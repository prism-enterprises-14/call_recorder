import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getAdminClient } from '@/lib/supabase/admin';

export const BUCKET_NAME = 'call-recordings';

/**
 * Builds the canonical storage path for a recording file:
 * call-recordings/user_id/recording_id/recording.webm
 */
export function buildStoragePath(userId: string, recordingId: string, format: string = 'webm'): string {
  return `${userId}/${recordingId}/recording.${format}`;
}

/**
 * Uploads an audio blob to Supabase private storage.
 */
export async function uploadRecordingFile(
  userId: string,
  recordingId: string,
  audioBlob: Blob,
  format: string = 'webm'
): Promise<{ filePath: string; error?: string }> {
  const filePath = buildStoragePath(userId, recordingId, format);

  if (!isSupabaseConfigured()) {
    // In local demo mode, store blob in IndexedDB
    const { saveLocalAudioBlob } = await import('@/lib/storage/localRecordings');
    await saveLocalAudioBlob(recordingId, audioBlob);
    return { filePath: `local://${filePath}` };
  }

  const supabase = createClient();
  const mimeType = audioBlob.type || `audio/${format}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, audioBlob, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    console.error('Storage upload error:', error);
    return { filePath: '', error: error.message };
  }

  return { filePath };
}

/**
 * Creates a time-limited signed URL for private recording playback.
 * Default expiration is 3600 seconds (1 hour).
 */
export async function createSignedPlaybackUrl(filePath: string, expiresInSeconds: number = 3600): Promise<{ signedUrl: string | null; error?: string }> {
  if (filePath.startsWith('local://')) {
    // Handled by client-side local blob resolver
    return { signedUrl: filePath };
  }

  const adminClient = getAdminClient();
  if (adminClient) {
    const { data, error } = await adminClient.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, expiresInSeconds);

    if (error) {
      return { signedUrl: null, error: error.message };
    }
    return { signedUrl: data.signedUrl };
  }

  // Fallback to standard client if user is signed in
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(filePath, expiresInSeconds);

  if (error) {
    return { signedUrl: null, error: error.message };
  }

  return { signedUrl: data.signedUrl };
}

/**
 * Permanently removes a recording file from storage.
 */
export async function deleteRecordingFile(filePath: string): Promise<{ success: boolean; error?: string }> {
  if (filePath.startsWith('local://')) {
    if (typeof window !== 'undefined') {
      try {
        const recordingId = filePath.split('/')[2];
        const { deleteLocalAudioBlob } = await import('@/lib/storage/localRecordings');
        await deleteLocalAudioBlob(recordingId);
      } catch (err) {
        console.warn('Local blob deletion note:', err);
      }
    }
    return { success: true };
  }

  const adminClient = getAdminClient();
  const client = adminClient || createClient();

  const { error } = await client.storage
    .from(BUCKET_NAME)
    .remove([filePath]);

  if (error) {
    console.error('Storage deletion error:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
