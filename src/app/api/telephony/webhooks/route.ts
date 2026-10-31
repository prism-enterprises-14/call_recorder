import { NextRequest, NextResponse } from 'next/server';
import { TwilioProvider } from '@/lib/telephony/twilio';
import { createClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { localDb } from '@/lib/db/fallbackDb';
import { Recording } from '@/types';

// In-memory set for deduplicating repeated webhook deliveries
const processedEvents = new Set<string>();

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let params: Record<string, string> = {};

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await request.text();
      const searchParams = new URLSearchParams(text);
      searchParams.forEach((val, key) => {
        params[key] = val;
      });
    } else {
      params = await request.json();
    }

    const provider = new TwilioProvider();
    const signature = request.headers.get('x-twilio-signature') || '';
    const requestUrl = request.url;

    // Verify provider webhook signature
    const isValid = provider.verifySignature(requestUrl, params, signature);
    if (!isValid) {
      console.warn('Invalid telephony webhook signature detected.');
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 403 });
    }

    // Parse webhook payload
    const event = provider.parseWebhook(params);
    if (!event) {
      return NextResponse.json({ message: 'Ignored unsupported event' }, { status: 200 });
    }

    // Event deduplication check
    if (processedEvents.has(event.eventId)) {
      return NextResponse.json({ message: 'Event already processed' }, { status: 200 });
    }
    processedEvents.add(event.eventId);
    // Limit memory size
    if (processedEvents.size > 5000) {
      const first = processedEvents.values().next().value;
      if (first) processedEvents.delete(first);
    }

    // Update Call Session Status
    if (event.eventType === 'call_answered' || event.eventType === 'call_completed') {
      const newStatus = event.eventType === 'call_answered' ? 'in_progress' : 'completed';
      const endedAt = event.eventType === 'call_completed' ? new Date().toISOString() : null;

      if (isSupabaseServerConfigured()) {
        const supabase = await createClient();
        await supabase
          .from('call_sessions')
          .update({
            call_status: newStatus,
            ...(endedAt ? { ended_at: endedAt } : {}),
          })
          .eq('external_call_id', event.externalCallId);
      } else {
        const sess = localDb.sessions.find(s => s.external_call_id === event.externalCallId);
        if (sess) {
          sess.call_status = newStatus;
          if (endedAt) sess.ended_at = endedAt;
        }
      }
    }

    // Handle Completed Recording Event
    if (event.eventType === 'recording_completed' && event.recordingUrl) {
      const recordingId = crypto.randomUUID();
      const duration = event.durationSeconds || 0;
      const title = `Telephony Call (${event.externalCallId.slice(0, 10)})`;
      const now = new Date().toISOString();

      if (isSupabaseServerConfigured()) {
        const supabase = await createClient();
        // Lookup session to get owning user
        const { data: session } = await supabase
          .from('call_sessions')
          .select('id, user_id')
          .eq('external_call_id', event.externalCallId)
          .single();

        if (session) {
          await supabase.from('recordings').insert({
            id: recordingId,
            user_id: session.user_id,
            title,
            file_path: event.recordingUrl,
            file_format: 'mp3',
            file_size: duration * 16000, // estimated
            duration,
            recording_status: 'completed',
            session_id: session.id,
            created_at: now,
            updated_at: now,
          });
        }
      } else {
        const session = localDb.sessions.find(s => s.external_call_id === event.externalCallId);
        const newRec: Recording = {
          id: recordingId,
          user_id: session?.user_id || 'default-user',
          title,
          file_path: event.recordingUrl,
          file_format: 'mp3',
          file_size: duration * 16000,
          duration,
          recording_date: now,
          recording_status: 'completed',
          session_id: session?.id || null,
          created_at: now,
          updated_at: now,
        };
        localDb.recordings.unshift(newRec);
      }
    }

    return NextResponse.json({
      success: true,
      eventId: event.eventId,
      eventType: event.eventType,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
