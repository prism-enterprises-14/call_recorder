'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Volume2,
  HardDrive,
  Download,
  Trash2,
  CheckCircle2,
  Sliders,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { RecordingSettings } from '@/types';

const DEFAULT_SETTINGS: RecordingSettings = {
  autoRecord: false,
  audioFormat: 'webm',
  audioQuality: '128000',
  titleTemplate: 'Call-{date}-{time}',
  autoUpload: true,
  defaultPlaybackSpeed: 1,
  consentRequirement: 'all_parties',
  audibleChime: true,
  retentionDays: 0,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<RecordingSettings>(DEFAULT_SETTINGS);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('call_recorder_settings');
    if (saved) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
      } catch {}
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('call_recorder_settings', JSON.stringify(settings));
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/recordings');
      const recs = await res.json();
      const exportPayload = {
        exportedAt: new Date().toISOString(),
        settings,
        recordings: recs,
      };

      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `call_recorder_export_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export error:', e);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Page Title */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-indigo-400" />
            Application Settings
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Configure audio encoding parameters, automated recording behaviors, and legal privacy consent rules.
          </p>
        </div>

        {saveSuccess && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-3 py-1.5 rounded-xl animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" />
            Settings Saved
          </span>
        )}
      </div>

      {/* 1. Recording Preferences Section */}
      <div className="bg-[#111114] border border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-zinc-800/80">
          <Sliders className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-semibold text-zinc-100">Recording Preferences</h3>
        </div>

        <div className="space-y-5 text-xs">
          {/* Automatic Recording */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-medium text-zinc-200">Automatic Recording Initiation</div>
              <div className="text-zinc-400">
                Automatically start recording when an authorized call connects and all required consents are verified.
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoRecord}
                onChange={(e) => setSettings({ ...settings, autoRecord: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Preferred Format */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-zinc-800/60">
            <div>
              <div className="font-medium text-zinc-200">Preferred Audio Format</div>
              <div className="text-zinc-400">WebM with Opus codec provides high fidelity and small file sizes.</div>
            </div>
            <select
              value={settings.audioFormat}
              onChange={(e) => setSettings({ ...settings, audioFormat: e.target.value as any })}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="webm">WebM (Opus Codec - Recommended)</option>
              <option value="wav">WAV (Uncompressed PCM)</option>
            </select>
          </div>

          {/* Audio Quality */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-zinc-800/60">
            <div>
              <div className="font-medium text-zinc-200">Audio Quality & Bitrate</div>
              <div className="text-zinc-400">Target bitrate for real-time MediaRecorder compression.</div>
            </div>
            <select
              value={settings.audioQuality}
              onChange={(e) => setSettings({ ...settings, audioQuality: e.target.value as any })}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="64000">Standard Voice (64 kbps)</option>
              <option value="128000">High Fidelity (128 kbps - Default)</option>
              <option value="256000">Studio Master (256 kbps)</option>
            </select>
          </div>

          {/* Title Template */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-zinc-800/60">
            <div>
              <div className="font-medium text-zinc-200">Default Title Pattern</div>
              <div className="text-zinc-400">Template pattern for naming new call captures.</div>
            </div>
            <input
              type="text"
              value={settings.titleTemplate}
              onChange={(e) => setSettings({ ...settings, titleTemplate: e.target.value })}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-indigo-500 w-full sm:w-60 font-mono"
            />
          </div>

          {/* Upload Automatically */}
          <div className="flex items-center justify-between gap-4 pt-3 border-t border-zinc-800/60">
            <div>
              <div className="font-medium text-zinc-200">Automatic Cloud Storage Upload</div>
              <div className="text-zinc-400">Automatically stream finished audio to Supabase Storage immediately after stopping.</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoUpload}
                onChange={(e) => setSettings({ ...settings, autoUpload: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Default Playback Speed */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-zinc-800/60">
            <div>
              <div className="font-medium text-zinc-200">Default Playback Speed</div>
              <div className="text-zinc-400">Initial speed when loading a recording in the player.</div>
            </div>
            <select
              value={settings.defaultPlaybackSpeed}
              onChange={(e) => setSettings({ ...settings, defaultPlaybackSpeed: parseFloat(e.target.value) })}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="1">1.0x (Normal)</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2.0x</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Privacy & Compliance Preferences Section */}
      <div className="bg-[#111114] border border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-zinc-800/80">
          <Shield className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-zinc-100">Privacy & Legal Compliance</h3>
        </div>

        <div className="space-y-5 text-xs">
          {/* Consent Requirement */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="font-medium text-zinc-200">Consent Requirement Standard</div>
              <div className="text-zinc-400">
                Enforces strict two-party verification across all jurisdictions.
              </div>
            </div>
            <select
              value={settings.consentRequirement}
              onChange={(e) => setSettings({ ...settings, consentRequirement: e.target.value as any })}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="all_parties">Two-Party / All-Party Consent (Strict Compliance)</option>
              <option value="single_party">Single-Party Notice (Where Permitted by Law)</option>
            </select>
          </div>

          {/* Audible Tone Chime */}
          <div className="flex items-center justify-between gap-4 pt-3 border-t border-zinc-800/60">
            <div>
              <div className="font-medium text-zinc-200">Audible Recording Disclosure Chime</div>
              <div className="text-zinc-400">
                Play an audible dual-frequency tone into the call stream at recording start.
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.audibleChime}
                onChange={(e) => setSettings({ ...settings, audibleChime: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Retention Policy */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-zinc-800/60">
            <div>
              <div className="font-medium text-zinc-200">Data Retention Horizon</div>
              <div className="text-zinc-400">
                Retention duration before automated expiration flagging.
              </div>
            </div>
            <select
              value={settings.retentionDays}
              onChange={(e) => setSettings({ ...settings, retentionDays: parseInt(e.target.value, 10) })}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="0">Retain Indefinitely</option>
              <option value="30">30 Days</option>
              <option value="90">90 Days</option>
              <option value="180">180 Days</option>
              <option value="365">365 Days (1 Year)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Account Data Management & Export Section */}
      <div className="bg-[#111114] border border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-zinc-800/80">
          <HardDrive className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-zinc-100">Data Export & Account Management</h3>
        </div>

        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-medium text-zinc-200">Export All Account Data</div>
              <div className="text-zinc-400">Download a full JSON archive of all call sessions, consent logs, and recording metadata.</div>
            </div>
            <button
              onClick={handleExportData}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 font-medium transition active:scale-95 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              {isExporting ? 'Exporting...' : 'Export JSON Archive'}
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-3 pt-4">
        <button
          onClick={handleSave}
          className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-lg shadow-indigo-600/20 active:scale-95 transition"
        >
          Save All Preferences
        </button>
      </div>
    </div>
  );
}
