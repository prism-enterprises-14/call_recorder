import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'CallVault - Enterprise Call Recording & Compliance Management',
  description:
    'Secure, authorized browser and telephony call recording platform with WebRTC multi-stream audio capture, automated consent verification, and Supabase private cloud storage.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className={`${inter.className} min-h-full flex flex-col bg-[#09090B] text-[#FAFAFA]`}>
        {children}
      </body>
    </html>
  );
}
