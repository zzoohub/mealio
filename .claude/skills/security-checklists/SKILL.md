---
name: security-checklists
description: |
  Detailed security checklists by domain.
  Use with security-reviewer agent for deep vulnerability analysis.
  Reference specific files based on the code being reviewed.
---

# Security Checklists

## When to Reference

| Reviewing... | Use |
|--------------|-----|
| Login, signup, session, JWT, OAuth | `auth.md` |
| REST/GraphQL endpoints, request/response | `api.md` |
| package.json, requirements.txt, Dockerfile | `supply-chain.md` |
| Payment, inventory, pricing, state machines | `business-logic.md` |

## Quick Reference - Universal Red Flags

These apply everywhere:

```
□ Secrets in code, logs, or git history
□ User input reaching shell, eval, or raw queries
□ Missing ownership check before data access
□ State change without proper validation
```
