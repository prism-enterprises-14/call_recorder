'use client';

import React from 'react';
import Link from 'next/link';
import {
  Mic,
  ShieldCheck,
  Radio,
  Lock,
  HardDrive,
  AudioWaveform,
  CheckCircle2,
  ArrowRight,
  Server,
  Cloud,
  Layers,
  PhoneCall,
  Activity,
  Sliders,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 selection:bg-indigo-500/30">
      {/* Top Navigation */}
      <header className="border-b border-zinc-800/80 bg-[#09090B]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-600/30">
              <Mic className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-semibold text-base tracking-tight text-zinc-100">CallVault</span>
              <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">v3.0</span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-medium text-zinc-300 hover:text-white px-3 py-1.5 rounded-lg transition"
            >
              Sign In
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition shadow-lg shadow-indigo-600/20 active:scale-95"
            >
              Launch Dashboard
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-6 max-w-7xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-medium text-indigo-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Production-Grade WebRTC Audio Recording & Compliance Platform</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-zinc-100 max-w-3xl mx-auto leading-tight">
          Authorized Browser & Telephony <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Call Recording</span>
        </h1>

        <p className="text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          High-fidelity multi-stream audio capture mixing local microphones and remote WebRTC tracks. Built with automated two-party consent verification, Supabase Storage, and signed streaming URLs.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-xl shadow-indigo-600/25 transition active:scale-95"
          >
            Open Recording Studio
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/dashboard/recordings"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 font-medium text-sm transition"
          >
            Explore Recording Library
          </Link>
        </div>

        {/* Live Audio Visualizer Banner */}
        <div className="pt-10 max-w-4xl mx-auto">
          <div className="p-6 rounded-3xl bg-[#111114] border border-zinc-800 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80 mb-6 text-xs text-zinc-400">
              <div className="flex items-center gap-2 font-mono">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Web Audio API Stream Multiplexer</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[11px]">128 kbps Opus</span>
                <span className="text-emerald-400 font-medium">Both Streams Synchronized</span>
              </div>
            </div>

            {/* Architecture Flow Diagram */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              <div className="p-4 rounded-xl bg-[#18181B] border border-zinc-800">
                <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs mb-1">
                  <Mic className="w-4 h-4" />
                  1. Local Audio Stream
                </div>
                <p className="text-xs text-zinc-400 leading-snug">
                  Hardware microphone stream captured via <code>getUserMedia</code> with noise cancellation.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#18181B] border border-zinc-800">
                <div className="flex items-center gap-2 text-purple-400 font-semibold text-xs mb-1">
                  <PhoneCall className="w-4 h-4" />
                  2. Remote WebRTC Audio
                </div>
                <p className="text-xs text-zinc-400 leading-snug">
                  Authorized peer audio track mixed through <code>AudioContext.createMediaStreamDestination</code>.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#18181B] border border-zinc-800">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs mb-1">
                  <HardDrive className="w-4 h-4" />
                  3. Cloud Finalization
                </div>
                <p className="text-xs text-zinc-400 leading-snug">
                  Encoded to WebM Opus, streamed to Supabase private storage, and indexed in PostgreSQL.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillars */}
      <section className="py-16 px-6 max-w-7xl mx-auto border-t border-zinc-800/80">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100">
            Engineered for Compliance and Audio Integrity
          </h2>
          <p className="text-xs text-zinc-400 mt-2">
            No covert captures or simulated system audio hacks. Legitimate WebRTC audio sessions with verifiable consent audit logs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-[#111114] border border-zinc-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-zinc-100">Automated Two-Party Consent</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Recording controls stay locked until all participants confirm consent. Includes an audible disclosure tone and timestamped consent records in the database.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#111114] border border-zinc-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-zinc-100">Private Storage & Signed URLs</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Files are stored in private Supabase Storage buckets. Audio is never public; time-limited signed URLs are generated on demand with Row Level Security.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#111114] border border-zinc-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Server className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-zinc-100">Telephony Ready (Twilio / Telnyx)</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Modular telephony architecture with HMAC-SHA1 webhook signature verification, call lifecycle event parsing, and automated recording downloads.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 py-8 px-6 bg-[#09090B]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-[10px]">
              <Mic className="w-3 h-3" />
            </div>
            <span className="font-semibold text-zinc-400">CallVault</span>
            <span>• Next.js App Router & Supabase Production System</span>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="hover:text-zinc-300 transition">Dashboard</Link>
            <Link href="/dashboard/recordings" className="hover:text-zinc-300 transition">Recordings</Link>
            <Link href="/dashboard/settings" className="hover:text-zinc-300 transition">Settings</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
