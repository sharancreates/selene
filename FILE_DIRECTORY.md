# 🌙 Selene — Comprehensive File Directory & Codebase Map

This document provides a comprehensive, file-by-file breakdown of the entire **Selene** project directory, explaining the exact purpose and responsibilities of every file across the backend, frontend, machine learning pipelines, database migrations, documentation, and infrastructure.

---

## 📁 Repository Overview

```text
selene/
├── .github/              # CI/CD pipelines & automation workflows
├── backend/              # Flask REST API, ML pipeline, crypto, and database
│   ├── dataset/          # Raw Marquette University clinical research datasets
│   ├── migrations/       # Alembic/Flask-Migrate database migration scripts
│   │   └── versions/     # Incremental revision scripts
│   └── instance/         # Local SQLite fallback database storage
├── docs/                 # Clinical specifications, audits, IRB proposals, research
├── frontend/             # React (Vite) single-page web application
│   ├── public/           # Static public assets (icons, favicons)
│   └── src/              # React components, styles, and Web Crypto client logic
│       ├── components/   # Modular UI components (Dashboard, Auth, Calendar, etc.)
│       └── utils/        # Zero-knowledge encryption & cryptographic utilities
├── nginx/                # Production reverse-proxy and TLS configuration
├── FILE_DIRECTORY.md     # This comprehensive file directory guide
├── README.md             # Project overview, installation, and setup instructions
└── analysis_results.md   # Architectural, privacy, and ML performance critique
```

---

## 🏛️ Root Directory Files

| File | Purpose & Responsibility |
| :--- | :--- |
| [`README.md`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/README.md) | Main repository documentation. Outlines Selene's core vision, zero-knowledge privacy architecture, local quickstart guide, testing procedures, and environmental configuration. |
| [`analysis_results.md`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/analysis_results.md) | Technical critique and audit. Details machine learning performance metrics ($R^2$, RMSE), root cause analysis of synthetic data limitations, cryptographic audit findings, and concrete improvements. |
| [`CONTRIBUTING.md`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/CONTRIBUTING.md) | **Contributor Guidelines**. Step-by-step instructions for contributors on local setup, zero-knowledge constraints, running tests, branch workflows, and responsible security disclosure. |
| [`CODE_OF_CONDUCT.md`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/CODE_OF_CONDUCT.md) | **Community Standards**. Contributor Covenant v2.1 detailing pledge, standards, enforcement responsibilities, and guidelines. |
| [`FILE_DIRECTORY.md`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/FILE_DIRECTORY.md) | *(This file)* Master index documenting the role of every file and directory across the Selene project. |
| [`.gitignore`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/.gitignore) | Git ignore specification for development environments, preventing sensitive files (`.env`), build artifacts (`dist/`), dependencies (`node_modules/`, `venv/`), and databases (`*.db`) from committing. |

---

## ⚙️ Backend (`backend/`)

The backend is built with Python and Flask. It enforces an envelope-encrypted, zero-knowledge storage model, hosts the REST API, executes rule-based clinical insights, and serves machine learning cycle predictions.

### Core Server & Configuration

| File | Purpose & Responsibility |
| :--- | :--- |
| [`backend/app.py`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/app.py) | **Application Entry Point & Factory**. Initializes Flask, registers blueprints (`auth_bp`, `logs_bp`, `predict_bp`, `public_health_bp`), configures SQLAlchemy, CORS, security headers (CSP, HSTS, X-Frame-Options), and global error handlers. |
| [`backend/config.py`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/config.py) | **Configuration Class**. Reads environment variables, normalizes database connection strings (PostgreSQL/Neon/SQLite), configures JWT secret keys, token lifespans, rate limits, and encryption salts. |
| [`backend/.env`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/.env) | **Active Environment Secrets**. Contains runtime secrets such as `DATABASE_URL` (Neon cloud connection), `JWT_SECRET_KEY`, and cryptographic salts. *(Never committed to version control).* |
| [`backend/.env.example`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/.env.example) | **Environment Template**. Reference file detailing required environment variables for developers deploying or cloning the project. |
| [`backend/requirements.txt`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/requirements.txt) | **Python Dependencies**. Lists required packages including Flask, Flask-SQLAlchemy, Flask-Migrate, psycopg2-binary, scikit-learn, cryptography, and pytest. |
| [`backend/gunicorn.conf.py`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/gunicorn.conf.py) | **Production WSGI Configuration**. Configures worker count, worker class, bind addresses, and logging for Gunicorn in production deployments. |
| [`backend/run_prod.sh`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/run_prod.sh) | **Production Startup Script**. Linux shell script to activate the virtual environment, apply pending database migrations, and launch Gunicorn. |

### Data Models & Cryptography

| File | Purpose & Responsibility |
| :--- | :--- |
| [`backend/models.py`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/models.py) | **Database Models & Encryption Decorators**. Defines SQLAlchemy models: `User`, `DailyLog`, `RevokedToken`, and `PredictionFeedback`. Implements AES-GCM envelope encryption decorators (`EncryptedString`, `EncryptedInt`, `EncryptedJSON`) and handles serialization. |
| [`backend/rotate_key.py`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/rotate_key.py) | **Key Rotation Utility**. Allows users to re-encrypt their Data Encryption Key (DEK) with a new Key Encryption Key (KEK) when changing their PIN or recovery passphrase. |

### REST API Blueprints & Routing

| File | Purpose & Responsibility |
| :--- | :--- |
| [`backend/auth.py`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/auth.py) | **Authentication & Account Lifecycle**. Endpoints for user registration, zero-knowledge PIN verification, JWT token issuance/refreshing, logout token revoking, 30-day soft-deletion, and account recovery. |
| [`backend/logs.py`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/logs.py) | **Daily Symptom Logging**. Handles encrypted read/write/update endpoints for daily user logs (flow intensity, pelvic pain, back pain, basal body temperature, mood toggles, and lifestyle actions). |
| [`backend/predict.py`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/predict.py) | **Cycle Prediction & Insights Endpoints**. Exposes `/api/predict` (invoking the trained ML model) and `/api/predict/insights` (running the deterministic clinical rules engine). Also handles prediction feedback. |
| [`backend/public_health.py`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/public_health.py) | **Anonymized Research Telemetry**. Aggregated, k-anonymized public health statistics endpoints calculating population-level cycle length variations and condition prevalence. |

### Clinical Insights & Machine Learning Pipeline

| File | Purpose & Responsibility |
| :--- | :--- |
| [`backend/insights_engine.py`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/insights_engine.py) | **Rule-Based Clinical Intelligence**. Deterministic clinical evaluator applying Rotterdam PCOS criteria, DSM-5 PMDD rules, and ACOG standards to logged symptom patterns (temperature shifts, luteal length, severe pain clusters). |
| [`backend/pipeline.py`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/pipeline.py) | **Feature Engineering Pipeline**. Extracts rolling statistical features (cycle variance, BBT nadir/shift, symptom frequencies, baseline conditions) from user log histories to feed into the prediction model. |
| [`backend/train_model.py`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/train_model.py) | **Model Training Script**. Loads the Marquette University dataset, performs feature extraction, trains a regularized Ridge regression estimator, and outputs the serialized model. |
| [`backend/selene_model.joblib`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/selene_model.joblib) | **Trained Machine Learning Model**. Serialized binary artifact of the trained Ridge regression pipeline used at runtime to predict cycle lengths. |
| [`backend/model_metrics.json`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/model_metrics.json) | **Validation Metrics Snapshot**. JSON record of model performance metrics ($R^2$, RMSE, MSE, MAE) generated during model training. |

### Development, Seeding & Testing

| File | Purpose & Responsibility |
| :--- | :--- |
| [`backend/test_backend.py`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/test_backend.py) | **Automated Test Suite**. Pytest suite with 50+ test cases covering authentication flows, envelope encryption integrity, clinical rule triggers, edge-case cycle predictions, and soft-delete windows. |
| [`backend/seed.py`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/seed.py) | **Database Seeder**. Populates local environments with realistic clinical profiles (regular cycles, PCOS, PMDD, Endometriosis) and multi-month encrypted daily logs for UI testing. |
| [`backend/generate_mock_data.py`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/generate_mock_data.py) | **Synthetic Cycle Data Generator**. Generates synthetic longitudinal patient records with realistic physiological signals (biphasic BBT curves, pre-menstrual luteal symptoms). |

### Datasets (`backend/dataset/`)

| File | Purpose & Responsibility |
| :--- | :--- |
| [`backend/dataset/FedCycleData071012.csv`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/dataset/FedCycleData071012.csv) | **Marquette University NFP Study Dataset**. Real-world clinical dataset containing menstrual cycle lengths, ovulation timing, mucus observations, and basal temperature records. |
| [`backend/dataset/FedCycleData071012 (2).csv`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/dataset/FedCycleData071012%20(2).csv) | Backup/duplicate copy of the Marquette University cycle dataset. |

### Database Migrations (`backend/migrations/versions/`)

All migrations manage incremental schema evolution across SQLite and PostgreSQL (Neon).

| Migration Script | Changes Applied |
| :--- | :--- |
| [`474a24018a42_initial_schema.py`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/migrations/versions/474a24018a42_initial_schema.py) | Baseline schema creating `users` and `daily_logs` tables. |
| [`3b565fdcbe1f_add_revoked_tokens_table_and_recovery_.py`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/migrations/versions/3b565fdcbe1f_add_revoked_tokens_table_and_recovery_.py) | Adds `revoked_tokens` blacklist table and `recovery_hash` column to `users`. |
| [`8f73fb177958_add_dek_fields.py`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/migrations/versions/8f73fb177958_add_dek_fields.py) | Adds envelope-encrypted `encrypted_dek_pin` and `encrypted_dek_recovery` columns to `users`. |
| [`3e9962afe0eb_add_index_and_soft_delete_columns.py`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/migrations/versions/3e9962afe0eb_add_index_and_soft_delete_columns.py) | Adds index on `daily_logs.user_id` and soft-delete columns (`is_deleted`, `deleted_at`) to `users`. |
| [`bf7f2780b340_add_prediction_feedback_table.py`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/migrations/versions/bf7f2780b340_add_prediction_feedback_table.py) | Creates `prediction_feedback` table for rating cycle predictions. |
| [`f6170b6fc591_add_has_onboarded_to_user.py`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/migrations/versions/f6170b6fc591_add_has_onboarded_to_user.py) | Adds `has_onboarded` boolean flag to `users` to manage onboarding redirection. |
| [`da411c616a11_add_medical_disclaimer_columns.py`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/migrations/versions/da411c616a11_add_medical_disclaimer_columns.py) | Adds `disclaimer_accepted` and encrypted `disclaimer_signed_name` to `users`. |
| [`5a91c8f72e10_add_terms_accepted_to_user.py`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/migrations/versions/5a91c8f72e10_add_terms_accepted_to_user.py) | Adds `terms_accepted` and encrypted `terms_signed_name` to `users`. |
| [`c19d4e5f2a3b_add_encrypted_data_to_daily_logs.py`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/backend/migrations/versions/c19d4e5f2a3b_add_encrypted_data_to_daily_logs.py) | Adds `encrypted_data` column to `daily_logs`, alters legacy `phase` to nullable, and indexes `log_date`. |

---

## 🎨 Frontend (`frontend/`)

Built with React and Vite. The frontend handles zero-knowledge cryptographic operations directly in the user's browser using the Web Crypto API, ensuring plaintext health data never leaves the client unencrypted.

### Build & Project Configuration

| File | Purpose & Responsibility |
| :--- | :--- |
| [`frontend/package.json`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/frontend/package.json) | Node package definitions, scripts (`dev`, `build`, `lint`), and dependencies (`react`, `framer-motion`, `lucide-react`, `canvas-confetti`). |
| [`frontend/package-lock.json`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/frontend/package-lock.json) | Dependency tree lockfile ensuring deterministic, reproducible dependency installations. |
| [`frontend/vite.config.js`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/frontend/vite.config.js) | Vite bundler config. Sets up local dev server on port 5173 with proxy rules routing `/api/*` requests to the Flask server on port 5000. |
| [`frontend/tsconfig.json`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/frontend/tsconfig.json) | TypeScript/JSX compiler options for strict type-checking and editor autocompletion. |
| [`frontend/index.html`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/frontend/index.html) | HTML shell loading Google Fonts (Inter, Playfair Display) and mounting the React application. |

### Application Entry & Styles

| File | Purpose & Responsibility |
| :--- | :--- |
| [`frontend/src/main.jsx`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/frontend/src/main.jsx) | React bootstrap file. Attaches the root `<App />` component to DOM root element `#root`. |
| [`frontend/src/index.css`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/frontend/src/index.css) | Global stylesheet defining CSS custom properties, fluid typography, dark-mode styling, glassmorphism utilities, and smooth color transitions. |
| [`frontend/src/App.jsx`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/frontend/src/App.jsx) | **Root Component & Routing Engine**. Manages active user authentication state, session persistence, automatic token refreshes, page routing (`landing`, `login`, `register`, `onboarding`, `dashboard`, `settings`), and camouflage mode state. |

### Client-Side Cryptography (`frontend/src/utils/`)

| File | Purpose & Responsibility |
| :--- | :--- |
| [`frontend/src/utils/crypto.js`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/frontend/src/utils/crypto.js) | **Web Crypto API Engine**. Implements client-side AES-256-GCM envelope encryption, PBKDF2 key derivation from user PINs, DEK generation, and local payload encryption/decryption. |
| [`frontend/src/utils/crypto.test.js`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/frontend/src/utils/crypto.test.js) | Automated unit tests verifying client-side key generation, encryption roundtrips, and key wrapping correctness. |

### UI Components (`frontend/src/components/`)

#### Core Screens & Views
| Component | Purpose & Responsibility |
| :--- | :--- |
| [`Dashboard.jsx`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/frontend/src/components/Dashboard.jsx) | **Primary User Dashboard**. Central interface displaying current cycle phase countdown, daily symptom logging form, luteal phase indicators, insights, and quick action panels. |
| [`CalendarView.jsx`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/frontend/src/components/CalendarView.jsx) | **Interactive Cycle Calendar**. Full monthly calendar view showing past period days, ovulation windows, predicted upcoming cycles, and historic symptom tags. |
| [`CalendarDay.jsx`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/frontend/src/components/CalendarDay.jsx) | Individual calendar cell displaying phase indicators, flow intensity dots, and active selection states. |
| [`Login.jsx`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/frontend/src/components/Login.jsx) | **Zero-Knowledge Login Form**. Derives KEK from the user's PIN locally, requests the encrypted DEK from the server, unwraps it in the browser, and stores it in session memory. |
| [`Register.jsx`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/frontend/src/components/Register.jsx) | **Zero-Knowledge Registration**. Generates a new random 256-bit DEK, wraps it with a PIN-derived KEK, creates an emergency recovery code, and sends only the wrapped keys to the backend. |
| [`Onboarding.jsx`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/frontend/src/components/Onboarding.jsx) | First-time setup wizard prompting users for their typical cycle length, period duration, chronic condition history (PCOS/PMDD/Endo), and legal agreements. |
| [`Settings.jsx`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/frontend/src/components/Settings.jsx) | Account settings panel for exporting raw encrypted/decrypted data, managing PIN changes, reading clinical disclaimers, or triggering account deletion. |
| [`PublicHealthStats.jsx`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/frontend/src/components/PublicHealthStats.jsx) | Public dashboard displaying privacy-preserving aggregate cycle statistics and epidemiology charts. |

#### Dashboard Widgets & Visualizations
| Component | Purpose & Responsibility |
| :--- | :--- |
| [`PhaseCircle.jsx`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/frontend/src/components/PhaseCircle.jsx) | Circular progress visualization displaying current cycle day and biological phase (Menstrual, Follicular, Ovulatory, Luteal) with phase-specific color schemes. |
| [`PredictionSummaryCard.jsx`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/frontend/src/components/PredictionSummaryCard.jsx) | Summary card showing predicted next period date, days remaining, cycle length estimate, and confidence rating. |
| [`PatternInsights.jsx`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/frontend/src/components/PatternInsights.jsx) | Insights feed displaying rule-based hormonal observations, ovulation confirmations, and cycle regularity trends. |
| [`AlertsPanel.jsx`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/frontend/src/components/AlertsPanel.jsx) | Contextual alert banner alerting users to critical patterns (prolonged bleeding, severe pelvic pain spikes, potential PMDD episodes) with guidance to seek medical care. |
| [`BBTTrendChart.jsx`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/frontend/src/components/BBTTrendChart.jsx) | SVG/Canvas temperature trend chart plotting daily waking temperatures over the cycle to visualize post-ovulatory biphasic shifts. |
| [`WakingVitalsCard.jsx`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/frontend/src/components/WakingVitalsCard.jsx) | Dedicated quick-input widget for entering morning basal body temperature and resting heart rate. |
| [`HealthConditionsPanel.jsx`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/frontend/src/components/HealthConditionsPanel.jsx) | Profile widget allowing users to review and toggle clinical profiles (PCOS, PMDD, Endometriosis). |
| [`CamouflageSection.jsx`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/frontend/src/components/CamouflageSection.jsx) | Privacy camouflage feature allowing the user to disguise the app as a simple calculator or neutral notes screen for personal safety. |
| [`DashboardHeader.jsx`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/frontend/src/components/DashboardHeader.jsx) | Top navigation bar on dashboard featuring active date display, camouflage trigger, and user menu. |
| [`DashboardSkeleton.jsx`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/frontend/src/components/DashboardSkeleton.jsx) | Animated skeleton loading placeholder shown while fetching and decrypting user cycle logs. |

#### Landing Page & Presentation
| Component | Purpose & Responsibility |
| :--- | :--- |
| [`Hero.jsx`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/frontend/src/components/Hero.jsx) | Hero banner on the public landing page showcasing the brand identity and core privacy guarantee. |
| [`Header.jsx`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/frontend/src/components/Header.jsx) | Landing page header containing branding, navigation anchors, and authentication buttons. |
| [`Footer.jsx`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/frontend/src/components/Footer.jsx) | Footer with open-source badges, zero-knowledge privacy notice, and clinical disclaimer. |
| [`ValueProposition.jsx`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/frontend/src/components/ValueProposition.jsx) | Section highlighting why zero-knowledge encryption and local privacy matter in menstrual health. |
| [`Component4.jsx`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/frontend/src/components/Component4.jsx) | Interactive animated card carousel highlighting Selene's three architectural pillars. |

#### Form Controls & Vector Illustrations
| Component | Purpose & Responsibility |
| :--- | :--- |
| [`CustomSlider.jsx`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/frontend/src/components/CustomSlider.jsx) | Reusable numeric range slider with labeled endpoints for symptom severity scoring (0–10). |
| [`CustomToggle.jsx`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/frontend/src/components/CustomToggle.jsx) | Animated switch component for boolean toggles (mood, cramps, medications). |
| [`ReadingIllustration.jsx`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/frontend/src/components/ReadingIllustration.jsx) | Calming vector illustration used in educational tooltips and empty states. |
| [`SleepingIllustration.jsx`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/frontend/src/components/SleepingIllustration.jsx) | Vector illustration used in the sleep tracking section. |
| [`TeaIllustration.jsx`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/frontend/src/components/TeaIllustration.jsx) | Vector illustration used for wellness and lifestyle recommendations. |

#### Static Public Assets (`frontend/public/`)
| File | Purpose & Responsibility |
| :--- | :--- |
| [`frontend/public/favicon.svg`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/frontend/public/favicon.svg) | SVG browser tab icon representing the Selene crescent moon. |
| [`frontend/public/icons.svg`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/frontend/public/icons.svg) | SVG sprite sheet containing common icons used across buttons and menus. |

---

## 📚 Documentation & Clinical Research (`docs/`)

| File | Purpose & Responsibility |
| :--- | :--- |
| [`docs/project_documentation.md`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/docs/project_documentation.md) | **System Architecture Guide**. Comprehensive overview of the database schema, cryptographic mechanisms, API endpoints, and setup directions. |
| [`docs/data_flow_mapping.md`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/docs/data_flow_mapping.md) | **Cryptographic Data Flow Map**. Step-by-step diagram and documentation tracing how plaintext is encrypted into ciphertext before touching network sockets or databases. |
| [`docs/user_recovery_flow.md`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/docs/user_recovery_flow.md) | **Account Recovery Specification**. Explains the cryptographic derivation of the emergency recovery phrase and how users can restore their data if they forget their PIN. |
| [`docs/ml.md`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/docs/ml.md) | **Machine Learning Technical Reference**. Explains feature extraction, clinical baselines, Ridge regression modeling, and performance benchmarks. |
| [`docs/clinical_letters_support.md`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/docs/clinical_letters_support.md) | Clinical criteria and evidence base used when formatting symptom export summaries for OB/GYNs and endocrinologists. |
| [`docs/irb_proposal.md`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/docs/irb_proposal.md) | Institutional Review Board (IRB) research protocol for conducting ethical, privacy-preserving menstrual cycle research with aggregate telemetry. |
| [`docs/audit.md`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/docs/audit.md) | Technical and security audit checklist covering HIPAA compliance, GDPR requirements, key handling, and zero-knowledge guarantees. |
| [`docs/SELENE_FULL_AUDIT_v1.1.md`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/docs/SELENE_FULL_AUDIT_v1.1.md) | Version 1.1 full system audit assessing privacy controls, clinical logic accuracy, and deployment readiness. |
| [`docs/pitch_deck.md`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/docs/pitch_deck.md) | Slide outline and talking points summarizing the product vision, market problem, and technical differentiators. |
| [`docs/banner.png`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/docs/banner.png) | Visual branding banner used in documentation and project presentations. |

---

## 🌐 Infrastructure & Deployment

| File | Purpose & Responsibility |
| :--- | :--- |
| [`nginx/selene.conf`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/nginx/selene.conf) | **Reverse Proxy Configuration**. Nginx configuration file defining HTTP to HTTPS redirection, SSL/TLS certificates, rate limiting, and routing between frontend static files and the Gunicorn backend. |
| [`.github/workflows/staging_deploy.yml`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/.github/workflows/staging_deploy.yml) | **CI/CD Deployment Workflow**. GitHub Actions workflow automating tests, building the frontend bundle, and deploying to staging servers upon pushing to `main`. |
| [`.github/ISSUE_TEMPLATE/bug_report.md`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/.github/ISSUE_TEMPLATE/bug_report.md) | **Bug Report Template**. Standardized issue form for reporting bugs, reproduction steps, error logs, and environment details. |
| [`.github/ISSUE_TEMPLATE/feature_request.md`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/.github/ISSUE_TEMPLATE/feature_request.md) | **Feature Request Template**. Form for proposing enhancements, clinical rationale, and zero-knowledge privacy impact. |
| [`.github/PULL_REQUEST_TEMPLATE.md`](file:///c:/Users/Sharanya%20Nagar/Desktop/selene/.github/PULL_REQUEST_TEMPLATE.md) | **Pull Request Template**. Checklist verifying tests, zero-knowledge invariants, and code style before merging. |

