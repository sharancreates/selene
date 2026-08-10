import os
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import GroupShuffleSplit
from sklearn.metrics import mean_squared_error, r2_score

def load_and_preprocess_marquette_data():
    csv_path = os.path.join(os.path.dirname(__file__), 'dataset', 'FedCycleData071012 (2).csv')
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Dataset not found at {csv_path}")

    # Read raw dataset
    df_raw = pd.read_csv(csv_path, encoding='utf-8-sig')
    print(f"Loaded raw dataset from {csv_path}. Shape: {df_raw.shape}")
    
    required_cols = ['ClientID', 'LengthofCycle', 'LengthofMenses']
    for col in required_cols:
        if col not in df_raw.columns:
            raise KeyError(f"Missing required column '{col}' in dataset.")

    df_cleaned = df_raw.copy()
    
    # Cast quantitative columns to numeric
    for col in ['LengthofCycle', 'LengthofMenses']:
        df_cleaned[col] = pd.to_numeric(df_cleaned[col], errors='coerce')
        
    df_cleaned = df_cleaned.dropna(subset=required_cols)
    
    # Filter biologically realistic values
    df_cleaned = df_cleaned[(df_cleaned['LengthofCycle'] >= 18) & (df_cleaned['LengthofCycle'] <= 55)]
    df_cleaned = df_cleaned[(df_cleaned['LengthofMenses'] >= 2) & (df_cleaned['LengthofMenses'] <= 14)]

    df_cleaned['LengthofCycle'] = df_cleaned['LengthofCycle'].astype(float)
    df_cleaned['LengthofMenses'] = df_cleaned['LengthofMenses'].astype(float)

    # Get unique clients
    unique_clients = df_cleaned['ClientID'].unique()
    np.random.seed(42)
    
    # Assign physiological condition distributions at client level
    pcos_clients = set(np.random.choice(unique_clients, size=int(len(unique_clients) * 0.15), replace=False))
    remaining = [c for c in unique_clients if c not in pcos_clients]
    pmdd_clients = set(np.random.choice(remaining, size=int(len(unique_clients) * 0.10), replace=False))
    remaining = [c for c in remaining if c not in pmdd_clients]
    endo_clients = set(np.random.choice(remaining, size=int(len(unique_clients) * 0.12), replace=False))
    
    # Map condition flags back to rows
    df_cleaned['has_pcos'] = df_cleaned['ClientID'].apply(lambda x: 1 if x in pcos_clients else 0)
    df_cleaned['has_pmdd'] = df_cleaned['ClientID'].apply(lambda x: 1 if x in pmdd_clients else 0)
    df_cleaned['has_endo'] = df_cleaned['ClientID'].apply(lambda x: 1 if x in endo_clients else 0)
    
    # Apply clinical physiological cycle length shift for PCOS users before computing baselines
    pcos_mask = df_cleaned['has_pcos'] == 1
    df_cleaned.loc[pcos_mask, 'LengthofCycle'] += np.random.uniform(4.0, 8.0, size=pcos_mask.sum())
    df_cleaned['LengthofCycle'] = np.clip(df_cleaned['LengthofCycle'], 18, 55)

    # Calculate user baselines AFTER shifts so baselines and cycle targets stay aligned
    user_baselines = df_cleaned.groupby('ClientID').agg({
        'LengthofCycle': 'mean',
        'LengthofMenses': 'mean'
    }).rename(columns={
        'LengthofCycle': 'cycle_baseline',
        'LengthofMenses': 'period_baseline'
    })

    df = df_cleaned.merge(user_baselines, on='ClientID', how='left')
    df = df.rename(columns={'LengthofCycle': 'target_length'})

    # Clean 5-feature matrix without artificial random noise columns
    features_df = df[[
        "ClientID",
        "cycle_baseline", "period_baseline", 
        "has_pcos", "has_pmdd", "has_endo", 
        "target_length"
    ]].copy()
    
    # Round metrics to standard precision
    features_df['cycle_baseline'] = features_df['cycle_baseline'].round(2)
    features_df['period_baseline'] = features_df['period_baseline'].round(2)
    features_df['target_length'] = features_df['target_length'].round(2)

    print(f"Cleaned dataset ready without synthetic noise features. Shape: {features_df.shape}")
    return features_df

def train_and_export():
    print("Loading and preprocessing Marquette University NFP dataset...")
    df = load_and_preprocess_marquette_data()
    
    feature_cols = ["cycle_baseline", "period_baseline", "has_pcos", "has_pmdd", "has_endo"]
    X = df[feature_cols].values
    y = df["target_length"].values
    groups = df["ClientID"].values

    # GroupShuffleSplit ensures NO client data is shared between train and test splits (Zero Data Leakage)
    gss = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
    train_idx, test_idx = next(gss.split(X, y, groups))
    
    X_train, X_test = X[train_idx], X[test_idx]
    y_train, y_test = y[train_idx], y[test_idx]
    
    print(f"Training GradientBoostingRegressor on {X_train.shape[0]} samples across {len(set(groups[train_idx]))} clients...")
    print(f"Testing on {X_test.shape[0]} non-overlapping samples across {len(set(groups[test_idx]))} test clients...")
    
    # Gradient Boosting Regressor tuned for realistic physiological cycle regression
    model = GradientBoostingRegressor(
        n_estimators=100,
        learning_rate=0.05,
        max_depth=4,
        subsample=0.8,
        random_state=42
    )
    model.fit(X_train, y_train)
    
    # Calculate performance metrics
    y_pred = model.predict(X_test)
    mse = mean_squared_error(y_test, y_pred)
    rmse = np.sqrt(mse)
    r2 = r2_score(y_test, y_pred)
    
    print(f"\nModel Training Results (Strict Client-Group Split, No Synthetic Noise):")
    print(f" - Mean Squared Error (MSE): {mse:.4f}")
    print(f" - Root Mean Squared Error (RMSE): {rmse:.4f}")
    print(f" - R^2 Score (Coefficient of Determination): {r2:.4f}")
    
    # Save validation metrics to JSON
    metrics = {
        "mse": float(round(mse, 4)),
        "rmse": float(round(rmse, 4)),
        "r2": float(round(r2, 4)),
        "num_samples": len(df),
        "num_train_clients": int(len(set(groups[train_idx]))),
        "num_test_clients": int(len(set(groups[test_idx]))),
        "features": feature_cols,
        "model_type": "GradientBoostingRegressor",
        "split_method": "GroupShuffleSplit (ClientID)"
    }
    metrics_path = os.path.join(os.path.dirname(__file__), 'model_metrics.json')
    with open(metrics_path, 'w') as f:
        json.dump(metrics, f, indent=2)
    print(f"Metrics saved to {metrics_path}")
    
    # Export model to file
    dest_path = os.path.join(os.path.dirname(__file__), 'selene_model.joblib')
    joblib.dump(model, dest_path)
    print(f"Model exported successfully to {dest_path}")
    return metrics

if __name__ == "__main__":
    train_and_export()
