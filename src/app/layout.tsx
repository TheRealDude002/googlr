import type { Metadata, Viewport } from 'next';
import './globals.css';
import '@/styles/buttons.css';
import '@/styles/corkboard.css';

export const metadata: Metadata = {
  title: 'Googlr — search by image',
  description: 'Reverse image search — find where any image comes from',
  applicationName: 'Googlr',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Googlr',
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#c4a265',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
