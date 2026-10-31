'use client';

import React from 'react';
import { Mic, Clock, Calendar, HardDrive, ArrowUpRight } from 'lucide-react';
import { DashboardStats } from '@/types';

interface OverviewStatsProps {
  stats: DashboardStats;
}

export function OverviewStats({ stats }: OverviewStatsProps) {
  // Format total duration: e.g. "12h 45m" or "45m 12s"
  const formatTotalDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  // Format bytes
  const formatStorage = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const statCards = [
    {
      title: 'Total Recordings',
      value: stats.totalRecordings.toLocaleString(),
      subtext: 'All time audio captures',
      icon: Mic,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10',
      borderColor: 'border-indigo-500/20',
    },
    {
      title: 'Total Recording Duration',
      value: formatTotalDuration(stats.totalDurationSeconds),
      subtext: 'Cumulative call duration',
      icon: Clock,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
    },
    {
      title: 'Recordings Today',
      value: stats.todayCount.toLocaleString(),
      subtext: 'Calls captured today',
      icon: Calendar,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
    },
    {
      title: 'Storage Usage',
      value: formatStorage(stats.storageUsageBytes),
      subtext: 'Supabase private bucket',
      icon: HardDrive,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div
            key={i}
            className="p-5 rounded-2xl bg-[#111114] border border-zinc-800/90 hover:border-zinc-700/80 transition shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-zinc-400">{card.title}</span>
              <div
                className={`w-8 h-8 rounded-xl ${card.bgColor} ${card.borderColor} border flex items-center justify-center ${card.color}`}
              >
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div>
              <div className="text-2xl font-bold tracking-tight text-zinc-100">{card.value}</div>
              <div className="text-xs text-zinc-500 mt-1">{card.subtext}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
