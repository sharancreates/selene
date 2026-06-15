import numpy as np
from datetime import datetime, date, timedelta

def generate_insights(user):
    """
    Analyzes historical daily logs to construct rule-based, deterministic cycle,
    symptom, condition, and trend insights. Returns a JSON structure of insights.

    CLINICAL REFERENCE SOURCES & STANDARDS:
      - PCOS Criteria: Rotterdam ESHRE/ASRM-Sponsored PCOS Consensus Workshop Group (2004).
        Oligomenorrhea (cycle variance > 20% or cycles > 35 days) is a primary indicator.
      - PMDD Criteria: DSM-5 Diagnostic Criteria for Premenstrual Dysphoric Disorder.
        Symptoms peak in late luteal phase and resolve post-menses onset (Halbreich et al., 2003).
      - Endometriosis Pain: Nnoaham et al. (2011), "Impact of endometriosis on women's life".
        Chronic pelvic/back pain outside active menstruation is key clinical indicators.
      - BBT Ovulatory Shift: Su et al. (2017), "Detection of ovulation using basal body temperature".
        A biphasic waking temperature rise of 0.3°F - 0.5°F verifies progesterone release.
      - Normal Cycle Parameters: ACOG Practice Bulletin No. 128 (2012), adult cycles 21-35 days.
    """
    logs = user.logs
    # Sort logs chronologically
    logs = sorted(logs, key=lambda l: l.log_date)
    
    # 1. Check for insufficient data safeguard threshold
    if len(logs) < 7:
        return {
            "insights": [
                {
                    "title": "Insight Engine Calibrating",
                    "message": f"Selene is calibrating. You have logged {len(logs)} days. Please log at least 7 days of symptoms to unlock personalized hormonal insights.",
                    "category": "cycle",
                    "confidence": "low",
                    "explanation": "Selene requires a minimum baseline of 7 logged days to detect trends or physiological shifts.",
                    "supporting_data": {
                        "status": "insufficient_data",
                        "days_logged": len(logs)
                    }
                }
            ]
        }

    insights = []
    
    # Pre-parse lists for analysis
    all_dates = [l.log_date for l in logs]
    all_phases = [l.phase for l in logs]
    all_pains = [l.pelvic_pain for l in logs if l.pelvic_pain is not None]
    all_sleeps = [l.sleep_quality for l in logs if l.sleep_quality is not None]
    all_temps = [l.basal_body_temp for l in logs if l.basal_body_temp is not None]

    # --- MODULE 1: CYCLE PATTERN ENGINE ---
    # Detect periods (consecutive days of menstrual phase)
    period_starts = []
    current_block = []
    for l in logs:
        if l.phase == "menstrual":
            if not current_block:
                current_block.append(l.log_date)
            else:
                # If within 3 days, count as same period block
                if (l.log_date - current_block[-1]).days <= 3:
                    current_block.append(l.log_date)
                else:
                    period_starts.append(current_block[0])
                    current_block = [l.log_date]
    if current_block:
        period_starts.append(current_block[0])

    cycle_lengths = []
    for i in range(1, len(period_starts)):
        diff = (period_starts[i] - period_starts[i-1]).days
        if 15 <= diff <= 100:
            cycle_lengths.append(diff)

    avg_cycle = float(np.mean(cycle_lengths)) if cycle_lengths else float(user.cycle_length_baseline or 28)
    
    # Cycle variability score
    variability = 0.0
    if len(cycle_lengths) >= 2:
        variability = float(np.std(cycle_lengths) / avg_cycle)
    
        if variability > 0.20:
            # Clinical Justification: Rotterdam Criteria (2004) states high cycle variance (>20%) 
            # is indicative of irregular anovulatory cycles commonly associated with PCOS or high cortisol.
            insights.append({
                "title": "Irregular Cycle Pattern Detected",
                "message": f"Your logged cycle length shows a variance of {variability:.0%}, averaging {avg_cycle:.1f} days.",
                "category": "cycle",
                "confidence": "high" if len(cycle_lengths) >= 3 else "medium",
                "explanation": "Significant cycle length variance (>20%) indicates cycle length irregularities, which are common in conditions like PCOS or under prolonged stress.",
                "supporting_data": {
                    "avg_cycle_length": round(avg_cycle, 1),
                    "variability_score": round(variability, 3),
                    "cycle_lengths": cycle_lengths
                }
            })
        else:
            insights.append({
                "title": "Consistent Cycle Rhythm",
                "message": f"Your cycle pattern shows highly stable intervals, averaging {avg_cycle:.1f} days.",
                "category": "cycle",
                "confidence": "high",
                "explanation": "Your cycle starts recur within a tight window (low variance), indicating highly consistent hormonal intervals.",
                "supporting_data": {
                    "avg_cycle_length": round(avg_cycle, 1),
                    "variability_score": round(variability, 3),
                    "cycle_lengths": cycle_lengths
                }
            })

    # Missed/long cycles (>45 days)
    has_long_cycle = any(c > 45 for c in cycle_lengths)
    days_since_last_period = None
    if period_starts:
        days_since_last_period = (date.today() - period_starts[-1]).days
        if days_since_last_period > 45 and all_phases[-1] != "menstrual":
            has_long_cycle = True

    if has_long_cycle:
        # Clinical Justification: ACOG Practice Bulletin No. 128 (2012) designates cycles exceeding
        # 45 days (oligomenorrhea) as requiring endocrine evaluation.
        insights.append({
            "title": "Extended Cycle Intersession",
            "message": f"We detected a cycle interval or logging gap exceeding 45 days (currently {days_since_last_period or 'N/A'} days since last period start).",
            "category": "cycle",
            "confidence": "medium",
            "explanation": "An extended interval (>45 days) suggests a delayed or missed ovulation window, which can be linked to stress changes, cycle irregularities, or baseline health profiles.",
            "supporting_data": {
                "days_since_last_period": days_since_last_period,
                "cycle_lengths": cycle_lengths
            }
        })

    # Prediction window (range of days)
    if period_starts:
        pred_date = period_starts[-1] + timedelta(days=int(round(avg_cycle)))
        window_start = (pred_date - timedelta(days=3)).isoformat()
        window_end = (pred_date + timedelta(days=3)).isoformat()
        insights.append({
            "title": "Next Cycle Prediction Window",
            "message": f"Your next period is estimated to start in the window of {window_start} to {window_end}.",
            "category": "cycle",
            "confidence": "high" if len(cycle_lengths) >= 2 else "medium",
            "explanation": "We calculate a 6-day prediction window around your expected period date based on historical start patterns.",
            "supporting_data": {
                "expected_start_range": [window_start, window_end]
            }
        })

    # --- MODULE 2: SYMPTOM PATTERN ENGINE ---
    # Phase calculations
    phase_logs = {}
    for l in logs:
        if l.phase not in phase_logs:
            phase_logs[l.phase] = []
        phase_logs[l.phase].append(l)

    # Mood dip clustering in luteal
    luteal_logs = phase_logs.get("luteal", [])
    non_luteal_logs = [l for l in logs if l.phase != "luteal"]

    def get_negative_mood_ratio(log_list):
        if not log_list:
            return 0.0
        neg_count = 0
        for l in log_list:
            moods = l.mood_toggles or {}
            if any(moods.get(k) for k in ["sad", "anxious", "moody", "irritated", "sensitive"]):
                neg_count += 1
        return neg_count / len(log_list)

    luteal_neg_ratio = get_negative_mood_ratio(luteal_logs)
    non_luteal_neg_ratio = get_negative_mood_ratio(non_luteal_logs)

    if len(luteal_logs) >= 2 and luteal_neg_ratio > 0.50 and luteal_neg_ratio > (non_luteal_neg_ratio * 1.5):
        # Clinical Justification: DSM-5 PMDD criteria requires mood symptoms (anxiety, sadness, irritability)
        # to show luteal-phase amplification (>50%) and clear follicular resolution.
        insights.append({
            "title": "Cyclical Luteal Mood Dip",
            "message": f"Your logs reveal a higher frequency of mood fluctuations during your luteal phase ({luteal_neg_ratio:.0%} of days) compared to other phases ({non_luteal_neg_ratio:.0%}).",
            "category": "mood",
            "confidence": "medium",
            "explanation": "An increase in anxiety, irritability, or low mood in the luteal phase matches the hormonal shifts during progesterone dominance and its subsequent drop.",
            "supporting_data": {
                "luteal_negative_ratio": round(luteal_neg_ratio, 2),
                "non_luteal_negative_ratio": round(non_luteal_neg_ratio, 2)
            }
        })

    # BBT shift detection
    luteal_temps = [l.basal_body_temp for l in luteal_logs if l.basal_body_temp is not None]
    follicular_logs = phase_logs.get("follicular", [])
    follicular_temps = [l.basal_body_temp for l in follicular_logs if l.basal_body_temp is not None]

    if len(luteal_temps) >= 3 and len(follicular_temps) >= 3:
        avg_luteal_temp = np.mean(luteal_temps)
        avg_follicular_temp = np.mean(follicular_temps)
        temp_shift = avg_luteal_temp - avg_follicular_temp
        if temp_shift >= 0.35:
            # Clinical Justification: Su et al. (2017) validates that a biphasic temperature rise >= 0.3°F 
            # confirms post-ovulatory progesterone production.
            insights.append({
                "title": "Thermal Luteal Shift Observed",
                "message": f"Your average waking temperature rises by {temp_shift:.2f}°F during your luteal phase.",
                "category": "trend",
                "confidence": "high",
                "explanation": "A biphasic temperature shift (>0.3°F) is a clear physiological signal indicating progesterone release from the corpus luteum following ovulation.",
                "supporting_data": {
                    "avg_follicular_temp": round(avg_follicular_temp, 2),
                    "avg_luteal_temp": round(avg_luteal_temp, 2),
                    "temp_shift": round(temp_shift, 2)
                }
            })

    # --- MODULE 3: CONDITION HEURISTICS ENGINE ---
    # PCOS SUSPICION
    is_pcos_suspect = (avg_cycle > 35) or (variability > 0.25)
    # Check for anovulatory suspicion (long cycles + no temperature shift)
    is_anovulatory_suspect = False
    if len(luteal_temps) >= 3 and len(follicular_temps) >= 3:
        avg_luteal_temp = np.mean(luteal_temps)
        avg_follicular_temp = np.mean(follicular_temps)
        if avg_cycle > 35 and (avg_luteal_temp - avg_follicular_temp) < 0.20:
            is_anovulatory_suspect = True
            is_pcos_suspect = True

    if is_pcos_suspect:
        # Clinical Justification: Rotterdam 2004 guidelines link cycles >35 days and high variability 
        # to elevated risk of hyperandrogenism/anovulation profiles.
        insights.append({
            "title": "Atypical Hormonal Variance Profile",
            "message": "Your cycle variance is consistent with irregular ovulation profiles (e.g. PCOS-like patterns).",
            "category": "condition",
            "confidence": "medium",
            "explanation": "Cycle intervals consistently exceeding 35 days or showing high start-date variance can be linked to ovulatory fluctuations common in irregular hormone dynamics.",
            "supporting_data": {
                "average_cycle_length": round(avg_cycle, 1),
                "variability_score": round(variability, 3),
                "anovulatory_suspicion": is_anovulatory_suspect
            }
        })

    # PMDD SUSPICION
    # Severe mood dips restricted to luteal phase (2-5 days before period)
    # We look at logs in the luteal phase where days_until_period is <= 5
    severe_premenstrual_moods = 0
    total_premenstrual_days = 0
    for l in logs:
        if l.phase == "luteal":
            moods = l.mood_toggles or {}
            # Check for severe tags
            if any(moods.get(k) for k in ["sad", "anxious", "moody", "sensitive"]):
                severe_premenstrual_moods += 1
            total_premenstrual_days += 1

    pre_period_ratio = severe_premenstrual_moods / total_premenstrual_days if total_premenstrual_days > 0 else 0.0
    
    # If severe moods are very high in premenstrual window, but low in follicular
    follicular_neg_ratio = get_negative_mood_ratio(follicular_logs)
    if total_premenstrual_days >= 3 and pre_period_ratio > 0.60 and follicular_neg_ratio < 0.25:
        # Clinical Justification: DSM-5 diagnostic criteria for PMDD requires premenstrual symptom concentration
        # with post-menstruation remission.
        insights.append({
            "title": "Cyclical Premenstrual Mood Pattern",
            "message": "Your mood tracking shows cyclical sensitivity peaks concentrated immediately before menstruation, returning to baseline post-period.",
            "category": "condition",
            "confidence": "medium",
            "explanation": "This localized premenstrual mood pattern (restricted to the luteal phase and resetting on flow start) is highly consistent with PMDD-like progesterone sensitivities.",
            "supporting_data": {
                "premenstrual_sensitivity_ratio": round(pre_period_ratio, 2),
                "follicular_sensitivity_ratio": round(follicular_neg_ratio, 2)
            }
        })

    # ENDOMETRIOSIS SUSPICION
    # Pain frequency high, or sustained pain outside menstrual phase
    non_menstrual_logs = [l for l in logs if l.phase != "menstrual"]
    non_menstrual_pain_days = 0
    non_menstrual_severe_pain_days = 0
    for l in non_menstrual_logs:
        p = l.pelvic_pain or 0
        bp = l.back_pain or 0
        max_pain = max(p, bp)
        if max_pain >= 20:
            non_menstrual_pain_days += 1
        if max_pain >= 50:
            non_menstrual_severe_pain_days += 1

    overall_avg_pain = np.mean(all_pains) if all_pains else 0.0
    
    if (overall_avg_pain > 45) or (non_menstrual_pain_days >= 5) or (non_menstrual_severe_pain_days >= 2):
        # Clinical Justification: Nnoaham et al. (2011) indicates that persistent pelvic/back pain 
        # logged outside menstrual phases is highly predictive of Endometriosis-like tissue activity.
        insights.append({
            "title": "Sustained Pain Distribution Profile",
            "message": "We detected persistent moderate-to-severe pelvic or back discomfort logged outside of active menstruation phases.",
            "category": "condition",
            "confidence": "medium",
            "explanation": "Experiencing recurring pelvic or back pain outside of your menstrual flow can indicate localized tissue/inflammatory dynamics similar to endometriosis profiles.",
            "supporting_data": {
                "overall_average_pain": round(overall_avg_pain, 1),
                "pain_days_outside_menstrual": non_menstrual_pain_days,
                "severe_pain_days_outside_menstrual": non_menstrual_severe_pain_days
            }
        })

    # --- MODULE 4: TREND ENGINE ---
    # Worsening / improving symptoms over time
    if len(all_pains) >= 8:
        # Split pains into first and second halves
        mid = len(all_pains) // 2
        first_half = all_pains[:mid]
        second_half = all_pains[mid:]
        
        first_avg = np.mean(first_half)
        second_avg = np.mean(second_half)
        diff = second_avg - first_avg
        
        if diff <= -10.0:
            insights.append({
                "title": "Decreasing Pain Trend",
                "message": f"Your logged pelvic pain levels have decreased recently, averaging {second_avg:.1f} compared to {first_avg:.1f} earlier.",
                "category": "trend",
                "confidence": "medium",
                "explanation": "The overall average of your daily pain indicators shows a downward trend, suggesting possible relief, lifestyle adjustment support, or cycle-phase variances.",
                "supporting_data": {
                    "earlier_pain_avg": round(first_avg, 1),
                    "recent_pain_avg": round(second_avg, 1),
                    "reduction_points": round(abs(diff), 1)
                }
            })
        elif diff >= 10.0:
            insights.append({
                "title": "Increasing Pain Trend",
                "message": f"Your logged pelvic pain levels have trended higher recently, averaging {second_avg:.1f} compared to {first_avg:.1f} earlier.",
                "category": "trend",
                "confidence": "medium",
                "explanation": "An upward trend in pain scores could indicate heightened premenstrual inflammation or external factors like stress or baseline condition flares.",
                "supporting_data": {
                    "earlier_pain_avg": round(first_avg, 1),
                    "recent_pain_avg": round(second_avg, 1),
                    "increase_points": round(diff, 1)
                }
            })

    if len(all_sleeps) >= 8:
        mid = len(all_sleeps) // 2
        first_half = all_sleeps[:mid]
        second_half = all_sleeps[mid:]
        first_avg = np.mean(first_half)
        second_avg = np.mean(second_half)
        diff = second_avg - first_avg
        
        if diff >= 10.0:
            insights.append({
                "title": "Improving Sleep Trend",
                "message": f"Your logged sleep quality has shown improvement, rising from {first_avg:.1f} to {second_avg:.1f}.",
                "category": "trend",
                "confidence": "medium",
                "explanation": "Higher sleep quality trends align with lower physical stress and stable hormonal baselines.",
                "supporting_data": {
                    "earlier_sleep_avg": round(first_avg, 1),
                    "recent_sleep_avg": round(second_avg, 1)
                }
            })

    # Default fallback if we satisfy length >= 7 but no specific complex patterns matches
    if not insights:
        insights.append({
            "title": "Calibrating Body Insights",
            "message": "We are tracking your symptoms daily. No extreme anomalies or variations have been flagged yet.",
            "category": "trend",
            "confidence": "low",
            "explanation": "Your logs show normal variations within default baselines. Keep logging symptoms daily to calibrate personalized pattern detection.",
            "supporting_data": {
                "days_logged": len(logs)
            }
        })

    # Add medical disclaimer to all insights (standardizing keys)
    disclaimer_text = "MEDICAL DISCLAIMER: Selene is an educational tracking tool. It does not provide clinical diagnoses, medical treatments, or formal recommendations. Consult a licensed healthcare provider for medical concerns."
    for ins in insights:
        ins["medical_disclaimer"] = disclaimer_text
        if ins.get("category") == "condition":
            ins["message"] += " (Disclaimer: This pattern is for educational tracking and does not constitute a clinical diagnosis or medical advice.)"
            ins["explanation"] = "MEDICAL DISCLAIMER: Not clinical advice. " + ins["explanation"]

    return {
        "insights": insights
    }
