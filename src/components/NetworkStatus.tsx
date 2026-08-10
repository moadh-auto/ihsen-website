'use client';
import { useState, useEffect } from 'react';

export default function NetworkStatus() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Initial check
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOffline(true);
    }

    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(26, 61, 46, 0.95)',
      backdropFilter: 'blur(10px)', zIndex: 999999, display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      color: '#fff', textAlign: 'center', padding: '20px'
    }}>
      <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 20, opacity: 0.8 }}>
        <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.58 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01"/>
      </svg>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 10, fontFamily: 'Cairo, sans-serif' }}>أنت غير متصل بالإنترنت</h1>
      <p style={{ fontSize: 16, color: '#e5e7eb', maxWidth: 400, fontFamily: 'Cairo, sans-serif' }}>
        يبدو أن هناك مشكلة في اتصالك بالإنترنت. يرجى التحقق من الشبكة الخاصة بك. سيعود الموقع للعمل فور عودة الاتصال.
      </p>
      <div style={{ marginTop: 30, display: 'flex', gap: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#EF4444', animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite' }} />
        <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#EF4444', animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite', animationDelay: '0.2s' }} />
        <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#EF4444', animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite', animationDelay: '0.4s' }} />
      </div>
      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
