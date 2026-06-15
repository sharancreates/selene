from datetime import datetime
import html
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
    else:
        symptom_tags = dict(symptom_tags)
    if not isinstance(lifestyle_actions, dict):
        lifestyle_actions = {}

    def sanitize_value(val):
        if isinstance(val, str):
            return html.escape(val)
        elif isinstance(val, dict):
            return {html.escape(k) if isinstance(k, str) else k: sanitize_value(v) for k, v in val.items()}
        elif isinstance(val, list):
            return [sanitize_value(item) for item in val]
        return val

    mood_toggles = sanitize_value(mood_toggles)
    symptom_tags = sanitize_value(symptom_tags)
    lifestyle_actions = sanitize_value(lifestyle_actions)

    # Map non-menstrual phase sliders to symptom_tags to fix semantic column mismatch
    if phase == 'follicular':
        if flow is not None:
            symptom_tags['focus'] = flow
            flow = None
        if pelvic is not None:
            symptom_tags['strength'] = pelvic
            pelvic = None
        if back is not None:
            symptom_tags['glow'] = back
            back = None
    elif phase == 'ovulatory':
        if flow is not None:
            symptom_tags['libido'] = flow
            flow = None
        if pelvic is not None:
            symptom_tags['confidence'] = pelvic
            pelvic = None
        if back is not None:
            symptom_tags['bloating'] = back
            back = None
    elif phase == 'luteal':
        if flow is not None:
            symptom_tags['bloating'] = flow
            flow = None
        if pelvic is not None:
            symptom_tags['breastSensitivity'] = pelvic
            pelvic = None
        if energy is not None:
            symptom_tags['anxiety'] = energy
            energy = None
        if back is not None:
            symptom_tags['cravings'] = back
            back = None

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
    Retrieve logs for the authenticated user. Order by date ascending.
    If page and per_page query parameters are provided, return paginated results.
    Otherwise, return all logs.
    """
    try:
        page = request.args.get('page', type=int)
        per_page = request.args.get('per_page', type=int)
        
        query = DailyLog.query.filter_by(user_id=g.user.id).order_by(DailyLog.log_date.asc())
        
        if page and per_page:
            pagination = query.paginate(page=page, per_page=per_page, error_out=False)
            return jsonify({
                "status": "success",
                "logs": [log.to_dict() for log in pagination.items],
                "total": pagination.total,
                "pages": pagination.pages,
                "current_page": pagination.page
            }), 200
        else:
            logs = query.all()
            return jsonify({
                "status": "success",
                "logs": [log.to_dict() for log in logs]
            }), 200
    except Exception as e:
        return jsonify({"error": "Failed to retrieve user logs due to an internal error."}), 500


@logs_bp.route('/export', methods=['GET'])
@jwt_required
def export_logs():
    """
    Export all user configurations and daily log history as a JSON download.
    """
    try:
        from flask import make_response
        logs = DailyLog.query.filter_by(user_id=g.user.id).order_by(DailyLog.log_date.asc()).all()
        export_data = {
            "user": g.user.to_dict(),
            "exported_at": datetime.utcnow().isoformat() + "Z",
            "logs": [log.to_dict() for log in logs]
        }
        response = make_response(jsonify(export_data), 200)
        response.headers["Content-Disposition"] = "attachment; filename=selene_health_export.json"
        response.headers["Content-Type"] = "application/json"
        return response
    except Exception as e:
        return jsonify({"error": "Failed to export data due to an internal error."}), 500


@logs_bp.route('/export/fhir', methods=['GET'])
@jwt_required
def export_fhir_logs():
    """
    Export all user daily log history formatted as a HL7/FHIR JSON Bundle.
    """
    try:
        from flask import make_response
        logs = DailyLog.query.filter_by(user_id=g.user.id).order_by(DailyLog.log_date.asc()).all()
        
        patient_ref = f"patient-{g.user.id}"
        
        # 1. Initialize FHIR Bundle
        bundle = {
            "resourceType": "Bundle",
            "type": "collection",
            "entry": [
                {
                    "resource": {
                        "resourceType": "Patient",
                        "id": patient_ref,
                        "identifier": [
                            {
                                "system": "http://selene.privacy/patients",
                                "value": g.user.username
                            }
                        ]
                    }
                }
            ]
        }
        
        # 2. Iterate through logs and append Observation entries
        for log in logs:
            effective_date = log.log_date.isoformat()
            
            # Waking Basal Body Temp
            if log.basal_body_temp is not None:
                bundle["entry"].append({
                    "resource": {
                        "resourceType": "Observation",
                        "id": f"obs-{log.id}-bbt",
                        "status": "final",
                        "code": {
                            "coding": [{
                                "system": "http://loinc.org",
                                "code": "8310-5",
                                "display": "Body temperature"
                            }]
                        },
                        "subject": {
                            "reference": f"Patient/{patient_ref}"
                        },
                        "effectiveDateTime": effective_date,
                        "valueQuantity": {
                            "value": float(log.basal_body_temp),
                            "unit": "degF",
                            "system": "http://unitsofmeasure.org",
                            "code": "[degF]"
                        }
                    }
                })
                
            # Menstrual Flow Intensity
            if log.flow_intensity is not None:
                bundle["entry"].append({
                    "resource": {
                        "resourceType": "Observation",
                        "id": f"obs-{log.id}-flow",
                        "status": "final",
                        "code": {
                            "coding": [{
                                "system": "http://loinc.org",
                                "code": "10159-2",
                                "display": "History of Menstrual flow"
                            }]
                        },
                        "subject": {
                            "reference": f"Patient/{patient_ref}"
                        },
                        "effectiveDateTime": effective_date,
                        "valueQuantity": {
                            "value": int(log.flow_intensity),
                            "unit": "%",
                            "system": "http://unitsofmeasure.org",
                            "code": "%"
                        }
                    }
                })

            # Pelvic Pain
            if log.pelvic_pain is not None:
                bundle["entry"].append({
                    "resource": {
                        "resourceType": "Observation",
                        "id": f"obs-{log.id}-pelvic",
                        "status": "final",
                        "code": {
                            "coding": [{
                                "system": "http://snomed.info/sct",
                                "code": "289535008",
                                "display": "Pelvic pain"
                            }]
                        },
                        "subject": {
                            "reference": f"Patient/{patient_ref}"
                        },
                        "effectiveDateTime": effective_date,
                        "valueQuantity": {
                            "value": int(log.pelvic_pain),
                            "unit": "%",
                            "system": "http://unitsofmeasure.org",
                            "code": "%"
                        }
                    }
                })

            # Lower Back Pain
            if log.back_pain is not None:
                bundle["entry"].append({
                    "resource": {
                        "resourceType": "Observation",
                        "id": f"obs-{log.id}-back",
                        "status": "final",
                        "code": {
                            "coding": [{
                                "system": "http://snomed.info/sct",
                                "code": "161891005",
                                "display": "Backache"
                            }]
                        },
                        "subject": {
                            "reference": f"Patient/{patient_ref}"
                        },
                        "effectiveDateTime": effective_date,
                        "valueQuantity": {
                            "value": int(log.back_pain),
                            "unit": "%",
                            "system": "http://unitsofmeasure.org",
                            "code": "%"
                        }
                    }
                })

            # Sleep Quality
            if log.sleep_quality is not None:
                bundle["entry"].append({
                    "resource": {
                        "resourceType": "Observation",
                        "id": f"obs-{log.id}-sleep",
                        "status": "final",
                        "code": {
                            "coding": [{
                                "system": "http://snomed.info/sct",
                                "code": "248254009",
                                "display": "Sleep quality"
                            }]
                        },
                        "subject": {
                            "reference": f"Patient/{patient_ref}"
                        },
                        "effectiveDateTime": effective_date,
                        "valueQuantity": {
                            "value": int(log.sleep_quality),
                            "unit": "%",
                            "system": "http://unitsofmeasure.org",
                            "code": "%"
                        }
                    }
                })

            # Energy Level
            if log.energy_level is not None:
                bundle["entry"].append({
                    "resource": {
                        "resourceType": "Observation",
                        "id": f"obs-{log.id}-energy",
                        "status": "final",
                        "code": {
                            "coding": [{
                                "system": "http://snomed.info/sct",
                                "code": "36111000119106",
                                "display": "Energy level"
                            }]
                        },
                        "subject": {
                            "reference": f"Patient/{patient_ref}"
                        },
                        "effectiveDateTime": effective_date,
                        "valueQuantity": {
                            "value": int(log.energy_level),
                            "unit": "%",
                            "system": "http://unitsofmeasure.org",
                            "code": "%"
                        }
                    }
                })

        response = make_response(jsonify(bundle), 200)
        response.headers["Content-Disposition"] = f"attachment; filename=selene_fhir_export_{g.user.username}.json"
        response.headers["Content-Type"] = "application/fhir+json"
        return response
    except Exception as e:
        return jsonify({"error": "Failed to export FHIR logs due to an internal error."}), 500
