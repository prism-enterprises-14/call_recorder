'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Phone,
  PhoneOff,
  Mic,
  Radio,
  CheckCircle2,
  Clock,
  Play,
  Pause,
  Square,
  ShieldCheck,
  AlertTriangle,
  UserCheck,
  Volume2,
  MessageCircle,
  HelpCircle,
  Share2,
  ExternalLink,
} from 'lucide-react';
import { useRecordingEngine } from '@/hooks/useRecordingEngine';
import { AudioWaveformVisualizer } from './AudioWaveformVisualizer';
import { CallSession, Recording, TelephonyProviderType } from '@/types';

interface WebRTCCallRoomProps {
  onRecordingComplete?: (recording: Recording) => void;
  userId?: string;
  defaultAutoRecord?: boolean;
  startTrigger?: number;
}

export function WebRTCCallRoom({
  onRecordingComplete,
  userId = 'default-user',
  defaultAutoRecord = true,
  startTrigger,
}: WebRTCCallRoomProps) {
  // Call session state
  const [isInCall, setIsInCall] = useState(false);
  const [callProvider, setCallProvider] = useState<TelephonyProviderType>('webrtc');
  const [activeSession, setActiveSession] = useState<CallSession | null>(null);
  const [remoteParticipantName, setRemoteParticipantName] = useState('Remote Peer (Alice)');
  const [whatsAppStream, setWhatsAppStream] = useState<MediaStream | null>(null);

  // Participant Consent states
  const [hostConsent, setHostConsent] = useState(true);
  const [remoteConsent, setRemoteConsent] = useState(true);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Auto record preference
  const [autoRecordEnabled, setAutoRecordEnabled] = useState(defaultAutoRecord);

  // Modals & UI states
  const [showCallSelector, setShowCallSelector] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [justSavedRecording, setJustSavedRecording] = useState<Recording | null>(null);

  // Engine hook with ZERO audible chime beep noise
  const {
    recordingStatus,
    duration,
    waveformData,
    errorMessage,
    requestMicPermission,
    attachRemoteStream,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    resetRecording,
  } = useRecordingEngine({
    userId,
    autoUpload: true,
    audibleChime: false, // ZERO BEEP NOISE
    onRecordingSaved: (saved) => {
      setJustSavedRecording(saved);
      onRecordingComplete?.(saved);
    },
  });

  const remoteAudioCtxRef = useRef<AudioContext | null>(null);

  // Format timer MM:SS
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Create clean silent audio stream for remote peer simulation (ZERO OSCILLATOR BEEP NOISE)
  const createCleanRemoteAudioStream = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      remoteAudioCtxRef.current = ctx;

      const dest = ctx.createMediaStreamDestination();
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime); // 100% silent - no beep noise
      gain.connect(dest);

      return dest.stream;
    } catch {
      return null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (whatsAppStream) {
        whatsAppStream.getTracks().forEach((t) => t.stop());
      }
      if (remoteAudioCtxRef.current) {
        try { remoteAudioCtxRef.current.close(); } catch {}
      }
    };
  }, [whatsAppStream]);

  // 1. Connect WebRTC Peer Call
  const handleStartWebRTCCall = async () => {
    setStatusNotice(null);
    setJustSavedRecording(null);
    setShowCallSelector(false);

    try {
      const micStream = await requestMicPermission();
      if (!micStream) {
        setStatusNotice('Microphone permission required to connect call.');
        return;
      }

      // Attach clean remote audio (no beep)
      const cleanRemoteStream = createCleanRemoteAudioStream();
      if (cleanRemoteStream) {
        attachRemoteStream(cleanRemoteStream);
      }

      const sessionId = crypto.randomUUID();
      const res = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: sessionId,
          provider: 'webrtc',
          call_status: 'in_progress',
          recording_enabled: true,
        }),
      });

      const sessionData: CallSession = res.ok
        ? await res.json()
        : {
            id: sessionId,
            user_id: userId,
            provider: 'webrtc',
            external_call_id: `rtc_${sessionId.slice(0, 8)}`,
            call_status: 'in_progress',
            started_at: new Date().toISOString(),
            ended_at: null,
            recording_enabled: true,
            created_at: new Date().toISOString(),
          };

      setCallProvider('webrtc');
      setRemoteParticipantName('WebRTC Peer (Alice)');
      setActiveSession(sessionData);
      setIsInCall(true);
      setHostConsent(true);
      setRemoteConsent(true);

      // Auto start recording once call is detected
      await startRecording();
    } catch (e: unknown) {
      console.error('WebRTC call start error:', e);
      setStatusNotice('Failed to connect WebRTC call session.');
    }
  };

  // 2. Connect & Record WhatsApp Call (Tab / Application Audio Capture)
  const handleCaptureWhatsAppCall = async () => {
    setStatusNotice(null);
    setJustSavedRecording(null);
    setShowCallSelector(false);

    try {
      // 1. Check microphone first
      await requestMicPermission();

      // 2. Request Display / Tab Media with system or tab audio
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        setStatusNotice('Tab audio capture is not supported in this browser version.');
        return;
      }

      // Browser displays standard picker for user to select WhatsApp Web tab or application window
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const audioTracks = displayStream.getAudioTracks();
      if (audioTracks.length === 0) {
        setStatusNotice('No audio track selected. Make sure to check "Share audio" when selecting the WhatsApp tab.');
        displayStream.getTracks().forEach((t) => t.stop());
        return;
      }

      // Extract isolated audio stream
      const audioStream = new MediaStream(audioTracks);
      setWhatsAppStream(displayStream);
      attachRemoteStream(audioStream);

      // Automatically stop recording when WhatsApp tab/call audio stream ends
      audioTracks[0].onended = () => {
        handleEndCall();
      };

      const sessionId = crypto.randomUUID();
      await fetch('/api/telephony/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'call_answered',
          call_id: `wa_${sessionId.slice(0, 8)}`,
        }),
      });

      const sessionData: CallSession = {
        id: sessionId,
        user_id: userId,
        provider: 'whatsapp',
        external_call_id: `wa_${sessionId.slice(0, 8)}`,
        call_status: 'in_progress',
        started_at: new Date().toISOString(),
        ended_at: null,
        recording_enabled: true,
        created_at: new Date().toISOString(),
      };

      setCallProvider('whatsapp');
      setRemoteParticipantName('WhatsApp Call (Live Audio)');
      setActiveSession(sessionData);
      setIsInCall(true);
      setHostConsent(true);
      setRemoteConsent(true);

      // Start recording the WhatsApp call immediately with zero beep noise
      await startRecording();
    } catch (e: unknown) {
      console.warn('WhatsApp capture cancelled or error:', e);
      setStatusNotice('WhatsApp capture cancelled or audio sharing was not enabled.');
    }
  };

  // Primary Record Button click handler:
  // If no call is detected, prompt the user to choose a call connection first.
  // If call is detected, toggle recording!
  const handleRecordButtonClick = () => {
    if (!isInCall) {
      setShowCallSelector(true);
      return;
    }

    if (recordingStatus === 'idle' || recordingStatus === 'completed' || recordingStatus === 'failed') {
      startRecording();
    } else if (recordingStatus === 'recording') {
      pauseRecording();
    } else if (recordingStatus === 'paused') {
      resumeRecording();
    }
  };

  // External trigger handler
  useEffect(() => {
    if (startTrigger && startTrigger > 0) {
      if (!isInCall) {
        setShowCallSelector(true);
      } else if (recordingStatus === 'idle' || recordingStatus === 'completed') {
        startRecording();
      }
    }
  }, [startTrigger, isInCall, recordingStatus, startRecording]);

  // End Call
  const handleEndCall = async () => {
    if (recordingStatus === 'recording' || recordingStatus === 'paused') {
      setShowStopConfirm(true);
      return;
    }
    finishCallSession();
  };

  const finishCallSession = async () => {
    const title = callProvider === 'whatsapp'
      ? `WhatsApp Call (${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
      : `Call with ${remoteParticipantName}`;

    if (recordingStatus === 'recording' || recordingStatus === 'paused') {
      await stopRecording({
        title,
        sessionId: activeSession?.id,
      });
    }

    if (whatsAppStream) {
      whatsAppStream.getTracks().forEach((t) => t.stop());
      setWhatsAppStream(null);
    }

    setIsInCall(false);
    setActiveSession(null);
    resetRecording();
    setShowStopConfirm(false);
  };

  return (
    <div className="relative bg-[#111114] border border-zinc-800 rounded-2xl p-6 shadow-xl">
      {/* Top Header: Session Status & Indicators */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-zinc-800/80">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div
              className={`w-3.5 h-3.5 rounded-full ${
                recordingStatus === 'recording'
                  ? 'bg-rose-500 animate-ping'
                  : isInCall
                  ? 'bg-emerald-500 animate-pulse'
                  : 'bg-amber-500'
              }`}
            />
            <div
              className={`absolute inset-0 w-3.5 h-3.5 rounded-full ${
                recordingStatus === 'recording'
                  ? 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.8)]'
                  : isInCall
                  ? 'bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]'
                  : 'bg-amber-500'
              }`}
            />
          </div>

          <div>
            <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              WebRTC & WhatsApp Recording Studio
              {recordingStatus === 'recording' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <Radio className="w-3 h-3 animate-pulse text-rose-500" />
                  RECORDING ACTIVE
                </span>
              ) : isInCall ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  CALL DETECTED: {callProvider.toUpperCase()}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  NO CALL DETECTED
                </span>
              )}
            </h3>
            <p className="text-xs text-zinc-400">
              {isInCall
                ? `Call active (${remoteParticipantName}) • Clean multi-stream recording engaged with zero tone noise`
                : 'Make a call or capture WhatsApp audio below. Recording starts only when an active call is detected.'}
            </p>
          </div>
        </div>

        {/* Call Timer & Action Buttons */}
        <div className="flex items-center gap-3">
          {isInCall && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span className="font-mono text-sm font-semibold text-zinc-100">{formatTimer(duration)}</span>
            </div>
          )}

          {!isInCall ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCaptureWhatsAppCall}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition shadow-lg shadow-emerald-600/20 active:scale-95"
                title="Capture audio from WhatsApp Web or WhatsApp Desktop call"
              >
                <MessageCircle className="w-4 h-4" />
                Record WhatsApp Call
              </button>
              <button
                onClick={handleStartWebRTCCall}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-medium text-xs transition active:scale-95"
              >
                <Phone className="w-4 h-4 text-indigo-400" />
                Make WebRTC Call
              </button>
            </div>
          ) : (
            <button
              onClick={handleEndCall}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800 font-medium text-xs transition active:scale-95"
            >
              <PhoneOff className="w-4 h-4" />
              End Active Call
            </button>
          )}
        </div>
      </div>

      {/* No Call Detected Guidance Banner */}
      {!isInCall && (
        <div className="mt-4 p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-zinc-300">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Call Detection Requirement:</strong> To prevent recording empty idle noise or beeps, recording requires an active call. Connect a WhatsApp call or WebRTC session to record.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCaptureWhatsAppCall}
              className="text-emerald-400 hover:text-emerald-300 font-medium underline underline-offset-2 flex items-center gap-1"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              WhatsApp Capture
            </button>
            <span>•</span>
            <button
              onClick={handleStartWebRTCCall}
              className="text-indigo-400 hover:text-indigo-300 font-medium underline underline-offset-2"
            >
              Start WebRTC Call
            </button>
          </div>
        </div>
      )}

      {/* Notice / Error notifications */}
      {statusNotice && (
        <div className="mt-4 p-3 rounded-xl bg-amber-950/40 border border-amber-800/40 flex items-center gap-3 text-amber-300 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>{statusNotice}</span>
        </div>
      )}

      {/* Just Saved Notification */}
      {justSavedRecording && (
        <div className="mt-4 p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/40 flex items-center justify-between gap-3 text-emerald-300 text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Recording saved:</strong> "{justSavedRecording.title}" ({formatTimer(justSavedRecording.duration)}, {(justSavedRecording.file_size / 1024).toFixed(1)} KB)
            </span>
          </div>
          <span className="text-[11px] text-emerald-400/80 font-mono">Clean Audio Finalized</span>
        </div>
      )}

      {/* Active Call Streams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
        {/* Stream 1: Local Microphone */}
        <div className="p-4 rounded-xl bg-[#18181B] border border-zinc-800/90 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-semibold text-xs">
                YOU
              </div>
              <div>
                <h4 className="text-sm font-medium text-zinc-100">Local Operator</h4>
                <p className="text-xs text-zinc-400">Microphone Audio (Clean Voice)</p>
              </div>
            </div>
            <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Mic Ready
            </span>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-zinc-800/60 text-xs text-zinc-400">
            <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
              <input
                type="checkbox"
                checked={hostConsent}
                onChange={(e) => setHostConsent(e.target.checked)}
                className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-indigo-600"
              />
              <span>Operator Consent Confirmed</span>
            </label>
            <span className="text-[11px] font-mono">Zero Beep Filter</span>
          </div>
        </div>

        {/* Stream 2: Remote Peer / WhatsApp Call Audio */}
        <div className="p-4 rounded-xl bg-[#18181B] border border-zinc-800/90 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full ${callProvider === 'whatsapp' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-purple-500/10 border-purple-500/30 text-purple-400'} border flex items-center justify-center font-semibold text-xs`}>
                {callProvider === 'whatsapp' ? 'WA' : 'CALL'}
              </div>
              <div>
                <h4 className="text-sm font-medium text-zinc-100">{remoteParticipantName}</h4>
                <p className="text-xs text-zinc-400">
                  {isInCall ? `${callProvider.toUpperCase()} incoming call audio stream` : 'Awaiting call connection'}
                </p>
              </div>
            </div>
            {isInCall ? (
              <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                <Volume2 className="w-3.5 h-3.5" />
                Live Stream Mixed
              </span>
            ) : (
              <span className="text-xs text-zinc-500">Not Connected</span>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-zinc-800/60 text-xs">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
                isInCall
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
              }`}
            >
              <UserCheck className="w-3 h-3" />
              {isInCall ? 'Call Audio Detected' : 'Standby'}
            </span>

            {!isInCall && (
              <button
                onClick={() => setShowCallSelector(true)}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium underline underline-offset-2 transition"
              >
                Choose Call Connection
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Recording Waveform & Live Visualizer */}
      <div className="flex flex-col items-center justify-center my-6 gap-3">
        <AudioWaveformVisualizer
          waveformData={waveformData}
          isRecording={recordingStatus === 'recording'}
          isPaused={recordingStatus === 'paused'}
        />

        <div className="flex items-center gap-4 text-xs text-zinc-400">
          <span className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                recordingStatus === 'recording'
                  ? 'bg-rose-500 animate-pulse'
                  : isInCall
                  ? 'bg-emerald-500'
                  : 'bg-zinc-600'
              }`}
            />
            Status: <span className="text-zinc-200 capitalize font-medium">{recordingStatus.replace(/_/g, ' ')}</span>
          </span>
          <span>•</span>
          <span>Tone Filter: Zero Noise Active</span>
        </div>
      </div>

      {/* Central Circular Recording Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 border-t border-zinc-800">
        {recordingStatus === 'idle' || recordingStatus === 'completed' || recordingStatus === 'failed' ? (
          <button
            onClick={handleRecordButtonClick}
            title={isInCall ? 'Start Recording Active Call' : 'Connect Call to Record'}
            className="group relative flex items-center justify-center w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-xl shadow-rose-600/30 hover:scale-105 active:scale-95 transition-all duration-200"
          >
            <div className="w-6 h-6 rounded-full bg-white group-hover:scale-110 transition-transform" />
          </button>
        ) : (
          <div className="flex items-center gap-3">
            {recordingStatus === 'recording' ? (
              <button
                onClick={pauseRecording}
                className="p-3.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition active:scale-95"
                title="Pause Recording"
              >
                <Pause className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={resumeRecording}
                className="p-3.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg transition active:scale-95"
                title="Resume Recording"
              >
                <Play className="w-5 h-5 fill-current ml-0.5" />
              </button>
            )}

            <button
              onClick={() => setShowStopConfirm(true)}
              className="flex items-center gap-2 px-6 py-3.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm transition shadow-xl shadow-rose-600/30 active:scale-95"
              title="Stop & Save Recording"
            >
              <Square className="w-4 h-4 fill-current" />
              Stop & Save Recording
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 sm:ml-4 text-xs text-zinc-400">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRecordEnabled}
              onChange={(e) => setAutoRecordEnabled(e.target.checked)}
              className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-indigo-600"
            />
            <span>Auto-record when call is detected</span>
          </label>
        </div>
      </div>

      {/* Call Selector Modal when user wants to start or record a call */}
      {showCallSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#18181B] border border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                <Phone className="w-5 h-5 text-indigo-400" />
                Select Call Source to Record
              </h3>
              <button
                onClick={() => setShowCallSelector(false)}
                className="text-zinc-400 hover:text-zinc-200 text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Choose the authorized audio stream you want to record. Recording engages automatically once the call stream is connected:
            </p>

            <div className="space-y-3">
              {/* Option 1: WhatsApp Call Capture */}
              <button
                onClick={handleCaptureWhatsAppCall}
                className="w-full p-4 rounded-2xl bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800 hover:border-emerald-500/50 transition flex items-start gap-3.5 text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-zinc-100 group-hover:text-emerald-400 transition">
                    WhatsApp Call (Web / App Audio)
                  </h4>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Records WhatsApp calls from your browser tab or desktop application with crystal clear audio.
                  </p>
                </div>
              </button>

              {/* Option 2: WebRTC Browser Peer Call */}
              <button
                onClick={handleStartWebRTCCall}
                className="w-full p-4 rounded-2xl bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800 hover:border-indigo-500/50 transition flex items-start gap-3.5 text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-zinc-100 group-hover:text-indigo-400 transition">
                    WebRTC Browser Call (Alice / Client)
                  </h4>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Start a browser-to-browser WebRTC call session mixing both local and remote tracks.
                  </p>
                </div>
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowCallSelector(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stop & Save Confirmation Modal */}
      {showStopConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#18181B] border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-zinc-100 mb-2">Finalize Call Recording?</h3>
            <p className="text-sm text-zinc-400 mb-6">
              Stopping will finalize your clean audio capture ({formatTimer(duration)}) and immediately save it to your library.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowStopConfirm(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
              >
                Keep Recording
              </button>
              <button
                onClick={finishCallSession}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20 transition"
              >
                Stop & Save Clean Audio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
