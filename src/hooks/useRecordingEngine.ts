'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { AudioRecordingEngine, RecordingEngineState } from '@/lib/recording/engine';
import { uploadRecordingFile } from '@/lib/storage/recordings';
import { Recording, RecordingStatus } from '@/types';

interface UseRecordingEngineOptions {
  userId?: string;
  autoUpload?: boolean;
  audibleChime?: boolean;
  bitrate?: number;
  onRecordingSaved?: (recording: Recording) => void;
}

export function useRecordingEngine(options: UseRecordingEngineOptions = {}) {
  const {
    userId = 'local-user',
    autoUpload = true,
    audibleChime = true,
    bitrate = 128000,
    onRecordingSaved,
  } = options;

  const [engineState, setEngineState] = useState<RecordingEngineState>('idle');
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>('idle');
  const [duration, setDuration] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>(new Array(32).fill(10));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastBlob, setLastBlob] = useState<Blob | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const engineRef = useRef<AudioRecordingEngine | null>(null);

  // Initialize engine
  useEffect(() => {
    const engine = new AudioRecordingEngine({
      onStateChange: (state) => {
        setEngineState(state);
        if (state === 'recording') setRecordingStatus('recording');
        if (state === 'paused') setRecordingStatus('paused');
        if (state === 'stopped') setRecordingStatus('completed');
      },
      onDurationUpdate: (dur) => setDuration(dur),
      onWaveformData: (data) => {
        // Downsample 64 bins to 32 normalized values (10-100%) with vocal frequency boost
        const sampled: number[] = [];
        const step = Math.floor(data.length / 32) || 1;
        for (let i = 0; i < 32; i++) {
          const val = data[i * step] || 0;
          sampled.push(Math.min(100, Math.max(8, Math.round((val / 160) * 100))));
        }
        setWaveformData(sampled);
      },
      onError: (err) => {
        console.error('Recording engine error:', err);
        setErrorMessage(err.message);
        setRecordingStatus('failed');
      },
      onDataAvailable: (blob, finalDuration) => {
        setLastBlob(blob);
      },
    });

    engineRef.current = engine;

    return () => {
      engine.cleanup();
    };
  }, []);

  const requestMicPermission = useCallback(async (options?: { ambientSpeakerMode?: boolean }) => {
    setErrorMessage(null);
    try {
      if (!engineRef.current) return null;
      return await engineRef.current.initMicrophone(options);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Microphone access denied';
      setErrorMessage(msg);
      return null;
    }
  }, []);

  const attachRemoteStream = useCallback((stream: MediaStream | null) => {
    engineRef.current?.setRemoteStream(stream);
  }, []);

  const startRecording = useCallback(async () => {
    setErrorMessage(null);
    setUploadProgress(0);
    try {
      if (audibleChime && engineRef.current) {
        await engineRef.current.playDisclosureChime();
      }
      await engineRef.current?.start(bitrate);
      setRecordingStatus('recording');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to start recording';
      setErrorMessage(msg);
      setRecordingStatus('failed');
    }
  }, [audibleChime, bitrate]);

  const pauseRecording = useCallback(() => {
    engineRef.current?.pause();
  }, []);

  const resumeRecording = useCallback(() => {
    engineRef.current?.resume();
  }, []);

  const stopRecording = useCallback(async (meta?: { title?: string; sessionId?: string | null }) => {
    if (!engineRef.current) return null;

    setRecordingStatus('uploading');
    setUploadProgress(15);

    const blob = await engineRef.current.stop();
    setLastBlob(blob);
    setUploadProgress(40);

    const recordingId = crypto.randomUUID();
    const finalDuration = Math.max(1, engineRef.current?.getDuration() || duration);
    const format = blob.type.includes('webm') ? 'webm' : 'wav';
    const title = meta?.title || `Recording ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    let savedFilePath = '';

    if (autoUpload) {
      setUploadProgress(60);
      const { filePath, error } = await uploadRecordingFile(userId, recordingId, blob, format);
      if (error) {
        setErrorMessage(`Upload error: ${error}`);
        setRecordingStatus('failed');
        return null;
      }
      savedFilePath = filePath;
      setUploadProgress(90);
    }

    // Persist recording metadata to API / DB
    try {
      const res = await fetch('/api/recordings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: recordingId,
          user_id: userId,
          title,
          file_path: savedFilePath || `local://${userId}/${recordingId}/recording.${format}`,
          file_format: format,
          file_size: blob.size,
          duration: finalDuration,
          recording_status: 'completed',
          session_id: meta?.sessionId || null,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save recording metadata');
      }

      const savedRecording: Recording = await res.json();
      setRecordingStatus('completed');
      setUploadProgress(100);
      onRecordingSaved?.(savedRecording);
      return savedRecording;
    } catch (e: unknown) {
      console.warn('API save fallback to client event:', e);
      const fallbackRec: Recording = {
        id: recordingId,
        user_id: userId,
        title,
        file_path: savedFilePath || `local://${userId}/${recordingId}/recording.${format}`,
        file_format: format,
        file_size: blob.size,
        duration: finalDuration,
        recording_date: new Date().toISOString(),
        recording_status: 'completed',
        session_id: meta?.sessionId || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setRecordingStatus('completed');
      setUploadProgress(100);
      onRecordingSaved?.(fallbackRec);
      return fallbackRec;
    }
  }, [autoUpload, duration, onRecordingSaved, userId]);

  const resetRecording = useCallback(() => {
    setDuration(0);
    setLastBlob(null);
    setRecordingStatus('idle');
    setEngineState('idle');
    setErrorMessage(null);
    setUploadProgress(0);
    setWaveformData(new Array(32).fill(10));
  }, []);

  return {
    engineState,
    recordingStatus,
    setRecordingStatus,
    duration,
    waveformData,
    errorMessage,
    lastBlob,
    uploadProgress,
    requestMicPermission,
    attachRemoteStream,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    resetRecording,
  };
}
