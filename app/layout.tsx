import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Vesper',
  description: 'Socialbot Vesper Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark antialiased bg-black text-white font-mono">
      <body className="antialiased bg-black text-white font-mono">
        {children}
      </body>
    </html>
  );
}
