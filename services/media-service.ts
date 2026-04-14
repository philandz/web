import { apiClient } from "@/lib/http/client";

const BASE_PATH = "/api/media";

type InitUploadResponse = {
  upload_id: string;
  file_id: string;
  bucket: string;
  object_key: string;
  presigned_url: string;
  expires_at: number;
  required_headers?: Record<string, string>;
};

type CompleteUploadResponse = {
  file_id: string;
  status: string;
  object_key: string;
  bucket: string;
  etag: string;
  confirmed_size: number;
  public_url: string;
};

type DownloadUrlResponse = {
  file_id: string;
  download_url: string;
  expires_at: number;
};

export type UploadResult = {
  fileId: string;
  objectKey: string;
  bucket: string;
  /** Presigned GET URL — valid for the configured download TTL (default 1 year). */
  url: string;
};

async function initUpload(file: File) {
  return apiClient.post<InitUploadResponse>(`${BASE_PATH}/uploads/init`, {
    file_name: file.name,
    content_type: file.type || "application/octet-stream",
    size: file.size
  });
}

async function completeUpload(uploadId: string) {
  return apiClient.post<CompleteUploadResponse>(`${BASE_PATH}/uploads/complete`, {
    upload_id: uploadId
  });
}

async function getDownloadUrl(fileId: string) {
  return apiClient.get<DownloadUrlResponse>(`${BASE_PATH}/files/${fileId}/download-url`);
}

async function uploadToPresignedUrl(file: File, init: InitUploadResponse) {
  const headers = new Headers();
  const requiredHeaders = init.required_headers ?? {};

  for (const [key, value] of Object.entries(requiredHeaders)) {
    if (value) headers.set(key, value);
  }

  if (!headers.has("content-type")) {
    headers.set("content-type", file.type || "application/octet-stream");
  }

  const response = await fetch(init.presigned_url, {
    method: "PUT",
    headers,
    body: file
  });

  if (!response.ok) {
    throw new Error("Unable to upload file. Please try again.");
  }
}

export const mediaService = {
  /**
   * Full upload flow: init → PUT to S3 → complete → get presigned download URL.
   * Returns a presigned GET URL valid for the configured download TTL.
   * Use this for avatars and any file that needs to be displayed in the UI.
   */
  async uploadImage(file: File): Promise<UploadResult> {
    const init = await initUpload(file);
    await uploadToPresignedUrl(file, init);
    const completed = await completeUpload(init.upload_id);
    const download = await getDownloadUrl(completed.file_id);

    return {
      fileId: completed.file_id,
      objectKey: completed.object_key,
      bucket: completed.bucket,
      url: download.download_url
    };
  }
};
