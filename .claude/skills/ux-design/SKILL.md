---
name: ux-design
description: |
  UX design principles and diagnostic frameworks.
  Use when: app feels uncomfortable, designing user journeys, layout decisions, product planning.
  Do not use for: visual styling, color choices, component implementation (use design-system skill).
  Workflow: Often used before design-system (new features) or standalone (diagnosis, improvements).
references:
  - cognitive-principles.md   # Hick's Law, Fitts's Law, etc. with examples
  - design-process.md         # Step-by-step flow design guide
  - ergonomics.md             # Layout specs, touch targets, accessibility
---

# UX Design

## First Principles (Every Task)

Before designing anything, answer in order:

1. **What is the user's ONE goal?** (Not features, not business metrics—their actual intent)
2. **What is the minimum needed to achieve it?** (Information, actions, screens)
3. **What can be removed?** (If removing it doesn't block the goal, remove it)

**Rule: If #1 is unclear, stop and clarify before proceeding.**

---

## Quick Diagnosis

| Problem | Principle | Action |
|---------|-----------|--------|
| User hesitates | Hick's Law | Reduce choices, progressive disclosure |
| User misses targets | Fitts's Law | Increase size, reduce distance |
| User overwhelmed | Cognitive Load | Show only essential info |
| User abandons midway | Goal Gradient | Show progress, make completion visible |
| User remembers negatively | Peak-End Rule | Fix core interaction and final state |

For detailed explanations with examples → see `cognitive-principles.md`

---

## Anti-patterns (Never Include)

These fail the "Does this help the user complete their goal?" test:

- Marketing copy, taglines, promotional language
- Hero sections with vague value propositions
- Decorative sections without functional purpose
- Unnecessary onboarding or splash screens
- Confirmation dialogs for non-destructive actions
- Elements that exist "because other apps have it"

**Rule: If adding something "just in case"—don't.**

---

## Core Philosophy

> The best UX is one the user doesn't notice. They should remember what they accomplished, not how the interface looked.

- **Efficiency**: Minimum steps, minimum time, minimum cognitive effort
- **Simplicity**: One primary action per screen, clear hierarchy, no clutter

**Rule: If a design needs explanation, it's not simple enough.**

---

## Quick Checklist

Before finalizing any UX decision:

- [ ] User's ONE goal clearly identified
- [ ] Every element passes "does this help the goal?" test
- [ ] Primary action is ONE and visually dominant per screen
- [ ] Information shown is only what's needed for current decision
- [ ] Feedback exists for user actions
- [ ] Checked against Anti-patterns above
- [ ] Mobile: primary actions in thumb zone (see `ergonomics.md`)
- [ ] Accessibility: not using color as only indicator
