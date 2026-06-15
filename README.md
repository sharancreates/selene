# Selene: Privacy-First Menstrual Health Platform

Selene is a zero-knowledge, encrypted menstrual health and symptom tracking platform designed with enterprise-grade cryptographic guarantees, clinical alignment, and machine learning cycle regressions.

---

## 1. Zero-Knowledge Security & Cryptography

All personal logging metrics and physiological data in Selene are fully encrypted on the client side or using user-derived keys before database storage:
- **PBKDF2 Key Derivation:** User passcodes (PIN) are processed client-side via **PBKDF2 (100,000 iterations, SHA-256)** to derive a 256-bit Key Encryption Key (KEK).
- **Double-Wrapped Data Encryption Keys (DEK):** Every user has an individual random AES-256 Data Encryption Key (DEK). This DEK is double-wrapped: once using the KEK (`encrypted_dek_pin`) and once using a PBKDF2-derived server recovery key (`encrypted_dek_recovery`).
- **Database-Level Encryption:** Custom SQLAlchemy type decorators (`EncryptedString`, `EncryptedInt`, `EncryptedFloat`, `EncryptedJSON`) automatically encrypt/decrypt database entries under the user's active session DEK.
- **Argon2id Verification:** Swapped basic password hashes for modern, GPU-resistant **Argon2id** (via `argon2-cffi`) for PIN verification.
- **Strict Content Security Policy (CSP):** Implemented strict CSP security headers on all responses, removing `unsafe-inline` references.
- **HttpOnly Cookies:** Session tokens (JWTs) are stored exclusively in HttpOnly, SameSite=Strict, Secure cookies, protected by Redis-backed JTI revocation blacklisting.

---

## 2. Clinical & ML Pipeline

Selene integrates advanced data science and clinical standards directly into the cycle prediction flow:
- **Gradient Boosting Cycle Regressor:** An adaptive regression model (`selene_model.joblib`) trained on clinical conditions (PCOS, PMDD, Endometriosis) predicts custom cycle lengths.
- **Prediction Uncertainty Bounds:** Cycle predictions calculate standard deviations dynamically, returning error bounds (e.g. `±2.0 days`) to set realistic expectations for users.
- **Savitzky-Golay BBT Filtering:** Mathematical smoothing of Basal Body Temperature (BBT) logs using quadratic/cubic 5-point Savitzky-Golay convolution coefficients to eliminate thermal fluctuations.
- **Isolation Forest Anomaly Checking:** Unsupervised multivariate outlier detection checking symptom counts and chronological logging gaps to identify irregular patterns.
- **Interoperability Coding (LOINC / SNOMED CT):** Logs map internal symptom labels to standard medical terminology codes to support healthcare exports.
- **Prediction Feedback Loop:** Users can submit star ratings and comments on calculations to train future iterations of predictions.

---

## 3. Getting Started

### Prerequisites
- Python 3.11+
- Redis Server (local or URL via `REDIS_URL`)

### Installation & Test Suite
1. Clone the repository and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   ./venv/Scripts/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the model training script:
   ```bash
   python train_model.py
   ```
5. Run the database migration upgrade:
   ```bash
   flask db upgrade
   ```
6. Run the integration test suite:
   ```bash
   python -m pytest
   ```
