import * as gcp from "@pulumi/gcp";
import { gcpProject, gcpRegion, r2PublicUrl, secrets } from "./config";

// Placeholder image — CI/CD owns the actual image tag via `gcloud run deploy`.
// ignoreChanges below prevents Pulumi from reverting CI/CD deployments.
const image = `${gcpRegion}-docker.pkg.dev/${gcpProject}/services/api:latest`;

export function createCloudRun() {
  const service = new gcp.cloudrunv2.Service(
    "mealio-api",
    {
      project: gcpProject,
      location: gcpRegion,
      name: "mealio-api",
      ingress: "INGRESS_TRAFFIC_ALL",
      scaling: { minInstanceCount: 0 },
      template: {
        scaling: {
          minInstanceCount: 0,
          maxInstanceCount: 3,
        },
        containers: [
          {
            image,
            ports: { containerPort: 8080 },
            resources: {
              limits: { cpu: "1", memory: "512Mi" },
              startupCpuBoost: true,
            },
            envs: [
              { name: "APPLE_TEAM_ID", value: "6VMN7W3K93" },
              { name: "APPLE_BUNDLE_ID", value: "com.zzoo.mealio" },
              { name: "R2_BUCKET_NAME", value: "mealio-uploads" },
              { name: "R2_PUBLIC_URL", value: r2PublicUrl },
              { name: "GEMINI_MODEL", value: "gemini-2.5-flash" },
              { name: "DATABASE_URL", value: secrets.databaseUrl },
              { name: "JWT_SECRET", value: secrets.jwtSecret },
              { name: "GOOGLE_CLIENT_ID", value: secrets.googleClientId },
              { name: "R2_ACCOUNT_ID", value: secrets.r2AccountId },
              { name: "R2_ACCESS_KEY_ID", value: secrets.r2AccessKeyId },
              { name: "R2_SECRET_ACCESS_KEY", value: secrets.r2SecretAccessKey },
              { name: "SENTRY_DSN", value: secrets.sentryDsn },
              { name: "GEMINI_API_KEY", value: secrets.geminiApiKey },
            ],
            startupProbe: {
              httpGet: { path: "/health", port: 8080 },
              initialDelaySeconds: 0,
              periodSeconds: 4,
              failureThreshold: 5,
            },
            livenessProbe: {
              httpGet: { path: "/health", port: 8080 },
              periodSeconds: 15,
            },
          },
        ],
        maxInstanceRequestConcurrency: 80,
        timeout: "30s",
      },
    },
    {
      protect: true,
      // CI/CD manages the container image via `gcloud run deploy --image`.
      // Prevent Pulumi from reverting the image tag on every `pulumi up`.
      ignoreChanges: ["template.containers[0].image"],
    },
  );

  // Allow unauthenticated invocations
  new gcp.cloudrunv2.ServiceIamMember("mealio-api-public", {
    project: gcpProject,
    location: gcpRegion,
    name: service.name,
    role: "roles/run.invoker",
    member: "allUsers",
  });

  return service;
}
