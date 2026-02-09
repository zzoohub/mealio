import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config("mealio");
const gcpConfig = new pulumi.Config("gcp");

// GCP
export const gcpProject = gcpConfig.require("project");
export const gcpRegion = gcpConfig.require("region");

// Neon
export const neonProjectId = config.require("neonProjectId");

// Cloudflare
export const cloudflareAccountId = config.require("cloudflareAccountId");

// Plain env vars for Cloud Run
export const r2PublicUrl = config.require("r2PublicUrl");
