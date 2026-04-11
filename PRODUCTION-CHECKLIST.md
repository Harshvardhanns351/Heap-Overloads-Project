# Production Deployment Checklist

Use this checklist to ensure your Veloris deployment is production-ready.

## Pre-Deployment

### Backend Configuration

- [ ] Copy `.env.example` to `.env` in `backend/server/`
- [ ] Set `ENVIRONMENT=production`
- [ ] Generate and set secure `SECRET_KEY` (use: `openssl rand -hex 32`)
- [ ] Configure PostgreSQL `DATABASE_URL` (not SQLite)
- [ ] Set `ALLOWED_ORIGINS` with your frontend domain(s)
- [ ] Set `FRONTEND_URL` to your frontend domain
- [ ] Configure `TRUSTED_HOSTS` with your backend domain
- [ ] Add `GROQ_API_KEY` for AI features
- [ ] Add `YOUTUBE_API_KEY` (optional, for video search)
- [ ] Add `GITHUB_TOKEN` (optional, for better rate limits)
- [ ] Review and adjust `ACCESS_TOKEN_EXPIRE_MINUTES`
- [ ] Review and adjust `MAX_UPLOAD_SIZE_MB`
- [ ] Set appropriate `LOG_LEVEL` (INFO or WARNING for production)

### Frontend Configuration

- [ ] Create `.env.production` in `front_end/`
- [ ] Set `VITE_API_BASE_URL` to your backend API URL
- [ ] Set `VITE_ENVIRONMENT=production`
- [ ] Verify `VITE_APP_NAME` and `VITE_APP_VERSION`

### Database

- [ ] PostgreSQL database created
- [ ] Database credentials secured
- [ ] Database accessible from backend server
- [ ] SSL/TLS enabled for database connection
- [ ] Automated backups configured
- [ ] Run migrations: `alembic upgrade head`

### Security

- [ ] All secrets stored in environment variables
- [ ] No hardcoded credentials in code
- [ ] `.env` files added to `.gitignore`
- [ ] HTTPS enabled for both frontend and backend
- [ ] SSL certificates valid and not expired
- [ ] CORS configured with specific origins (not `*`)
- [ ] Rate limiting configured
- [ ] File upload size limits set
- [ ] Allowed file extensions restricted

## Deployment

### Backend

- [ ] Dependencies installed: `pip install -r requirements.txt`
- [ ] Database migrations applied: `alembic upgrade head`
- [ ] Uploads directory created and writable
- [ ] Using production ASGI server (Gunicorn + Uvicorn)
- [ ] Appropriate number of workers configured
- [ ] Health check endpoint responding: `/api/health`
- [ ] API documentation disabled (automatic in production)
- [ ] Logs being captured and stored
- [ ] Error tracking configured (optional: Sentry)

### Frontend

- [ ] Dependencies installed: `npm install`
- [ ] Production build created: `npm run build`
- [ ] Build artifacts deployed to hosting platform
- [ ] Environment variables configured on hosting platform
- [ ] CDN configured (if applicable)
- [ ] Gzip/Brotli compression enabled
- [ ] Cache headers configured

### Infrastructure

- [ ] Domain names configured and pointing to servers
- [ ] DNS records propagated
- [ ] Load balancer configured (if applicable)
- [ ] Auto-scaling configured (if applicable)
- [ ] Firewall rules configured
- [ ] Only necessary ports open (80, 443)
- [ ] SSH access secured (key-based, no password)

## Post-Deployment

### Testing

- [ ] Health check endpoint returns 200 OK
- [ ] Frontend loads without errors
- [ ] User registration works
- [ ] User login works
- [ ] API endpoints respond correctly
- [ ] File uploads work
- [ ] Database queries execute successfully
- [ ] CORS working correctly
- [ ] HTTPS redirects working
- [ ] Mobile responsiveness verified

### Monitoring

- [ ] Application monitoring configured
- [ ] Error tracking active
- [ ] Log aggregation configured
- [ ] Uptime monitoring configured
- [ ] Performance monitoring active
- [ ] Database monitoring configured
- [ ] Disk space monitoring active
- [ ] Alert notifications configured

### Performance

- [ ] Response times acceptable (< 500ms for most endpoints)
- [ ] Database queries optimized
- [ ] Indexes created on frequently queried columns
- [ ] Static assets cached properly
- [ ] API responses compressed
- [ ] Connection pooling configured
- [ ] No N+1 query issues

### Backup & Recovery

- [ ] Database backup strategy implemented
- [ ] Backup restoration tested
- [ ] File uploads backed up
- [ ] Disaster recovery plan documented
- [ ] Backup retention policy defined
- [ ] Automated backup verification

### Documentation

- [ ] Deployment process documented
- [ ] Environment variables documented
- [ ] API endpoints documented
- [ ] Troubleshooting guide created
- [ ] Runbook for common operations
- [ ] Contact information for support

## Ongoing Maintenance

### Daily

- [ ] Check error logs
- [ ] Monitor application performance
- [ ] Review security alerts

### Weekly

- [ ] Review application metrics
- [ ] Check disk space usage
- [ ] Review database performance
- [ ] Check backup success

### Monthly

- [ ] Update dependencies
- [ ] Review and rotate logs
- [ ] Security audit
- [ ] Performance optimization review
- [ ] Backup restoration test

### Quarterly

- [ ] SSL certificate renewal check
- [ ] Disaster recovery drill
- [ ] Security penetration testing
- [ ] Capacity planning review

## Security Best Practices

- [ ] Keep all dependencies up to date
- [ ] Regular security audits
- [ ] Principle of least privilege for database access
- [ ] Regular password rotation for service accounts
- [ ] Monitor for suspicious activity
- [ ] Keep backups encrypted
- [ ] Regular vulnerability scanning
- [ ] Security headers configured
- [ ] Input validation on all endpoints
- [ ] SQL injection protection verified

## Compliance (if applicable)

- [ ] GDPR compliance verified
- [ ] Data retention policies implemented
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Cookie consent implemented
- [ ] Data export functionality
- [ ] Data deletion functionality
- [ ] Audit logging enabled

## Rollback Plan

- [ ] Previous version tagged in git
- [ ] Rollback procedure documented
- [ ] Database migration rollback tested
- [ ] Rollback can be executed quickly
- [ ] Team trained on rollback procedure

## Sign-off

- [ ] Technical lead approval
- [ ] Security review completed
- [ ] Performance testing passed
- [ ] Stakeholder approval
- [ ] Go-live date confirmed

---

**Deployment Date:** _______________

**Deployed By:** _______________

**Reviewed By:** _______________

**Notes:**
