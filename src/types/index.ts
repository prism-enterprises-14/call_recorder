export type CallStatus = 'initiated' | 'in_progress' | 'completed' | 'failed';
export type RecordingStatus = 'idle' | 'waiting_for_call' | 'awaiting_consent' | 'recording' | 'paused' | 'uploading' | 'completed' | 'failed';
export type ConsentStatus = 'pending' | 'granted' | 'denied';
export type TelephonyProviderType = 'webrtc' | 'twilio' | 'telnyx' | 'whatsapp' | 'manual';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

export interface CallSession {
  id: string;
  user_id: string;
  provider: TelephonyProviderType;
  external_call_id: string | null;
  call_status: CallStatus;
  started_at: string;
  ended_at: string | null;
  recording_enabled: boolean;
  created_at: string;
}

export interface RecordingConsent {
  id: string;
  session_id: string;
  participant_id: string;
  participant_name?: string;
  consent_status: ConsentStatus;
  consent_timestamp: string | null;
  created_at: string;
}

export interface Recording {
  id: string;
  user_id: string;
  title: string;
  file_path: string;
  file_format: string;
  file_size: number; // in bytes
  duration: number; // in seconds
  recording_date: string;
  recording_status: 'recording' | 'uploading' | 'completed' | 'failed';
  session_id: string | null;
  created_at: string;
  updated_at: string;
  signed_url?: string;
}

export interface RecordingSettings {
  autoRecord: boolean;
  audioFormat: 'webm' | 'wav';
  audioQuality: '64000' | '128000' | '256000';
  titleTemplate: string;
  autoUpload: boolean;
  defaultPlaybackSpeed: number;
  consentRequirement: 'all_parties' | 'single_party';
  audibleChime: boolean;
  retentionDays: number; // 0 = indefinitely
}

export interface DashboardStats {
  totalRecordings: number;
  totalDurationSeconds: number;
  todayCount: number;
  storageUsageBytes: number;
}
