'use client';

import React from 'react';
import Link from 'next/link';
import { Mic, ListMusic, Settings, PhoneForwarded } from 'lucide-react';

interface QuickActionsProps {
  onStartRecordingClick?: () => void;
}

export function QuickActions({ onStartRecordingClick }: QuickActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={onStartRecordingClick}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-lg shadow-indigo-600/20 active:scale-95 transition"
      >
        <Mic className="w-4 h-4" />
        Start Recording
      </button>

      <Link
        href="/dashboard/recordings"
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 font-medium text-xs transition active:scale-95"
      >
        <ListMusic className="w-4 h-4 text-zinc-400" />
        View Recordings
      </Link>

      <Link
        href="/dashboard/settings"
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 font-medium text-xs transition active:scale-95"
      >
        <Settings className="w-4 h-4 text-zinc-400" />
        Recording Settings
      </Link>
    </div>
  );
}
