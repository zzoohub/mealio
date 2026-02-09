import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";
import { gcpProject, gcpRegion, r2PublicUrl } from "./config";
import { SecretResource } from "./gcp-secrets";

const image = `${gcpRegion}-docker.pkg.dev/${gcpProject}/services/api:latest`;

export function createCloudRun(secretResources: SecretResource[]) {
  const secretEnvVars = secretResources.map((sr) => ({
    name: sr.envVar,
    valueSource: {
      secretKeyRef: {
        secret: sr.secret.secretId,
        version: "latest",
      },
    },
  }));

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
              ...secretEnvVars,
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
    { protect: true },
  );

  // Grant Cloud Run service agent access to read secrets
  const projectNumber = gcp.organizations
    .getProject({ projectId: gcpProject })
    .then((p) => p.number);

  for (const sr of secretResources) {
    new gcp.secretmanager.SecretIamMember(
      `${sr.envVar.toLowerCase()}-accessor`,
      {
        project: gcpProject,
        secretId: sr.secret.secretId,
        role: "roles/secretmanager.secretAccessor",
        member: pulumi.interpolate`serviceAccount:service-${projectNumber}@serverless-robot-prod.iam.gserviceaccount.com`,
      },
    );
  }

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
