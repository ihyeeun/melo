import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

const PREVIEW_MAX_DIMENSION = 720;
const PREVIEW_QUALITY = 0.82;

export async function createPreviewThumbnail(uri: string, width: number, height: number) {
  const actions: NonNullable<Parameters<typeof manipulateAsync>[1]> = [];
  if (
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    width > 0 &&
    height > 0 &&
    Math.max(width, height) > PREVIEW_MAX_DIMENSION
  ) {
    actions.push({
      resize: width >= height
        ? { width: PREVIEW_MAX_DIMENSION }
        : { height: PREVIEW_MAX_DIMENSION },
    });
  }

  for (const format of [SaveFormat.WEBP, SaveFormat.JPEG]) {
    try {
      const thumbnail = await manipulateAsync(uri, actions, {
        base64: true,
        compress: PREVIEW_QUALITY,
        format,
      });

      if (thumbnail.base64) {
        return {
          base64: thumbnail.base64,
          mimeType: format === SaveFormat.WEBP ? "image/webp" : "image/jpeg",
        };
      }
    } catch {
      // Try JPEG if WebP fails; a preview failure must not discard the original photo.
    }
  }

  return null;
}
