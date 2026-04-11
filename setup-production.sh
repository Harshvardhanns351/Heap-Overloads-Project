#!/bin/bash
# Quick setup script for Veloris production deployment

set -e

echo "========================================="
echo "Veloris Production Setup"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    echo -e "${RED}Please do not run as root${NC}"
    exit 1
fi

# Function to generate random secret
generate_secret() {
    openssl rand -hex 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(32))"
}

echo "Step 1: Backend Configuration"
echo "------------------------------"

# Backend setup
cd backend/server

if [ -f .env ]; then
    echo -e "${YELLOW}Warning: .env file already exists${NC}"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Keeping existing .env file"
        cd ../..
        exit 0
    fi
fi

# Copy example file
cp .env.example .env

# Generate secret key
SECRET_KEY=$(generate_secret)
echo -e "${GREEN}Generated SECRET_KEY${NC}"

# Prompt for configuration
echo ""
echo "Please provide the following information:"
echo ""

read -p "Environment (production/staging) [production]: " ENVIRONMENT
ENVIRONMENT=${ENVIRONMENT:-production}

read -p "Database URL (PostgreSQL): " DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Database URL is required!${NC}"
    exit 1
fi

read -p "Frontend URL (e.g., https://yourdomain.com): " FRONTEND_URL
if [ -z "$FRONTEND_URL" ]; then
    echo -e "${RED}Frontend URL is required!${NC}"
    exit 1
fi

read -p "Backend domain (e.g., api.yourdomain.com): " BACKEND_DOMAIN

read -p "GROQ API Key: " GROQ_API_KEY
read -p "YouTube API Key (optional): " YOUTUBE_API_KEY
read -p "GitHub Token (optional): " GITHUB_TOKEN

# Update .env file
cat > .env << EOF
# Database
DATABASE_URL=$DATABASE_URL

# Environment
ENVIRONMENT=$ENVIRONMENT

# Security
SECRET_KEY=$SECRET_KEY
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# CORS
ALLOWED_ORIGINS=$FRONTEND_URL
FRONTEND_URL=$FRONTEND_URL

# Trusted Hosts
TRUSTED_HOSTS=$BACKEND_DOMAIN,${BACKEND_DOMAIN#api.}

# API Keys
GROQ_API_KEY=$GROQ_API_KEY
YOUTUBE_API_KEY=$YOUTUBE_API_KEY
GITHUB_TOKEN=$GITHUB_TOKEN

# File Upload
MAX_UPLOAD_SIZE_MB=10
ALLOWED_UPLOAD_EXTENSIONS=.pdf,.jpg,.jpeg,.png,.doc,.docx

# Rate Limiting
RATE_LIMIT_PER_MINUTE=60

# Logging
LOG_LEVEL=INFO

# OCR (set if needed)
POPPLER_PATH=
EOF

echo -e "${GREEN}Backend .env file created successfully!${NC}"

cd ../..

# Frontend setup
echo ""
echo "Step 2: Frontend Configuration"
echo "-------------------------------"

cd front_end

# Create production env file
cat > .env.production << EOF
# Production Environment
VITE_API_BASE_URL=https://$BACKEND_DOMAIN/api
VITE_ENVIRONMENT=production
VITE_APP_NAME=Veloris
VITE_APP_VERSION=1.0.0
EOF

echo -e "${GREEN}Frontend .env.production file created successfully!${NC}"

cd ..

# Summary
echo ""
echo "========================================="
echo "Setup Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Backend:"
echo "   cd backend/server"
echo "   pip install -r requirements.txt"
echo "   alembic upgrade head"
echo "   chmod +x start.sh"
echo "   ./start.sh"
echo ""
echo "2. Frontend:"
echo "   cd front_end"
echo "   npm install"
echo "   npm run build"
echo ""
echo "3. Review configuration files:"
echo "   - backend/server/.env"
echo "   - front_end/.env.production"
echo ""
echo "4. See DEPLOYMENT.md for platform-specific deployment instructions"
echo ""
echo -e "${YELLOW}IMPORTANT: Keep your .env files secure and never commit them to git!${NC}"
echo ""
