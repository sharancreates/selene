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
    encrypted_data = data.get('encrypted_data')
    if not phase and encrypted_data:
        try:
            import json
            from models import decrypt_val
            decrypted_str = decrypt_val(encrypted_data, str)
            decrypted_dict = json.loads(decrypted_str)
            phase = decrypted_dict.get('phase')
        except Exception:
            pass
            
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
            if encrypted_data:
                existing_log.encrypted_data = encrypted_data
            else:
                # Update matching fields in-place via property setters
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
            if encrypted_data:
                new_log = DailyLog(
                    user_id=g.user.id,
                    log_date=log_date,
                    encrypted_data=encrypted_data
                )
            else:
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


@logs_bp.route('/export-pdf', methods=['GET'])
@jwt_required
def export_pdf_report():
    """
    Generate a beautifully styled consultation PDF containing user tracking baselines and decrypted daily logs.
    """
    import io
    from datetime import datetime
    from flask import send_file, make_response, current_app
    
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    except ImportError:
        return jsonify({"error": "PDF generation library (ReportLab) is not installed."}), 500

    try:
        # Get decrypted logs
        logs = DailyLog.query.filter_by(user_id=g.user.id).order_by(DailyLog.log_date.desc()).all()

        # In-memory buffer
        buffer = io.BytesIO()

        # Get password query parameter and set encryption
        password = request.args.get('password')
        encrypt_helper = None
        if password:
            try:
                from reportlab.lib import pdfencrypt
                encrypt_helper = pdfencrypt.StandardEncryption(password)
            except ImportError:
                pass

        # Document Setup
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=40,
            leftMargin=40,
            topMargin=40,
            bottomMargin=40,
            encrypt=encrypt_helper
        )

        story = []
        styles = getSampleStyleSheet()

        # Custom warm brand colors
        primary_color = colors.HexColor('#df9b6d')   # Coral/Brown
        secondary_color = colors.HexColor('#8ba68b') # Green
        text_dark = colors.HexColor('#2c2c2c')        # Charcoal
        bg_cream = colors.HexColor('#f9f6f0')         # Light cream

        # Custom paragraph styles
        title_style = ParagraphStyle(
            'DocTitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=22,
            textColor=text_dark,
            spaceAfter=15,
            alignment=1 # Center
        )

        subtitle_style = ParagraphStyle(
            'DocSubtitle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=11,
            textColor=primary_color,
            spaceAfter=15,
            alignment=1 # Center
        )

        section_heading = ParagraphStyle(
            'SecHeading',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=13,
            textColor=secondary_color,
            spaceBefore=12,
            spaceAfter=8
        )

        body_style = ParagraphStyle(
            'DocBody',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            textColor=text_dark,
            leading=12
        )

        bold_body_style = ParagraphStyle(
            'DocBoldBody',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=9,
            textColor=text_dark,
            leading=12
        )

        header_style = ParagraphStyle(
            'TableHeader',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=9,
            textColor=colors.white
        )

        disclaimer_style = ParagraphStyle(
            'Disclaimer',
            parent=styles['Italic'],
            fontName='Helvetica-Oblique',
            fontSize=8,
            textColor=colors.HexColor('#7f7f7f'),
            spaceAfter=15,
            alignment=1 # Center
        )

        # 1. Title & Header
        story.append(Paragraph("SELENE HEALTH COMPANION REPORT", title_style))
        story.append(Paragraph("Clinical Health Summary for Doctor Consultation", subtitle_style))

        disclaimer_text = (
            "<b>Clinical Disclaimer:</b> This document is generated by Selene based on self-logged data. "
            "It is intended solely for sharing tracking trends during clinical consultations. "
            "Selene is not a medical device, nor does it provide diagnostic assessments or treatment protocols."
        )
        story.append(Paragraph(disclaimer_text, disclaimer_style))
        story.append(Spacer(1, 10))

        # 2. Patient Profile Table
        story.append(Paragraph("1. Patient Profile Summary", section_heading))
        
        active_conditions = []
        if g.user.has_pcos: active_conditions.append("PCOS")
        if g.user.has_pmdd: active_conditions.append("PMDD")
        if g.user.has_endo: active_conditions.append("Endometriosis")
        conditions_str = ", ".join(active_conditions) if active_conditions else "None declared"

        profile_data = [
            [Paragraph("<b>Anonymized Patient ID:</b>", body_style), Paragraph(g.user.username, body_style),
             Paragraph("<b>Report Date:</b>", body_style), Paragraph(datetime.now().strftime("%Y-%m-%d"), body_style)],
            [Paragraph("<b>Baseline Cycle Length:</b>", body_style), Paragraph(f"{g.user.cycle_length_baseline} days", body_style),
             Paragraph("<b>Baseline Period Length:</b>", body_style), Paragraph(f"{g.user.period_length_baseline} days", body_style)],
            [Paragraph("<b>Chronic Conditions:</b>", body_style), Paragraph(conditions_str, body_style),
             Paragraph("<b>Total Tracked Logs:</b>", body_style), Paragraph(str(len(logs)), body_style)]
        ]

        profile_table = Table(profile_data, colWidths=[125, 145, 125, 145])
        profile_table.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('LINEBELOW', (0,0), (-1,-1), 0.5, colors.HexColor('#e5e5e5')),
        ]))
        story.append(profile_table)
        story.append(Spacer(1, 15))

        # 3. Log Details Section
        story.append(Paragraph("2. Tracked Health Indicators & Logs", section_heading))

        if not logs:
            story.append(Paragraph("No daily health logs found in user history.", body_style))
        else:
            # Columns: Date, Cycle Phase, Key Vitals & Symptoms, Details / Moods
            headers = [
                Paragraph("Date", header_style),
                Paragraph("Cycle Phase", header_style),
                Paragraph("Physiological Symptoms", header_style),
                Paragraph("Moods & Detail Tags", header_style)
            ]
            
            table_rows = [headers]

            for log in logs:
                symptoms = []
                if log.flow_intensity is not None:
                    symptoms.append(f"Flow: {log.flow_intensity}%")
                if log.pelvic_pain is not None:
                    symptoms.append(f"Pelvic Pain: {log.pelvic_pain}%")
                if log.back_pain is not None:
                    symptoms.append(f"Back Pain: {log.back_pain}%")
                if log.energy_level is not None:
                    symptoms.append(f"Energy: {log.energy_level}%")
                if log.sleep_quality is not None:
                    symptoms.append(f"Sleep: {log.sleep_quality}%")
                if log.basal_body_temp is not None:
                    symptoms.append(f"BBT: {log.basal_body_temp}°F")
                
                symptoms_text = ", ".join(symptoms) if symptoms else "None"

                details = []
                moods = [k for k, v in (log.mood_toggles or {}).items() if v]
                tags = [f"{k}: {v}%" if isinstance(v, (int, float)) else f"{k}: {v}" for k, v in (log.symptom_tags or {}).items() if v]
                details.extend(moods)
                details.extend(tags)
                details_text = ", ".join(details) if details else "None"

                table_rows.append([
                    Paragraph(log.log_date.strftime("%Y-%m-%d"), body_style),
                    Paragraph(log.phase.capitalize() if log.phase else "Unknown", body_style),
                    Paragraph(symptoms_text, body_style),
                    Paragraph(details_text, body_style)
                ])

            logs_table = Table(table_rows, colWidths=[70, 75, 195, 200])
            
            t_style = TableStyle([
                ('BACKGROUND', (0,0), (-1,0), secondary_color),
                ('ALIGN', (0,0), (-1,-1), 'LEFT'),
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('TOPPADDING', (0,0), (-1,-1), 5),
                ('BOTTOMPADDING', (0,0), (-1,-1), 5),
                ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e5e5e5')),
                ('BOX', (0,0), (-1,-1), 0.5, secondary_color),
            ])

            for i in range(1, len(table_rows)):
                if i % 2 == 0:
                    t_style.add('BACKGROUND', (0, i), (-1, i), bg_cream)
            
            logs_table.setStyle(t_style)
            story.append(logs_table)

        doc.build(story)
        buffer.seek(0)

        response = make_response(send_file(
            buffer,
            as_attachment=True,
            download_name=f"selene_consultation_report_{g.user.username}.pdf",
            mimetype='application/pdf'
        ))
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response

    except Exception as e:
        if current_app:
            current_app.logger.error(f"Failed to generate consultation PDF: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to generate consultation PDF due to an internal error."}), 500

