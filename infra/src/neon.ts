import * as neon from "@pulumi/neon";
import { neonProjectId } from "./config";

export function createNeon() {
  const project = new neon.Project(
    "mealio-db",
    {
      name: "mealio",
      regionId: "aws-us-east-1",
      pgVersion: 18,
      historyRetentionSeconds: 21600,
    },
    { protect: true },
  );

  return { projectId: project.id, defaultBranchId: project.defaultBranchId };
}
