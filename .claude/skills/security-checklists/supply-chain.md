# Supply Chain & Dependency Security

## Dependency Auditing

| Check | Why |
|-------|-----|
| Security audit passing (npm/pip/cargo audit) | Known CVEs |
| Automated dependency updates enabled | Delayed patches |
| Known CVEs addressed or exception documented | Unpatched vulnerabilities |

**Patterns to catch:**
- Audit warnings ignored in CI
- No automated update mechanism (Dependabot, Renovate)
- Old versions with public exploits

---

## Version Pinning

| Check | Why |
|-------|-----|
| Lockfiles committed | Reproducible builds, prevents supply chain injection |
| Exact versions in production | Unexpected updates |
| CI uses frozen lockfile | Build-time injection |

**Patterns to catch:**
- Lockfile in .gitignore
- Range versions in dependencies (`^`, `~`, `*`, `>=`)
- CI installs without lockfile enforcement

---

## Install Scripts

| Check | Why |
|-------|-----|
| Postinstall scripts reviewed for new deps | Malicious package execution |
| Typosquatting risks checked | Malicious lookalike packages |
| Minimal install scripts in CI | Attack surface reduction |

**Patterns to catch:**
- Postinstall scripts with network calls or shell execution
- Package names similar to popular packages (one char off)
- Packages with very few downloads but similar names

---

## Container Security

| Check | Why |
|-------|-----|
| Base images pinned by digest | Unexpected base changes |
| Multi-stage builds | Dev dependencies in production |
| No secrets in image layers | Secrets in image history |
| Non-root user | Container escape impact |
| Minimal base image | Attack surface |

**Patterns to catch:**
- `FROM image:tag` without digest
- Secrets in ENV, COPY, or ARG
- No USER directive (runs as root)
- Full OS image when distroless/alpine works

---

## CI/CD Pipeline

| Check | Why |
|-------|-----|
| Secrets not logged | CI log exposure |
| Artifacts from trusted sources only | Supply chain injection |
| Pipeline config protected from contributors | Pipeline manipulation |
| Actions/plugins pinned to specific versions | Compromised action updates |

**Patterns to catch:**
- Secrets echoed or in verbose output
- Third-party actions at `@master` instead of pinned version
- PR can modify CI config and run it

---

## Git & Secrets

| Check | Why |
|-------|-----|
| No secrets in git history | Historical exposure |
| .env in .gitignore | Accidental commit |
| Pre-commit hooks for secret detection | Prevention |
| Protected branches configured | Unauthorized changes |

**Patterns to catch:**
- Secrets visible in `git log -p`
- .env or credential files tracked
- No secret scanning in CI (truffleHog, git-secrets)

---

## SBOM & License

| Check | Why |
|-------|-----|
| SBOM generated for production | Vulnerability tracking, compliance |
| License compliance checked | Legal risk |
| Transitive dependencies audited | Hidden vulnerabilities |
