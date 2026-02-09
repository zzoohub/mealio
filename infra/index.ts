import { createIam } from "./src/gcp-iam";
import { createSecrets } from "./src/gcp-secrets";
import { createRegistry } from "./src/gcp-registry";
import { createCloudRun } from "./src/gcp-cloudrun";
import { createR2Bucket } from "./src/cloudflare";
import { createNeon } from "./src/neon";

// =============================================================================
// Managed by Pulumi (`pulumi destroy` will delete these)
// =============================================================================
// - GCP Cloud Run service (mealio-api)
// - GCP Secret Manager (7 secrets — containers only, not values)
// - GCP Artifact Registry (services repo)
// - GCP IAM: WIF pool, OIDC provider, service account
// - GCP IAM: Secret accessor bindings, Cloud Run public invoker
// - Cloudflare R2 bucket (mealio-uploads)
// - Neon database project (mealio)
//
// =============================================================================
// NOT managed by Pulumi (must delete manually on project teardown)
// =============================================================================
// - Sentry projects        → https://sentry.io
// - Google OAuth creds     → https://console.cloud.google.com/apis/credentials
// - Apple developer certs  → https://developer.apple.com
// - EAS project + secrets  → https://expo.dev
// - Cloudflare DNS records → https://dash.cloudflare.com
// - Cloudflare API tokens  → https://dash.cloudflare.com/profile/api-tokens
// - GitHub repo secrets    → https://github.com/zzoohub/mealio/settings/secrets
// - GCP project itself     → https://console.cloud.google.com
// =============================================================================

// IAM: WIF pool, provider, service account
createIam();

// GCP Secret Manager
const secretResources = createSecrets();

// Artifact Registry
createRegistry();

// Cloud Run
const cloudRunService = createCloudRun(secretResources);

// Cloudflare R2
createR2Bucket();

// Neon database
const neon = createNeon();

// Stack outputs
export const apiUrl = cloudRunService.uri;
export const neonProjectId = neon.projectId;
