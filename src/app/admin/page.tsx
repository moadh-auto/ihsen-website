'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

import { supabase } from '@/lib/supabase';

export default function AdminLogin() {
  const router  = useRouter();
  const [pw,      setPw]      = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [show,    setShow]    = useState(false);
  const [splash,  setSplash]  = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFadeOut(true), 1100);
    const t2 = setTimeout(() => setSplash(false), 1650);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@ihsen.store',
      password: pw
    });

    if (!authError) {
      sessionStorage.setItem('ihsen_admin', '1');
      router.push('/admin/dashboard');
    } else {
      setError('كلمة المرور غير صحيحة أو الحساب غير موجود');
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes splashFadeIn { from { opacity: 0; transform: scale(.94) } to { opacity: 1; transform: scale(1) } }
        @keyframes splashLogoIn { from { opacity: 0; transform: translateY(12px) scale(.9) } to { opacity: 1; transform: translateY(0) scale(1) } }
        @keyframes splashPulse { 0%,100% { opacity: .5 } 50% { opacity: 1 } }
        @keyframes formIn { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>

      {/* ── SPLASH ── */}
      {splash && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(160deg, #040c06, #0B1E10, #152E1C)',
          transition: 'opacity .55s ease, transform .55s ease',
          opacity: fadeOut ? 0 : 1,
          transform: fadeOut ? 'scale(1.03)' : 'scale(1)',
          pointerEvents: fadeOut ? 'none' : 'auto',
          animation: 'splashFadeIn .4s ease both',
        }}>
          {/* ambient orbs */}
          <div style={{ position:'absolute', top:'25%', right:'20%', width:360, height:360, borderRadius:'50%', background:'radial-gradient(circle, rgba(36,77,59,.45) 0%, transparent 65%)', pointerEvents:'none' }} />
          <div style={{ position:'absolute', bottom:'20%', left:'15%', width:280, height:280, borderRadius:'50%', background:'radial-gradient(circle, rgba(175,142,74,.1) 0%, transparent 65%)', pointerEvents:'none' }} />

          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:20, animation:'splashLogoIn .7s .2s ease both' }}>
            <Image
              src="/logos/full-vertical-gold.svg"
              alt="إحسان"
              width={100}
              height={138}
              style={{ filter:'drop-shadow(0 0 28px rgba(175,142,74,.55))' }}
            />
            {/* loading dots */}
            <div style={{ display:'flex', gap:6, marginTop:8 }}>
              {[0, .2, .4].map((delay, i) => (
                <div key={i} style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: '#AF8E4A',
                  animation: `splashPulse 1.1s ${delay}s ease-in-out infinite`,
                }} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── LOGIN FORM ── */}
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(145deg, #060e08, #0F2419, #1a3a28)',
        fontFamily: 'Cairo, sans-serif', direction: 'rtl', padding: 20,
        position: 'relative', overflow: 'hidden',
        opacity: splash ? 0 : 1,
        transition: 'opacity .4s ease',
      }}>
        {/* Orbs */}
        <div style={{ position:'absolute', top:'20%', right:'15%', width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle, rgba(36,77,59,.5) 0%, transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:'15%', left:'10%', width:250, height:250, borderRadius:'50%', background:'radial-gradient(circle, rgba(175,142,74,.12) 0%, transparent 70%)', pointerEvents:'none' }} />

        <div style={{
          width: '100%', maxWidth: 400,
          background: 'rgba(15,36,25,.85)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(36,77,59,.5)', borderRadius: 24,
          padding: '40px 36px',
          boxShadow: '0 32px 80px rgba(0,0,0,.5)',
          position: 'relative', zIndex: 1,
          animation: splash ? 'none' : 'formIn .5s ease both',
        }}>
          {/* Logo — centered */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginBottom:28 }}>
            <Image
              src="/logos/full-vertical-gold.svg"
              alt="إحسان"
              width={80}
              height={110}
              style={{ filter:'drop-shadow(0 0 16px rgba(175,142,74,.4))' }}
            />
            <div style={{ fontSize:11, color:'rgba(218,192,139,.45)', letterSpacing:3, textTransform:'uppercase', fontFamily:'Inter, sans-serif', marginTop:10 }}>
              admin panel
            </div>
          </div>

          <h1 style={{ fontSize:20, fontWeight:800, color:'#fff', textAlign:'center', marginBottom:6 }}>
            لوحة التحكم
          </h1>
          <p style={{ fontSize:13, color:'rgba(255,255,255,.4)', textAlign:'center', marginBottom:28 }}>
            أدخلي كلمة المرور للدخول
          </p>

          <form onSubmit={handleLogin}>
            <div style={{ position:'relative', marginBottom:16 }}>
              <input
                type={show ? 'text' : 'password'}
                value={pw}
                onChange={e => { setPw(e.target.value); setError(''); }}
                placeholder="كلمة المرور"
                autoFocus
                style={{
                  width:'100%', boxSizing:'border-box',
                  padding:'13px 44px 13px 16px',
                  borderRadius:12, fontSize:15, fontFamily:'Cairo, sans-serif',
                  background:'rgba(255,255,255,.06)', backdropFilter:'blur(8px)',
                  border:`1.5px solid ${error ? '#EF4444' : 'rgba(36,77,59,.6)'}`,
                  color:'#fff', outline:'none', direction:'rtl',
                  transition:'border-color .2s',
                }}
                onFocus={e => e.currentTarget.style.borderColor = 'rgba(175,142,74,.6)'}
                onBlur={e => e.currentTarget.style.borderColor = error ? '#EF4444' : 'rgba(36,77,59,.6)'}
              />
              <button type="button" onClick={() => setShow(!show)} style={{
                position:'absolute', top:'50%', transform:'translateY(-50%)', left:14,
                background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,.35)',
                display:'flex', alignItems:'center',
              }}>
                {show
                  ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                }
              </button>
            </div>

            {error && (
              <div style={{ background:'rgba(239,68,68,.12)', border:'1px solid rgba(239,68,68,.3)', borderRadius:8, padding:'8px 12px', marginBottom:14, fontSize:12, color:'#EF4444', textAlign:'center' }}>
                <span style={{ display:'inline-flex', alignItems:'center', gap:5 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                  {error}
                </span>
              </div>
            )}

            <button type="submit" disabled={loading || !pw} style={{
              width:'100%', padding:'13px',
              background: loading || !pw
                ? 'rgba(36,77,59,.3)'
                : 'linear-gradient(135deg, #AF8E4A, #8B6E35)',
              border:'none', borderRadius:12,
              color: loading || !pw ? 'rgba(255,255,255,.35)' : '#0F2419',
              fontSize:15, fontWeight:800, cursor: loading || !pw ? 'not-allowed' : 'pointer',
              fontFamily:'Cairo, sans-serif', transition:'all .2s',
              boxShadow: loading || !pw ? 'none' : '0 6px 20px rgba(175,142,74,.4)',
            }}>
              {loading
                ? <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation:'spin 1s linear infinite' }}>
                      <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/>
                      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
                      <line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
                      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
                    </svg>
                    جارٍ التحقق...
                  </span>
                : 'دخول ←'
              }
            </button>
          </form>

          <div style={{ textAlign:'center', marginTop:24 }}>
            <button onClick={() => router.push('/')} style={{ background:'none', border:'none', cursor:'pointer', fontSize:12, color:'rgba(255,255,255,.25)', fontFamily:'Cairo, sans-serif' }}>
              ← العودة للموقع
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
