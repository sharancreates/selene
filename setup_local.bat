@echo off
:: Selene Local Environment Setup Script
:: Target OS: Windows

echo ===================================================
echo   SELENE - LOCAL DEVELOPMENT SETUP
echo ===================================================
echo.

:: 1. Verify Python Installation
echo [*] Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not added to PATH.
    echo Please install Python 3.10+ and try again.
    exit /b 1
)
echo [OK] Python is installed.

:: 2. Verify Node.js & NPM Installation
echo [*] Checking Node.js and NPM...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed.
    echo Please install Node.js (LTS version recommended) and try again.
    exit /b 1
)
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] NPM is not installed.
    exit /b 1
)
echo [OK] Node.js and NPM are installed.

:: 3. Configure Python Virtual Environment
echo [*] Setting up Python virtual environment (venv)...
if not exist venv (
    python -m venv venv
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create virtual environment.
        exit /b 1
    )
)
echo [OK] Virtual environment prepared.

:: 4. Install Backend Dependencies
echo [*] Activating venv and installing python dependencies...
call venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install backend dependencies.
    exit /b 1
)
echo [OK] Backend dependencies installed.

:: 5. Initialize & Migrate SQLite/PostgreSQL Database
echo [*] Upgrading database schema via migrations...
flask db upgrade
if %errorlevel% neq 0 (
    echo [WARNING] Flask db upgrade failed. You may need to set FLASK_APP=backend.app
    set FLASK_APP=backend.app
    flask db upgrade
    if %errorlevel% neq 0 (
        echo [ERROR] Database upgrade failed.
        exit /b 1
    )
)
echo [OK] Database schema initialized.

:: 6. Install Frontend Dependencies
echo [*] Installing frontend Node modules...
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install frontend node modules.
    cd ..
    exit /b 1
)
cd ..
echo [OK] Frontend dependencies installed.

echo.
echo ===================================================
echo   SETUP COMPLETED SUCCESSFULY!
echo ===================================================
echo.
echo To start development servers:
echo.
echo 1. Start the Flask Backend:
echo    venv\Scripts\activate
echo    set FLASK_APP=backend.app
echo    flask run
echo.
echo 2. Start the Frontend (in a separate terminal):
echo    cd frontend
echo    npm run dev
echo.
echo ===================================================
pause
