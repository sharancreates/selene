# Contributing to Selene 🌙

Thank you for your interest in contributing to **Selene**! Selene is an open-source, privacy-first menstrual cycle tracking and hormonal health platform built on **zero-knowledge architecture**.

By contributing, you help make reproductive health tracking safe, confidential, and medically sound for people everywhere.

---

## 🔒 Core Philosophy: Zero-Knowledge by Design

Before writing code, please understand our strict cryptographic guarantee:
1. **Client-Side Envelope Encryption**: All sensitive health data (symptoms, pain severity, flow intensity, mood, notes, names) **must be encrypted in the client's browser** via the Web Crypto API (AES-GCM-256) before leaving the device.
2. **Zero Server Access**: The backend server must **never** receive or store plaintext health information or raw PINs.
3. **Open Standards & Clinical Rigor**: We adhere to verified clinical criteria (Rotterdam criteria for PCOS, DSM-5 for PMDD, ACOG guidelines). Any changes to medical rules must cite peer-reviewed clinical literature.

---

## 🛠️ Local Development Setup

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** & **npm**
- **Git**

---

### 1. Fork & Clone Repository

```bash
git clone https://github.com/YOUR-USERNAME/selene.git
cd selene
```

### 2. Backend Setup

1. **Navigate to backend and create a virtual environment**:
   ```bash
   cd backend
   python -m venv venv
   ```

2. **Activate the virtual environment**:
   - **Windows (PowerShell)**:
     ```powershell
     venv\Scripts\Activate.ps1
     ```
   - **macOS / Linux**:
     ```bash
     source venv/bin/activate
     ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure Environment Variables**:
   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   *(By default, `.env` uses local SQLite `sqlite:///instance/selene.db` which requires zero cloud setup).*

5. **Run Database Migrations**:
   ```bash
   flask db upgrade
   ```

6. **Seed Test Data (Optional)**:
   Populate realistic mock profiles and encrypted daily logs:
   ```bash
   python seed.py
   ```

7. **Start Backend Server**:
   ```bash
   python app.py
   ```
   The Flask API will run on `http://127.0.0.1:5000`.

---

### 3. Frontend Setup

1. **In a new terminal, navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install Node dependencies**:
   ```bash
   npm install
   ```

3. **Start the Vite development server**:
   ```bash
   npm run dev
   ```
   The application will be live at `http://localhost:5173`. Vite automatically proxies `/api/*` requests to the Flask backend on port 5000.

---

## 🧪 Running Tests

All pull requests must pass existing and newly added automated tests.

### Backend Tests (Pytest)
```bash
cd backend
python -m pytest test_backend.py -v
```

### Frontend Tests (Jest / Unit Tests)
```bash
cd frontend
npm test
```

---

## 🌿 Contribution Workflow

1. **Find or Open an Issue**: Check [Issues](https://github.com/sharancreates/selene/issues) first to discuss major architectural changes before starting work.
2. **Create a Feature Branch**:
   ```bash
   git checkout -b feature/amazing-feature
   # or
   git checkout -b fix/issue-description
   ```
3. **Follow Code Standards**:
   - **Python**: Follow PEP 8 style guidelines. Keep endpoints documented.
   - **JavaScript / React**: Use functional components with hooks. Maintain responsive, calming UI design without aggressive alert colors.
   - **Privacy First**: Never log or serialize unencrypted symptom or user identification data.
4. **Commit Your Changes**:
   Write clear, semantic commit messages:
   ```bash
   git commit -m "feat(insights): add biphasic BBT shift detection"
   ```
5. **Push to Your Fork & Open a Pull Request**:
   ```bash
   git push origin feature/amazing-feature
   ```
   Follow the [Pull Request Template](.github/PULL_REQUEST_TEMPLATE.md) when submitting.

---

## 🛡️ Responsible Disclosure (Security Vulnerabilities)

If you discover a security vulnerability—especially regarding the cryptographic envelope, key derivation, or token handling—**please do not open a public GitHub issue**.

Instead, privately disclose the vulnerability to the maintainers via email or GitHub's Private Security Advisory feature. We take all cryptographic and privacy vulnerabilities with utmost urgency.

---

## 📜 Code of Conduct

All contributors are expected to uphold our [Code of Conduct](CODE_OF_CONDUCT.md). Please be kind, respectful, and inclusive of everyone in our community.
