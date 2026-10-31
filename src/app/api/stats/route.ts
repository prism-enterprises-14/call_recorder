import { NextResponse } from 'next/server';
import { createClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { localDb } from '@/lib/db/fallbackDb';
import { DashboardStats } from '@/types';

export async function GET() {
  try {
    if (isSupabaseServerConfigured()) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { data: recordings, error } = await supabase
        .from('recordings')
        .select('duration, file_size, recording_date')
        .eq('user_id', user.id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const totalRecordings = recordings.length;
      const totalDurationSeconds = recordings.reduce((acc, r) => acc + (Number(r.duration) || 0), 0);
      const storageUsageBytes = recordings.reduce((acc, r) => acc + (Number(r.file_size) || 0), 0);

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const todayCount = recordings.filter(
        (r) => new Date(r.recording_date).getTime() >= startOfToday
      ).length;

      const stats: DashboardStats = {
        totalRecordings,
        totalDurationSeconds,
        todayCount,
        storageUsageBytes,
      };

      return NextResponse.json(stats);
    }

    const stats = localDb.getStats('default-user');
    return NextResponse.json(stats);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
