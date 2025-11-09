// client/src/components/NotificationBadge.jsx
import React from 'react';

export default function NotificationBadge({ count, variant = 'default' }) {
  if (!count || count === 0) return null;

  const getStyle = () => {
    const baseStyle = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: '20px',
      height: '20px',
      padding: '0 6px',
      fontSize: '11px',
      fontWeight: '700',
      borderRadius: '10px',
      marginLeft: '8px',
      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
    };

    const variants = {
      default: {
        background: '#ef4444',
        color: 'white',
        boxShadow: '0 0 10px rgba(239, 68, 68, 0.5)'
      },
      warning: {
        background: '#f59e0b',
        color: 'white',
        boxShadow: '0 0 10px rgba(245, 158, 11, 0.5)'
      },
      success: {
        background: '#10b981',
        color: 'white',
        boxShadow: '0 0 10px rgba(16, 185, 129, 0.5)'
      },
      info: {
        background: '#3b82f6',
        color: 'white',
        boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)'
      }
    };

    return { ...baseStyle, ...variants[variant] };
  };

  return (
    <span style={getStyle()}>
      {count > 99 ? '99+' : count}
    </span>
  );
}

// Add to your global.css:
/*
@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.05);
  }
}
*/