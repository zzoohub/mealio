# Security Checklist

## Pre-Deployment

```
□ No hardcoded secrets in code
□ All secrets in environment variables
□ .env files in .gitignore
□ npm audit / pip audit passing
□ Security headers configured
□ HTTPS enforced
□ CORS properly configured
□ Rate limiting on auth endpoints
□ Input validation on all endpoints
□ SQL injection prevention verified
□ XSS prevention verified
□ Authentication on protected routes
□ Authorization checks (IDOR prevention)
□ Error messages don't leak internals
□ Logging excludes sensitive data
□ Debug mode disabled in production
```

## Periodic Review

```
□ Dependency security updates
□ Access key rotation
□ User permission audit
□ Log review for anomalies
□ SSL certificate expiry check
```
