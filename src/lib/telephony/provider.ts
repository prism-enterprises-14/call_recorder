import { CallSession, CallStatus } from '@/types';

export interface TelephonyCallParams {
  to: string;
  from: string;
  userId: string;
  requireConsent: boolean;
  recordAudio: boolean;
}

export interface TelephonyCallResult {
  sessionId: string;
  externalCallId: string;
  provider: string;
  status: CallStatus;
}

export interface TelephonyWebhookEvent {
  eventId: string;
  externalCallId: string;
  eventType: 'call_initiated' | 'call_ringing' | 'call_answered' | 'call_completed' | 'recording_completed' | 'consent_granted' | 'consent_denied';
  durationSeconds?: number;
  recordingUrl?: string;
  recordingSid?: string;
  timestamp: string;
  rawPayload: Record<string, unknown>;
}

export interface TelephonyProvider {
  name: string;
  createSession(params: TelephonyCallParams): Promise<TelephonyCallResult>;
  verifySignature(url: string, params: Record<string, string>, signatureHeader: string): boolean;
  parseWebhook(payload: Record<string, string>): TelephonyWebhookEvent | null;
}
