---
name: seo
description: |
  SEO checklist and structured data patterns.
  Use when: setting up metadata, structured data, OG images, multi-language SEO.
  Do not use for: general web performance (use performance-patterns skill).
  Workflow: Use alongside nextjs skill.
---

# SEO Patterns

**For latest Next.js metadata APIs, use context7 MCP server with library-id `vercel/next.js`.**

---

## Quick Checklist

### Per Page
- [ ] Unique title (50-60 chars)
- [ ] Meta description (150-160 chars)
- [ ] Canonical URL set
- [ ] OG tags (title, description, image)
- [ ] Single H1, proper heading hierarchy
- [ ] Images have alt text

### Site-Wide
- [ ] sitemap.xml generated
- [ ] robots.txt configured
- [ ] HTTPS enabled
- [ ] Core Web Vitals passing
- [ ] Hreflang tags (if multi-language)

---

## Next.js Metadata

**For latest Next.js metadata APIs:**
- Use `context7` MCP server
- Or see: [Next.js Metadata & OG Images](https://nextjs.org/docs/app/getting-started/metadata-and-og-images)

---

## Structured Data (JSON-LD)

**Rule: Add JSON-LD for content that benefits from rich results.**

### How to Add

```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
/>
```

### Article

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Article title",
  "description": "Article description",
  "image": "https://example.com/image.jpg",
  "datePublished": "2024-01-01",
  "author": { "@type": "Person", "name": "Author Name" }
}
```

### Product

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Product Name",
  "description": "Product description",
  "image": "https://example.com/product.jpg",
  "offers": {
    "@type": "Offer",
    "price": "29.99",
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock"
  }
}
```

### FAQ

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Question text?",
      "acceptedAnswer": { "@type": "Answer", "text": "Answer text" }
    }
  ]
}
```

---

## Multi-language SEO

Set `alternates.languages` in metadata with hreflang codes:

```
'en': 'https://example.com/en'
'ko': 'https://example.com/ko'
'x-default': 'https://example.com/en'
```

---

## References

- [Google Search Central](https://developers.google.com/search/docs)
- [Schema.org](https://schema.org/)
- [Rich Results Test](https://search.google.com/test/rich-results)
- [Next.js Metadata](https://nextjs.org/docs/app/getting-started/metadata-and-og-images)
