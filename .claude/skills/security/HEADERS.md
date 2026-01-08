# Security Headers - Next.js

Complete security headers configuration for Next.js applications.

## Configuration

```typescript
// next.config.js
const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline';
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: https:;
      font-src 'self';
      connect-src 'self' https://api.example.com;
      frame-ancestors 'none';
    `.replace(/\n/g, ""),
  },
];

module.exports = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};
```

## Header Explanations

| Header | Purpose |
|--------|---------|
| HSTS | Force HTTPS connections |
| X-Frame-Options | Prevent clickjacking |
| X-Content-Type-Options | Prevent MIME sniffing |
| CSP | Control resource loading |
| Permissions-Policy | Disable browser features |
