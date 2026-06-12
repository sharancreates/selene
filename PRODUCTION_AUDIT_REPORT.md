# Selene Production Audit Report (v1.0)

**Audit Date:** June 8, 2026  
**Auditor:** Principal Software Engineer, Security Auditor, Product Architect  
**Application:** Selene - Privacy-focused menstrual health platform

---

## Executive Summary

**System Grade:** D+  
**Launch Readiness:** ❌ Not ready

Selene is **not ready for production deployment**. Critical frontend-backend integration failures mean all user health data is ephemeral and lost on page refresh. The backend has robust infrastructure including JWT authentication, rate limiting, and prediction systems, but the frontend forms (Dashboard, Login, Register) only log to console and never persist data.

---

## Critical Issues

1. **No Encryption Layer** - Claims Fernet encryption but no implementation exists; all health data stored in plaintext database
2. **Frontend-Backend Disconnect** - Dashboard.jsx captures health data but never calls `/api/logs/sync`; all state is client-side only
3. **Database Migration Issues** - Using `db.create_all()` instead of proper `flask db upgrade` workflow
4. **O(n) Refresh Token Lookup** - Every `/refresh` call iterates ALL users in database (line 220: `User.query.filter(User.refresh_token_hash.is_not(None)).all()`)

---

## High Risk Issues

1. Rate limiting disabled in tests (`RATELIMIT_ENABLED = False`)
2. JWT access token 15min expiry but no automatic refresh handling in frontend
3. No input sanitization for JSON health fields (XSS vulnerability)
4. Missing CSRF protection on state-changing endpoints
5. No backup/restore mechanism for user health data
6. Prediction logic test failures - insights may be incorrect for PCOS/PMDD/Endo users

---

## Medium Risk Issues

1. CalendarView renders static hardcoded 2026 dates
2. Dashboard.jsx has undefined `setValues` function calls (lines 416-470)
3. No offline-first architecture - data lost on network failure
4. Hardcoded debug/development URLs
5. No audit logging for health data access
6. Missing accessibility attributes in frontend

---

## Low Risk Issues

1. Pandas FutureWarning for downcasting (will error in future)
2. No API documentation/OpenAPI spec
3. Missing GDPR-compliant data export
4. No automated database backup
5. Missing PostgreSQL connection health check

---

## Architecture Summary

Frontend and backend are **disconnected**. Dashboard.jsx captures user health data but never sends it to `/api/logs/sync`. All state is client-side only in React useState hooks. No Redux/Context state management. Backend has robust API with JWT auth, rate limiting, and prediction engine, but no one is calling it.

**Pattern:** "Backend exists but frontend does not integrate."

---

## Security & Privacy Summary

- JWT auth improved (15min expiry, refresh tokens in HttpOnly cookies)
- Rate limiting implemented (5/min) but disabled in tests
- **Missing encryption at rest**
- SESSION_COOKIE_SECURE defaults to true (requires HTTPS)
- PIN validation improved to 6 characters minimum
- Missing CSRF protection and XSS input validation
- **Score: 5/10**

---

## Data Integrity Summary

- Atomic upsert with unique constraint (uq_user_log_date)
- **Data loss risks:**
  - No encryption prevents zero-knowledge architecture
  - No retry on network failure
  - Frontend localStorage never synced
  - No backup strategy
- SQLite database with no replication
- **Score: 6/10**

---

## ML/Prediction Assessment

- ML model (selene_model.joblib) is optional with fallback to heuristics
- Uses rule-based cycle prediction:
  - Requires 11+ logs for calibration
  - Biologically realistic filter: 18-45 days
  - Phase insights tailored for PCOS/PMDD/Endo
- **ML not necessary currently** - rule-based system is sufficient
- **Score: 7/10**

---

## Clinical Logic Assessment

- Cycle phase detection: menstrual → follicular → ovulatory → luteal
- Condition-specific insights implemented in `predict.py:189-232`
- Users self-report conditions (PCOS, PMDD, Endo)
- BBT data captured with forward-fill imputation
- **Risk:** False reassurance from period predictions
- **Score: 8/10**

---

## Frontend UX Assessment

- Visually polished with Framer Motion
- Authentication forms have validation/error display
- **Critical:** Dashboard data entry has NO backend integration
- Calendar shows static 2026 dates
- Settings page exists but functionality unverified
- **Score: 4/10**

---

## Top 5 Catastrophic Failures

1. **User logs health data for months, browser clears LocalStorage - ALL DATA LOST silently**
2. **Encryption key misconfigured - ALL health data permanently unreadable**
3. **Race condition in refresh token lookup under load - tokens invalidated**
4. **Wrong phase insights returned (test fails) - users follow wrong advice**
5. **Database corruption with no backup - permanent loss of health history**

---

## Top 5 Improvements Needed

1. Wire all Dashboard forms to `/api/logs/sync` with retry logic
2. Implement Fernet encryption for health data fields before database storage
3. Add React Query/SWR for offline-first data synchronization
4. Run `flask db upgrade` in production, remove `db.create_all()`
5. Add comprehensive API integration tests between frontend and backend

---

## Should ML Be Used?

**No.** Rule-based heuristics are sufficient. The prediction engine works correctly without ML. ML complexity adds failure modes without clear benefit.

---

## Final Recommendation

**NOT READY FOR PRODUCTION.** The fundamental frontend-backend disconnect makes this unusable for real health tracking. Every user interaction is ephemeral.

**Must complete before launch:**
1. Connect Dashboard.jsx sliders/toggles to API endpoints
2. Implement encryption layer for health data
3. Add offline sync with conflict resolution

After fixes: **Limited beta with 10-50 users maximum.** 1,000 user launch would expose data loss and privacy failures immediately.

---

## Files Modified During Security Improvements

- `backend/auth.py` - Reduced JWT expiry to 15min, added refresh tokens, rate limiting
- `backend/models.py` - Added `is_valid_pin()` validation, `refresh_token_hash` column
- `backend/config.py` - Added secure cookie flags, SECRET_KEY validation
- `backend/app.py` - Integrated Flask-Limiter and Flask-Migrate
- `backend/requirements.txt` - Added Flask-Limiter, Flask-Migrate
- `backend/.env.example` - Updated with secure defaults
- `backend/test_backend.py` - Updated PINs to 6 characters
- `frontend/src/components/Login.jsx` - Added form validation, API integration
- `frontend/src/components/Register.jsx` - Added form validation, API integration
- `backend/migrations/` - Created Alembic migration repository