import * as gcp from "@pulumi/gcp";
import { gcpProject, gcpRegion } from "./config";

export function createRegistry() {
  return new gcp.artifactregistry.Repository(
    "services-repo",
    {
      project: gcpProject,
      location: gcpRegion,
      repositoryId: "services",
      format: "DOCKER",
      description: "Container images for Mealio services",
    },
    { protect: true },
  );
}
