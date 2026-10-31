'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  Play,
  Download,
  Trash2,
  Edit2,
  Clock,
  HardDrive,
  FileAudio,
  Calendar,
  Check,
  X,
  Info,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { Recording } from '@/types';

interface RecordingLibraryProps {
  recordings: Recording[];
  onSelectRecordingForPlay: (recording: Recording) => void;
  onRefresh?: () => void;
}

export function RecordingLibrary({
  recordings,
  onSelectRecordingForPlay,
  onRefresh,
}: RecordingLibraryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'duration' | 'size'>('newest');
  const [filterDuration, setFilterDuration] = useState<'all' | 'short' | 'medium' | 'long'>('all'); // short < 5m, medium 5-15m, long > 15m
  const [filterDate, setFilterDate] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // Inline rename state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Delete confirm modal state
  const [deletingRecording, setDeletingRecording] = useState<Recording | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Inspector modal state
  const [inspectRecording, setInspectRecording] = useState<Recording | null>(null);

  // Filter and sort logic
  const filteredRecordings = useMemo(() => {
    return recordings
      .filter((rec) => {
        // Search filter
        const matchesSearch =
          rec.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          rec.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (rec.session_id && rec.session_id.toLowerCase().includes(searchTerm.toLowerCase()));

        if (!matchesSearch) return false;

        // Duration filter
        if (filterDuration === 'short' && rec.duration >= 300) return false;
        if (filterDuration === 'medium' && (rec.duration < 300 || rec.duration > 900)) return false;
        if (filterDuration === 'long' && rec.duration <= 900) return false;

        // Date filter
        const recTime = new Date(rec.recording_date).getTime();
        const now = Date.now();
        if (filterDate === 'today') {
          const todayStart = new Date().setHours(0, 0, 0, 0);
          if (recTime < todayStart) return false;
        } else if (filterDate === 'week') {
          if (now - recTime > 7 * 86400000) return false;
        } else if (filterDate === 'month') {
          if (now - recTime > 30 * 86400000) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'oldest') {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        if (sortBy === 'duration') {
          return b.duration - a.duration;
        }
        if (sortBy === 'size') {
          return b.file_size - a.file_size;
        }
        // Default newest
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [recordings, searchTerm, sortBy, filterDuration, filterDate]);

  // Rename action
  const handleStartRename = (rec: Recording) => {
    setEditingId(rec.id);
    setEditTitle(rec.title);
  };

  const handleSaveRename = async (id: string) => {
    if (!editTitle.trim()) return;
    try {
      await fetch(`/api/recordings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle.trim() }),
      });
      setEditingId(null);
      onRefresh?.();
    } catch (e) {
      console.error('Rename failed:', e);
    }
  };

  // Delete action
  const handleConfirmDelete = async () => {
    if (!deletingRecording) return;
    setIsDeleting(true);
    try {
      await fetch(`/api/recordings/${deletingRecording.id}`, {
        method: 'DELETE',
      });
      setDeletingRecording(null);
      onRefresh?.();
    } catch (e) {
      console.error('Deletion failed:', e);
    } finally {
      setIsDeleting(false);
    }
  };

  // Download action
  const handleDownload = async (rec: Recording) => {
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
    } catch (e) {
      console.error('Download error:', e);
    }
  };

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

  return (
    <div className="space-y-4">
      {/* Search & Filter Header Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 bg-[#111114] border border-zinc-800 rounded-2xl">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search recordings by title, session ID, or format..."
            className="w-full pl-10 pr-4 py-2 bg-[#18181B] border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter & Sort Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sort By Dropdown */}
          <div className="flex items-center gap-1.5 bg-[#18181B] px-3 py-1.5 rounded-xl border border-zinc-800 text-xs text-zinc-300">
            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-zinc-200 focus:outline-none cursor-pointer"
            >
              <option value="newest" className="bg-zinc-900">Newest First</option>
              <option value="oldest" className="bg-zinc-900">Oldest First</option>
              <option value="duration" className="bg-zinc-900">Longest Duration</option>
              <option value="size" className="bg-zinc-900">Largest File Size</option>
            </select>
          </div>

          {/* Date Range Filter */}
          <div className="flex items-center gap-1.5 bg-[#18181B] px-3 py-1.5 rounded-xl border border-zinc-800 text-xs text-zinc-300">
            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value as any)}
              className="bg-transparent text-zinc-200 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-zinc-900">All Dates</option>
              <option value="today" className="bg-zinc-900">Today</option>
              <option value="week" className="bg-zinc-900">Past 7 Days</option>
              <option value="month" className="bg-zinc-900">Past 30 Days</option>
            </select>
          </div>

          {/* Duration Filter */}
          <div className="flex items-center gap-1.5 bg-[#18181B] px-3 py-1.5 rounded-xl border border-zinc-800 text-xs text-zinc-300">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={filterDuration}
              onChange={(e) => setFilterDuration(e.target.value as any)}
              className="bg-transparent text-zinc-200 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-zinc-900">All Durations</option>
              <option value="short" className="bg-zinc-900">&lt; 5 mins</option>
              <option value="medium" className="bg-zinc-900">5 - 15 mins</option>
              <option value="long" className="bg-zinc-900">&gt; 15 mins</option>
            </select>
          </div>
        </div>
      </div>

      {/* Recording List / Table */}
      {filteredRecordings.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#111114] border border-zinc-800/80">
          <FileAudio className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <h4 className="text-base font-medium text-zinc-300 mb-1">No recordings found</h4>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            {searchTerm || filterDate !== 'all' || filterDuration !== 'all'
              ? 'Try adjusting your search query or filters to find what you are looking for.'
              : 'Record your first WebRTC or telephony call above to populate your library.'}
          </p>
        </div>
      ) : (
        <div className="bg-[#111114] border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="divide-y divide-zinc-800/70">
            {filteredRecordings.map((rec) => {
              const isEditing = editingId === rec.id;
              const formattedDate = new Date(rec.recording_date).toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });
              const formattedTime = new Date(rec.recording_date).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={rec.id}
                  className="p-4 md:px-6 hover:bg-zinc-800/30 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  {/* Left: Play icon + Title + Meta */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <button
                      onClick={() => onSelectRecordingForPlay(rec)}
                      className="w-10 h-10 rounded-full bg-indigo-500/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20 hover:border-transparent flex items-center justify-center shrink-0 transition shadow-sm active:scale-95 group"
                      title="Play Recording"
                    >
                      <Play className="w-4 h-4 fill-current ml-0.5 group-hover:scale-110 transition-transform" />
                    </button>

                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <div className="flex items-center gap-2 max-w-md">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="px-2.5 py-1 text-sm bg-zinc-900 border border-indigo-500 rounded-lg text-zinc-100 focus:outline-none w-full"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveRename(rec.id)}
                            className="p-1 rounded text-emerald-400 hover:bg-emerald-950/40"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1 rounded text-zinc-400 hover:bg-zinc-800"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h4
                            onClick={() => onSelectRecordingForPlay(rec)}
                            className="text-sm font-medium text-zinc-200 hover:text-indigo-400 transition cursor-pointer truncate"
                          >
                            {rec.title}
                          </h4>
                          <button
                            onClick={() => handleStartRename(rec)}
                            className="text-zinc-500 hover:text-zinc-300 transition opacity-0 group-hover:opacity-100"
                            title="Rename"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 mt-1">
                        <span className="flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3 text-zinc-500" />
                          {formattedDate} at {formattedTime}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-zinc-500" />
                          {formatDuration(rec.duration)}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-mono">
                          <HardDrive className="w-3 h-3 text-zinc-500" />
                          {formatFileSize(rec.file_size)}
                        </span>
                        <span>•</span>
                        <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
                          {rec.file_format}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => setInspectRecording(rec)}
                      className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 transition"
                      title="Inspect Metadata & Session"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleStartRename(rec)}
                      className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 transition"
                      title="Rename Recording"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDownload(rec)}
                      className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 transition"
                      title="Download Recording"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingRecording(rec)}
                      className="p-2 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30 transition"
                      title="Delete Recording"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Inspector Modal */}
      {inspectRecording && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#18181B] border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                <FileAudio className="w-4 h-4 text-indigo-400" />
                Recording Specifications
              </h3>
              <button
                onClick={() => setInspectRecording(null)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-zinc-800/50">
                <span className="text-zinc-400">Recording ID:</span>
                <span className="font-mono text-zinc-200">{inspectRecording.id}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-800/50">
                <span className="text-zinc-400">Title:</span>
                <span className="text-zinc-200 font-medium">{inspectRecording.title}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-800/50">
                <span className="text-zinc-400">Associated Call Session:</span>
                <span className="font-mono text-indigo-400">{inspectRecording.session_id || 'Browser Direct Session'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-800/50">
                <span className="text-zinc-400">Duration:</span>
                <span className="text-zinc-200">{formatDuration(inspectRecording.duration)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-800/50">
                <span className="text-zinc-400">Audio Format:</span>
                <span className="text-zinc-200 uppercase">{inspectRecording.file_format} (Opus Codec)</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-800/50">
                <span className="text-zinc-400">File Size:</span>
                <span className="text-zinc-200">{formatFileSize(inspectRecording.file_size)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-800/50">
                <span className="text-zinc-400">Cloud Storage Bucket:</span>
                <span className="text-zinc-200">call-recordings (Private)</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-800/50">
                <span className="text-zinc-400">Storage Object URI:</span>
                <span className="font-mono text-zinc-400 truncate max-w-[260px]">{inspectRecording.file_path}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-zinc-400">Created At:</span>
                <span className="font-mono text-zinc-200">{new Date(inspectRecording.created_at).toISOString()}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
              <button
                onClick={() => {
                  onSelectRecordingForPlay(inspectRecording);
                  setInspectRecording(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Listen in Player
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingRecording && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#18181B] border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400 mb-3">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-semibold text-zinc-100">Permanently Delete Recording?</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed mb-6">
              This action cannot be undone. This will permanently remove <strong className="text-zinc-200">"{deletingRecording.title}"</strong> and delete the private audio object from your Supabase Storage bucket.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeletingRecording(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20 transition disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
