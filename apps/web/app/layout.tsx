import type { Metadata, Viewport } from 'next';

const DOMAIN = process.env.NEXT_PUBLIC_DOMAIN ?? 'localhost:3000';
const protocol = DOMAIN.includes('localhost') ? 'http' : 'https';
const baseUrl = `${protocol}://${DOMAIN}`;

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'NFC Digital Smart Card Platform',
    template: '%s | NFC Digital Card Platform',
  },
  description:
    'Manage, share, and track your NFC smart business cards and dynamic digital profiles.',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          boxSizing: 'border-box',
          backgroundColor: '#0b0f19',
          color: '#f8fafc',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        }}
      >
        {children}
      </body>
    </html>
  );
}
