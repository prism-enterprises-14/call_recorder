import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { localDb } from '@/lib/db/fallbackDb';
import { RecordingConsent } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (isSupabaseServerConfigured()) {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('recording_consents')
        .select('*')
        .eq('session_id', id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(data);
    }

    const sessionConsents = localDb.consents.filter((c) => c.session_id === id);
    return NextResponse.json(sessionConsents);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const body = await request.json();
    const {
      participant_id,
      participant_name,
      consent_status = 'granted',
    } = body;

    if (!participant_id) {
      return NextResponse.json({ error: 'participant_id is required' }, { status: 400 });
    }

    const now = new Date().toISOString();

    if (isSupabaseServerConfigured()) {
      const supabase = await createClient();

      // Check if consent record already exists for this participant
      const { data: existing } = await supabase
        .from('recording_consents')
        .select('id')
        .eq('session_id', sessionId)
        .eq('participant_id', participant_id)
        .single();

      if (existing) {
        const { data, error } = await supabase
          .from('recording_consents')
          .update({
            consent_status,
            consent_timestamp: consent_status === 'granted' ? now : null,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data);
      }

      const { data, error } = await supabase
        .from('recording_consents')
        .insert({
          id: crypto.randomUUID(),
          session_id: sessionId,
          participant_id,
          consent_status,
          consent_timestamp: consent_status === 'granted' ? now : null,
          created_at: now,
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(data, { status: 201 });
    }

    // Local / Demo Mode Fallback
    const existingIndex = localDb.consents.findIndex(
      (c) => c.session_id === sessionId && c.participant_id === participant_id
    );

    if (existingIndex !== -1) {
      localDb.consents[existingIndex].consent_status = consent_status;
      localDb.consents[existingIndex].consent_timestamp = consent_status === 'granted' ? now : null;
      if (participant_name) localDb.consents[existingIndex].participant_name = participant_name;
      return NextResponse.json(localDb.consents[existingIndex]);
    }

    const newConsent: RecordingConsent = {
      id: crypto.randomUUID(),
      session_id: sessionId,
      participant_id,
      participant_name: participant_name || participant_id,
      consent_status,
      consent_timestamp: consent_status === 'granted' ? now : null,
      created_at: now,
    };

    localDb.consents.push(newConsent);
    return NextResponse.json(newConsent, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
