import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppShell } from '@/components/AppShell';

export const metadata: Metadata = {
  title: 'IMQ Labs — Create. Connect. Get Paid.',
  description: 'The AI-native music studio for artists. Make beats, write lyrics, find collaborators, and earn from your fans, all in one app.',
};

export const viewport: Viewport = {
  themeColor: '#06060A',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen relative">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
