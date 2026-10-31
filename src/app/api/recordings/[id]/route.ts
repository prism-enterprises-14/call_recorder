import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { deleteRecordingFile } from '@/lib/storage/recordings';
import { localDb } from '@/lib/db/fallbackDb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (isSupabaseServerConfigured()) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { data, error } = await supabase
        .from('recordings')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: 'Recording not found' }, { status: 404 });
      }

      return NextResponse.json(data);
    }

    const rec = localDb.recordings.find((r) => r.id === id);
    if (!rec) {
      return NextResponse.json({ error: 'Recording not found' }, { status: 404 });
    }
    return NextResponse.json(rec);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, recording_status } = body;

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (title !== undefined) updates.title = title;
    if (recording_status !== undefined) updates.recording_status = recording_status;

    if (isSupabaseServerConfigured()) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { data, error } = await supabase
        .from('recordings')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(data);
    }

    const recIndex = localDb.recordings.findIndex((r) => r.id === id);
    if (recIndex === -1) {
      return NextResponse.json({ error: 'Recording not found' }, { status: 404 });
    }

    const updated = {
      ...localDb.recordings[recIndex],
      ...updates,
    };
    localDb.recordings[recIndex] = updated;

    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    let filePathToDelete = '';

    if (isSupabaseServerConfigured()) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Fetch file path first
      const { data: existing, error: fetchErr } = await supabase
        .from('recordings')
        .select('file_path')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (fetchErr || !existing) {
        return NextResponse.json({ error: 'Recording not found' }, { status: 404 });
      }

      filePathToDelete = existing.file_path;

      // Delete from database
      const { error: deleteErr } = await supabase
        .from('recordings')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (deleteErr) {
        return NextResponse.json({ error: deleteErr.message }, { status: 500 });
      }
    } else {
      const recIndex = localDb.recordings.findIndex((r) => r.id === id);
      if (recIndex === -1) {
        return NextResponse.json({ error: 'Recording not found' }, { status: 404 });
      }
      filePathToDelete = localDb.recordings[recIndex].file_path;
      localDb.recordings.splice(recIndex, 1);
    }

    // Delete corresponding object from cloud storage
    if (filePathToDelete) {
      await deleteRecordingFile(filePathToDelete);
    }

    return NextResponse.json({ success: true, message: 'Recording deleted successfully' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
