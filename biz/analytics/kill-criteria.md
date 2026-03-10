# Kill / Keep / Scale Criteria -- Mealio

Last updated: 2026-03-10
Status: **Pre-measurement** (tracking not yet instrumented; criteria defined for when data is available)

---

## Product Context

Mealio is a photo-first meal tracking app with AI nutrition analysis. It runs in dual mode: guest (local-only, max 10 entries) and authenticated (full features, server-backed). This is a solopreneur product -- resource allocation decisions must be ruthless.

**Usage category**: Daily utility (meal tracking targets 1-3x/day usage)
**Comparable products**: MyFitnessPal, Lose It!, Yazio, Cronometer
**Key differentiator**: Photo capture flow + AI analysis (zero-friction logging vs manual macros entry)

---

## Decision Framework

| Signal | Kill | Keep (iterate) | Scale (invest) |
|--------|------|-----------------|----------------|
| **D30 retention plateau** | No plateau visible (curve keeps declining) | Emerging plateau at 5-15% | Established plateau > 15% |
| **Activation rate** (first meal saved within 24h) | < 15% | 15-40% | > 40% |
| **Aha Moment reach rate** (3 meals in 7 days) | < 5% | 5-20% | > 20% |
| **D7 retention** | < 10% | 10-25% | > 25% |
| **Weekly usage frequency** (meals/week for retained users) | < 2 meals/week | 2-5 meals/week | > 5 meals/week |
| **Guest-to-auth conversion** | < 5% | 5-20% | > 20% |
| **Organic inflow trend** (30d trailing) | Declining | Flat | Rising |
| **Sean Ellis score** ("very disappointed" %) | < 20% | 20-40% | > 40% |

### How to read the table

- **Kill**: 3+ signals in the Kill column. The product is not finding PMF. Pivot or shut down.
- **Keep**: Mostly Keep signals with 1-2 in Scale. There is a signal of value -- iterate on activation and retention before investing in growth.
- **Scale**: 3+ signals in Scale, none in Kill. PMF is established. Invest in acquisition and growth loops.

---

## Carrying Capacity (CC)

CC = the equilibrium MAU a product settles at when paid acquisition is zero.

```
CC = Organic New Users per Period / (1 - Retention Rate for that Period)
```

For a monthly calculation:
```
CC_monthly = Monthly Organic New Users / Monthly Churn Rate
```

### CC Benchmarks for Kill/Keep/Scale

| CC Trend (60d rolling) | Decision |
|------------------------|----------|
| CC declining for 60+ days | Kill signal |
| CC flat | Keep -- work on retention first |
| CC rising | Scale signal -- but verify retention plateau exists first |

### Why CC, not MAU

MAU can grow from paid acquisition even when the product is broken. CC strips out artificial growth and shows the product's natural equilibrium. A product with rising MAU but declining CC is spending its way to a cliff.

---

## Metrics to Monitor Weekly

### Tier 1 (report every week)

1. **Weekly Active Users (WAU)** -- segmented by auth_mode
2. **Meals logged this week** -- absolute count and per-user average
3. **Activation rate** -- % of new users who saved first meal within 24h
4. **D1 / D7 retention** for this week's cohort
5. **Guest-to-auth conversion rate** -- trailing 30d

### Tier 2 (report biweekly or on demand)

6. **D30 retention** for the cohort from 30 days ago
7. **CC estimate** (60d trailing window, given small user base)
8. **AI analysis completion rate** -- % of entries that receive completed analysis
9. **Feature adoption rates** -- search, edit, share
10. **Aha Moment reach rate** -- % of new users who log 3 meals in first 7 days

---

## Small Data Adjustments

Mealio is early-stage. Expect dozens to low hundreds of users for the first months. All quantitative metrics above should be treated as **directional signals**, not statistically significant conclusions.

### Adaptations

- **Report absolute numbers alongside percentages**: "3 of 12 users retained at D7 (25%)" is more honest than "25% D7 retention"
- **Use 60-90 day windows** for CC instead of 30 days to smooth noise
- **Supplement with qualitative data**: Cross-reference `biz/ops/feedback-log.md` for every weekly report
- **Sean Ellis survey early**: Deploy the "How would you feel if you could no longer use Mealio?" survey once you have 30+ active users. At this stage, the survey is more reliable than retention curves for PMF assessment
- **Investigate individual users**: With < 100 users, every churn and every power user matters. Note specific user behaviors in weekly reports

### When to transition to full quantitative analysis

- 200+ cumulative signups: Activation funnel percentages become meaningful
- 50+ users in a monthly cohort: Retention curves become plottable
- 500+ MAU: CC calculation becomes reliable

---

## Current Assessment

**Status**: Cannot assess -- no tracking instrumented yet.

**Next steps**:
1. Instrument P0 events from `biz/analytics/tracking-plan.md`
2. Wait for 2-4 weeks of data collection
3. Produce first weekly report with whatever data is available
4. Deploy Sean Ellis survey once 30+ users are active
5. Reassess Kill/Keep/Scale with real data

---

## Review Cadence

- **Weekly**: Tier 1 metrics in `biz/analytics/reports/week-YYYY-WW.md`
- **Monthly**: Full Kill/Keep/Scale assessment update to this file
- **On milestone**: Update when crossing 100, 500, 1000 users
