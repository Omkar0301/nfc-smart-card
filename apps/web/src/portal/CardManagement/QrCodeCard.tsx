'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface QrCodeCardProps {
  publicUrl: string;
  cardNumber: string;
}

export function QrCodeCard({ publicUrl, cardNumber }: QrCodeCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDownload = () => {
    const svg = document.getElementById(`qr-${cardNumber}`) as SVGElement | null;
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = 600;
      canvas.height = 600;
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 600, 600);
        ctx.drawImage(img, 40, 40, 520, 520);
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `NFC-QR-${cardNumber}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      }
    };

    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
  };

  return (
    <div
      style={{
        background: 'rgba(30, 41, 59, 0.55)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 14,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          padding: 16,
          borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
          marginBottom: 16,
          display: 'inline-flex',
        }}
      >
        <QRCodeSVG
          id={`qr-${cardNumber}`}
          value={publicUrl}
          size={180}
          level="H"
          includeMargin={false}
        />
      </div>

      <div style={{ width: '100%', marginBottom: 16 }}>
        <span
          style={{
            fontSize: '0.78rem',
            color: '#94a3b8',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Public Profile URL
        </span>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 8,
            padding: '8px 12px',
            marginTop: 6,
          }}
        >
          <span
            style={{
              fontSize: '0.82rem',
              color: '#cbd5e1',
              flex: 1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              textAlign: 'left',
              fontFamily: 'monospace',
            }}
          >
            {publicUrl}
          </span>
          <button
            onClick={handleCopy}
            type="button"
            style={{
              minHeight: 36,
              padding: '6px 12px',
              background: copied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(99, 102, 241, 0.2)',
              border: `1px solid ${copied ? '#10b981' : '#6366f1'}`,
              borderRadius: 6,
              color: copied ? '#34d399' : '#a5b4fc',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      </div>

      <button
        onClick={handleDownload}
        type="button"
        style={{
          width: '100%',
          minHeight: 44,
          padding: '10px 16px',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 8,
          color: '#f8fafc',
          fontSize: '0.85rem',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          transition: 'all 0.2s ease',
        }}
      >
        <span>📥</span> Download QR Code Image
      </button>
    </div>
  );
}
