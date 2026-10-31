import { Recording, CallSession, RecordingConsent, DashboardStats } from '@/types';

// Real-time dynamic store for local sessions and recordings (no mock placeholders)
class LocalStore {
  public recordings: Recording[] = [];
  public sessions: CallSession[] = [];
  public consents: RecordingConsent[] = [];

  getStats(userId: string): DashboardStats {
    const userRecs = this.recordings.filter(r => r.user_id === userId || userId === 'default-user');
    const totalRecordings = userRecs.length;
    const totalDurationSeconds = userRecs.reduce((acc, r) => acc + (Number(r.duration) || 0), 0);
    const storageUsageBytes = userRecs.reduce((acc, r) => acc + (Number(r.file_size) || 0), 0);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayCount = userRecs.filter(r => new Date(r.recording_date).getTime() >= startOfToday).length;

    return {
      totalRecordings,
      totalDurationSeconds,
      todayCount,
      storageUsageBytes,
    };
  }

  clearAll(userId: string) {
    this.recordings = this.recordings.filter(r => r.user_id !== userId && userId !== 'default-user');
    this.sessions = this.sessions.filter(s => s.user_id !== userId && userId !== 'default-user');
    this.consents = [];
  }
}

// Global singleton across serverless invocations within the same container
const globalForStore = globalThis as unknown as { fallbackDbStore?: LocalStore };
export const localDb = globalForStore.fallbackDbStore ?? new LocalStore();
if (process.env.NODE_ENV !== 'production') globalForStore.fallbackDbStore = localDb;
