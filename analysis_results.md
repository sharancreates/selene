# Selene — Full Project Critique & Analysis

---

## 🌙 Overall Verdict

Selene is an **impressively ambitious** project for a solo or small-team effort. The privacy-first architecture with zero-knowledge encryption is genuinely rare in health-tracking apps and shows real engineering conviction. The clinical grounding (Rotterdam criteria, DSM-5, ACOG) elevates it beyond a toy project. However, the **ML pipeline is the weakest link** — it's actively hurting credibility with an R² of 0.66 and a fundamentally flawed data engineering approach. Here's the full breakdown.

---

## 🔴 THE BIG PROBLEM: ML Accuracy (R² = 0.66, RMSE = 2.58 days)

Your model's current metrics from [model_metrics.json](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/model_metrics.json):

| Metric | Value | What It Means |
|:-------|:------|:-------------|
| R² | 0.664 | Model explains only 66% of variance — **bad for a cycle predictor** |
| RMSE | 2.58 days | Predictions are off by ~2.6 days on average |
| MSE | 6.64 | Squared error baseline |

For a menstrual cycle predictor, an RMSE of 2.6 days is the difference between "period starts Friday" and "oh, it started Tuesday." Users will lose trust after 2-3 wrong predictions.

### Root Causes (in order of severity):

### 1. 🚨 Synthetic Data Poisoning — This is the #1 problem

In [train_model.py](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/train_model.py#L43-L80), you're taking a real dataset (Marquette University NFP data) and then **injecting random synthetic conditions**:

```python
# Lines 44-48: Random assignment of conditions
pcos_clients = set(np.random.choice(unique_clients, size=int(len(unique_clients) * 0.15), replace=False))
pmdd_clients = set(np.random.choice(remaining, size=int(len(unique_clients) * 0.10), replace=False))
endo_clients = set(np.random.choice(remaining, size=int(len(unique_clients) * 0.12), replace=False))
```

Then you **artificially shift** their cycle lengths:
```python
# Line 57: Random PCOS shift
df_cleaned.loc[pcos_mask, 'LengthofCycle'] += np.random.uniform(4.0, 9.0, size=pcos_mask.sum())
```

And fabricate lifestyle columns from thin air:
```python
# Lines 72-73: Pure noise
df['avg_sleep'] = np.random.uniform(low=65, high=90, size=num_samples)
df['avg_pain'] = np.random.uniform(low=5, high=25, size=num_samples)
```

**Why this is devastating**: `avg_sleep` and `avg_pain` are **random noise** that has zero causal relationship to cycle length. The model learns to ignore them (which is correct), but they dilute the signal-to-noise ratio and waste feature capacity. The PCOS shift is an artificial linear bias — the model essentially learns `if has_pcos: add ~6.5 days`, which is a rule you could have written as one line of Python. There's no actual learning happening for conditions.

### 2. 🚨 Bootstrap Resampling as "Augmentation" — Doesn't Add Information

[Lines 98-126](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/train_model.py#L98-L126): You bootstrap resample to 12,000 samples and add Gaussian noise:
```python
indices = np.random.choice(features_df.index, size=12000, replace=True)
augmented_df['target_length'] += np.random.normal(0, 0.2, size=12000)
```

This **does not create new information**. You're duplicating rows with tiny noise, which means:
- Cross-validation scores are **inflated** (test set contains near-duplicates of training set)
- The R² of 0.66 is actually an **overestimate** — real-world performance is worse
- The model memorizes noise patterns from duplicated rows

### 3. README vs. Reality Mismatch

The [README](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/../README.md#L155-L159) says "Gradient Boosting Regressor", but [train_model.py line 145](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/train_model.py#L145) uses `RandomForestRegressor`. The README line 142 claims `R² = 0.66` and `train_model.py` line 142 labels it "Random Forest" — these are contradictory. **Keep your docs honest.**

---

## ✅ WHICH MODEL SHOULD YOU USE?

### Recommendation: **XGBoost Regressor** or **LightGBM Regressor**

| Model | Why |
|:------|:----|
| ❌ `RandomForestRegressor` (current) | Overfits on duplicated bootstrap data; poor at extrapolation; large serialized size (1.3MB) for 7 features |
| ⚠️ `GradientBoostingRegressor` (README claims) | Better than RF but slower to train; no native handling of missing values |
| ✅ **`XGBRegressor`** | Handles sparse features natively; regularization (L1/L2) prevents overfitting on noisy synthetic data; monotonic constraints can enforce clinical priors (e.g. PCOS → longer cycles) |
| ✅ **`LGBMRegressor`** | Fastest to train; native categorical feature support; handles imbalanced condition flags well; smallest model binary |
| 🔮 **Bayesian Ridge Regression** | Worth trying as a baseline — if it beats your RF, it proves your current model is overfitting to noise |

### But the model is NOT your real problem. Fix the data first.

**Concrete action plan for accuracy:**

1. **Drop `avg_sleep` and `avg_pain` from training** — they're random noise, not real features
2. **Stop bootstrap resampling** — use the actual Marquette data (~3000-5000 real cycles). A smaller real dataset always beats a larger synthetic one.
3. **Add temporal features**: cycle number per user (are later cycles more regular?), prior cycle length (autoregressive lag-1), season
4. **Use proper cross-validation**: `GroupKFold` split by `ClientID` so that no user appears in both train and test sets. Your current `train_test_split` leaks duplicate users across splits.
5. **After fixing data**: try XGBoost with `max_depth=4`, `n_estimators=200`, `learning_rate=0.05`, `reg_alpha=0.1`

If you fix #1 and #4 alone, expect R² to **drop initially** (because you were overestimating) but real-world predictions to improve dramatically.

---

## 🏆 THINGS I GENUINELY LOVE

### 1. Zero-Knowledge Encryption Architecture — Exceptional

The [envelope encryption scheme](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/models.py#L37-L101) is beautifully designed:
- **PBKDF2** with 100K iterations for KEK derivation
- **AES-256-GCM** (authenticated encryption!) for actual data
- **Custom SQLAlchemy TypeDecorators** (`EncryptedString`, `EncryptedInt`, etc.) that make encryption transparent at the ORM layer
- **Double-wrapped DEK** (PIN + recovery key) enabling PIN resets without data loss
- **Argon2id** for PIN hashing — state of the art

The client-side [crypto.js](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/frontend/src/utils/crypto.js) correctly uses the Web Crypto API with matching PBKDF2 parameters. This is production-grade cryptographic engineering.

### 2. Clinical Grounding — Rare & Valuable

The [insights_engine.py](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/insights_engine.py) cites actual clinical standards:
- Rotterdam 2004 for PCOS detection
- DSM-5 for PMDD screening
- ACOG Practice Bulletin No. 128 for cycle boundaries
- Su et al. 2017 for BBT ovulation detection

The code comments include **inline clinical justifications** for every threshold. This is the kind of rigor that impresses medical reviewers and ethics boards.

### 3. Feature Engineering Pipeline — Well-Structured

[pipeline.py](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/pipeline.py) does genuinely smart things:
- Savitzky-Golay smoothing on BBT (clinically appropriate for noisy temp readings)
- Cascaded imputation (forward-fill → backward-fill → default) for BBT
- Rolling moving averages for slider metrics
- Dynamic JSON flattening with namespace prefixes (`mood_`, `symptom_`, `action_`)

### 4. Security Depth — Multi-Layered

The [auth.py](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/auth.py) module is remarkably thorough:
- JWT with JTI blacklisting via Redis (with DB fallback!)
- Refresh token rotation with hash-based validation
- CSRF double-submit cookie pattern
- Rate limiting on auth endpoints (5/min)
- Soft-delete with 30-day recovery window
- Legacy user migration path (old hash → Argon2)

### 5. FHIR Export — Real Clinical Interop

The [FHIR export](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/logs.py#L270-L473) uses actual LOINC and SNOMED CT codes. This isn't decoration — it's real EHR interoperability that doctors could import.

### 6. K-Anonymity in Public Health

[public_health.py](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/public_health.py#L22-L24) enforces K≥5 before exposing aggregate stats. Most student projects skip this entirely.

### 7. The Empathetic Insights Copy

The [get_empathetic_insight()](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/predict.py#L368-L412) function is beautifully written — condition-specific, phase-aware, genuinely supportive language. This is the kind of UX detail that makes users feel seen.

---

## 🟡 AREAS WHERE IT'S LAGGING

### 1. Frontend Architecture — The Dashboard is a God Component

[Dashboard.jsx](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/frontend/src/components/Dashboard.jsx) is **1,379 lines** and 69KB. This is a massive maintainability problem:
- Contains inline styles, data fetching, state management, form handling, and render logic all in one file
- No routing library (manual `window.location.pathname` parsing in [App.jsx](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/frontend/src/App.jsx#L27-L36))
- No state management library — everything is prop-drilled through `useState`
- No API layer abstraction — `fetch()` calls are scattered across components with duplicated CSRF/cookie logic

**Recommendation**: Extract into `DailyLogger`, `PredictionCard`, `PhaseSelector`, `InsightsPanel` sub-components. Add React Router and a simple API service layer.

### 2. No Frontend Tests

Zero test coverage on the frontend. The backend has 29 integration tests, but the entire React app ships untested. For a privacy-focused app, this is a risk — what if an encryption bug in `crypto.js` silently corrupts data?

### 3. TypeScript is Installed but Not Used

[package.json](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/frontend/package.json) includes `typescript: "~6.0.2"` and there's a `tsconfig.json`, but every component is `.jsx`. You're paying the dependency cost without the type safety benefit. Either adopt TypeScript or remove it.

### 4. Tailwind is Installed but Not Used (Consistently)

`@tailwindcss/vite` and `tailwindcss` are in devDependencies, but components use inline styles extensively. The [Dashboard.jsx](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/frontend/src/components/Dashboard.jsx) alone has hundreds of inline `style={{...}}` objects. Pick one approach.

### 5. Hardcoded Legacy DEK in Auth

[auth.py line 418](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/auth.py#L418) contains a **hardcoded encryption key**:
```python
g.user_encryption_key = "p_Mh8N-YsKDORo4aEg5zYf51CJ8KD0qkmMDEOdrCVo4="
```
This is a legacy migration key committed to source control. In a zero-knowledge system, this is a critical vulnerability — anyone with the repo can decrypt legacy user data.

### 6. `.env` File Committed to Git

The [.env](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/.env) file containing `SECRET_KEY` and database credentials is in the repo. The `.gitignore` should exclude it (it likely does have `.env` in it, but the file exists in the working tree). Verify this is not tracked.

### 7. Isolation Forest Fitted Per Request

In [predict.py lines 341-342](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/predict.py#L341-L342), the Isolation Forest is **trained from scratch on every GET request**:
```python
clf = IsolationForest(contamination=0.1, random_state=42)
preds = clf.fit_predict(features)
```
This is computationally expensive and doesn't scale. For 100 daily active users, each with 60+ log entries, this becomes a bottleneck. Pre-compute or cache.

### 8. Model Loaded on Every Prediction Request

[predict.py line 85](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/predict.py#L85):
```python
model = joblib.load(MODEL_PATH)
```
This deserializes 1.3MB from disk on **every single prediction request**. Load it once at module or app startup and cache it.

### 9. No Database Indexing on DailyLog Queries

The `extract_log_dataframe()` in [pipeline.py](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/pipeline.py#L28) queries all logs ordered by date. While `user_id` and `log_date` are indexed individually, the query pattern `filter_by(user_id=X).order_by(log_date)` would benefit from a composite index `(user_id, log_date)` — which the `UniqueConstraint` in [models.py line 282](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/models.py#L282) does provide. ✅ This one is actually handled.

### 10. The `to_dict()` Method Overwrites Fields Based on Phase

[models.py lines 394-416](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/models.py#L394-L416): The `DailyLog.to_dict()` method silently **replaces** `flow_intensity`, `pelvic_pain`, `back_pain`, and `energy_level` with values from `symptom_tags` depending on the phase. This means:
- The API returns different semantic meanings for the same field names across phases
- The ML pipeline in `pipeline.py` reads the raw properties, but `to_dict()` remaps them — creating a **data mismatch** between what the model trains on and what the user sees
- This is a subtle but serious bug for ML accuracy

### 11. No Model Versioning or A/B Testing

The model ships as a single `selene_model.joblib` with no version tracking, no metrics endpoint, and no way to compare models. When you retrain, you overwrite blindly.

---

## 📊 Priority Fix Order

| Priority | Fix | Impact | Effort |
|:---------|:----|:-------|:-------|
| 🔴 P0 | Remove synthetic noise features from training data | Massive accuracy improvement | 2 hours |
| 🔴 P0 | Use GroupKFold by ClientID instead of random split | Honest metrics (stops self-deception) | 1 hour |
| 🔴 P0 | Remove hardcoded legacy DEK from auth.py | Security vulnerability | 5 minutes |
| 🟡 P1 | Stop bootstrap resampling, use real data | Better generalization | 1 hour |
| 🟡 P1 | Switch to XGBoost/LightGBM | Better accuracy on small datasets | 3 hours |
| 🟡 P1 | Cache the joblib model at startup | Performance (eliminates per-request disk I/O) | 15 minutes |
| 🟡 P1 | Cache Isolation Forest results | Performance | 1 hour |
| 🟡 P2 | Fix README model name mismatch | Credibility | 5 minutes |
| 🟡 P2 | Break up Dashboard.jsx | Maintainability | 1 day |
| 🟢 P3 | Add frontend test coverage | Quality | 2-3 days |
| 🟢 P3 | Adopt TypeScript or remove it | Consistency | Varies |

---

## 💡 The One-Paragraph Summary

**Selene's encryption architecture, clinical rigor, and privacy engineering are genuinely excellent — better than most production health apps.** The project falls down on ML accuracy because the training pipeline injects noise and uses flawed validation (bootstrap + random split). Fix the data engineering before changing the model. The frontend is functional but architecturally stressed (1,400-line god component, no tests, inconsistent styling strategy). There's also a hardcoded legacy encryption key in `auth.py` that needs immediate removal. With 3-4 days of focused work on the ML pipeline and the security fix, this project would go from "impressive student work" to "genuinely deployable."
