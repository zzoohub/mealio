import * as gcp from "@pulumi/gcp";
import { gcpProject } from "./config";

export function createIam() {
  const wifPool = new gcp.iam.WorkloadIdentityPool(
    "github-wif-pool",
    {
      project: gcpProject,
      workloadIdentityPoolId: "github",
      displayName: "GitHub Actions",
    },
    { protect: true },
  );

  const wifProvider = new gcp.iam.WorkloadIdentityPoolProvider(
    "github-wif-provider",
    {
      project: gcpProject,
      workloadIdentityPoolId: wifPool.workloadIdentityPoolId,
      workloadIdentityPoolProviderId: "github",
      displayName: "GitHub",
      attributeMapping: {
        "google.subject": "assertion.sub",
        "attribute.actor": "assertion.actor",
        "attribute.repository": "assertion.repository",
        "attribute.repository_owner": "assertion.repository_owner",
      },
      attributeCondition:
        'assertion.repository == "zzoohub/mealio"',
      oidc: {
        issuerUri: "https://token.actions.githubusercontent.com",
      },
    },
    { protect: true },
  );

  const serviceAccount = new gcp.serviceaccount.Account(
    "deploy-sa",
    {
      project: gcpProject,
      accountId: "github-actions",
      displayName: "GitHub Actions",
    },
    { protect: true },
  );

  return { wifPool, wifProvider, serviceAccount };
}
