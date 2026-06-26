# Gunicorn production configuration file for Selene API
import os
import multiprocessing

# Bind to localhost on port 5000 to match Nginx proxy pass config
bind = os.environ.get("GUNICORN_BIND", "127.0.0.1:5000")

# Worker configuration
# Rule of thumb: 2-4 workers per core
workers = int(os.environ.get("GUNICORN_WORKERS", multiprocessing.cpu_count() * 2 + 1))
threads = int(os.environ.get("GUNICORN_THREADS", 2))

# Timeout for requests
timeout = int(os.environ.get("GUNICORN_TIMEOUT", 120))

# Logging configuration
# Log to stdout and stderr to integrate with docker/systemd log aggregators
accesslog = "-"
errorlog = "-"
loglevel = os.environ.get("GUNICORN_LOGLEVEL", "info")

# Process naming
proc_name = "selene-api"
