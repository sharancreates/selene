# Selene — ML Integration Roadmap

> Grounded in the **actual codebase** as of Phase 2 completion.  
> Every suggestion maps directly to existing files, data columns, and hook points already in the project.

---

## What Already Exists (The Baseline)

| File | Current Role | ML Hook Present? |
|---|---|---|
| `pipeline.py` | Extracts logs → pandas DataFrame, imputes missing values, one-hot encodes phases | ✅ Yes — ready for model input |
| `predict.py` | Tries to load `selene_model.joblib`; falls back to rule-based heuristics if absent | ✅ Yes — `MODEL_PATH` stub is live |
| `insights_engine.py` | ~365 lines of deterministic `if/else` rule chains for cycle, mood, BBT, condition flags | ❌ No ML — pure heuristics |
| `models.py` | `DailyLog` stores: `phase`, `energy_level`, `pelvic_pain`, `flow_intensity`, `back_pain`, `sleep_quality`, `basal_body_temp`, `mood_toggles` (JSON), `symptom_tags` (JSON), `lifestyle_actions` (JSON) | ✅ Rich structured data |

The infrastructure (DataFrame pipeline, joblib model slot, scikit-learn in `requirements.txt`) is **already scaffolded**. The project is ready to receive real models.

---

## Opportunity 1 — Cycle Length Predictor (Replace the Heuristic Average)

### What it replaces
`predict.py` lines 112–115: the simple `np.mean(cycle_lengths)` fallback.

### The problem with the current approach
The mean of historical cycle lengths doesn't account for **systematic factors** — sleep trends, pain patterns, stress (low energy), or conditions like PCOS that cause non-random variation. A regression model can account for these.

### Feature vector (already built by `pipeline.py`)
```python
[
  cycle_length_baseline,    # User.cycle_length_baseline
  period_length_baseline,   # User.period_length_baseline
  has_pcos,                 # int(User.has_pcos)
  has_pmdd,                 # int(User.has_pmdd)
  has_endo,                 # int(User.has_endo)
  avg_sleep_quality,        # df['sleep_quality'].mean()
  avg_pelvic_pain,          # df['pelvic_pain'].mean()
  # NEW additions possible:
  avg_energy_level,
  avg_bbt_luteal_shift,     # avg luteal BBT − avg follicular BBT
  cycle_std_dev,            # historical cycle length std dev
]
```

### Recommended model
**`GradientBoostingRegressor`** or **`RandomForestRegressor`** (scikit-learn, already installed).  
- Target: `next_cycle_length` (days)  
- Train offline on public datasets (e.g. [Apple Women's Health Study](https://www.apple.com/wh-study/), [Clue Menstrual Health dataset](https://www.clue.com/en/period-science))  
- Save as `selene_model.joblib` — the existing `MODEL_PATH` stub in `predict.py` will pick it up automatically

### Integration point
`predict.py` line 65–88: already has the `if os.path.exists(MODEL_PATH)` block. **Zero new plumbing needed.**

### Privacy note
Train the model **offline on public data**. The model binary ships with the app. No user data ever leaves the device/server.

### Difficulty: 🟢 Easy (infrastructure already done)

---

## Opportunity 2 — Phase Classifier (Replace Hard-Coded Phase Boundaries)

### What it replaces
`predict.py` lines 151–158:
```python
if days_in_cycle < estimated_period_length:
    current_phase_est = 'menstrual'
elif days_in_cycle < ovulation_day - 1:
    current_phase_est = 'follicular'
...
```
This is a threshold rule — it ignores actual symptom signals entirely.

### The real problem
Phase boundaries vary wildly per person. A user with PCOS may have a 20-day follicular phase. The rule `ovulation_day = cycle_length - 14` is a population average, not a personal truth. BBT is the gold-standard signal for ovulation that the system already collects but doesn't use for phase estimation.

### Feature vector per day
```python
[
  basal_body_temp,           # DailyLog.basal_body_temp
  energy_level,              # DailyLog.energy_level
  pelvic_pain,               # DailyLog.pelvic_pain
  flow_intensity,            # DailyLog.flow_intensity
  sleep_quality,             # DailyLog.sleep_quality
  back_pain,                 # DailyLog.back_pain
  day_of_cycle,              # derived: (log_date − last_period_start).days
  bbt_rolling_avg_3d,        # rolling 3-day avg of BBT
  bbt_delta_1d,              # BBT − previous day's BBT (ovulation signal)
  mood_anxious,              # from mood_toggles JSON
  mood_energized,
  symptom_bloating,          # from symptom_tags JSON
  # etc.
]
```

### Recommended model
**`RandomForestClassifier`** (4-class: menstrual / follicular / ovulatory / luteal).  
Use the user's own logged `phase` field as the label — this is **self-supervised**: the user labels their own data via the dashboard.

- After N days of tracking, periodically re-train a personalized model on the user's own history
- This is called **online learning** or **personalized fine-tuning**

### Integration point
New function in `predict.py`: `classify_phase_ml(user_id, log_date)` that replaces the hard-coded phase block.

### Difficulty: 🟡 Medium

---

## Opportunity 3 — BBT Ovulation Detector (Signal Processing → ML)

### What it replaces
`insights_engine.py` lines 183–195: the naive `temp_shift >= 0.35°F` rule.

### Why ML wins here
The biphasic shift detection currently uses a single threshold. In practice, BBT curves have noise (illness, poor sleep, alcohol). A small ML classifier or signal-processing approach can:
- Detect the actual ovulation event with higher confidence
- Account for noise from `sleep_quality` and `lifestyle_actions`
- Predict the **ovulation window** (3-5 days) instead of a single point

### Approach
**Option A (Simple — 1 week)**: Apply a Savitzky-Golay smoothing filter to the BBT series, then detect the step-change using a first-derivative threshold. This is signal processing, not ML, but far better than the current approach.

**Option B (ML — 2-4 weeks)**: Train a **1D CNN** or **LSTM** on BBT time-series sequences of length 14 days to classify whether ovulation occurred in that window.  
- Requires `torch` or `tensorflow` (not currently in requirements)
- Alternatively: **HMM (Hidden Markov Model)** using `hmmlearn` — lightweight, interpretable, and perfect for biphasic temperature sequences

### Feature sequence (per 14-day window)
```python
[bbt_day_1, ..., bbt_day_14,
 sleep_quality_day_1, ..., sleep_quality_day_14]  # noise correction
```

### Integration point
New helper in `insights_engine.py`: `detect_ovulation_bbt(df)` replacing the current `temp_shift >= 0.35` block.

### Difficulty: 🟡 Medium (Option A) / 🔴 Advanced (Option B)

---

## Opportunity 4 — Mood Pattern Anomaly Detector

### What it replaces
`insights_engine.py` lines 148–172: the `luteal_neg_ratio > 0.50` hard-coded PMDD heuristic.

### The ML opportunity
Instead of fixed ratios, use **unsupervised anomaly detection** to flag mood patterns that are statistically unusual *for that user's own baseline*. This is more honest than comparing against population averages.

### Approach
**Isolation Forest** or **Local Outlier Factor** (both in scikit-learn) applied to each user's mood vector time series.

Feature vector per log:
```python
[
  is_sad, is_anxious, is_moody, is_irritated, is_sensitive,  # mood_toggles
  is_energized, is_happy, is_calm,                            # positive toggles
  phase_menstrual, phase_luteal, phase_follicular,            # one-hot (already in pipeline.py)
  pelvic_pain, sleep_quality, energy_level                    # continuous
]
```

The model learns **what is normal for this user** and flags deviations. This is privacy-preserving because it's trained on the user's own data, never shared.

### Integration point
New function: `detect_mood_anomalies(df)` in `insights_engine.py`, replacing `get_negative_mood_ratio()` comparisons.

### Difficulty: 🟡 Medium

---

## Opportunity 5 — Symptom Clustering (Discover Patterns the Rules Miss)

### What it adds (no current equivalent)
The current `insights_engine.py` checks specific hand-coded symptoms. **K-Means or DBSCAN clustering** on the full symptom + mood feature vector can discover co-occurring symptom groups that neither the user nor the developer anticipated — for example, "sleep drops + back pain + bloating always co-occur on day 22-25."

### Approach
Run **K-Means** (k=4–6) on the full flattened feature matrix from `pipeline.py`. Each cluster represents a symptom archetype. Map clusters to the most common phase to find phase-symptom associations.

```python
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

df = extract_log_dataframe(user.id)
feature_cols = [c for c in df.columns if c.startswith(('mood_', 'symptom_', 'action_')) 
                or c in ['energy_level', 'pelvic_pain', 'sleep_quality', 'back_pain']]
X = StandardScaler().fit_transform(df[feature_cols].fillna(0))
kmeans = KMeans(n_clusters=4, random_state=42).fit(X)
df['symptom_cluster'] = kmeans.labels_
```

### Integration point
New endpoint `GET /api/predict/clusters` or incorporated into the insights response as a new "pattern" category.

### Difficulty: 🟢 Easy (3–5 hours of work)

---

## Opportunity 6 — Condition Risk Screener (Replace Rule-Based Flags)

### What it replaces
`insights_engine.py` Modules 3 (lines 197–281): the PCOS / PMDD / Endometriosis heuristic blocks.

### The current problem
The current flags are **brittle thresholds** (`avg_cycle > 35`, `variability > 0.25`, `non_menstrual_pain_days >= 5`). They were authored manually and treat all conditions independently.

### ML approach: Multi-label classifier
Train a **multi-label classifier** (one label per condition) that outputs probability scores, not binary flags.

```python
# Target labels (from user's self-reported conditions)
y = [has_pcos, has_pmdd, has_endo]  # 3 binary labels

# Features: aggregate per-user statistics
X = [
  avg_cycle_length, std_cycle_length,
  avg_pelvic_pain, avg_back_pain, avg_energy,
  avg_luteal_neg_mood_ratio, bbt_shift,
  non_menstrual_pain_days_ratio,
  period_length_avg, flow_avg
]
```

**Recommended model**: `MultiOutputClassifier(LogisticRegression())` or `MultiOutputClassifier(RandomForestClassifier())` — both in scikit-learn.

> ⚠️ **Important ethical constraint**: Never present this as a diagnosis. Output must be labelled as *"pattern suggests similarity to"* and always include the medical disclaimer already implemented in `insights_engine.py` line 358–360.

### Dataset
This requires labelled training data. Good sources:
- PhysioNet menstrual health datasets
- UCI ML repository (women's health)
- Research partnerships with gynecologists

### Difficulty: 🔴 Advanced (requires labelled clinical data)

---

## Opportunity 7 — Personalized Next-Day Symptom Forecaster

### What it adds (no current equivalent)
Predict **what the user is likely to feel tomorrow** based on their historical patterns and today's log — a proactive warning system.

### Approach
A **time-series regression** model:
- **Input**: last 7 days of log features (sliding window)
- **Output**: tomorrow's predicted `energy_level`, `pelvic_pain`, `sleep_quality` values and mood flags

**Model options** (lightest to heaviest):
1. **ARIMA / SARIMA** per feature — classic, no deep learning, interpretable
2. **LightGBM with lag features** — fast, accurate, runs on CPU, no GPU needed
3. **Transformer / LSTM** — best accuracy, requires PyTorch

### Practical starting point (LightGBM, no GPU):
```python
pip install lightgbm
# Features: lag-1, lag-2, lag-3 of all symptom columns + phase one-hot
# Target: energy_level tomorrow
```

### Integration point
New endpoint: `GET /api/predict/tomorrow`  
Frontend: A "Tomorrow's Forecast" card on the Dashboard.

### Difficulty: 🔴 Advanced

---

## Priority Matrix

| # | Feature | Difficulty | Value | Time Estimate | Deps Needed |
|---|---|---|---|---|---|
| 1 | Cycle Length Regressor | 🟢 Easy | High | 1–2 days | None (stub exists) |
| 5 | Symptom Clustering | 🟢 Easy | Medium | 3–5 hrs | None |
| 2 | Phase Classifier | 🟡 Medium | High | 3–5 days | None |
| 4 | Mood Anomaly Detector | 🟡 Medium | High | 2–3 days | None |
| 3A | BBT Signal Filter | 🟡 Medium | High | 1–2 days | `scipy` |
| 3B | BBT LSTM/HMM | 🔴 Advanced | Very High | 1–2 weeks | `hmmlearn` or `torch` |
| 6 | Condition Risk Screener | 🔴 Advanced | Very High | Weeks + dataset | Clinical data |
| 7 | Next-Day Forecaster | 🔴 Advanced | High | 1–2 weeks | `lightgbm` |

---

## Recommended Starting Path

```
Week 1:  Opportunity 1 — Train a GradientBoostingRegressor on public data,
         drop it as selene_model.joblib. Zero frontend changes needed.

Week 2:  Opportunity 5 — Add K-Means clustering to insights_engine.py.
         Expose a "symptom archetype" card in the Dashboard insights tab.

Week 3:  Opportunity 4 — Add Isolation Forest mood anomaly detection.
         Replaces the fragile ratio comparisons in insights_engine.py.

Month 2: Opportunity 2 — Build a per-user phase classifier trained on 
         the user's own logged data after N days. Start with 30+ log days 
         as the minimum threshold (currently threshold is 10).

Month 3: Opportunity 3A — BBT signal processing with scipy.
         Opportunity 7 — LightGBM next-day symptom forecaster.
```

---

## Privacy Architecture for On-Device ML

Since Selene is a **privacy-first** platform, all ML models must follow this architecture:

```
┌─────────────────────────────────────────────┐
│  PUBLIC DATASET (offline)                   │
│  → Train base model                        │
│  → Serialize to selene_model.joblib         │
│  → Ship with application                   │
└─────────────────────┬───────────────────────┘
                      │ Base model (generalises)
                      ▼
┌─────────────────────────────────────────────┐
│  USER'S OWN DATA (on-server, encrypted)     │
│  → Fine-tune / calibrate base model         │
│  → Produce user-specific weights            │
│  → Store encrypted alongside user record    │
│  → Never transmitted to third parties       │
└─────────────────────────────────────────────┘
```

**No federated learning, no cloud model APIs, no telemetry.** Every prediction is computed locally on the server for that user's data only.

---

## New Dependencies Required (by tier)

### Tier 1 (Opportunities 1, 4, 5) — Already installed
```
scikit-learn ✅  (in requirements.txt)
numpy ✅
pandas ✅
joblib ✅
```

### Tier 2 (Opportunities 2, 3A)
```
scipy          # BBT signal smoothing (Savitzky-Golay filter)
```

### Tier 3 (Opportunities 3B, 7)
```
lightgbm       # Fast gradient boosting for time-series forecasting
hmmlearn       # Hidden Markov Model for BBT ovulation detection
```

### Tier 4 (Deep learning, optional)
```
torch          # LSTM / Transformer for sequence modelling
```

---

## Files to Create / Modify

| File | Action | Reason |
|---|---|---|
| `backend/ml/` | New directory | Isolate ML training scripts from inference code |
| `backend/ml/train_cycle_regressor.py` | New | Offline training script for Opp. 1 |
| `backend/ml/train_phase_classifier.py` | New | Offline training script for Opp. 2 |
| `backend/predict.py` | Modify | Replace heuristic phase estimation with classifier |
| `backend/insights_engine.py` | Modify | Replace hardcoded ratios with anomaly detection |
| `backend/selene_model.joblib` | New artifact | Compiled model binary (not in git — in `.gitignore`) |
| `frontend/src/components/Dashboard.jsx` | Modify | Add symptom cluster card + tomorrow forecast card |
