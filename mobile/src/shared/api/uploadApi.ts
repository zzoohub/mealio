import { apiClient } from "./client";
import type { ApiPresignResponse } from "./types";

const CONTENT_TYPE_MAP: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
};

function detectContentType(uri: string): string {
  const ext = uri.split(".").pop()?.toLowerCase() ?? "";
  return CONTENT_TYPE_MAP[ext] ?? "image/jpeg";
}

async function requestPresignedUrl(contentType: string): Promise<ApiPresignResponse> {
  return apiClient.post<ApiPresignResponse>("/uploads/presign", {
    content_type: contentType,
  });
}

async function uploadToR2(
  presignedUrl: string,
  fileUri: string,
  contentType: string,
): Promise<void> {
  const response = await fetch(fileUri);
  const blob = await response.blob();

  const uploadResponse = await fetch(presignedUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  });

  if (!uploadResponse.ok) {
    throw new Error(`R2 upload failed with status ${uploadResponse.status}`);
  }
}

/**
 * Uploads a local photo to R2 via presigned URL.
 * Returns the public URL of the uploaded file.
 */
export async function uploadPhoto(fileUri: string): Promise<string> {
  const contentType = detectContentType(fileUri);
  const presign = await requestPresignedUrl(contentType);
  await uploadToR2(presign.upload_url, fileUri, contentType);
  return presign.public_url;
}
