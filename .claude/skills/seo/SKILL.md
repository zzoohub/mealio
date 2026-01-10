---
name: seo
description: SEO checklist and common patterns. Covers structured data (JSON-LD), dynamic OG images, and multi-language setup. Use as a reference when setting up SEO for Next.js apps.
---

# SEO

## Checklist

### Per Page

- [ ] Unique, descriptive title (50-60 chars)
- [ ] Meta description (150-160 chars)
- [ ] Canonical URL set
- [ ] Open Graph tags (title, description, image)
- [ ] Structured data (JSON-LD) where applicable
- [ ] Single H1, proper heading hierarchy
- [ ] Alt text on images

### Site-Wide

- [ ] sitemap.xml generated and submitted
- [ ] robots.txt configured
- [ ] HTTPS enabled
- [ ] Mobile-friendly (responsive)
- [ ] Core Web Vitals passing (LCP < 2.5s, INP < 200ms, CLS < 0.1)
- [ ] Hreflang tags (if multi-language)
- [ ] No broken links

---

## Dynamic OG Images

```typescript
// app/api/og/route.tsx
import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || "Default Title";
  
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#1a1a1a",
          color: "white",
          fontSize: 60,
          fontWeight: "bold",
        }}
      >
        {title}
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
```

```typescript
// Usage in metadata
export const metadata: Metadata = {
  openGraph: {
    images: ["/api/og?title=My+Page+Title"],
  },
};
```

---

## Structured Data (JSON-LD)

### Article / Blog Post

```typescript
const articleSchema = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: post.title,
  description: post.excerpt,
  image: post.coverImage,
  datePublished: post.publishedAt,
  dateModified: post.updatedAt,
  author: {
    "@type": "Person",
    name: post.author.name,
  },
};
```

### Organization

```typescript
const orgSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Company Name",
  url: "https://example.com",
  logo: "https://example.com/logo.png",
  sameAs: [
    "https://twitter.com/company",
    "https://linkedin.com/company/company",
  ],
};
```

### Product

```typescript
const productSchema = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Product Name",
  description: "Product description",
  image: "https://example.com/product.jpg",
  offers: {
    "@type": "Offer",
    price: "29.99",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
  },
};
```

### FAQ

```typescript
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is this product?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "This product is...",
      },
    },
  ],
};
```

### Injecting JSON-LD

```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
/>
```

---

## Multi-language SEO

```typescript
// app/[lang]/layout.tsx
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  
  return {
    alternates: {
      canonical: `https://mysite.com/${lang}`,
      languages: {
        "en": "https://mysite.com/en",
        "ko": "https://mysite.com/ko",
        "x-default": "https://mysite.com/en",
      },
    },
  };
}
```

---

## References

- Google Search Central: https://developers.google.com/search/docs
- Schema.org: https://schema.org/
- Rich Results Test: https://search.google.com/test/rich-results
