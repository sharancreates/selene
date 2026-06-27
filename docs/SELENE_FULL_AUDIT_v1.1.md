# SELENE — FULL SYSTEM PRODUCTION AUDIT (v1.1)

**Audit Date:** June 12, 2026 | **Auditor:** Principal SWE, Security Auditor, Product Architect  
**Codebase Snapshot:** Commit `def2b1f` (main)

---

## SYSTEM VERDICT

| Dimension | Rating |
|---|---|
| **System Grade** | **C+** (up from D+ in v1.0 audit) |
| **Launch Readiness** | 🟡 **Limited Beta Only** (max ~50 users) |
| **What breaks first** | Encryption key loss = permanent data destruction |

> [!IMPORTANT]
> Since v1.0 audit, critical issues (no encryption, frontend-backend disconnect) have been **fixed**. Fernet encryption is implemented across all health fields. Dashboard/Login/Register/Settings all call real API endpoints. However, **new critical issues** were discovered.

---

## 1. CRITICAL ISSUES (5)

### CRIT-1: Encryption Key as Plaintext File, No Backup
- [models.py:31-43](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/models.py#L31-L43) — `.encryption_key` is plaintext on disk. If deleted/corrupted, **ALL user health data is permanently unrecoverable**. No key escrow, no HSM, no backup.

### CRIT-2: SECRET_KEY in .env File on Disk
- [.env:5](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/.env#L5) — Real SECRET_KEY exists in the `.env` file. Anyone with disk/repo access can forge JWT tokens for any user.

### CRIT-3: No Token Blacklist/Revocation
- [auth.py:235-254](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/auth.py#L235-L254) — Logout clears refresh token but **access token remains valid 15 minutes**. Stolen tokens cannot be invalidated.

### CRIT-4: db.create_all() on Every Startup
- [app.py:76-77](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/app.py#L76-L77) — Despite Flask-Migrate, `db.create_all()` runs unconditionally, masking migration issues and causing schema drift.

### CRIT-5: Fabricated "Success" on Prediction Errors
- [predict.py:174-188](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/predict.py#L174-L188) — Catch-all returns `status: "success"` with hardcoded 28-day fallback. Users see confident predictions based on zero data. **Clinical safety violation.**

---

## 2. HIGH RISK ISSUES (8)

| ID | Issue | Location |
|---|---|---|
| HIGH-1 | No CSRF protection on POST/PUT/DELETE | auth.py, logs.py |
| HIGH-2 | JWT in localStorage (XSS-extractable) | App.jsx:28 |
| HIGH-3 | No input length limits on username | auth.py:108 |
| HIGH-4 | Silent plaintext fallback on decrypt failure | models.py:67-78 |
| HIGH-5 | Rate limiter in-memory (resets on restart) | auth.py:22 |
| HIGH-6 | `setValues` undefined in Dashboard scope | Dashboard.jsx:853-900 |
| HIGH-7 | No automatic token refresh in frontend | App.jsx:72-101 |
| HIGH-8 | Health check leaks database type | app.py:60 |

---

## 3. MEDIUM RISK ISSUES (10)

| ID | Issue |
|---|---|
| MED-1 | CalendarView uses hardcoded phase-day mapping, not user data |
| MED-2 | No pagination on GET /api/logs |
| MED-3 | Export Data button non-functional |
| MED-4 | PIN reset is placeholder alert() |
| MED-5 | 3 API calls on every date change in Dashboard |
| MED-6 | No retry/offline queue for failed syncs |
| MED-7 | Semantic column mismatch (flow_intensity stores "focus"/"libido") |
| MED-8 | Register camouflage mode never saved to localStorage |
| MED-9 | BBT input accepts arbitrary text |
| MED-10 | No audit logging for data access |

---

## 4. LOW RISK ISSUES (10)

No OpenAPI spec · yTicks/xTicks undefined in BBT chart · Illustration placeholders · Duplicated AppFooter · No CSP headers · Unused tsconfig.json · No DB connection pooling · print() instead of app.logger · Werkzeug hash for token comparison · No backup tooling

---

## 5. DIMENSION SCORES

| Dimension | Score | Summary |
|---|---|---|
| **Architecture** | 6/10 | Clean blueprints, Fernet encryption. Manual pushState routing, no state management, 1400-line Dashboard monolith, SQLite not production-ready. |
| **Security** | 6/10 | JWT+refresh, rate limiting, encryption at rest. Missing CSRF, token revocation, CSP, input validation, key management. |
| **Data Integrity** | 6.5/10 | Atomic upserts, unique constraints, encrypted fields. Missing event sourcing, backup, offline sync. |
| **ML/Prediction** | 7/10 | Rule-based heuristics appropriate. No ML model exists. Error fallback masks failures as success. |
| **Clinical Logic** | 7.5/10 | Condition-specific insights with disclaimers. Missing escalation triggers and uncertainty communication. |
| **UX** | 6/10 | Beautiful design, accessibility features. alert() confirmations, no loading states, monolithic component. |

---

## TOP 5 CATASTROPHIC FAILURES

1. **Encryption key deleted** → ALL health data permanently destroyed, zero recovery
2. **Key rotation fails mid-process** → Mixed plaintext/ciphertext DB, silent fallback returns garbled data
3. **Prediction exception** → Fabricated 28-day prediction shown as fact, may delay medical attention
4. **XSS via JSON fields** → JWT extracted from localStorage, full account takeover
5. **SQLite under concurrent load** → Write locks, timeouts, data corruption

---

## TOP 5 IMPROVEMENTS NEEDED

1. Move encryption key to env var only, remove file-based fallback, add backup docs
2. Fix prediction error fallback to return `status: "error"` not fake success
3. Add token blacklist (DB-backed revoked JTI set)
4. Fix semantic column mismatch (flow_intensity storing unrelated data per phase)
5. Add loading/error states, replace alert() with toasts

---

## TRANSFORMATION ROADMAP

### Phase 1: Hardening (Before ANY users, ~8hr)

1. Remove `db.create_all()`, enforce `flask db upgrade` only
2. Move encryption key to env var, remove file fallback
3. Fix prediction error to return actual error status
4. Add input length validation on username (3-80 chars)
5. Fix `setValues` reference bug in Dashboard sliders
6. Rotate committed SECRET_KEY, scrub git history
7. Remove health check DB type disclosure
8. Add CSRF protection

### Phase 2: Production-Safe (Before 50-user beta, ~28hr)

1. Token blacklist (DB-backed revoked JTI set)
2. Move JWT from localStorage to httpOnly cookie
3. Automatic token refresh before expiry
4. Pagination on GET /api/logs
5. Implement data export (JSON download)
6. Loading/error states, replace alert() with toasts
7. Fix semantic column mismatch
8. Content Security Policy headers
9. PIN reset flow
10. Structured logging (replace print())

### Phase 3: Clinically Trustworthy (Before 1,000 users, ~59hr)

1. Migrate SQLite → PostgreSQL
2. Event sourcing / append-only audit log
3. Offline-first sync with conflict resolution
4. "Seek medical advice" escalation triggers
5. Predictions as probability ranges, not exact dates
6. User feedback loop on prediction accuracy
7. Soft-delete with 30-day recovery
8. Automated database backups
9. Break Dashboard.jsx into sub-components
10. E2E integration tests

---

## TRUST ARCHITECTURE UPGRADES

- **Data Ownership:** Add "Your Data" page showing what's stored, sync status, encryption proof
- **Proof of Privacy:** 🔒 icon on encrypted fields, last access timestamp, data residency badge
- **Explainability:** Show prediction calculation chain (last period → cycle length → next date)
- **Privacy API:** `/api/auth/privacy-status` returning encryption algorithm, key rotation date

## CLINICAL SAFETY LAYER

| App MAY Infer | App MUST NEVER Infer |
|---|---|
| Estimated period window (±3 days) | Pregnancy status |
| Current cycle phase (with confidence) | Fertility for contraception |
| Symptom trends | Medical diagnoses |
| BBT biphasic shift | Medication recommendations |

**Escalation triggers:** Bleeding >10 days · No period >60 days · Pain >80 for 3+ days · BBT >100.4°F

## PREDICTION SYSTEM: STAY RULE-BASED

Justification: User base too small for ML · Irregular cycles make ML unreliable · Rules are explainable · Lower medical liability. **Improvement:** Replace point predictions with range predictions using `predicted_date ± std_dev(cycle_lengths)`.

## SCALABILITY WITHOUT BREAKING PRIVACY

| Layer | Strategy |
|---|---|
| DB | PostgreSQL + row-level encryption + PgBouncer |
| Auth | Rate limiter + token blacklist → Redis |
| API | Stateless Flask behind Gunicorn (4 workers) |
| Encryption | Keep Fernet AES-128. Per-user keys at 10K+ scale |
| Frontend | Service Worker for offline. CDN for static assets |

---

## "BEST IN THE WORLD" DECISIONS

1. **Per-user encryption keys derived from PIN** — True zero-knowledge. Server cannot read data without user's PIN.
2. **Event-sourced immutable data model** — No symptom log can ever be silently lost.
3. **Probabilistic prediction display** — Confidence intervals communicate uncertainty honestly.
4. **Remove ML model path entirely** — Increase trust via simplicity and auditability.
5. **Eliminate silent decryption fallback** — Fail loud, not silent. Prevents the most dangerous data integrity failure.

---

## FINAL RECOMMENDATION

> **🟡 LIMITED BETA ONLY** after Phase 1 hardening (~8hr effort). Not ready for 1,000 users until Phase 2 + PostgreSQL migration complete. The system has made meaningful progress from D+ to C+, with real encryption and API integration now working. The path to production is achievable but requires disciplined execution of the hardening roadmap above.

**What will realistically break first:** A user will lose their encryption key file during a server migration or container rebuild, permanently destroying all health data with no recovery path. Fix CRIT-1 before anything else.
