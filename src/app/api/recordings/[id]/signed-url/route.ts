import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { createSignedPlaybackUrl } from '@/lib/storage/recordings';
import { localDb } from '@/lib/db/fallbackDb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let filePath = '';

    if (isSupabaseServerConfigured()) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { data, error } = await supabase
        .from('recordings')
        .select('file_path')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: 'Recording not found' }, { status: 404 });
      }
      filePath = data.file_path;
    } else {
      const rec = localDb.recordings.find((r) => r.id === id);
      if (!rec) {
        return NextResponse.json({ error: 'Recording not found' }, { status: 404 });
      }
      filePath = rec.file_path;
    }

    // Default expiration: 3600 seconds (1 hour)
    const { signedUrl, error: signError } = await createSignedPlaybackUrl(filePath, 3600);

    if (signError) {
      return NextResponse.json({ error: signError }, { status: 500 });
    }

    return NextResponse.json({
      signedUrl,
      expiresIn: 3600,
      filePath,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
