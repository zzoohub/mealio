import * as gcp from "@pulumi/gcp";
import { gcpProject } from "./config";

const prodSecrets = [
  { name: "mealio-database-url", envVar: "DATABASE_URL" },
  { name: "mealio-jwt-secret", envVar: "JWT_SECRET" },
  { name: "mealio-google-client-id", envVar: "GOOGLE_CLIENT_ID" },
  { name: "r2-account-id", envVar: "R2_ACCOUNT_ID" },
  { name: "r2-access-key-id", envVar: "R2_ACCESS_KEY_ID" },
  { name: "r2-secret-access-key", envVar: "R2_SECRET_ACCESS_KEY" },
  { name: "mealio-api-sentry-dsn", envVar: "SENTRY_DSN" },
];

export interface SecretResource {
  secret: gcp.secretmanager.Secret;
  envVar: string;
}

export function createSecrets(): SecretResource[] {
  // Import existing secrets — values already in GCP, not managed by Pulumi
  return prodSecrets.map((def) => {
    const secret = new gcp.secretmanager.Secret(
      def.name,
      {
        project: gcpProject,
        secretId: def.name,
        replication: {
          userManaged: {
            replicas: [{ location: "us-east4" }],
          },
        },
      },
      { protect: true },
    );
    return { secret, envVar: def.envVar };
  });
}
