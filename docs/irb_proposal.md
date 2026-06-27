# IRB Clinical Trial Research Proposal

**Study Title:** Evaluating the Clinical Efficacy of Machine Learning Cycle Forecasting and Zero-Knowledge End-to-End Encryption on Menstrual Tracking Compliance and Symptom Management (The Selene Study)

---

## 1. Administrative Structure & Investigators
*   **Principal Investigator:** Dr. Sarah Jenkins, MD, FACOG (Clinical Advisor, Digital Health Research)
*   **Co-Investigator:** Prof. Rajesh Kumar, PhD (Professor of Medical Machine Learning, Selene Research Institute)
*   **Reviewing Board:** Institutional Review Board (IRB) for Digital Health & Clinical AI Research
*   **Protocol Version:** 1.0.4
*   **Date:** June 15, 2026

---

## 2. Abstract
This study proposes to validate the clinical forecasting accuracy of the Selene FemTech Machine Learning Regressor (`selene_model.joblib`) in predicting menstrual cycles while auditing the psychological benefit of zero-knowledge client-side encryption on tracking compliance. Traditional FemTech apps suffer from low retention due to data-privacy concerns (GDPR / DPDP Act). Selene resolves this by wrapping Data Encryption Keys (DEKs) locally. A 12-week observational cohort of 200 participants will log symptoms, temperature, and cycle dates to compare algorithm accuracy (standard deviation bounds of ±2 days) against actual onset.

---

## 3. Study Objectives & Hypotheses
*   **Primary Objective:** To measure the mean absolute error (MAE) of the Selene cycle prediction model under real-world settings and assess whether prediction error remains within standard deviation bounds (e.g., ±2 days).
*   **Secondary Objective:** To determine if E2EE privacy architectures increase daily symptom logging compliance (waking temperature, pelvic pain, back pain, sleep, energy) compared to standard cloud-hosted databases.
*   **Hypothesis 1:** The ML regressor predicts next-cycle onset with an error margin of $\le 2.2$ days for users without severe cycle anomalies.
*   **Hypothesis 2:** Guaranteeing zero-knowledge encryption increases logging frequency by $\ge 40\%$ due to decreased privacy apprehension.

---

## 4. Methodology & Participant Cohort
### A. Participant Inclusion Criteria
*   Female or individuals who menstruate, aged 18 to 45 years.
*   Owns a smartphone with a web browser.
*   Willingness to log waking Basal Body Temperature (BBT) and daily symptom sliders.
*   Provides explicit, DPDP Act-compliant digital consent.

### B. Participant Exclusion Criteria
*   Currently pregnant or lactating.
*   Using hormonal birth control or undergoing active hormone replacement therapy (HRT).
*   Inability to understand the E2EE PIN boundaries.

### C. Technical Study Design
1. **Enrollment Phase:** Participants enroll via the registration screen, completing the explicit DPDP privacy consent flow.
2. **Setup Phase:** Users generate a local PIN and receive their recovery keys. Baseline cycle parameters are input.
3. **Data Collection:** Over 90 days, participants log:
   - Waking temperature (BBT) in Fahrenheit.
   - Pain metrics (cramps, backache, pelvic pain).
   - Quality indicators (sleep, energy).
4. **Endpoint Assessment:** Forecasted cycle phases are overlayed on the dashboard calendar. True cycle onset is compared against model predictions.

---

## 5. Ethical Considerations & Data Privacy Controls
*   **Zero-Knowledge Architecture:** Plaintext logs are never transmitted. The server receives only AES-128-CBC base64 block ciphertext.
*   **Consent Flow:** Consent is structured as granular check-boxes matching Section 6 of the Indian DPDP Act 2023.
*   **Erasure Rights:** Participants can exercise their right to be forgotten. Clicking "Erase All Data" triggers account soft-deletion on the database, followed by permanent background purge of all encrypted rows.
*   **Clinical Safeguards:** All dashboards and ML predictions include explicit disclaimers:
    > "Selene is not a diagnostic tool and does not replace professional medical advice. If you experience severe symptoms or sudden anomalies, consult a licensed OB/GYN."
