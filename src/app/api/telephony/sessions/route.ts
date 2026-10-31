import { NextRequest, NextResponse } from 'next/server';
import { TwilioProvider } from '@/lib/telephony/twilio';
import { createClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { localDb } from '@/lib/db/fallbackDb';
import { CallSession } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      to,
      from = '+15550001234',
      requireConsent = true,
      recordAudio = true,
    } = body;

    if (!to) {
      return NextResponse.json({ error: 'Recipient phone number is required' }, { status: 400 });
    }

    let userId = 'default-user';

    if (isSupabaseServerConfigured()) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      userId = user.id;
    }

    const provider = new TwilioProvider();
    const result = await provider.createSession({
      to,
      from,
      userId,
      requireConsent,
      recordAudio,
    });

    const now = new Date().toISOString();

    if (isSupabaseServerConfigured()) {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('call_sessions')
        .insert({
          id: result.sessionId,
          user_id: userId,
          provider: result.provider,
          external_call_id: result.externalCallId,
          call_status: result.status,
          started_at: now,
          recording_enabled: recordAudio,
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
      id: result.sessionId,
      user_id: userId,
      provider: 'twilio',
      external_call_id: result.externalCallId,
      call_status: result.status,
      started_at: now,
      ended_at: null,
      recording_enabled: recordAudio,
      created_at: now,
    };
    localDb.sessions.unshift(newSession);

    return NextResponse.json(newSession, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
