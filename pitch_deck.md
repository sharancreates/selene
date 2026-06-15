# Selene - Pitch Deck Presentation

An 8-slide presentation outlining the Selene E2EE FemTech Platform.

---

## Slide 1: Title Slide
### **SELENE**
*The Private, Secure Menstrual Cycle & Symptoms Forecaster*

*   **Subtitle:** Bridging the gap between predictive ML diagnostics and zero-knowledge privacy.
*   **Presenter:** Selene Research Team
*   **Mission:** Empowering individuals to track their reproductive health without compromising their digital privacy rights.

---

## Slide 2: The Problem
### **The FemTech Privacy Crisis**
*   **Data Exploitation:** Traditional period trackers sell sensitive health, fertility, and intimacy logs to brokers.
*   **Surveillance Risk:** In the modern legal climate, cycle tracking databases pose a subpoena risk for reproductive health profiling.
*   **User Apprehension:** Over 68% of users report anxiety or reluctance in tracking symptoms due to fears of cloud data exposure.

---

## Slide 3: The Solution
### **Selene Zero-Knowledge Architecture**
*   **Client-Side Cryptographic Boundary:** All symptoms, logs, and Basal Body Temperatures are encrypted on the browser before transmission.
*   **Zero Server Visibility:** We don't store or know your PIN. If database servers are compromised, adversaries read only undecryptable base64 blocks.
*   **Full User Agency:** Absolute control over key recovery and immediate account erasure options.

---

## Slide 4: Premium Product Experience
### **Vibrant Aesthetics Meets Accessibility**
*   **Warm Palette:** Earthy pastels (Beige, terracotta `#df9b6d`, muted green `#8ba68b`) create a calm, soothing atmosphere.
*   **WCAG AAA Compliance:** High contrast text elements ensure readability for users with low vision.
*   **Responsive Layout:** Smooth micro-animations and custom SVG illustrations (Tea, Reading, Sleep) keep the interface lively and engaging.

---

## Slide 5: The Technology Stack
### **Multi-Layered Envelope Encryption**
*   **Passcode Derivation:** PBKDF2-HMAC-SHA256 (100,000 iterations) turns user PINs into Key Encryption Keys (KEK).
*   **Symmetric Encryption:** Fernet (AES-128-CBC) encrypts log payloads database columns.
*   **Robust Backend:** Flask REST API backed by PostgreSQL and managed through Alembic schema upgrades.

---

## Slide 6: Machine Learning Pipeline
### **Cycle Regressor & Prediction Error Limits**
*   **Custom Predictor:** Trains on historical menstrual onset data using cycle length regressors.
*   **Standard Deviation Bounds:** Cycle forecasts output clear error boundaries (e.g. ±2 days) to reflect biological variation.
*   **Savitzky-Golay BBT Smoothing:** Filters daily waking temperature noise to help clinicians isolate the progesterone biphasic surge.

---

## Slide 7: Clinical Integrations
### **HL7/FHIR & Interoperability**
*   **Standardized Coding:** Dynamic symptom labels align with clinical terminologies:
    - **LOINC** for body temperature (`8310-5`) and menstrual flow (`10159-2`).
    - **SNOMED CT** for pelvic pain (`289535008`) and back pain (`161891005`).
*   **FHIR Export:** Users export cycle history directly as clinical FHIR bundles for EHR integration.

---

## Slide 8: Compliance & Roadmap
### **DPDP Act & Clinical Trials**
*   **Consent Mandate:** Registration incorporates explicit opt-ins matching India's DPDP Act requirements.
*   **IRB Proposal:** Prepared clinical protocol package for a 12-week efficacy trial of 200 cohorts.
*   **Future Vision:** Open-source SDK for other reproductive wellness apps seeking to adopt E2EE telemetry.
