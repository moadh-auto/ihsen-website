'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

interface Message {
  id:         string;
  name:       string;
  phone:      string;
  message:    string;
  is_read:    boolean;
  created_at: string;
}

export default function MessagesPage() {
  const router = useRouter();
  const [windowW,  setW]        = useState(1200);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState<Message | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [adminLang, setAdminLang] = useState<'ar'|'fr'>('ar');

  const C = {
    bg:'#EEF5F1', sidebar:'#1a3d2e', card:'#FFFFFF',
    border:'#D5E8DC', text:'#172B1E', muted:'#4E6D5C', sub:'#84A695',
    green:'#244D3B', gold:'#AF8E4A',
  };
  const isMobile  = windowW < 768;
  const isDesktop = windowW >= 1024;
  const isAdminAr = adminLang === 'ar';
  const font = isAdminAr ? 'Cairo, sans-serif' : 'Inter, sans-serif';
  const dir  = isAdminAr ? 'rtl' : 'ltr';

  useEffect(() => {
    if (!sessionStorage.getItem('ihsen_admin')) { router.replace('/admin'); return; }
    setAdminLang((localStorage.getItem('ihsen_admin_lang') as 'ar'|'fr') ?? 'ar');
    const upd = () => setW(window.innerWidth);
    upd(); window.addEventListener('resize', upd);
    fetchMessages();
    return () => window.removeEventListener('resize', upd);
  }, [router]);

  const fetchMessages = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false });
    setMessages((data as Message[]) ?? []);
    setLoading(false);
  };

  const markRead = async (msg: Message) => {
    if (!msg.is_read) {
      await supabase.from('contact_messages').update({ is_read: true }).eq('id', msg.id);
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m));
    }
    setSelected({ ...msg, is_read: true });
  };

  const deleteMsg = async (id: string) => {
    setDeleting(id);
    await supabase.from('contact_messages').delete().eq('id', id);
    setMessages(prev => prev.filter(m => m.id !== id));
    if (selected?.id === id) setSelected(null);
    setDeleting(null);
  };

  const unreadCount = messages.filter(m => !m.is_read).length;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(isAdminAr ? 'ar-DZ' : 'fr-DZ', { day:'numeric', month:'long', hour:'2-digit', minute:'2-digit' });
  };



  return (
    <div style={{ minHeight:'100%', height:'100%', background:C.bg, display:'flex', fontFamily:font, direction:dir }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
        @keyframes spin   { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
        * { box-sizing: border-box; }
      `}</style>

      {/* Main */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
        {/* Header */}
        <div style={{ background:'#fff', borderBottom:`1px solid ${C.border}`, padding:'16px 24px', display:'flex', alignItems:'center', gap:12, position:'sticky', top:0, zIndex:10 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:`linear-gradient(135deg, ${C.green}, #1D4939)`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.85)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:16, fontWeight:800, color:C.text }}>{isAdminAr ? 'صندوق الرسائل' : 'Messages'}</div>
            <div style={{ fontSize:11, color:C.sub, marginTop:1 }}>
              {messages.length} {isAdminAr ? 'رسالة' : 'message(s)'}{unreadCount > 0 ? ` — ${unreadCount} ${isAdminAr ? 'غير مقروءة' : 'non lu(s)'}` : ''}
            </div>
          </div>
          <button onClick={fetchMessages} style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:8, padding:'6px 12px', cursor:'pointer', color:C.muted, fontSize:12, fontFamily:font, display:'flex', alignItems:'center', gap:6 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            {isAdminAr ? 'تحديث' : 'Actualiser'}
          </button>
        </div>

        <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

          {/* Messages list */}
          <div style={{ width: selected && isDesktop ? 340 : '100%', borderInlineEnd: selected && isDesktop ? `1px solid ${C.border}` : 'none', overflowY:'auto', background:'#fff' }}>
            {loading ? (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:60, color:C.sub, fontSize:13 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation:'spin 1s linear infinite', marginInlineEnd:8 }}><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
                {isAdminAr ? 'جارٍ التحميل...' : 'Chargement...'}
              </div>
            ) : messages.length === 0 ? (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'80px 40px', gap:12, color:C.sub, textAlign:'center' }}>
                <div style={{ width:56, height:56, borderRadius:16, background:`${C.green}10`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                </div>
                <div style={{ fontSize:14, fontWeight:700, color:C.muted }}>{isAdminAr ? 'لا توجد رسائل بعد' : 'Aucun message'}</div>
                <div style={{ fontSize:12 }}>{isAdminAr ? 'ستظهر رسائل العملاء هنا عند إرسالها' : 'Les messages des clients apparaîtront ici'}</div>
              </div>
            ) : (
              messages.map(msg => (
                <div key={msg.id}
                  onClick={() => markRead(msg)}
                  style={{ padding:'16px 20px', borderBottom:`1px solid ${C.border}`, cursor:'pointer', background: selected?.id === msg.id ? `${C.green}08` : msg.is_read ? '#fff' : `${C.gold}07`, transition:'background .15s', display:'flex', gap:12, alignItems:'flex-start', animation:'fadeUp .2s ease' }}
                  onMouseEnter={e => { if(selected?.id !== msg.id) (e.currentTarget as HTMLElement).style.background = `${C.green}06`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = selected?.id === msg.id ? `${C.green}08` : msg.is_read ? '#fff' : `${C.gold}07`; }}>
                  {/* Avatar */}
                  <div style={{ width:36, height:36, borderRadius:10, background:`${C.green}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:14, fontWeight:800, color:C.green }}>
                    {msg.name.charAt(0)}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                      <span style={{ fontSize:13, fontWeight:msg.is_read?600:800, color:C.text }}>{msg.name}</span>
                      {!msg.is_read && <span style={{ width:7, height:7, borderRadius:'50%', background:C.gold, flexShrink:0 }} />}
                    </div>
                    <div style={{ fontSize:12, color:C.muted, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:200 }}>{msg.message}</div>
                    <div style={{ fontSize:10, color:C.sub, marginTop:4, fontFamily:'Inter' }}>{formatDate(msg.created_at)}</div>
                  </div>
                  {/* Delete */}
                  <button onClick={e=>{ e.stopPropagation(); deleteMsg(msg.id); }} disabled={deleting===msg.id}
                    style={{ background:'none', border:'none', cursor:'pointer', color:'#EF4444', opacity:.4, padding:'2px 4px', borderRadius:6, flexShrink:0, transition:'opacity .15s', display:'flex', alignItems:'center' }}
                    onMouseEnter={e=>e.currentTarget.style.opacity='1'} onMouseLeave={e=>e.currentTarget.style.opacity='.4'}>
                    {deleting===msg.id
                      ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation:'spin 1s linear infinite' }}><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
                      : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                    }
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Message detail panel */}
          {selected && (
            <div style={{ flex:1, overflowY:'auto', padding: isMobile?'20px 16px':'32px 36px', background:C.bg, animation:'fadeUp .2s ease' }}>
              {/* Back on mobile */}
              {!isDesktop && (
                <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', cursor:'pointer', color:C.muted, display:'flex', alignItems:'center', gap:6, fontSize:13, fontFamily:font, marginBottom:20, padding:0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  {isAdminAr ? 'العودة للقائمة' : 'Retour à la liste'}
                </button>
              )}

              {/* Card */}
              <div style={{ background:'#fff', borderRadius:20, border:`1px solid ${C.border}`, overflow:'hidden', boxShadow:'0 4px 20px rgba(0,0,0,.06)' }}>
                {/* Header */}
                <div style={{ background:`linear-gradient(135deg, ${C.green}, #0F2419)`, padding:'24px 28px', position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', top:-20, left:-20, width:100, height:100, borderRadius:'50%', background:'rgba(175,142,74,.1)', pointerEvents:'none' }} />
                  <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                    <div style={{ width:48, height:48, borderRadius:14, background:'rgba(255,255,255,.12)', border:'1px solid rgba(255,255,255,.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:900, color:'#fff' }}>
                      {selected.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontSize:16, fontWeight:800, color:'#fff', marginBottom:3 }}>{selected.name}</div>
                      {selected.phone && <div style={{ fontSize:12, color:'rgba(255,255,255,.6)', fontFamily:'Inter', direction:'ltr', display:'inline-block' }}>{selected.phone}</div>}
                    </div>
                  </div>
                  <div style={{ fontSize:10, color:'rgba(175,142,74,.7)', marginTop:12, fontFamily:'Inter', letterSpacing:1 }}>
                    {formatDate(selected.created_at)}
                  </div>
                </div>

                {/* Message body */}
                <div style={{ padding:'24px 28px' }}>
                  <div style={{ fontSize:11, fontWeight:700, color:C.sub, textTransform:'uppercase', letterSpacing:1.5, fontFamily:'Inter', marginBottom:12 }}>{isAdminAr ? 'الرسالة' : 'Message'}</div>
                  <div style={{ fontSize:14, color:C.text, lineHeight:1.8, whiteSpace:'pre-wrap', fontFamily:font }}>
                    {selected.message}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ padding:'16px 28px', borderTop:`1px solid ${C.border}`, display:'flex', gap:10, flexWrap:'wrap' }}>
                  {selected.phone && (
                    <a href={`tel:${selected.phone}`} style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:7, padding:'9px 16px', borderRadius:10, background:`${C.green}12`, border:`1px solid ${C.green}30`, color:C.green, fontSize:12, fontWeight:700, fontFamily:font }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                      {isAdminAr ? 'اتصال' : 'Appeler'}
                    </a>
                  )}
                  {selected.phone && (
                    <a href={`https://wa.me/${selected.phone.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:7, padding:'9px 16px', borderRadius:10, background:'#25D36612', border:'1px solid #25D36630', color:'#128C7E', fontSize:12, fontWeight:700, fontFamily:font }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>
                      {isAdminAr ? 'واتساب' : 'WhatsApp'}
                    </a>
                  )}
                  <button onClick={() => deleteMsg(selected.id)} disabled={deleting===selected.id}
                    style={{ marginInlineStart:'auto', display:'flex', alignItems:'center', gap:7, padding:'9px 16px', borderRadius:10, background:'#EF444412', border:'1px solid #EF444430', color:'#EF4444', fontSize:12, fontWeight:700, fontFamily:font, cursor:'pointer' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                    {isAdminAr ? 'حذف الرسالة' : 'Supprimer'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
