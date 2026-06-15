import os
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score

def generate_synthetic_data(num_samples=1000, random_seed=42):
    np.random.seed(random_seed)
    
    # 1. Generate features
    cycle_baseline = np.random.normal(loc=28.5, scale=2.5, size=num_samples)
    cycle_baseline = np.clip(cycle_baseline, 21, 45).astype(int)
    
    period_baseline = np.random.normal(loc=5.2, scale=1.1, size=num_samples)
    period_baseline = np.clip(period_baseline, 3, 10).astype(int)
    
    has_pcos = np.random.binomial(n=1, p=0.15, size=num_samples)
    has_pmdd = np.random.binomial(n=1, p=0.10, size=num_samples)
    has_endo = np.random.binomial(n=1, p=0.12, size=num_samples)
    
    avg_sleep = np.random.uniform(low=50, high=90, size=num_samples)
    # PMDD correlates with poorer sleep quality
    avg_sleep = avg_sleep - (has_pmdd * np.random.uniform(8, 18, size=num_samples))
    avg_sleep = np.clip(avg_sleep, 0, 100)
    
    avg_pain = np.random.uniform(low=5, high=45, size=num_samples)
    # Endometriosis and PCOS correlate with higher logged pelvic pain
    avg_pain = avg_pain + (has_endo * np.random.uniform(15, 35, size=num_samples))
    avg_pain = avg_pain + (has_pcos * np.random.uniform(5, 15, size=num_samples))
    avg_pain = np.clip(avg_pain, 0, 100)
    
    # 2. Define target cycle length (with realistic physiological correlations)
    # PCOS increases cycle length variance and duration
    # High pain/stress and poor sleep can cause minor cycle elongations
    target_length = (
        cycle_baseline +
        (has_pcos * np.random.uniform(4.0, 9.0, size=num_samples)) +
        ((100 - avg_sleep) * 0.05) +
        (avg_pain * 0.03) +
        np.random.normal(loc=0.0, scale=1.0, size=num_samples)
    )
    target_length = np.clip(target_length, 21, 45)
    
    df = pd.DataFrame({
        "cycle_baseline": cycle_baseline,
        "period_baseline": period_baseline,
        "has_pcos": has_pcos,
        "has_pmdd": has_pmdd,
        "has_endo": has_endo,
        "avg_sleep": avg_sleep,
        "avg_pain": avg_pain,
        "target_length": target_length
    })
    
    return df

def train_and_export():
    print("Generating representative FemTech dataset...")
    df = generate_synthetic_data(num_samples=1500)
    
    X = df[[
        "cycle_baseline", "period_baseline", 
        "has_pcos", "has_pmdd", "has_endo", 
        "avg_sleep", "avg_pain"
    ]].values
    y = df["target_length"].values
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Training GradientBoostingRegressor model...")
    model = GradientBoostingRegressor(
        n_estimators=100,
        learning_rate=0.05,
        max_depth=4,
        random_state=42
    )
    model.fit(X_train, y_train)
    
    # Calculate performance metrics
    y_pred = model.predict(X_test)
    mse = mean_squared_error(y_test, y_pred)
    rmse = np.sqrt(mse)
    r2 = r2_score(y_test, y_pred)
    
    print(f"Model Training Results:")
    print(f" - Mean Squared Error (MSE): {mse:.4f}")
    print(f" - Root Mean Squared Error (RMSE): {rmse:.4f}")
    print(f" - R^2 Score: {r2:.4f}")
    
    # Export model to file
    dest_path = os.path.join(os.path.dirname(__file__), 'selene_model.joblib')
    joblib.dump(model, dest_path)
    print(f"Model exported successfully to {dest_path}")

if __name__ == "__main__":
    train_and_export()
