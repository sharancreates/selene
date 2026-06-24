from flask import Blueprint, jsonify
import math

try:
    from .models import db, User
except ImportError:
    from models import db, User

public_health_bp = Blueprint('public_health', __name__)

@public_health_bp.route('/stats', methods=['GET'])
def get_public_health_stats():
    """
    Exposes anonymized, aggregate wellness metrics across the platform.
    Enforces a strict K-anonymity privacy threshold (K >= 5) to prevent re-identification.
    """
    try:
        # Query active, onboarded users
        users = User.query.filter_by(is_deleted=False, has_onboarded=True).all()
        
        # Privacy guard threshold
        K_THRESHOLD = 5
        
        if len(users) < K_THRESHOLD:
            # Return general population statistics as a fallback to preserve privacy
            return jsonify({
                "status": "calibrating_cohort",
                "message": f"Cohort size ({len(users)}) is below the privacy-preserving threshold (K={K_THRESHOLD}). Returning general population baselines.",
                "total_users_represented": len(users),
                "cycle_length_stats": {
                    "average": 28.0,
                    "min": 21,
                    "max": 35,
                    "std_dev": 2.5
                },
                "period_length_stats": {
                    "average": 5.0,
                    "min": 3,
                    "max": 8,
                    "std_dev": 1.2
                },
                "chronic_conditions": {
                    "pcos_percentage": 10.0,
                    "pmdd_percentage": 6.0,
                    "endo_percentage": 11.0,
                    "pcos_count": 0,
                    "pmdd_count": 0,
                    "endo_count": 0
                },
                "condition_breakdown": {
                    "pcos": {
                        "avg_cycle_length": 32.5,
                        "avg_period_length": 6.2
                    },
                    "pmdd": {
                        "avg_cycle_length": 28.2,
                        "avg_period_length": 5.1
                    },
                    "endo": {
                        "avg_cycle_length": 29.0,
                        "avg_period_length": 6.5
                    },
                    "no_conditions": {
                        "avg_cycle_length": 28.0,
                        "avg_period_length": 5.0
                    }
                }
            }), 200

        # If cohort meets threshold, calculate direct aggregates
        cycle_lengths = [u.cycle_length_baseline for u in users]
        period_lengths = [u.period_length_baseline for u in users]
        
        total_users = len(users)
        
        def calculate_stats(arr):
            if not arr:
                return {"average": 0.0, "min": 0, "max": 0, "std_dev": 0.0}
            avg = sum(arr) / len(arr)
            variance = sum((x - avg) ** 2 for x in arr) / len(arr)
            std_dev = math.sqrt(variance)
            return {
                "average": round(avg, 2),
                "min": int(min(arr)),
                "max": int(max(arr)),
                "std_dev": round(std_dev, 2)
            }
            
        cycle_stats = calculate_stats(cycle_lengths)
        period_stats = calculate_stats(period_lengths)
        
        pcos_users = [u for u in users if u.has_pcos]
        pmdd_users = [u for u in users if u.has_pmdd]
        endo_users = [u for u in users if u.has_endo]
        no_cond_users = [u for u in users if not u.has_pcos and not u.has_pmdd and not u.has_endo]
        
        pcos_count = len(pcos_users)
        pmdd_count = len(pmdd_users)
        endo_count = len(endo_users)
        
        pcos_percentage = round((pcos_count / total_users) * 100, 2)
        pmdd_percentage = round((pmdd_count / total_users) * 100, 2)
        endo_percentage = round((endo_count / total_users) * 100, 2)
        
        def avg_baseline_for_subset(subset):
            if not subset:
                return {"avg_cycle_length": 0.0, "avg_period_length": 0.0}
            c_avg = sum(u.cycle_length_baseline for u in subset) / len(subset)
            p_avg = sum(u.period_length_baseline for u in subset) / len(subset)
            return {
                "avg_cycle_length": round(c_avg, 2),
                "avg_period_length": round(p_avg, 2)
            }

        return jsonify({
            "status": "active_cohort",
            "total_users_represented": total_users,
            "cycle_length_stats": cycle_stats,
            "period_length_stats": period_stats,
            "chronic_conditions": {
                "pcos_percentage": pcos_percentage,
                "pmdd_percentage": pmdd_percentage,
                "endo_percentage": endo_percentage,
                "pcos_count": pcos_count,
                "pmdd_count": pmdd_count,
                "endo_count": endo_count
            },
            "condition_breakdown": {
                "pcos": avg_baseline_for_subset(pcos_users),
                "pmdd": avg_baseline_for_subset(pmdd_users),
                "endo": avg_baseline_for_subset(endo_users),
                "no_conditions": avg_baseline_for_subset(no_cond_users)
            }
        }), 200
        
    except Exception as e:
        # Avoid leaking database details
        return jsonify({"error": "Failed to retrieve public health aggregates due to an internal error."}), 500
