# Veloris Backend

Production-ready FastAPI backend for the Veloris educational platform.

## Quick Start

### Development

1. **Install dependencies:**
```bash
pip install -r requirements.txt
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Run development server:**
```bash
uvicorn app.main:app --reload
```

Or use the start script:
```bash
chmod +x start.sh
./start.sh
```

### Production

See [DEPLOYMENT.md](../../DEPLOYMENT.md) for complete production deployment guide.

## Environment Variables

All configuration is done through environment variables. See `.env.example` for all available options.

### Critical Variables

- `DATABASE_URL`: PostgreSQL connection string (required in production)
- `SECRET_KEY`: JWT secret key (must be changed in production)
- `ENVIRONMENT`: Set to `production` for production deployment
- `ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins
- `GROQ_API_KEY`: Required for AI features

### Optional Variables

- `YOUTUBE_API_KEY`: Enables YouTube video search
- `GITHUB_TOKEN`: Increases GitHub API rate limits
- `POPPLER_PATH`: Path to Poppler for PDF processing
- `LOG_LEVEL`: Logging level (DEBUG, INFO, WARNING, ERROR)

## API Documentation

When running in development mode, API documentation is available at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

**Note:** Documentation is automatically disabled in production for security.

## Database

### Development
SQLite is used by default for development. The database file is created automatically.

### Production
PostgreSQL is required for production. Set `DATABASE_URL` to your PostgreSQL connection string.

### Migrations

```bash
# Create a new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

## Project Structure

```
app/
├── api/
│   └── routers/        # API endpoints
├── auth/               # Authentication
├── models/             # Database models
├── schemas/            # Pydantic schemas
├── config.py           # Configuration management
├── database.py         # Database connection
└── main.py             # Application entry point
```

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- CORS protection with configurable origins
- Rate limiting support
- SQL injection protection via SQLModel
- Environment-based configuration
- Secure headers in production
- API documentation disabled in production

## Testing

```bash
# Run tests
pytest

# With coverage
pytest --cov=app
```

## Docker

### Build
```bash
docker build -t veloris-backend .
```

### Run
```bash
docker run -p 8000:8000 --env-file .env veloris-backend
```

### Docker Compose
```bash
# From project root
docker-compose up
```

## Monitoring

### Health Check
```bash
curl http://localhost:8000/api/health
```

Response:
```json
{
  "status": "ok",
  "environment": "production",
  "version": "1.0.0"
}
```

### Logs

Logs are written to stdout/stderr and can be collected by your hosting platform.

Set `LOG_LEVEL=DEBUG` for detailed logging during troubleshooting.

## Performance

### Production Settings

- Uses Gunicorn with Uvicorn workers
- Connection pooling for PostgreSQL
- GZip compression for responses
- Async request handling
- Scheduled background tasks

### Recommended Resources

- **Minimum:** 512MB RAM, 1 CPU
- **Recommended:** 1GB RAM, 2 CPUs
- **Database:** Separate PostgreSQL instance

## Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` format
- Check network connectivity to database
- Ensure database exists and credentials are correct

### CORS Errors
- Add frontend URL to `ALLOWED_ORIGINS`
- Ensure protocol (http/https) matches

### Import Errors
- Reinstall dependencies: `pip install -r requirements.txt`
- Check Python version (3.11+ recommended)

### Performance Issues
- Increase number of workers
- Check database query performance
- Enable connection pooling
- Add database indexes

## Support

For issues or questions, check:
1. [DEPLOYMENT.md](../../DEPLOYMENT.md) - Deployment guide
2. Application logs
3. Database connection status
4. Environment variable configuration
