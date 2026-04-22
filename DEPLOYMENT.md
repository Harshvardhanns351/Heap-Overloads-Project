# Veloris Production Deployment Guide

This guide covers deploying Veloris to production with proper security and configuration.

## Prerequisites

- PostgreSQL database (recommended: Neon, Supabase, or AWS RDS)
- Backend hosting (Railway, Render, AWS, or similar)
- Frontend hosting (Vercel, Netlify, or similar)
- Domain names configured (optional but recommended)

## Backend Deployment

### 1. Environment Configuration

Create a `.env` file in `backend/server/` with production values:

```bash
# Database - Use PostgreSQL in production
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require

# Environment
ENVIRONMENT=production

# Security - CRITICAL: Generate a secure secret key
# Generate with: openssl rand -hex 32
SECRET_KEY=your-secure-secret-key-here

# CORS - Add your frontend domain(s)
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
FRONTEND_URL=https://yourdomain.com

# Trusted Hosts - Add your backend domain
TRUSTED_HOSTS=api.yourdomain.com,yourdomain.com

# API Keys
GROQ_API_KEY=your-groq-api-key
YOUTUBE_API_KEY=your-youtube-api-key
GITHUB_TOKEN=your-github-token

# JWT Configuration
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# File Upload
MAX_UPLOAD_SIZE_MB=10
ALLOWED_UPLOAD_EXTENSIONS=.pdf,.jpg,.jpeg,.png,.doc,.docx

# Rate Limiting
RATE_LIMIT_PER_MINUTE=60

# Logging
LOG_LEVEL=INFO
```

### 2. Database Migration

For production, use Alembic migrations instead of auto-creating tables:

```bash
cd backend/server
alembic upgrade head
```

### 3. Install Dependencies

```bash
cd backend/server
pip install -r requirements.txt
```

### 4. Run Production Server

Use a production ASGI server like Gunicorn with Uvicorn workers:

```bash
pip install gunicorn
gunicorn app.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -
```

### 5. Platform-Specific Deployment

#### Railway
1. Create new project
2. Add PostgreSQL database
3. Connect GitHub repository
4. Set environment variables in Railway dashboard
5. Deploy

#### Render
1. Create new Web Service
2. Connect GitHub repository
3. Set build command: `pip install -r requirements.txt`
4. Set start command: `gunicorn app.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT`
5. Add environment variables
6. Deploy

#### Docker
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["gunicorn", "app.main:app", "--workers", "4", "--worker-class", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"]
```

## Frontend Deployment

### 1. Environment Configuration

Update `front_end/.env.production`:

```bash
VITE_API_BASE_URL=https://your-backend-domain.com/api
VITE_ENVIRONMENT=production
VITE_APP_NAME=Veloris
VITE_APP_VERSION=1.0.0
```

### 2. Build for Production

```bash
cd front_end
npm install
npm run build
```

### 3. Platform-Specific Deployment

#### Vercel
1. Connect GitHub repository
2. Set root directory to `front_end`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add environment variables
6. Deploy

#### Netlify
1. Connect GitHub repository
2. Base directory: `front_end`
3. Build command: `npm run build`
4. Publish directory: `front_end/dist`
5. Add environment variables
6. Deploy

## Security Checklist

- [ ] Change `SECRET_KEY` to a secure random value
- [ ] Use PostgreSQL (not SQLite) in production
- [ ] Enable HTTPS for both frontend and backend
- [ ] Configure CORS with specific origins (not `*`)
- [ ] Set `ENVIRONMENT=production`
- [ ] Disable API docs in production (automatic)
- [ ] Configure trusted hosts
- [ ] Set up database backups
- [ ] Enable rate limiting
- [ ] Configure proper logging
- [ ] Set up monitoring and alerts
- [ ] Use environment variables for all secrets
- [ ] Never commit `.env` files to git

## Post-Deployment

### Health Check

Test the backend health endpoint:
```bash
curl https://your-backend-domain.com/api/health
```

Expected response:
```json
{
  "status": "ok",
  "environment": "production",
  "version": "1.0.0"
}
```

### Database Seeding

If you need demo data:
```bash
# SSH into your backend server
python seed_data.py
```

### Monitoring

Set up monitoring for:
- API response times
- Error rates
- Database connection pool
- Memory and CPU usage
- Disk space (for uploads)

## Troubleshooting

### CORS Errors
- Verify `ALLOWED_ORIGINS` includes your frontend URL
- Check that frontend is using correct `VITE_API_BASE_URL`
- Ensure HTTPS is used consistently

### Database Connection Issues
- Check `DATABASE_URL` format
- Verify database is accessible from backend server
- Check connection pool settings in `app/database.py`

### 502/504 Errors
- Increase worker timeout
- Check database query performance
- Verify sufficient server resources

## Scaling Considerations

### Backend
- Increase Gunicorn workers based on CPU cores
- Use Redis for caching
- Implement database read replicas
- Use CDN for static files

### Frontend
- Enable CDN caching
- Optimize bundle size
- Implement code splitting
- Use service workers for offline support

## Maintenance

### Database Backups
Set up automated daily backups of your PostgreSQL database.

### Log Rotation
Configure log rotation to prevent disk space issues.

### Updates
```bash
# Backend
pip install -r requirements.txt --upgrade
alembic upgrade head

# Frontend
npm update
npm run build
```

## Support

For issues or questions:
- Check logs: `LOG_LEVEL=DEBUG` in backend
- Review error messages in browser console
- Check database connection and migrations
- Verify all environment variables are set correctly
