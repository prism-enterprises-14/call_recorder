import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { localDb } from '@/lib/db/fallbackDb';
import { CallSession } from '@/types';

export async function GET() {
  try {
    if (isSupabaseServerConfigured()) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { data, error } = await supabase
        .from('call_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(data);
    }

    return NextResponse.json(localDb.sessions);
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
      provider = 'webrtc',
      external_call_id = null,
      call_status = 'initiated',
      recording_enabled = true,
    } = body;

    const now = new Date().toISOString();

    if (isSupabaseServerConfigured()) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { data, error } = await supabase
        .from('call_sessions')
        .insert({
          id,
          user_id: user.id,
          provider,
          external_call_id,
          call_status,
          started_at: now,
          recording_enabled,
          created_at: now,
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(data, { status: 201 });
    }

    const newSession: CallSession = {
      id,
      user_id: body.user_id || 'default-user',
      provider,
      external_call_id,
      call_status,
      started_at: now,
      ended_at: null,
      recording_enabled,
      created_at: now,
    };

    localDb.sessions.unshift(newSession);
    return NextResponse.json(newSession, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
