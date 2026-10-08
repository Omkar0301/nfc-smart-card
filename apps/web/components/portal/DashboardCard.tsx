import type { ReactNode } from 'react';

interface DashboardCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon?: string;
  accentColor?: string;
  badge?: {
    text: string;
    variant: 'success' | 'warning' | 'danger' | 'info';
  };
  children?: ReactNode;
}

export function DashboardCard({
  title,
  value,
  subtext,
  icon,
  accentColor = '#6366f1',
  badge,
  children,
}: DashboardCardProps) {
  const getBadgeStyle = (variant: 'success' | 'warning' | 'danger' | 'info') => {
    switch (variant) {
      case 'success':
        return {
          bg: 'rgba(16, 185, 129, 0.15)',
          text: '#34d399',
          border: 'rgba(16, 185, 129, 0.3)',
        };
      case 'warning':
        return {
          bg: 'rgba(245, 158, 11, 0.15)',
          text: '#fbbf24',
          border: 'rgba(245, 158, 11, 0.3)',
        };
      case 'danger':
        return { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' };
      default:
        return {
          bg: 'rgba(99, 102, 241, 0.15)',
          text: '#818cf8',
          border: 'rgba(99, 102, 241, 0.3)',
        };
    }
  };

  return (
    <div
      style={{
        background: 'rgba(30, 41, 59, 0.55)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 14,
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: accentColor,
        }}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <span
          style={{
            fontSize: '0.85rem',
            color: '#94a3b8',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {title}
        </span>
        {icon && <span style={{ fontSize: '1.25rem' }}>{icon}</span>}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
        <span
          style={{
            fontSize: '1.85rem',
            fontWeight: 700,
            color: '#ffffff',
            letterSpacing: '-0.02em',
          }}
        >
          {value}
        </span>
        {badge && (
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 12,
              background: getBadgeStyle(badge.variant).bg,
              color: getBadgeStyle(badge.variant).text,
              border: `1px solid ${getBadgeStyle(badge.variant).border}`,
            }}
          >
            {badge.text}
          </span>
        )}
      </div>

      {subtext && (
        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 400 }}>{subtext}</span>
      )}

      {children}
    </div>
  );
}
