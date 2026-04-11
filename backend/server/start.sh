#!/bin/bash
# Production startup script for Veloris Backend

set -e

echo "Starting Veloris Backend..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "ERROR: .env file not found!"
    echo "Please copy .env.example to .env and configure it."
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Validate critical environment variables
if [ "$ENVIRONMENT" = "production" ]; then
    echo "Running in PRODUCTION mode"
    
    if [ "$SECRET_KEY" = "dev-secret-key-change-in-production" ] || [ -z "$SECRET_KEY" ]; then
        echo "ERROR: SECRET_KEY must be set in production!"
        exit 1
    fi
    
    if [ -z "$DATABASE_URL" ] || [[ "$DATABASE_URL" == *"sqlite"* ]]; then
        echo "ERROR: Production DATABASE_URL must be PostgreSQL!"
        exit 1
    fi
    
    if [ -z "$GROQ_API_KEY" ]; then
        echo "WARNING: GROQ_API_KEY is not set!"
    fi
else
    echo "Running in $ENVIRONMENT mode"
fi

# Run database migrations
echo "Running database migrations..."
alembic upgrade head || echo "No migrations to run or alembic not configured"

# Create uploads directory if it doesn't exist
mkdir -p uploads

# Determine number of workers (2 * CPU cores + 1)
WORKERS=${WORKERS:-4}
echo "Starting with $WORKERS workers..."

# Start the application
if [ "$ENVIRONMENT" = "production" ]; then
    # Production: Use Gunicorn with Uvicorn workers
    exec gunicorn app.main:app \
        --workers $WORKERS \
        --worker-class uvicorn.workers.UvicornWorker \
        --bind 0.0.0.0:${PORT:-8000} \
        --timeout 120 \
        --access-logfile - \
        --error-logfile - \
        --log-level info
else
    # Development: Use Uvicorn with reload
    exec uvicorn app.main:app \
        --host 0.0.0.0 \
        --port ${PORT:-8000} \
        --reload
fi
