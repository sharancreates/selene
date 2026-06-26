#!/bin/bash
# Selene Production Startup Script
# Target Environment: POSIX / Linux VM (e.g. AWS EC2, GCP Compute Engine)

# Move to backend directory
cd "$(dirname "$0")"

# Activate virtual environment
if [ -d "venv" ]; then
    echo "[*] Activating virtual environment..."
    source venv/bin/activate
fi

# Upgrade database migrations to latest schema
echo "[*] Running database migrations..."
flask db upgrade

# Clean up expired revoked tokens in the background
echo "[*] Cleaning up expired revoked tokens..."
flask db-cleanup

# Execute Gunicorn application server
echo "[*] Starting Gunicorn WSGI server..."
exec gunicorn -c gunicorn.conf.py app:app
