export const buildImageFilePart = (fileUri: string, fallbackName = 'upload.jpg') => {
  const normalizedUri = fileUri.trim();
  const filename = normalizedUri.split('/').pop()?.split('?')[0] || fallbackName;
  const extension = filename.split('.').pop()?.toLowerCase();

  const type =
    extension === 'png'
      ? 'image/png'
      : extension === 'webp'
        ? 'image/webp'
        : 'image/jpeg';

  return {
    uri: normalizedUri,
    name: filename,
    type,
  } as any;
};
