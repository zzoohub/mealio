import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config("mealio");
const gcpConfig = new pulumi.Config("gcp");

// GCP
export const gcpProject = gcpConfig.require("project");
export const gcpRegion = gcpConfig.require("region");

// Neon
export const neonProjectId = config.require("neon-project-id");

// Cloudflare
export const cloudflareAccountId = config.require("cloudflare-account-id");

// Plain env vars for Cloud Run
export const r2PublicUrl = config.require("r2-public-url");

// Secrets (encrypted in Pulumi state via `pulumi config set --secret`)
export const secrets = {
  databaseUrl: config.requireSecret("database-url"),
  jwtSecret: config.requireSecret("jwt-secret"),
  googleClientId: config.requireSecret("google-client-id"),
  r2AccountId: config.requireSecret("r2-account-id"),
  r2AccessKeyId: config.requireSecret("r2-access-key-id"),
  r2SecretAccessKey: config.requireSecret("r2-secret-access-key"),
  sentryDsn: config.requireSecret("sentry-dsn"),
  geminiApiKey: config.requireSecret("gemini-api-key"),
};
