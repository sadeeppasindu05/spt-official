import { supabase } from '../supabaseClient';

const BUCKET_NAME = 'cms-images';

export async function uploadToSupabaseStorage(base64DataUrl: string, fileName?: string): Promise<string | null> {
  const isSupabaseReady = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!isSupabaseReady) return null;

  try {
    const ext = base64DataUrl.includes('image/png') ? 'png' : 'jpg';
    const cleanBase64 = base64DataUrl.replace(/^data:image\/\w+;base64,/, '');
    const binaryStr = atob(cleanBase64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: `image/${ext}` });
    const filePath = fileName || `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

    // Try to upload
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, blob, {
        contentType: `image/${ext}`,
        upsert: true,
      });

    if (uploadError) {
      // Bucket might not exist - try creating it
      if (uploadError.message?.includes('bucket') || uploadError.message?.includes('not found')) {
        console.warn('Storage bucket not found, falling back to base64');
        return null;
      }
      console.error('Storage upload error:', uploadError);
      return null;
    }

    if (uploadData) {
      const { data: publicUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
      return publicUrlData?.publicUrl || null;
    }

    return null;
  } catch (err) {
    console.error('Failed to upload to Supabase Storage:', err);
    return null;
  }
}
