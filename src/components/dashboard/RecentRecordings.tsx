'use client';

import React from 'react';
import Link from 'next/link';
import { Play, Download, Clock, HardDrive, Calendar, ArrowRight, FileAudio } from 'lucide-react';
import { Recording } from '@/types';

interface RecentRecordingsProps {
  recordings: Recording[];
  onSelectRecordingForPlay: (recording: Recording) => void;
}

export function RecentRecordings({
  recordings,
  onSelectRecordingForPlay,
}: RecentRecordingsProps) {
  const recentItems = recordings.slice(0, 5);

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${mins}m ${s.toString().padStart(2, '0')}s`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleDownload = async (rec: Recording, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (rec.file_path.startsWith('local://')) {
        const { getLocalAudioBlob } = await import('@/lib/storage/localRecordings');
        const blob = await getLocalAudioBlob(rec.id);
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${rec.title.replace(/[^a-z0-9_-]/gi, '_')}.${rec.file_format || 'webm'}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          return;
        }
      }

      const res = await fetch(`/api/recordings/${rec.id}/signed-url`);
      const data = await res.json();
      if (data.signedUrl && !data.signedUrl.startsWith('local://')) {
        const a = document.createElement('a');
        a.href = data.signedUrl;
        a.download = `${rec.title.replace(/[^a-z0-9_-]/gi, '_')}.${rec.file_format || 'webm'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  return (
    <div className="bg-[#111114] border border-zinc-800 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80 mb-4">
        <div>
          <h3 className="text-base font-semibold text-zinc-100">Recent Recordings</h3>
          <p className="text-xs text-zinc-400">Latest authorized audio captures</p>
        </div>
        <Link
          href="/dashboard/recordings"
          className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition"
        >
          View all
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {recentItems.length === 0 ? (
        <div className="py-8 text-center text-xs text-zinc-500">
          <FileAudio className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
          No recordings saved yet. Initiate a call above to record audio.
        </div>
      ) : (
        <div className="divide-y divide-zinc-800/60">
          {recentItems.map((rec) => (
            <div
              key={rec.id}
              onClick={() => onSelectRecordingForPlay(rec)}
              className="py-3 flex items-center justify-between gap-4 hover:bg-zinc-800/20 px-2 rounded-xl transition cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectRecordingForPlay(rec);
                  }}
                  className="w-8 h-8 rounded-full bg-indigo-500/10 group-hover:bg-indigo-600 text-indigo-400 group-hover:text-white border border-indigo-500/20 group-hover:border-transparent flex items-center justify-center shrink-0 transition"
                >
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                </button>
                <div className="min-w-0">
                  <h4 className="text-xs font-medium text-zinc-200 group-hover:text-indigo-400 truncate transition">
                    {rec.title}
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-0.5">
                    <span>{new Date(rec.recording_date).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{formatDuration(rec.duration)}</span>
                    <span>•</span>
                    <span>{formatFileSize(rec.file_size)}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={(e) => handleDownload(rec, e)}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition shrink-0"
                title="Download file"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
