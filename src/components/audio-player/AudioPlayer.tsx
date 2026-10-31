'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Download,
  X,
  Sparkles,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Recording } from '@/types';
import { getLocalAudioBlob } from '@/lib/storage/localRecordings';

interface AudioPlayerProps {
  recording: Recording | null;
  onClose?: () => void;
  autoPlay?: boolean;
}

export function AudioPlayer({ recording, onClose, autoPlay = true }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const speeds = [0.5, 1, 1.25, 1.5, 2];

  // Resolve real audio source (IndexedDB Local Blob or Signed Storage URL)
  useEffect(() => {
    if (!recording) {
      setAudioSrc(null);
      setIsPlaying(false);
      return;
    }

    let isMounted = true;
    let createdBlobUrl: string | null = null;
    setIsLoadingUrl(true);
    setLoadError(null);
    setCurrentTime(0);

    const loadAudioSource = async () => {
      try {
        if (recording.file_path.startsWith('local://')) {
          // Fetch real recorded audio blob from IndexedDB
          const blob = await getLocalAudioBlob(recording.id);
          if (blob && isMounted) {
            createdBlobUrl = URL.createObjectURL(blob);
            setAudioSrc(createdBlobUrl);
            setIsLoadingUrl(false);
            return;
          }

          if (isMounted) {
            setLoadError('Recorded audio file not found in local browser storage.');
            setIsLoadingUrl(false);
            return;
          }
        }

        // Fetch secure signed URL from API for private Supabase Storage
        const res = await fetch(`/api/recordings/${recording.id}/signed-url`);
        if (!res.ok) {
          throw new Error('Could not retrieve secure playback URL');
        }
        const data = await res.json();
        if (data.signedUrl && isMounted) {
          setAudioSrc(data.signedUrl);
        } else if (isMounted) {
          setLoadError('Signed URL unavailable.');
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Failed to load audio';
          setLoadError(msg);
        }
      } finally {
        if (isMounted) setIsLoadingUrl(false);
      }
    };

    loadAudioSource();

    return () => {
      isMounted = false;
      if (createdBlobUrl) {
        URL.revokeObjectURL(createdBlobUrl);
      }
    };
  }, [recording]);

  // Handle Play/Pause
  const togglePlay = useCallback(() => {
    if (!audioRef.current || !audioSrc) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((e) => {
          console.warn('Playback error:', e);
          setIsPlaying(false);
        });
    }
  }, [isPlaying, audioSrc]);

  // Seek +/- seconds
  const seekRelative = (seconds: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, Math.min(audioRef.current.currentTime + seconds, duration));
  };

  // Timeline scrubber
  const handleTimelineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  // Speed change
  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  // Volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume || 0.8;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  // Download Recording
  const handleDownload = () => {
    if (!audioSrc || !recording) return;
    const a = document.createElement('a');
    a.href = audioSrc;
    a.download = `${recording.title.replace(/[^a-z0-9_-]/gi, '_')}.${recording.file_format || 'webm'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!recording) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:px-8 bg-[#09090B]/95 backdrop-blur-xl border-t border-zinc-800 shadow-2xl transition-all animate-in slide-in-from-bottom duration-300">
      <audio
        ref={audioRef}
        src={audioSrc || undefined}
        onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration || recording.duration || 0);
            if (autoPlay) {
              audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
            }
          }
        }}
        onEnded={() => setIsPlaying(false)}
      />

      <div className="max-w-7xl mx-auto flex flex-col gap-2">
        {/* Top bar: Title & meta */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
              <Sparkles className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-zinc-100 truncate">{recording.title}</h4>
              <p className="text-xs text-zinc-400 truncate">
                {new Date(recording.recording_date).toLocaleDateString()} • {recording.file_format.toUpperCase()} • {(recording.file_size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isLoadingUrl && (
              <span className="flex items-center gap-1.5 text-xs text-indigo-400 bg-indigo-950/40 px-2.5 py-1 rounded-full border border-indigo-800/40">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Loading audio...
              </span>
            )}
            {loadError && (
              <span className="flex items-center gap-1 text-xs text-rose-400 bg-rose-950/40 px-2.5 py-1 rounded-full border border-rose-800/40">
                <AlertCircle className="w-3.5 h-3.5" />
                {loadError}
              </span>
            )}
            <button
              onClick={handleDownload}
              title="Download Recording"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
            >
              <Download className="w-4 h-4" />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                title="Close Player"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Center: Controls & Scrubber */}
        <div className="flex flex-col md:flex-row items-center gap-4">
          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => seekRelative(-10)}
              title="Seek backward 10s"
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={togglePlay}
              disabled={isLoadingUrl || !audioSrc}
              className="w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>

            <button
              onClick={() => seekRelative(10)}
              title="Seek forward 10s"
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>

          {/* Timeline bar */}
          <div className="flex items-center gap-3 flex-1 w-full">
            <span className="text-xs font-mono text-zinc-400 shrink-0 w-12 text-right">
              {formatTime(currentTime)}
            </span>
            <div className="relative flex-1 flex items-center group">
              <input
                type="range"
                min="0"
                max={duration || recording.duration || 100}
                step="0.1"
                value={currentTime}
                onChange={handleTimelineChange}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:h-2 transition-all focus:outline-none"
              />
            </div>
            <span className="text-xs font-mono text-zinc-400 shrink-0 w-12">
              {formatTime(duration || recording.duration || 0)}
            </span>
          </div>

          {/* Right: Volume & Speed Controls */}
          <div className="flex items-center gap-4 shrink-0">
            {/* Speed Pills */}
            <div className="flex items-center bg-zinc-850 p-0.5 rounded-lg border border-zinc-800">
              {speeds.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSpeedChange(s)}
                  className={`px-2 py-0.5 text-xs font-medium rounded transition ${
                    playbackSpeed === s
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            {/* Volume */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="text-zinc-400 hover:text-zinc-200 transition"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
