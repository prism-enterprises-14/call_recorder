import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { localDb } from '@/lib/db/fallbackDb';
import { CallSession } from '@/types';

/**
 * WhatsApp Voice Gateway Webhook Handler
 * Supports Meta WhatsApp Cloud Voice API & Twilio for WhatsApp Calling
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      event_type = 'call_answered',
      call_id = `wa_${crypto.randomUUID().slice(0, 8)}`,
      whatsapp_number = '+15551234567',
      duration = 0,
      recording_url = null,
    } = body;

    const now = new Date().toISOString();

    if (isSupabaseServerConfigured()) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (event_type === 'call_answered') {
        const { data, error } = await supabase.from('call_sessions').insert({
          id: crypto.randomUUID(),
          user_id: user?.id || 'default-user',
          provider: 'whatsapp',
          external_call_id: call_id,
          call_status: 'in_progress',
          started_at: now,
          recording_enabled: true,
          created_at: now,
        }).select().single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ status: 'call_detected', session: data });
      }

      if (event_type === 'call_completed') {
        await supabase
          .from('call_sessions')
          .update({ call_status: 'completed', ended_at: now })
          .eq('external_call_id', call_id);

        return NextResponse.json({ status: 'call_ended', call_id });
      }
    }

    // Local sandbox mode
    if (event_type === 'call_answered') {
      const session: CallSession = {
        id: crypto.randomUUID(),
        user_id: 'default-user',
        provider: 'whatsapp',
        external_call_id: call_id,
        call_status: 'in_progress',
        started_at: now,
        ended_at: null,
        recording_enabled: true,
        created_at: now,
      };
      localDb.sessions.unshift(session);
      return NextResponse.json({ status: 'call_detected', session });
    }

    return NextResponse.json({ status: 'processed', event_type });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
