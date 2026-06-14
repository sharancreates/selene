# Selene Project Status & Documentation Report

This document outlines the architectural status of **Selene: Privacy-Focused Menstrual Health Platform**, summarizing the features implemented to date and mapping out all remaining development tasks for the platform's production-ready submission.

---

## 1. Architectural Accomplishments (Done Till Now)

We have successfully completed all **10/10 tasks** of the **Security & Cryptography** checklist, establishing a state-of-the-art zero-knowledge, privacy-preserving infrastructure:

### A. Zero-Knowledge Cryptographic Key Management (Task 1 & 4)
* **Client-Side KEK Derivation:** The user's PIN is never transmitted to the server in plain text. The React frontend uses the Web Crypto API to run **PBKDF2 (100,000 iterations, SHA-256)**, combining the PIN and username with a custom salt to derive a 256-bit Key Encryption Key (`kek_pin`).
* **Database-Level Encryption (DEK):** Each user is assigned a random 32-byte Data Encryption Key (DEK) generated on the server using Cryptography's Fernet. This DEK is used by custom SQLAlchemy `TypeDecorator` classes (`EncryptedString`, `EncryptedInt`, `EncryptedFloat`, `EncryptedJSON` in `models.py`) to encrypt all personal log entries.
* **Double Key Wrapping:** The DEK is encrypted client-side using `kek_pin` (`encrypted_dek_pin`) and server-side using a PBKDF2-derived recovery key (`encrypted_dek_recovery`), storing only the encrypted payloads in the database.

### B. Secure Token Storage & Revocation (Task 2 & 3)
* **HttpOnly Session Cookies:** Moved JWT token storage from insecure browser `localStorage` to secure, HttpOnly, SameSite=Strict, Secure cookies (`access_token` and `refresh_token`).
* **Redis-Backed Blacklist:** Integrated a Redis cache client in `auth.py`. When a user logs out, rotates tokens, or resets their PIN, the JWT identifier (JTI) is blacklisted globally in Redis with a TTL corresponding to the remaining token expiry time (with an automatic SQLite/PostgreSQL database query fallback).

### C. Password Verification & Upgrades (Task 5 & 6)
* **Argon2id Verification:** Swapped standard SHA-256/PBKDF2 hashes for **Argon2id** (via `argon2-cffi`) for user PIN and recovery key verification, mitigating GPU brute-force attacks.
* **Auto-Migration Pipeline:** Built a seamless backend migration routine. When a legacy user logs in, the backend verifies their old password using the pbkdf2 hash fallback, upgrades their credentials to Argon2id, generates their user-specific DEK, decrypts their historical logs using the deprecated global environment key, and re-encrypts them under their new DEK in a single transaction.

### D. Hardening & Ingestion Security (Task 7, 8, 9 & 10)
* **Strict Content Security Policy (CSP):** Configured strict CSP response headers in `app.py`, completely removing `'unsafe-inline'` from script directives.
* **Redis-Backed Rate Limiting:** Bound Flask-Limiter to the Redis server (`RATELIMIT_STORAGE_URI`) to protect endpoints from brute-force register attempts.
* **Dynamic JSON Sanitization:** Added recursive HTML-escaping to sanitize all unstructured JSON fields (`mood_toggles`, `symptom_tags`, and `lifestyle_actions`) in `logs.py` to block XSS payloads.
* **SSL Termination Conf:** Written a production-ready `nginx/selene.conf` supporting modern TLS 1.2/1.3 protocols, secure ciphers, HSTS, and proxy headers.

---

## 2. Remaining Development Checklist (What is Left)

The remaining 40 tasks from the audit are organized by core areas.

### A. Backend Infrastructure (Tasks 11–20)
- [ ] **11. Migrate Database to PostgreSQL:** Transition the backend `config.py` from SQLite to PostgreSQL.
- [ ] **12. Remove db.create_all():** Enforce schema upgrades solely through Flask-Migrate.
- [ ] **13. Implement Connection Pooling:** Integrate PgBouncer or configure SQLAlchemy connection pool settings.
- [ ] **14. Index Configurations:** Configure performance indexes on `user_id` and `log_date` fields.
- [ ] **15. Standardize API Responses:** Ensure all error and success payloads use unified structures.
- [ ] **16. Structured JSON Logging:** Switch basic print/logger messages to structured JSON formats.
- [ ] **17. Nightly Backup Task:** Set up automated cron scripts for daily database backups.
- [ ] **18. Database Health Checks:** Integrate health status indicators into the `/health` endpoint.
- [ ] **19. Soft-Delete Accounts:** Implement a 30-day recovery window before permanent account deletion.
- [ ] **20. Revoked Token Cleanup:** Set up a Celery or cron worker to clean expired JTI entries from the database.

### B. Clinical & ML Pipeline (Tasks 21–30)
- [ ] **21. Train Cycle Regressor:** Train the cycle prediction model on public FemTech datasets and export it to `selene_model.joblib`.
- [ ] **22. Prediction Error Standard Deviations:** Update prediction output to display standard deviation error bounds (e.g., ±2 days).
- [ ] **23. Predict Exception Refactoring:** Ensure ML pipeline failure blocks raise descriptive API errors.
- [ ] **24. Document Insight Sources:** Reference the medical papers justifying the rules (e.g., PCOS or PMDD flags) in the codebase.
- [ ] **25. Savitzky-Golay Smoothing:** Implement moving-average smoothing for the Basal Body Temperature (BBT) curve.
- [ ] **26. Isolation Forest Anomaly Detection:** Implement outlier detection on logging frequency and symptom counts.
- [ ] **27. Clinical Disclaimers:** Add explicit medical disclaimers under all recommendations.
- [ ] **28. Standardize Symptom Labels:** Align dynamic database symptom labels with standardized codes (e.g., LOINC / SNOMED CT).
- [ ] **29. User Feedback Prompts:** Implement a rating feedback card to validate cycle predictions.
- [ ] **30. Pipeline Validation Tests:** Write unit tests to check raw vital inputs against expected pipeline structures.

### C. Frontend Quality (Tasks 31–40)
- [ ] **31. Refactor Monolith Dashboard:** Split `Dashboard.jsx` (currently 1,400+ lines) into modular React components.
- [ ] **32. Toast Notifications:** Swap standard browser `alert()` popups for beautiful, custom CSS toast notifications.
- [ ] **33. Ingestion Loading States:** Show elegant skeleton loaders or spinners during backend syncing.
- [ ] **34. Error Fallback UI:** Add clean error states and offline message banners when API fetches fail.
- [ ] **35. Fix Slider setValues Bug:** Resolve the variable reference issue in the dashboard slider controls.
- [ ] **36. Calendar Prediction Overlays:** Render predicted cycle phases directly on the calendar interface.
- [ ] **37. Accessibility Review:** Refactor color choices and styles to meet Web Content Accessibility Guidelines (WCAG) AAA contrast ratios.
- [ ] **38. Browser Local Caching:** Set up IndexedDB/localStorage queuing to support offline tracking when network is missing.
- [ ] **39. Custom Illustrations:** Replace static icons or text with curated SVG FemTech illustrations.
- [ ] **40. Calendar Render Optimization:** Optimize calendar day cells to avoid unnecessary re-renders.

### D. Compliance & Documentation (Tasks 41–50)
- [ ] **41. Privacy Consent Flow:** Create an explicit consent modal on registration matching DPDP Act requirements.
- [ ] **42. Data Flow Mapping:** Draft a formal documentation asset illustrating user data life cycle and decryption boundaries.
- [ ] **43. FHIR Export Support:** Enable data export in the clinical HL7/FHIR JSON format.
- [ ] **44. IRB Proposal Draft:** Prepare an Institutional Review Board proposal package for potential clinical trials.
- [ ] **45. Clinical Letters of Support:** Obtain support statements from licensed clinicians.
- [ ] **46. JWT Integration Tests:** Expand Python tests to check JWT edge cases.
- [ ] **47. User PIN Recovery Flow:** Define and document user recovery paths when they lose their passcode.
- [ ] **48. Local Installation Script:** Build an automated setup script (e.g., shell or batch) for local dev environments.
- [ ] **49. Staging Server Setup:** Configure an automated CI/CD pipeline to deploy changes to a remote staging server.
- [ ] **50. Pitch Deck Presentation:** Finalize the slide presentation emphasizing Selene's unique E2EE privacy model.
