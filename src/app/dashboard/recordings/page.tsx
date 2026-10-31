'use client';

import React, { useState, useEffect } from 'react';
import { RecordingLibrary } from '@/components/recordings/RecordingLibrary';
import { AudioPlayer } from '@/components/audio-player/AudioPlayer';
import { Recording } from '@/types';
import { ListMusic, RefreshCw, Loader2 } from 'lucide-react';

export default function RecordingsPage() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRecordings = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/recordings');
      if (res.ok) {
        const data = await res.json();
        setRecordings(data);
      }
    } catch (err) {
      console.error('Failed to fetch recordings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecordings();
  }, []);

  return (
    <div className="space-y-6 pb-28">
      {/* Page Header */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2.5">
            <ListMusic className="w-6 h-6 text-indigo-400" />
            Recording Library
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Search, listen, organize, rename, and download your private browser and telephony call recordings.
          </p>
        </div>

        <button
          onClick={fetchRecordings}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-medium transition active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-zinc-500">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
          <p className="text-xs">Loading recording repository...</p>
        </div>
      ) : (
        <RecordingLibrary
          recordings={recordings}
          onSelectRecordingForPlay={(rec) => setSelectedRecording(rec)}
          onRefresh={fetchRecordings}
        />
      )}

      {/* Persistent Audio Player */}
      {selectedRecording && (
        <AudioPlayer
          recording={selectedRecording}
          onClose={() => setSelectedRecording(null)}
        />
      )}
    </div>
  );
}
