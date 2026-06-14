import pandas as pd
import numpy as np
import logging
from datetime import date

# Set up module logger
logger = logging.getLogger(__name__)

# Import models supporting execution both as a package or direct script
try:
    from .models import DailyLog
except ImportError:
    from models import DailyLog

def extract_log_dataframe(user_id):
    """
    Extracts raw SQLAlchemy log records for a specific user and preprocesses them
    into a structured pandas DataFrame suitable for machine learning inference.
    
    Handles missing values dynamically:
      - Basal Body Temperature: forward-fill, backward-fill, then default.
      - Slider Metrics (0-100): rolling moving average (window=3) or default constants.
      - JSON Toggle keys: flattened to separate columns, filled with 0.
      - Phase names: one-hot encoded to numerical values.
    """
    try:
        # Fetch all logs in historical chronological order
        logs = DailyLog.query.filter_by(user_id=user_id).order_by(DailyLog.log_date.asc()).all()
        if not logs:
            return pd.DataFrame()
            
        data = []
        for log in logs:
            row = {
                "id": log.id,
                "user_id": log.user_id,
                "log_date": log.log_date,
                "phase": log.phase,
                "energy_level": log.energy_level,
                "pelvic_pain": log.pelvic_pain,
                "flow_intensity": log.flow_intensity,
                "back_pain": log.back_pain,
                "sleep_quality": log.sleep_quality,
                "basal_body_temp": log.basal_body_temp
            }
            
            # Flatten mood toggles (prefixed with mood_)
            moods = log.mood_toggles or {}
            if isinstance(moods, dict):
                for k, v in moods.items():
                    row[f"mood_{k}"] = 1 if v else 0
                    
            # Flatten symptom tags (prefixed with symptom_)
            symptoms = log.symptom_tags or {}
            if isinstance(symptoms, dict):
                for k, v in symptoms.items():
                    row[f"symptom_{k}"] = 1 if v else 0
                    
            # Flatten lifestyle actions (prefixed with action_)
            actions = log.lifestyle_actions or {}
            if isinstance(actions, dict):
                for k, v in actions.items():
                    row[f"action_{k}"] = 1 if v else 0
                    
            data.append(row)
            
        df = pd.DataFrame(data)
        
        # Ensure date format
        df['log_date'] = pd.to_datetime(df['log_date'])
        
        # Impute missing Basal Body Temperature values (vitals check)
        if 'basal_body_temp' in df.columns:
            # 1. Forward-fill (propagate last known temperature)
            df['basal_body_temp'] = df['basal_body_temp'].ffill()
            # 2. Backward-fill (for leading missing values)
            df['basal_body_temp'] = df['basal_body_temp'].bfill()
            # 3. Final default fallback (98.0°F baseline)
            df['basal_body_temp'] = df['basal_body_temp'].fillna(98.0)
        else:
            df['basal_body_temp'] = 98.0
            
        # Impute missing slider metrics (0-100 spectrum scale)
        slider_cols = ['energy_level', 'pelvic_pain', 'flow_intensity', 'back_pain', 'sleep_quality']
        for col in slider_cols:
            if col not in df.columns:
                df[col] = np.nan
            else:
                # Cast to numeric to prevent string conversion issues
                df[col] = pd.to_numeric(df[col], errors='coerce')
                
            # Compute a centered moving average (window size of 3) to smooth/fill gaps
            rolling_avg = df[col].rolling(window=3, min_periods=1, center=True).mean()
            df[col] = df[col].fillna(rolling_avg)
            
            # Establish baseline defaults: 50 for levels (energy/sleep), 0 for symptoms (pain/flow)
            default_constant = 50 if col in ['energy_level', 'sleep_quality'] else 0
            df[col] = df[col].fillna(default_constant).round().astype(int)
            
        # One-hot encode the cycle phase categories
        phases = ['menstrual', 'follicular', 'ovulatory', 'luteal']
        for p in phases:
            df[f"phase_{p}"] = (df['phase'] == p).astype(int)
            
        # Impute all dynamic JSON columns that were flattened (fill absent keys with 0)
        json_prefix_cols = [col for col in df.columns if col.startswith(('mood_', 'symptom_', 'action_'))]
        for col in json_prefix_cols:
            df[col] = df[col].fillna(0).astype(int)
            
        # Sort logs chronologically to ensure time-series sanity
        df = df.sort_values(by='log_date').reset_index(drop=True)
        return df

    except Exception as e:
        # Return an empty DataFrame in case of unexpected structural errors
        logger.error(f"Error compiling DataFrame in preprocessing pipeline: {str(e)}")
        return pd.DataFrame()
