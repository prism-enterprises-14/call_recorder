'use client';

import React from 'react';

interface AudioWaveformVisualizerProps {
  waveformData: number[]; // Array of 32 normalized heights (0..100)
  isRecording: boolean;
  isPaused?: boolean;
}

export function AudioWaveformVisualizer({
  waveformData,
  isRecording,
  isPaused = false,
}: AudioWaveformVisualizerProps) {
  return (
    <div className="flex items-center justify-center gap-1 h-14 w-full max-w-md px-4 py-2 bg-zinc-950/80 rounded-xl border border-zinc-800/80 shadow-inner">
      {waveformData.map((height, i) => {
        // Height varies dynamically with audio level or pulses gently
        const barHeight = isRecording
          ? isPaused
            ? 12
            : Math.max(10, height)
          : 8;

        return (
          <div
            key={i}
            className={`w-1.5 rounded-full transition-all duration-75 ${
              isRecording
                ? isPaused
                  ? 'bg-amber-500/50'
                  : 'bg-gradient-to-t from-indigo-500 to-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]'
                : 'bg-zinc-700/50'
            }`}
            style={{
              height: `${barHeight}%`,
            }}
          />
        );
      })}
    </div>
  );
}
