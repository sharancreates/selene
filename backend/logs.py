from datetime import datetime
from flask import Blueprint, request, jsonify, g
try:
    from .models import db, DailyLog
    from .auth import jwt_required
except ImportError:
    from models import db, DailyLog
    from auth import jwt_required

# Define the logs blueprint
logs_bp = Blueprint('logs', __name__)

@logs_bp.route('/sync', methods=['POST'])
@jwt_required
def sync_log():
    """
    Debounced sync endpoint to ingest updates to the daily health companion log.
    Implements a database-agnostic atomic check-then-commit upsert mechanism.
    """
    data = request.get_json() or {}
    
    # 1. Parse and validate the tracking date
    log_date_str = data.get('log_date')
    if not log_date_str:
        return jsonify({"error": "log_date is a required parameter"}), 400
        
    try:
        log_date = datetime.strptime(log_date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({"error": "log_date must be in YYYY-MM-DD format"}), 400
        
    # 2. Parse and validate the cycle phase
    phase = data.get('phase')
    if not phase:
        return jsonify({"error": "phase is a required parameter"}), 400

    # Helper function to enforce 0–100 range constraints on sliders
    def clamp_slider(val):
        if val is None:
            return None
        try:
            clamped = int(val)
            return max(0, min(100, clamped))
        except (ValueError, TypeError):
            return None

    # Helper to parse BBT safely
    def parse_float(val):
        if val is None or val == "":
            return None
        try:
            return float(val)
        except (ValueError, TypeError):
            return None

    # Parse parameters
    energy = clamp_slider(data.get('energy_level'))
    pelvic = clamp_slider(data.get('pelvic_pain'))
    flow = clamp_slider(data.get('flow_intensity'))
    back = clamp_slider(data.get('back_pain'))
    sleep = clamp_slider(data.get('sleep_quality'))
    bbt = parse_float(data.get('basal_body_temp'))
    
    mood_toggles = data.get('mood_toggles', {})
    symptom_tags = data.get('symptom_tags', {})
    lifestyle_actions = data.get('lifestyle_actions', {})

    # Ensure JSON objects are dictionary-compatible
    if not isinstance(mood_toggles, dict):
        mood_toggles = {}
    if not isinstance(symptom_tags, dict):
        symptom_tags = {}
    if not isinstance(lifestyle_actions, dict):
        lifestyle_actions = {}

    # 3. Perform atomic transaction upsert
    try:
        # Check if record exists for this user and date
        existing_log = DailyLog.query.filter_by(user_id=g.user.id, log_date=log_date).first()
        
        if existing_log:
            # Update matching fields in-place
            existing_log.phase = phase
            
            # Only update slider/temp values if explicitly provided in sync payload
            if 'energy_level' in data:
                existing_log.energy_level = energy
            if 'pelvic_pain' in data:
                existing_log.pelvic_pain = pelvic
            if 'flow_intensity' in data:
                existing_log.flow_intensity = flow
            if 'back_pain' in data:
                existing_log.back_pain = back
            if 'sleep_quality' in data:
                existing_log.sleep_quality = sleep
            if 'basal_body_temp' in data:
                existing_log.basal_body_temp = bbt
            
            # Merge JSON values dictionary-style to preserve previous settings
            if mood_toggles:
                existing_log.mood_toggles = {**existing_log.mood_toggles, **mood_toggles}
            if symptom_tags:
                existing_log.symptom_tags = {**existing_log.symptom_tags, **symptom_tags}
            if lifestyle_actions:
                existing_log.lifestyle_actions = {**existing_log.lifestyle_actions, **lifestyle_actions}
                
            action = "updated"
            log_record = existing_log
        else:
            # Initialize a new record row
            new_log = DailyLog(
                user_id=g.user.id,
                log_date=log_date,
                phase=phase,
                energy_level=energy,
                pelvic_pain=pelvic,
                flow_intensity=flow,
                back_pain=back,
                sleep_quality=sleep,
                basal_body_temp=bbt,
                mood_toggles=mood_toggles,
                symptom_tags=symptom_tags,
                lifestyle_actions=lifestyle_actions
            )
            db.session.add(new_log)
            action = "created"
            log_record = new_log
            
        # Commit transaction atomically
        db.session.commit()
        
        return jsonify({
            "status": "success",
            "message": f"Daily log for {log_date_str} successfully {action}",
            "log": log_record.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to synchronize tracking log due to an internal error."}), 500


@logs_bp.route('', methods=['GET'])
@jwt_required
def get_logs():
    """
    Retrieve all historical logs for the authenticated user, ordered by date.
    """
    try:
        logs = DailyLog.query.filter_by(user_id=g.user.id).order_by(DailyLog.log_date.asc()).all()
        return jsonify({
            "status": "success",
            "logs": [log.to_dict() for log in logs]
        }), 200
    except Exception as e:
        return jsonify({"error": "Failed to retrieve user logs due to an internal error."}), 500
