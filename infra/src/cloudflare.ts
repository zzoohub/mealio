import * as cloudflare from "@pulumi/cloudflare";
import { cloudflareAccountId } from "./config";

export function createR2Bucket() {
  return new cloudflare.R2Bucket(
    "mealio-uploads",
    {
      accountId: cloudflareAccountId,
      name: "mealio-uploads",
      location: "ENAM",
    },
    { protect: true },
  );
}
