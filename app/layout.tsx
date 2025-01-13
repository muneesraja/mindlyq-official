import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import TawkToChat from '@/components/tawk-to';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MindlyQ - Your Smart WhatsApp Assistant',
  description: 'MindlyQ is an intelligent WhatsApp bot that helps you manage reminders and organize your digital life using advanced AI technology.',
  icons: {
    icon: [
      {
        url: '/images/favicon/16x16.svg',
        sizes: '16x16',
        type: 'image/svg+xml',
      },
      {
        url: '/images/favicon/32x32.svg',
        sizes: '32x32',
        type: 'image/svg+xml',
      },
      {
        url: '/images/favicon/48x48.svg',
        sizes: '48x48',
        type: 'image/svg+xml',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Small devices and fallback */}
        <link
          rel="icon"
          type="image/svg+xml"
          href="/images/favicon/16x16.svg"
          sizes="16x16"
        />
        {/* Standard size for most devices */}
        <link
          rel="icon"
          type="image/svg+xml"
          href="/images/favicon/32x32.svg"
          sizes="32x32"
        />
        {/* High-DPI displays */}
        <link
          rel="icon"
          type="image/svg+xml"
          href="/images/favicon/48x48.svg"
          sizes="48x48"
        />
      </head>
      <body className={inter.className}>
        {children}
        <TawkToChat />
      </body>
    </html>
  );
}