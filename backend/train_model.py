import os
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score

def load_and_preprocess_marquette_data():
    csv_path = os.path.join(os.path.dirname(__file__), 'dataset', 'FedCycleData071012 (2).csv')
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Dataset not found at {csv_path}")

    # Read dataset
    df_raw = pd.read_csv(csv_path, encoding='utf-8-sig')
    print(f"Loaded raw dataset from {csv_path}. Shape: {df_raw.shape}")
    
    required_cols = ['ClientID', 'LengthofCycle', 'LengthofMenses']
    for col in required_cols:
        if col not in df_raw.columns:
            raise KeyError(f"Missing required column '{col}' in dataset.")

    df_cleaned = df_raw.copy()
    
    # Cast only quantitative columns to numeric
    for col in ['LengthofCycle', 'LengthofMenses']:
        df_cleaned[col] = pd.to_numeric(df_cleaned[col], errors='coerce')
        
    df_cleaned = df_cleaned.dropna(subset=required_cols)
    
    # Filter biologically realistic values
    df_cleaned = df_cleaned[(df_cleaned['LengthofCycle'] >= 18) & (df_cleaned['LengthofCycle'] <= 55)]
    df_cleaned = df_cleaned[(df_cleaned['LengthofMenses'] >= 2) & (df_cleaned['LengthofMenses'] <= 14)]

    # Cast to float64 to support floating point shifts cleanly
    df_cleaned['LengthofCycle'] = df_cleaned['LengthofCycle'].astype(float)
    df_cleaned['LengthofMenses'] = df_cleaned['LengthofMenses'].astype(float)

    # Get unique clients
    unique_clients = df_cleaned['ClientID'].unique()
    np.random.seed(42)
    
    # Assign conditions at client level (physiologically realistic)
    pcos_clients = set(np.random.choice(unique_clients, size=int(len(unique_clients) * 0.15), replace=False))
    remaining = [c for c in unique_clients if c not in pcos_clients]
    pmdd_clients = set(np.random.choice(remaining, size=int(len(unique_clients) * 0.10), replace=False))
    remaining = [c for c in remaining if c not in pmdd_clients]
    endo_clients = set(np.random.choice(remaining, size=int(len(unique_clients) * 0.12), replace=False))
    
    # Map conditions back to rows
    df_cleaned['has_pcos'] = df_cleaned['ClientID'].apply(lambda x: 1 if x in pcos_clients else 0)
    df_cleaned['has_pmdd'] = df_cleaned['ClientID'].apply(lambda x: 1 if x in pmdd_clients else 0)
    df_cleaned['has_endo'] = df_cleaned['ClientID'].apply(lambda x: 1 if x in endo_clients else 0)
    
    # Apply physiological shifts to LengthofCycle for PCOS users before computing baselines
    pcos_mask = df_cleaned['has_pcos'] == 1
    df_cleaned.loc[pcos_mask, 'LengthofCycle'] += np.random.uniform(4.0, 9.0, size=pcos_mask.sum())
    
    # Calculate user baselines AFTER shifts to keep baselines and cycle lengths aligned!
    user_baselines = df_cleaned.groupby('ClientID').agg({
        'LengthofCycle': 'mean',
        'LengthofMenses': 'mean'
    }).rename(columns={
        'LengthofCycle': 'cycle_baseline',
        'LengthofMenses': 'period_baseline'
    })

    df = df_cleaned.merge(user_baselines, on='ClientID', how='left')
    
    # Lifestyle columns
    num_samples = len(df)
    df['avg_sleep'] = np.random.uniform(low=65, high=90, size=num_samples)
    df['avg_pain'] = np.random.uniform(low=5, high=25, size=num_samples)
    
    # Apply symptoms shifts
    pmdd_mask = df['has_pmdd'] == 1
    df.loc[pmdd_mask, 'avg_sleep'] -= np.random.uniform(8, 18, size=pmdd_mask.sum())
    
    endo_mask = df['has_endo'] == 1
    df.loc[endo_mask, 'avg_pain'] += np.random.uniform(15, 35, size=endo_mask.sum())
    
    # Clip values to valid clinical bounds
    df['LengthofCycle'] = np.clip(df['LengthofCycle'], 18, 55)
    df['avg_sleep'] = np.clip(df['avg_sleep'], 0, 100)
    df['avg_pain'] = np.clip(df['avg_pain'], 0, 100)

    # Rename target column to match expected schema
    df = df.rename(columns={'LengthofCycle': 'target_length'})

    # Final feature dataset selection
    features_df = df[[
        "cycle_baseline", "period_baseline", 
        "has_pcos", "has_pmdd", "has_endo", 
        "avg_sleep", "avg_pain", "target_length"
    ]]
    
    return features_df

def train_and_export():
    print("Loading and preprocessing Marquette University NFP dataset...")
    df = load_and_preprocess_marquette_data()
    
    X = df[[
        "cycle_baseline", "period_baseline", 
        "has_pcos", "has_pmdd", "has_endo", 
        "avg_sleep", "avg_pain"
    ]].values
    y = df["target_length"].values
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print(f"Training Random Forest on {X_train.shape[0]} samples (testing on {X_test.shape[0]} samples)...")
    
    # Train Random Forest Regressor
    model = RandomForestRegressor(
        n_estimators=150,
        max_depth=6,
        min_samples_split=5,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train, y_train)
    
    # Calculate performance metrics
    y_pred = model.predict(X_test)
    mse = mean_squared_error(y_test, y_pred)
    rmse = np.sqrt(mse)
    r2 = r2_score(y_test, y_pred)
    
    print(f"\nModel Training Results on Marquette NFP Dataset:")
    print(f" - Mean Squared Error (MSE): {mse:.4f}")
    print(f" - Root Mean Squared Error (RMSE): {rmse:.4f}")
    print(f" - R^2 Score (Coefficient of Determination): {r2:.4f}")
    
    # Export model to file
    dest_path = os.path.join(os.path.dirname(__file__), 'selene_model.joblib')
    joblib.dump(model, dest_path)
    print(f"Model exported successfully to {dest_path}")

if __name__ == "__main__":
    train_and_export()
