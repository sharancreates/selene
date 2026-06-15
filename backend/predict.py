import os
import joblib
import numpy as np
import pandas as pd
import logging
from datetime import datetime, date, timedelta
from flask import Blueprint, request, jsonify, g

logger = logging.getLogger(__name__)

# Robust imports supporting direct script execution or package import
try:
    from .models import db, User
    from .auth import jwt_required
    from .pipeline import extract_log_dataframe
except ImportError:
    from models import db, User
    from auth import jwt_required
    from pipeline import extract_log_dataframe

class MLPipelineError(Exception):
    """Custom exception for ML pipeline errors to return descriptive API messages."""
    def __init__(self, message, status_code=400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


# Define the prediction blueprint
predict_bp = Blueprint('predict', __name__)


@predict_bp.errorhandler(MLPipelineError)
def handle_pipeline_error(error):
    return jsonify({
        "status": "error",
        "error": error.message
    }), error.status_code


# Absolute path for the compiled ML model binary
MODEL_PATH = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'selene_model.joblib')

@predict_bp.route('/next-cycle', methods=['GET'])
@jwt_required
def predict_next_cycle():
    """
    Computes adaptive cycle predictions and generates personalized daily insights.
    If a compiled scikit-learn model binary exists, it runs ML inference.
    Otherwise, it executes a fallback mathematical regression engine.
    """
    user = g.user
    
    try:
        # 1. Preprocess raw tracking logs into a cleansed DataFrame
        df = extract_log_dataframe(user.id)
        
        # 2. Data Safeguard check: Requires at least 10 log entries to calibrate baselines
        if df.empty or len(df) < 10:
            return jsonify({
                "status": "calibrating",
                "message": f"Selene is currently calibrating. You have logged {len(df)}/10 days of indicators. Please log at least 10 entries to enable adaptive tracking.",
                "prediction": {
                    "next_period_date": None,
                    "estimated_phase": "Calibrating",
                    "insight": "Every log helps build a safer, more accurate calibration picture of your unique rhythm. Keep tracking daily indicators."
                }
            }), 200

        # Optional date query parameter for testing
        test_date_str = request.args.get('date')
        if test_date_str:
            try:
                reference_date = datetime.strptime(test_date_str, '%Y-%m-%d').date()
            except ValueError:
                raise MLPipelineError("Invalid 'date' query parameter format. Use YYYY-MM-DD.", 400)
        else:
            reference_date = datetime.now().date()

        # 3. Model Inference Check: Try to load serialized scikit-learn binary
        predicted_cycle_length = None
        if os.path.exists(MODEL_PATH):
            try:
                # Load joblib binary model
                model = joblib.load(MODEL_PATH)
                
                # Construct feature vector matching model's expected shape:
                # [cycle_baseline, period_baseline, has_pcos, has_pmdd, has_endo, avg_sleep, avg_pain]
                features = np.array([[
                    user.cycle_length_baseline,
                    user.period_length_baseline,
                    int(user.has_pcos),
                    int(user.has_pmdd),
                    int(user.has_endo),
                    df['sleep_quality'].mean(),
                    df['pelvic_pain'].mean()
                ]])
                
                # Execute scikit-learn prediction
                prediction_output = model.predict(features)
                predicted_cycle_length = int(round(prediction_output[0]))
                
            except Exception as ml_err:
                # Log model error and allow execution to fall back to regression engine
                logger.warning(f"ML Model inference warning: {str(ml_err)}. Falling back to mathematical heuristics.")

        # 4. Fallback Regression Engine: Analyze logs to identify cycles
        # Identify period starts (transition to menstrual phase)
        period_starts = []
        for i in range(len(df)):
            current_phase = df.loc[i, 'phase']
            current_date = df.loc[i, 'log_date'].date()
            if current_phase == 'menstrual':
                # Check for the start of a menstrual phase block
                if i == 0 or df.loc[i-1, 'phase'] != 'menstrual':
                    period_starts.append(current_date)
                    
        # Calculate actual historical cycle lengths
        cycle_lengths = []
        for i in range(1, len(period_starts)):
            diff_days = (period_starts[i] - period_starts[i-1]).days
            # Filter biologically realistic cycles (18 to 45 days)
            if 18 <= diff_days <= 45:
                cycle_lengths.append(diff_days)

        # Calculate estimated cycle length
        if predicted_cycle_length is not None:
            estimated_cycle_length = predicted_cycle_length
        elif cycle_lengths:
            estimated_cycle_length = int(round(np.mean(cycle_lengths)))
        else:
            estimated_cycle_length = user.cycle_length_baseline or 28

        # Calculate average period duration (days of menstrual phase)
        period_durations = []
        if period_starts:
            for start in period_starts:
                # Count consecutive menstrual log entries following the start date
                consecutive_days = len(df[(df['log_date'].dt.date >= start) & 
                                         (df['log_date'].dt.date < start + timedelta(days=10)) & 
                                         (df['phase'] == 'menstrual')])
                if 2 <= consecutive_days <= 10:
                    period_durations.append(consecutive_days)
                    
        estimated_period_length = int(round(np.mean(period_durations))) if period_durations else (user.period_length_baseline or 5)

        # Calculate the most recent period start date
        if period_starts:
            last_period_start = period_starts[-1]
        else:
            # Safe boundary fallback: assume oldest log date is the start
            last_period_start = df.loc[0, 'log_date'].date()

        # Compute next predicted period date
        next_period_date = last_period_start + timedelta(days=estimated_cycle_length)
        
        # Avoid past predicted date return: project forward if predicted date is already passed
        while next_period_date <= reference_date:
            next_period_date += timedelta(days=estimated_cycle_length)

        # 5. Estimate the user's current cycle phase on the reference date
        days_since_start = (reference_date - last_period_start).days
        days_in_cycle = days_since_start % estimated_cycle_length
        
        # Calculate ovulation day (typically 14 days before the next cycle starts)
        ovulation_day = estimated_cycle_length - 14
        
        if days_in_cycle < estimated_period_length:
            current_phase_est = 'menstrual'
        elif days_in_cycle < ovulation_day - 1:
            current_phase_est = 'follicular'
        elif days_in_cycle <= ovulation_day + 1:
            current_phase_est = 'ovulatory'
        else:
            current_phase_est = 'luteal'

        # 6. Generate empathetic, personalized insights based on health conditions
        insight = get_empathetic_insight(current_phase_est, user)
        if user.has_pcos or user.has_pmdd or user.has_endo:
            insight += " (Disclaimer: This insight is for educational tracking and does not constitute medical advice.)"

        # Calculate standard deviation of historical cycle lengths (Task 22)
        if len(cycle_lengths) >= 2:
            prediction_std = float(np.std(cycle_lengths))
        else:
            prediction_std = 2.0  # Default standard error fallback

        disclaimer_text = "MEDICAL DISCLAIMER: Selene is an educational tracking tool. It does not provide clinical diagnoses, medical treatments, or formal recommendations. Consult a licensed healthcare provider for medical concerns."

        return jsonify({
            "status": "success",
            "prediction": {
                "next_period_date": next_period_date.isoformat(),
                "estimated_phase": current_phase_est,
                "days_until_period": (next_period_date - reference_date).days,
                "cycle_length_calculated": estimated_cycle_length,
                "period_length_calculated": estimated_period_length,
                "prediction_error_std": round(prediction_std, 2),
                "prediction_error_bounds": f"±{round(prediction_std, 1)} days",
                "insight": insight,
                "medical_disclaimer": disclaimer_text
            }
        }), 200

    except MLPipelineError as mpe:
        raise mpe
    except Exception as e:
        from flask import current_app
        current_app.logger.error(f"Prediction logic error: {str(e)}", exc_info=True)
        raise MLPipelineError(f"Failed to calculate cycle prediction due to an internal error: {str(e)}", 500)


@predict_bp.route('/insights', methods=['GET'])
@jwt_required
def get_insights():
    """
    Exposes deterministic, rule-based clinical and cycle insights.
    """
    try:
        from insights_engine import generate_insights
    except ImportError:
        from .insights_engine import generate_insights

    try:
        insights_data = generate_insights(g.user)
        return jsonify(insights_data), 200
    except Exception as err:
        logger.error(f"Error executing insights engine: {str(err)}")
        return jsonify({
            "insights": [
                {
                    "title": "Insight Engine Error",
                    "message": "We encountered an issue calculating your insights. Please try again later.",
                    "category": "trend",
                    "confidence": "low",
                    "explanation": "Decryption or calculation failed internally.",
                    "supporting_data": {"error": "An internal calculation error occurred."}
                }
            ]
        }), 500


@predict_bp.route('/feedback', methods=['POST'])
@jwt_required
def submit_feedback():
    """
    Records user validation feedback and rating for a cycle prediction.
    """
    from models import PredictionFeedback
    
    data = request.get_json() or {}
    prediction_date_str = data.get('prediction_date')
    actual_start_date_str = data.get('actual_start_date')
    rating = data.get('rating')
    comments = data.get('comments')
    
    if not prediction_date_str:
        raise MLPipelineError("prediction_date is required.", 400)
    if rating is None:
        raise MLPipelineError("rating is required.", 400)
    try:
        rating_int = int(rating)
        if not (1 <= rating_int <= 5):
            raise ValueError()
    except ValueError:
        raise MLPipelineError("rating must be an integer between 1 and 5.", 400)
        
    try:
        pred_date = datetime.strptime(prediction_date_str, '%Y-%m-%d').date()
    except ValueError:
        raise MLPipelineError("Invalid prediction_date format. Use YYYY-MM-DD.", 400)
        
    actual_date = None
    if actual_start_date_str:
        try:
            actual_date = datetime.strptime(actual_start_date_str, '%Y-%m-%d').date()
        except ValueError:
            raise MLPipelineError("Invalid actual_start_date format. Use YYYY-MM-DD.", 400)
            
    try:
        feedback = PredictionFeedback(
            user_id=g.user.id,
            prediction_date=pred_date,
            actual_start_date=actual_date,
            rating=rating_int,
            comments=comments
        )
        db.session.add(feedback)
        db.session.commit()
        
        return jsonify({
            "status": "success",
            "message": "Feedback submitted successfully.",
            "feedback": feedback.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        raise MLPipelineError(f"Failed to save feedback: {str(e)}", 500)


@predict_bp.route('/anomalies', methods=['GET'])
@jwt_required
def detect_anomalies():
    """
    Analyzes user's historical log patterns using an Isolation Forest 
    to flag symptom spike and tracking frequency anomalies.
    """
    from sklearn.ensemble import IsolationForest
    
    try:
        df = extract_log_dataframe(g.user.id)
        if df.empty or len(df) < 10:
            return jsonify({
                "status": "calibrating",
                "message": f"Fewer than 10 logs logged. Isolation Forest anomaly calibration requires at least 10 log entries (currently {len(df)}).",
                "anomalies": [],
                "medical_disclaimer": "MEDICAL DISCLAIMER: Selene anomaly detection is not diagnostic advice."
            }), 200
            
        # 1. Compute symptom index counts per log day
        symptom_counts = []
        for i in range(len(df)):
            count = 0.0
            # Sum dynamic mood counts
            count += sum(df.loc[i, col] for col in df.columns if col.startswith('mood_'))
            count += sum(df.loc[i, col] for col in df.columns if col.startswith('symptom_'))
            # Scale pelvic and back pain (0-100) to match count variance
            count += (df.loc[i, 'pelvic_pain'] or 0) / 10.0
            count += (df.loc[i, 'back_pain'] or 0) / 10.0
            symptom_counts.append(count)
            
        # 2. Compute chronological logging gaps
        logging_gaps = [0.0]
        for i in range(1, len(df)):
            gap = float((df.loc[i, 'log_date'] - df.loc[i-1, 'log_date']).days)
            logging_gaps.append(gap)
            
        features = np.column_stack((symptom_counts, logging_gaps))
        
        # 3. Fit Isolation Forest to detect multivariate outliers
        clf = IsolationForest(contamination=0.1, random_state=42)
        preds = clf.fit_predict(features)
        
        anomalies = []
        for i in range(len(df)):
            if preds[i] == -1:
                reason = "Logging frequency gap anomaly detected."
                if symptom_counts[i] > np.median(symptom_counts):
                    reason = "Symptom score spike anomaly detected."
                anomalies.append({
                    "date": df.loc[i, 'log_date'].date().isoformat(),
                    "symptom_index": float(round(symptom_counts[i], 1)),
                    "logging_gap_days": int(logging_gaps[i]),
                    "reason": reason
                })
                
        disclaimer_text = "MEDICAL DISCLAIMER: Selene anomaly detection is based on mathematical models and is not diagnostic advice."
        return jsonify({
            "status": "success",
            "anomalies": anomalies,
            "medical_disclaimer": disclaimer_text
        }), 200
        
    except Exception as e:
        raise MLPipelineError(f"Anomaly detection pipeline failed: {str(e)}", 500)


def get_empathetic_insight(phase, user):
    """
    Returns custom-tailored, supportive insights based on the estimated cycle phase 
    and chronic health conditions.
    """
    if phase == 'menstrual':
        if user.has_endo:
            return "Pelvic congestion or heaviness may feel intense. Focus on warm herbal teas, heating pad relief, and gentle stretching. Honor your body's request for rest today."
        elif user.has_pcos:
            return "Flow can fluctuate. Keep your energy grounded with warm, protein-rich nourishment. Avoid intense cardiorespiratory stress and support your metabolic rest."
        elif user.has_pmdd:
            return "As hormone levels reset, nervous system sensitivity should begin to calm. Give yourself space and lean into gentle, quiet comforts."
        else:
            return "Your body is restoring. Nourish it with warm, iron-rich meals, prioritize hydration, and get extra sleep."
            
    elif phase == 'follicular':
        if user.has_pmdd:
            return "Resilience is naturally higher now. This is a great window for active socializing, brainstorming, and executing complex tasks."
        elif user.has_pcos:
            return "As estrogen slowly rises, insulin sensitivity increases. A great window for strength training and fiber-dense, stabilizing meals."
        elif user.has_endo:
            return "Energy is returning. Focus on anti-inflammatory nutrition (like omega-3s) to help support tissue health as you transition into activity."
        else:
            return "Estrogen is climbing, lifting your energy and focus. Ideal time for planning new projects, exercising, and collaborative ideas."
            
    elif phase == 'ovulatory':
        if user.has_pcos:
            return "Ovulation timing can vary. Support follicle health and egg development with healthy fats (nuts, seeds) and restful sleep."
        elif user.has_endo:
            return "You might notice localized twinges (mittelschmerz). Stay hydrated, support circulation, and enjoy your peak communication battery."
        elif user.has_pmdd:
            return "Estrogen is peaking, but be mindful of the upcoming post-ovulatory drop. Enjoy the active stamina, and establish gentle boundaries for later."
        else:
            return "Your social battery and stamina are at their peak. Your communication skills are naturally heightened today."
            
    else:  # Luteal phase
        if user.has_pmdd:
            return "Progesterone shifts may trigger nervous system sensitivity. Keep self-talk gentle, embrace nesting comfort, and set clear boundaries to conserve mental energy."
        elif user.has_pcos:
            return "Support progesterone production with restful sleep and blood sugar stability. Avoid skipping meals and opt for gentle, winding-down movements."
        elif user.has_endo:
            return "Premenstrual pelvic tension or bloating can start building. Warm epsom salt baths and anti-inflammatory support may help ease this transition."
        else:
            return "Physical energy is naturally winding down as progesterone peaks. Pivot to restorative walks, quiet journaling, and deep rest."
