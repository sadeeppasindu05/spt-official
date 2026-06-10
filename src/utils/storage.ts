import { supabase } from '../supabaseClient';

const BUCKETS = {
  avatars: 'avatars',
  receipts: 'receipts',
  cms: 'cms-images',
} as const;

type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];

async function ensureBucket(bucket: BucketName): Promise<boolean> {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.find((b) => b.name === bucket)) {
      await supabase.storage.createBucket(bucket, { public: true });
    }
    return true;
  } catch {
    return false;
  }
}

export async function uploadToSupabaseStorage(
  base64DataUrl: string,
  bucket: BucketName = BUCKETS.cms,
  fileName?: string,
): Promise<string | null> {
  const isSupabaseReady =
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!isSupabaseReady) return null;

  try {
    const ext = base64DataUrl.includes('image/png') ? 'png' : 'jpg';
    const cleanBase64 = base64DataUrl.replace(/^data:image\/\w+;base64,/, '');
    const binaryStr = atob(cleanBase64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

    const blob = new Blob([bytes], { type: `image/${ext}` });
    const filePath =
      fileName || `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

    await ensureBucket(bucket);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, blob, { contentType: `image/${ext}`, upsert: true });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return null;
    }

    if (uploadData) {
      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
      return publicUrlData?.publicUrl || null;
    }

    return null;
  } catch (err) {
    console.error('Failed to upload to Supabase Storage:', err);
    return null;
  }
}

export async function deleteFromSupabaseStorage(
  fileUrl: string,
  bucket: BucketName = BUCKETS.cms,
): Promise<boolean> {
  try {
    const urlObj = new URL(fileUrl);
    const pathParts = urlObj.pathname.split('/');
    const fileName = pathParts[pathParts.length - 1];
    if (!fileName) return false;

    const { error } = await supabase.storage.from(bucket).remove([fileName]);
    if (error) {
      console.error('Storage delete error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to delete from Supabase Storage:', err);
    return false;
  }
}

export async function uploadBase64ToBucket(
  base64DataUrl: string,
  bucket: BucketName,
  userId: string,
): Promise<string | null> {
  const fileName = `${userId}_${Date.now()}.${base64DataUrl.includes('image/png') ? 'png' : 'jpg'}`;
  return uploadToSupabaseStorage(base64DataUrl, bucket, fileName);
}

export { BUCKETS };
