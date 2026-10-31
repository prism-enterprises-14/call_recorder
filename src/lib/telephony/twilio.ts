import crypto from 'crypto';
import { TelephonyProvider, TelephonyCallParams, TelephonyCallResult, TelephonyWebhookEvent } from './provider';

export class TwilioProvider implements TelephonyProvider {
  public name = 'twilio';
  private accountSid: string;
  private authToken: string;

  constructor(accountSid?: string, authToken?: string) {
    this.accountSid = accountSid || process.env.TELEPHONY_ACCOUNT_SID || '';
    this.authToken = authToken || process.env.TELEPHONY_AUTH_TOKEN || '';
  }

  public isConfigured(): boolean {
    return Boolean(this.accountSid && this.authToken && !this.accountSid.includes('your-account'));
  }

  /**
   * Creates an authorized call session with Twilio REST API
   */
  public async createSession(params: TelephonyCallParams): Promise<TelephonyCallResult> {
    const sessionId = crypto.randomUUID();

    if (!this.isConfigured()) {
      // In development or simulation mode, return structured mock session
      return {
        sessionId,
        externalCallId: `CA${crypto.randomBytes(16).toString('hex')}`,
        provider: 'twilio_simulated',
        status: 'initiated',
      };
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000';
    const statusCallbackUrl = `${appUrl}/api/telephony/webhooks`;

    // Construct Twilio REST API request
    const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Calls.json`;
    const formBody = new URLSearchParams();
    formBody.append('To', params.to);
    formBody.append('From', params.from);
    formBody.append('Url', `${appUrl}/api/telephony/twiml?sessionId=${sessionId}`);
    formBody.append('StatusCallback', statusCallbackUrl);
    formBody.append('StatusCallbackEvent', 'initiated');
    formBody.append('StatusCallbackEvent', 'ringing');
    formBody.append('StatusCallbackEvent', 'answered');
    formBody.append('StatusCallbackEvent', 'completed');
    if (params.recordAudio) {
      formBody.append('Record', 'true');
      formBody.append('RecordingStatusCallback', statusCallbackUrl);
    }

    const authHeader = 'Basic ' + Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody.toString(),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Twilio API Error: ${errText}`);
    }

    const data = await res.json();
    return {
      sessionId,
      externalCallId: data.sid,
      provider: 'twilio',
      status: 'initiated',
    };
  }

  /**
   * Twilio HMAC-SHA1 Webhook Signature Validation
   * Reference: Twilio Security Documentation
   */
  public verifySignature(url: string, params: Record<string, string>, signatureHeader: string): boolean {
    if (!this.authToken) {
      // Allow testing when credentials not configured
      return true;
    }

    // Sort parameters alphabetically by key
    const sortedKeys = Object.keys(params).sort();
    let dataString = url;
    for (const key of sortedKeys) {
      dataString += key + params[key];
    }

    const expectedSignature = crypto
      .createHmac('sha1', this.authToken)
      .update(Buffer.from(dataString, 'utf-8'))
      .digest('base64');

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'utf-8'),
      Buffer.from(signatureHeader, 'utf-8')
    );
  }

  /**
   * Translates Twilio webhook payload into standard TelephonyWebhookEvent
   */
  public parseWebhook(payload: Record<string, string>): TelephonyWebhookEvent | null {
    const callSid = payload.CallSid || payload.call_sid;
    if (!callSid) return null;

    const eventId = payload.RecordingSid || payload.SequenceNumber || `${callSid}-${Date.now()}`;
    const callStatus = (payload.CallStatus || payload.call_status || '').toLowerCase();

    let eventType: TelephonyWebhookEvent['eventType'] = 'call_initiated';
    if (payload.RecordingStatus === 'completed' || payload.RecordingUrl) {
      eventType = 'recording_completed';
    } else if (callStatus === 'ringing') {
      eventType = 'call_ringing';
    } else if (callStatus === 'in-progress' || callStatus === 'answered') {
      eventType = 'call_answered';
    } else if (callStatus === 'completed' || callStatus === 'no-answer' || callStatus === 'canceled' || callStatus === 'busy') {
      eventType = 'call_completed';
    }

    return {
      eventId,
      externalCallId: callSid,
      eventType,
      durationSeconds: payload.RecordingDuration ? parseInt(payload.RecordingDuration, 10) : payload.CallDuration ? parseInt(payload.CallDuration, 10) : undefined,
      recordingUrl: payload.RecordingUrl,
      recordingSid: payload.RecordingSid,
      timestamp: new Date().toISOString(),
      rawPayload: payload,
    };
  }
}
