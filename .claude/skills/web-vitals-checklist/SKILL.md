---
name: web-vitals-checklist
description: |
  Core Web Vitals targets and performance checklist.
  Use when: reviewing code for performance, setting performance targets, defining budgets.
  For automated measurement: use web-vitals-auditor sub-agent.
---

# Web Vitals Checklist

Framework-agnostic performance criteria. Focuses on **what to verify**, not how to measure.

---

## Core Web Vitals Targets

| Metric | Pass | Excellent |
|--------|------|-----------|
| LCP (Largest Contentful Paint) | < 2.5s | < 1.5s |
| INP (Interaction to Next Paint) | < 200ms | < 100ms |
| CLS (Cumulative Layout Shift) | < 0.1 | < 0.05 |
| TTFB (Time to First Byte) | < 800ms | < 400ms |
| FCP (First Contentful Paint) | < 1.8s | < 1.0s |

- **Pass**: Google official threshold. No SEO penalty.
- **Excellent**: Top-tier site performance. Unofficial target.

---

## 1. Loading Performance (LCP)

### Critical Path
- [ ] No render-blocking resources in document head
- [ ] Critical resources load before non-critical
- [ ] Document response starts within TTFB target

### LCP Element
- [ ] LCP element identified and loads early
- [ ] LCP element not lazy-loaded
- [ ] LCP image prioritized over other resources
- [ ] No client-side rendering delays for LCP content

### Resource Loading
- [ ] Critical third-party origins connected early
- [ ] Above-fold images load without delay
- [ ] No unnecessary redirects in critical path

---

## 2. Interactivity (INP)

### Main Thread
- [ ] No long tasks (> 50ms) during interaction
- [ ] Heavy computation offloaded from main thread
- [ ] Event handlers complete within 100ms

### Input Response
- [ ] Visual feedback appears immediately on interaction
- [ ] Input events not blocked by other scripts
- [ ] Frequent events (scroll, input) properly throttled

### Script Execution
- [ ] Third-party scripts don't block user interaction
- [ ] No synchronous storage access in interaction handlers
- [ ] DOM updates batched efficiently

---

## 3. Visual Stability (CLS)

### Layout Reservation
- [ ] Images have dimensions before load
- [ ] Videos and iframes have reserved space
- [ ] Ads and embeds don't shift content
- [ ] Dynamic content has minimum space reserved

### Font Stability
- [ ] Text doesn't reflow after font load
- [ ] Fallback font size matches web font
- [ ] No invisible text during font load (unless intended)

### Content Injection
- [ ] No content inserted above existing content
- [ ] Animations don't trigger layout shifts
- [ ] Skeleton/placeholder matches final content size

---

## 4. Network & Caching

### Cache Effectiveness
- [ ] Static assets cached long-term
- [ ] Cache hit rate > 80% for repeat visits
- [ ] API responses cached appropriately
- [ ] No unnecessary network requests on repeat visits

### Compression
- [ ] Text resources compressed (Brotli preferred)
- [ ] Compression ratio reasonable for content type

### Protocol
- [ ] HTTP/2 or HTTP/3 in use
- [ ] Connection reuse effective
- [ ] No excessive parallel connections to same origin

### CDN
- [ ] Static assets served from edge locations
- [ ] Cache headers set correctly at edge
- [ ] Geographic latency acceptable for target users

---

## 5. Images

### Format Efficiency
- [ ] Modern formats used where supported (WebP, AVIF)
- [ ] Format appropriate for content type
- [ ] No unnecessarily high quality settings

### Sizing
- [ ] Images not larger than display size
- [ ] Responsive images serve appropriate sizes
- [ ] No oversized images on mobile

### Loading Behavior
- [ ] Below-fold images lazy-loaded
- [ ] Above-fold images load immediately
- [ ] No layout shift when images load

---

## 6. JavaScript

### Bundle Size
- [ ] Total JS size within budget
- [ ] No duplicate dependencies in bundle
- [ ] Dead code eliminated

### Loading Behavior
- [ ] Critical JS loads first
- [ ] Non-critical JS deferred
- [ ] Third-party scripts don't block page load

### Code Splitting
- [ ] Routes load only required code
- [ ] Large features split into separate chunks
- [ ] Initial bundle minimal

### Dependencies
- [ ] No unused dependencies in bundle
- [ ] Heavy libraries loaded only when needed
- [ ] No full library imports when subset sufficient

---

## 7. CSS

### Delivery
- [ ] Critical CSS available immediately
- [ ] Non-critical CSS doesn't block render
- [ ] Total CSS size within budget

### Efficiency
- [ ] No unused CSS in critical path
- [ ] Selector complexity reasonable
- [ ] No excessive specificity wars

### Animation Performance
- [ ] Animations don't trigger layout recalculation
- [ ] Animations run at 60fps
- [ ] Off-screen content rendering optimized

---

## 8. Fonts

### Loading Impact
- [ ] Fonts don't block text rendering excessively
- [ ] Font files load within LCP budget
- [ ] No visible font swap flash (or acceptable)

### Efficiency
- [ ] Font files reasonably sized
- [ ] Only necessary font weights loaded
- [ ] Font family count minimal

---

## 9. Third-Party Scripts

### Audit
- [ ] All third-party scripts justified and necessary
- [ ] Third-party impact measured and acceptable
- [ ] Unused third-party scripts removed

### Performance Impact
- [ ] Third-party scripts don't block page load
- [ ] Third-party scripts don't degrade INP
- [ ] Third-party content doesn't cause CLS

### Resilience
- [ ] Page functional if third-party fails
- [ ] Third-party timeouts don't block critical path

---

## 10. Server Performance

### Response Time
- [ ] Server response within TTFB target
- [ ] Database queries not blocking response
- [ ] Server-side caching effective

### Infrastructure
- [ ] Server located near target users (or edge deployed)
- [ ] Server resources adequate for load
- [ ] No bottlenecks under normal traffic

### Monitoring
- [ ] Real User Monitoring (RUM) active
- [ ] Core Web Vitals tracked in production
- [ ] Performance regression alerts configured

---

## Performance Budget

| Resource | Budget |
|----------|--------|
| Total page weight | < 1.5MB |
| JavaScript (compressed) | < 300KB |
| CSS (compressed) | < 100KB |
| Images (above-fold) | < 500KB |
| Fonts | < 100KB |
| Third-party (total) | < 100KB |
