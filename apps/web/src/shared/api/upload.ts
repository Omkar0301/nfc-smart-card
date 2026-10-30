import { API_ROUTES } from './routes';
import { apiFetch } from './client';

export interface UploadResult {
  url: string;
}

/**
 * Upload a profile photo (max 5 MB, JPEG/PNG/WebP).
 */
export async function uploadProfilePhoto(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await apiFetch<{ success: boolean; data: UploadResult }>(
    API_ROUTES.upload.profilePhoto,
    {
      method: 'POST',
      body: formData,
    }
  );

  return res.data;
}

/**
 * Upload a template thumbnail (max 2 MB, JPEG/PNG/WebP) with admin auth.
 */
export async function uploadTemplateThumbnail(
  file: File,
  templateId: string
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('templateId', templateId);

  const res = await apiFetch<{ success: boolean; data: UploadResult }>(
    API_ROUTES.upload.templateThumbnail,
    {
      method: 'POST',
      body: formData,
    }
  );

  return res.data;
}
