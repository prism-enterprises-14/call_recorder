'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ListMusic,
  Settings,
  Mic,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Server,
  Cloud,
} from 'lucide-react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('operator@callvault.io');
  const isCloudConnected = isSupabaseConfigured();

  useEffect(() => {
    if (isCloudConnected) {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user?.email) {
          setUserEmail(user.email);
        }
      });
    }
  }, [isCloudConnected]);

  const navLinks = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      active: pathname === '/dashboard',
    },
    {
      name: 'Recordings',
      href: '/dashboard/recordings',
      icon: ListMusic,
      active: pathname.startsWith('/dashboard/recordings'),
    },
    {
      name: 'Settings',
      href: '/dashboard/settings',
      icon: Settings,
      active: pathname.startsWith('/dashboard/settings'),
    },
  ];

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 flex flex-col md:flex-row">
      {/* Mobile Top Navbar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-[#111114] border-b border-zinc-800">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-600/30">
            <Mic className="w-4 h-4" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-zinc-100">CallVault</span>
        </Link>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar for Desktop & Mobile Overlay */}
      <aside
        className={`${
          mobileMenuOpen ? 'block' : 'hidden'
        } md:flex flex-col justify-between w-full md:w-64 bg-[#111114] border-r border-zinc-800 p-5 shrink-0 z-40`}
      >
        <div className="space-y-6">
          {/* Logo Brand */}
          <Link href="/dashboard" className="hidden md:flex items-center gap-2.5 px-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-600/30">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-sm tracking-tight text-zinc-100">CallVault</span>
              <span className="block text-[10px] text-zinc-500 font-mono leading-none">Enterprise Audio</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition ${
                    link.active
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Status Indicator Widget */}
          <div className="p-3.5 rounded-xl bg-[#18181B] border border-zinc-800/80 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 font-medium">Platform Mode</span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                  isCloudConnected
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                }`}
              >
                {isCloudConnected ? <Cloud className="w-3 h-3" /> : <Server className="w-3 h-3" />}
                {isCloudConnected ? 'Supabase Cloud' : 'Local Sandbox'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 leading-snug">
              {isCloudConnected
                ? 'Connected to live Supabase Postgres & Storage bucket.'
                : 'Direct microphone capture, live waveform, and IndexedDB local storage active.'}
            </p>
          </div>
        </div>

        {/* User profile & logout footer */}
        <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-semibold text-xs uppercase">
              {userEmail.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-zinc-200 truncate">{userEmail}</div>
              <div className="text-[10px] text-zinc-500 truncate">
                {isCloudConnected ? 'Verified Member' : 'Local Operator'}
              </div>
            </div>
          </div>

          <Link
            href="/login"
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
