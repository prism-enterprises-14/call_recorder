'use client';

import React, { useState, useEffect, useRef } from 'react';
import { OverviewStats } from '@/components/dashboard/OverviewStats';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { RecentRecordings } from '@/components/dashboard/RecentRecordings';
import { WebRTCCallRoom } from '@/components/recording/WebRTCCallRoom';
import { AudioPlayer } from '@/components/audio-player/AudioPlayer';
import { DashboardStats, Recording } from '@/types';
import { LayoutDashboard, Radio, ShieldCheck, Sparkles } from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalRecordings: 0,
    totalDurationSeconds: 0,
    todayCount: 0,
    storageUsageBytes: 0,
  });
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const studioRef = useRef<HTMLDivElement | null>(null);

  const loadDashboardData = async () => {
    try {
      const [statsRes, recsRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/recordings'),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
      if (recsRes.ok) {
        const recsData = await recsRes.json();
        setRecordings(recsData);
      }
    } catch (e) {
      console.error('Failed to load dashboard data:', e);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const [recordTrigger, setRecordTrigger] = useState(0);

  const handleStartRecordingScroll = () => {
    studioRef.current?.scrollIntoView({ behavior: 'smooth' });
    setRecordTrigger((prev) => prev + 1);
  };

  const handleRecordingSaved = (newRec: Recording) => {
    setRecordings((prev) => [newRec, ...prev]);
    loadDashboardData();
  };

  return (
    <div className="space-y-8 pb-32">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2.5">
            <LayoutDashboard className="w-6 h-6 text-indigo-400" />
            Call Recording Dashboard
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Enterprise call recording platform with WebRTC dual-stream audio capture and automated consent verification.
          </p>
        </div>

        <QuickActions onStartRecordingClick={handleStartRecordingScroll} />
      </div>

      {/* A. Overview Statistics */}
      <section>
        <OverviewStats stats={stats} />
      </section>

      {/* Recording Engine Studio & Call Interface */}
      <section ref={studioRef} className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
            <Radio className="w-4 h-4 text-indigo-400" />
            Live WebRTC Recording Studio
          </h2>
          <span className="text-xs text-zinc-500 font-mono">v3.0 Production Engine</span>
        </div>

        <WebRTCCallRoom
          onRecordingComplete={handleRecordingSaved}
          startTrigger={recordTrigger}
        />
      </section>

      {/* C. Recent Recordings */}
      <section className="space-y-3">
        <RecentRecordings
          recordings={recordings}
          onSelectRecordingForPlay={(rec) => setSelectedRecording(rec)}
        />
      </section>

      {/* Persistent Audio Player Drawer */}
      {selectedRecording && (
        <AudioPlayer
          recording={selectedRecording}
          onClose={() => setSelectedRecording(null)}
        />
      )}
    </div>
  );
}
