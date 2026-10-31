import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { localDb } from '@/lib/db/fallbackDb';
import { Recording } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase() || '';
    const sortBy = searchParams.get('sortBy') || 'newest';
    const filterDate = searchParams.get('filterDate'); // 'today', 'week', 'month', 'all'

    if (isSupabaseServerConfigured()) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      let query = supabase
        .from('recordings')
        .select('*')
        .eq('user_id', user.id);

      if (search) {
        query = query.ilike('title', `%${search}%`);
      }

      if (sortBy === 'oldest') {
        query = query.order('created_at', { ascending: true });
      } else if (sortBy === 'duration') {
        query = query.order('duration', { ascending: false });
      } else if (sortBy === 'size') {
        query = query.order('file_size', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json(data);
    }

    // Local / Demo Mode Fallback
    let items = [...localDb.recordings];

    if (search) {
      items = items.filter(r => r.title.toLowerCase().includes(search) || r.id.toLowerCase().includes(search));
    }

    if (filterDate === 'today') {
      const startOfToday = new Date().setHours(0, 0, 0, 0);
      items = items.filter(r => new Date(r.recording_date).getTime() >= startOfToday);
    } else if (filterDate === 'week') {
      const weekAgo = Date.now() - 7 * 86400000;
      items = items.filter(r => new Date(r.recording_date).getTime() >= weekAgo);
    }

    if (sortBy === 'oldest') {
      items.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sortBy === 'duration') {
      items.sort((a, b) => b.duration - a.duration);
    } else if (sortBy === 'size') {
      items.sort((a, b) => b.file_size - a.file_size);
    } else {
      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return NextResponse.json(items);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id = crypto.randomUUID(),
      title,
      file_path,
      file_format = 'webm',
      file_size = 0,
      duration = 0,
      recording_status = 'completed',
      session_id = null,
    } = body;

    if (!title || !file_path) {
      return NextResponse.json({ error: 'Title and file_path are required' }, { status: 400 });
    }

    const now = new Date().toISOString();

    if (isSupabaseServerConfigured()) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { data, error } = await supabase
        .from('recordings')
        .insert({
          id,
          user_id: user.id,
          title,
          file_path,
          file_format,
          file_size,
          duration,
          recording_status,
          session_id,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(data, { status: 201 });
    }

    // Local / Demo Mode Fallback
    const newRecording: Recording = {
      id,
      user_id: body.user_id || 'default-user',
      title,
      file_path,
      file_format,
      file_size,
      duration,
      recording_date: now,
      recording_status,
      session_id,
      created_at: now,
      updated_at: now,
    };

    localDb.recordings.unshift(newRecording);
    return NextResponse.json(newRecording, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
