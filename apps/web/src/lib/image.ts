const MAX_SOURCE_BYTES = 8 * 1024 * 1024;

/**
 * Resizes an uploaded photo to a 320×320 center-cropped JPEG data URL
 * (~20–40 KB), small enough to store inside the resume document.
 */
export async function photoFileToDataUrl(file: File, size = 320): Promise<string> {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
    throw new Error('Choose a PNG, JPEG or WebP image.');
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error('Choose an image smaller than 8 MB.');
  }
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Your browser could not process the image.');
  context.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    size,
    size,
  );
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.85);
}
