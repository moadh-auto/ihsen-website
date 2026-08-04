'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

type StatusKey =
  | 'pending' | 'reviewing' | 'confirmed' | 'modified'
  | 'shipped'  | 'attempt_failed' | 'delivered' | 'returned' | 'cancelled';

const STATUS_META: Record<StatusKey, {
  ar: string; fr: string; icon: string; color: string; step: number;
  desc: { ar: string; fr: string };
}> = {
  pending:        { ar:'قيد الانتظار',  fr:'En attente',         icon:'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', color:'#F59E0B', step:0,  desc:{ ar:'طلبك وصلنا وهو قيد الانتظار — سنتصل بكِ قريباً لتأكيده', fr:'Commande reçue, nous vous appellerons bientôt' } },
  reviewing:      { ar:'قيد المراجعة', fr:'En révision',        icon:'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z', color:'#3B82F6', step:1,  desc:{ ar:'فريقنا يراجع طلبك حالياً — سيتم التأكيد قريباً', fr:'Notre équipe examine votre commande' } },
  confirmed:      { ar:'تم التأكيد',   fr:'Confirmé',           icon:'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', color:'#10B981', step:2,  desc:{ ar:'تم تأكيد طلبك! سيتم تجهيزه وشحنه خلال 24-48 ساعة', fr:'Commande confirmée ! Expédition sous 24-48h' } },
  modified:       { ar:'تم التعديل',   fr:'Modifié',            icon:'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z', color:'#8B5CF6', step:2,  desc:{ ar:'تم تعديل طلبك — تحققي من هاتفك لمعرفة التفاصيل', fr:'Commande modifiée — vérifiez vos notifications' } },
  shipped:        { ar:'تم الشحن',     fr:'Expédié',            icon:'M17 8l4 4m0 0l-4 4m4-4H3', color:'#6366F1', step:3,  desc:{ ar:'طلبك في الطريق إليكِ! ستصلك خلال 2-5 أيام عمل', fr:'Votre colis est en route ! Délai 2-5 jours ouvrés' } },
  attempt_failed: { ar:'فشل التسليم', fr:'Échec de livraison', icon:'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', color:'#EF4444', step:3,  desc:{ ar:'لم نتمكن من التسليم — سنتصل بكِ لتحديد موعد جديد', fr:'Livraison échouée — nous vous recontacterons' } },
  delivered:      { ar:'تم التسليم',   fr:'Livré',              icon:'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', color:'#10B981', step:4,  desc:{ ar:'تم استلام طلبك بنجاح! نتمنى أن تعجبكِ', fr:'Colis livré avec succès ! Merci de votre confiance' } },
  returned:       { ar:'تم الإرجاع',   fr:'Retourné',           icon:'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15', color:'#EF4444', step:4,  desc:{ ar:'تم إرجاع الطلب — سيتم التواصل معكِ قريباً', fr:'Commande retournée — nous vous contacterons' } },
  cancelled:      { ar:'ملغي',         fr:'Annulé',             icon:'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636', color:'#EF4444', step:-1, desc:{ ar:'تم إلغاء هذا الطلب', fr:'Cette commande a été annulée' } },
};

const STEPS = [
  { ar:'انتظار',  fr:'Attente'   },
  { ar:'مراجعة', fr:'Révision'  },
  { ar:'تأكيد',  fr:'Confirmé'  },
  { ar:'شحن',    fr:'Expédié'   },
  { ar:'تسليم',  fr:'Livré'     },
];

function TrackContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [lang,  setLang]  = useState<'ar'|'fr'>('ar');
  const [theme, setTheme] = useState<'light'|'dark'>('light');
  const [windowWidth, setWindowWidth] = useState(1200);

  const [input,      setInput]     = useState('');
  const [searching,  setSearching] = useState(false);
  const [status,     setStatus]    = useState<StatusKey | null>(null);
  const [notFound,   setNotFound]  = useState(false);
  const [foundOrder, setFoundOrder] = useState<{ customer_name:string; product_name:string; product_emoji:string } | null>(null);

  useEffect(() => {
    const html = document.documentElement;
    setLang((html.getAttribute('data-lang') as 'ar'|'fr') ?? 'ar');
    setTheme((html.getAttribute('data-theme') as 'light'|'dark') ?? 'light');
    const upd = () => setWindowWidth(window.innerWidth);
    upd();
    window.addEventListener('resize', upd);
    return () => window.removeEventListener('resize', upd);
  }, []);

  // Auto-search if ?num= in URL
  useEffect(() => {
    const num = searchParams.get('num');
    if (num) { setInput(num); doSearch(num); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isAr      = lang === 'ar';
  const isDark    = theme === 'dark';
  const isMobile  = windowWidth < 640;
  const font      = isAr ? 'Cairo, sans-serif' : 'Inter, sans-serif';

  const C = {
    bg:     isDark ? '#0a1a0f' : '#F9F6F1',
    card:   isDark ? '#0f2419' : '#FFFFFF',
    border: isDark ? '#244D3B' : '#E5DDD0',
    text:   isDark ? '#F0EBE3' : '#1a1a1a',
    muted:  isDark ? '#8BA89A' : '#6B6B6B',
    green:  '#244D3B',
    gold:   '#AF8E4A',
    input:  isDark ? '#1D4939' : '#F5F0EA',
  };

  const toggleLang = () => {
    const next = isAr ? 'fr' : 'ar';
    setLang(next);
    document.documentElement.setAttribute('data-lang', next);
    document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
  };
  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  };

  const doSearch = async (num: string) => {
    const n = num.trim().toUpperCase();
    if (!n) return;
    setSearching(true);
    setStatus(null);
    setNotFound(false);
    setFoundOrder(null);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('status, customer_name, product_name, product_emoji')
        .eq('order_num', n)
        .single();
      if (error || !data) {
        setNotFound(true);
      } else {
        setStatus(data.status as StatusKey);
        setFoundOrder({ customer_name: data.customer_name, product_name: data.product_name, product_emoji: data.product_emoji });
      }
    } catch {
      setNotFound(true);
    }
    setSearching(false);
  };

  const meta        = status ? STATUS_META[status] : null;
  const currentStep = meta?.step ?? -1;
  const normalizedInput = input.trim().toUpperCase();

  return (
    <div style={{ minHeight:'100vh', background:C.bg, fontFamily:font, direction:isAr?'rtl':'ltr' }}>

      {/* ── Nav ── */}
      <nav style={{
        position:'sticky', top:0, zIndex:100,
        background:isDark?'rgba(10,26,15,.96)':'rgba(249,246,241,.96)',
        backdropFilter:'blur(14px)', borderBottom:`1px solid ${C.border}`,
        padding:isMobile?'10px 14px':'11px 20px',
        display:'flex', alignItems:'center', justifyContent:'space-between',
      }}>
        <button onClick={() => router.push('/')} style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:8, padding:isMobile?'6px 10px':'6px 14px', cursor:'pointer', color:C.text, fontSize:isMobile?12:13, fontFamily:font }}>
          {isAr ? '→ الرئيسية' : '← Accueil'}
        </button>
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          <Image src={isDark ? '/logos/icon-gold.svg' : '/logos/icon-green.svg'} alt="إحسان" width={isMobile?22:26} height={isMobile?22:26} />
          {!isMobile && <span style={{ fontWeight:800, fontSize:15, color:isDark ? C.gold : C.green }}>إحسان</span>}
        </div>
        <div style={{ display:'flex', gap:6 }}>
          <button onClick={toggleTheme} style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:8, padding:'5px 8px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', width:30, height:28 }}>
            {isDark
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
            }
          </button>
          <button onClick={toggleLang}  style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:8, padding:'5px 9px', cursor:'pointer', color:C.gold, fontWeight:700, fontSize:11, fontFamily:font }}>{isAr?'FR':'AR'}</button>
        </div>
      </nav>

      {/* ── Page ── */}
      <div style={{ maxWidth:640, margin:'0 auto', padding:isMobile?'24px 14px':'44px 20px' }}>

        {/* Header */}
        <div data-reveal style={{ textAlign:'center', marginBottom:isMobile?22:32 }}>
          <div style={{
            width:isMobile?62:76, height:isMobile?62:76, borderRadius:'50%',
            background:`linear-gradient(135deg, ${C.green}, #1D4939)`,
            display:'flex', alignItems:'center', justifyContent:'center',
            margin:'0 auto 14px',
            boxShadow:`0 6px 28px rgba(36,77,59,.3)`,
          }}>
            <svg width={isMobile?28:34} height={isMobile?28:34} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/>
            </svg>
          </div>
          <h1 style={{ fontSize:isMobile?22:28, fontWeight:800, color:C.text, marginBottom:6, fontFamily:font }}>
            {isAr ? 'تتبع طلبك' : 'Suivre votre commande'}
          </h1>
          <p style={{ fontSize:isMobile?12:14, color:C.muted, fontFamily:font }}>
            {isAr ? 'أدخلي رقم الطلب لمعرفة حالته الحالية' : 'Entrez votre numéro de commande'}
          </p>
        </div>

        {/* Search card */}
        <div data-reveal data-reveal-delay="80" style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:isMobile?16:24, marginBottom:20 }}>
          <label style={{ display:'block', fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:1, marginBottom:8, fontFamily:font }}>
            {isAr ? 'رقم الطلب' : 'N° de commande'}
          </label>
          <div style={{ display:'flex', gap:10 }}>
            <input
              type="text" value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doSearch(input)}
              placeholder="IH-XXXXXX"
              style={{
                flex:1, padding:isMobile?'13px 14px':'12px 16px',
                borderRadius:10, border:`1.5px solid ${C.border}`,
                background:C.input, color:C.text,
                fontSize:isMobile?15:14, fontFamily:'Inter, monospace',
                outline:'none', direction:'ltr',
                textAlign: isAr ? 'right' : 'left', letterSpacing:1,
                boxSizing:'border-box' as const,
              }}
            />
            <button
              onClick={() => doSearch(input)}
              disabled={searching || !input.trim()}
              style={{
                background: (searching || !input.trim()) ? C.muted : `linear-gradient(135deg, ${C.green}, #1D4939)`,
                color:'#fff', border:'none', borderRadius:10,
                padding:isMobile?'13px 14px':'12px 20px',
                fontSize:14, fontWeight:700,
                cursor: (searching || !input.trim()) ? 'not-allowed' : 'pointer',
                fontFamily:font, whiteSpace:'nowrap',
                transition:'background .2s',
              }}>
              {searching ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ animation:'spin .8s linear infinite' }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
              ) : (
                <span style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                  {isAr ? 'بحث' : 'Chercher'}
                </span>
              )}
            </button>
          </div>
          <p style={{ fontSize:11, color:C.muted, marginTop:8, fontFamily:font }}>
            {isAr ? 'مثال: IH-548113  (الرقم الذي وصلكِ بعد إتمام الطلب)' : 'Ex: IH-548113  (reçu après confirmation)'}
          </p>
        </div>

        {/* Not found */}
        {notFound && (
          <div style={{
            background:isDark?'#2a0a0a':'#FFF5F5',
            border:`1px solid #EF444440`, borderRadius:16,
            padding:isMobile?16:24, textAlign:'center', marginBottom:20,
          }}>
            <div style={{ display:'flex', justifyContent:'center', marginBottom:10 }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                <line x1="8" y1="11" x2="14" y2="11"/>
              </svg>
            </div>
            <h3 style={{ fontSize:16, fontWeight:700, color:'#EF4444', marginBottom:8, fontFamily:font }}>
              {isAr ? 'لم يتم العثور على الطلب' : 'Commande introuvable'}
            </h3>
            <p style={{ fontSize:13, color:C.muted, fontFamily:font, marginBottom:0 }}>
              {isAr
                ? 'تأكدي من رقم الطلب — يجب أن يكون بصيغة IH-XXXXXX (6 أرقام)'
                : 'Vérifiez le format: IH-XXXXXX (6 chiffres)'}
            </p>
          </div>
        )}

        {/* ── Result ── */}
        {status && meta && (
          <div data-reveal data-reveal-delay="80">

            {/* Order status header */}
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:isMobile?15:20, marginBottom:14 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:10 }}>
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:1.5, marginBottom:4, fontFamily:font }}>
                    {isAr ? 'رقم الطلب' : 'N° commande'}
                  </div>
                  <div style={{ fontSize:isMobile?18:22, fontWeight:900, color:C.gold, fontFamily:'Inter, monospace', letterSpacing:2 }}>
                    {normalizedInput}
                  </div>
                  {foundOrder && (
                    <div style={{ marginTop:6, fontSize:12, color:C.muted, fontFamily:font, display:'flex', alignItems:'center', gap:5 }}>
                      <span>{foundOrder.product_emoji}</span>
                      <span>{foundOrder.product_name}</span>
                      <span style={{ color:C.border }}>•</span>
                      <span>{foundOrder.customer_name}</span>
                    </div>
                  )}
                </div>
                <div style={{
                  background: meta.color + '20',
                  border:`2px solid ${meta.color}50`,
                  borderRadius:20, padding:'8px 16px',
                  display:'flex', alignItems:'center', gap:7,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={meta.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}>
                    <path d={meta.icon} />
                  </svg>
                  <span style={{ fontSize:13, fontWeight:700, color:meta.color, fontFamily:font }}>
                    {isAr ? meta.ar : meta.fr}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div style={{
                background:isDark?'#1D4939':'#F0F9F4',
                border:`1px solid #10B98125`, borderRadius:10, padding:'13px 16px',
              }}>
                <p style={{ fontSize:13, color:C.text, fontFamily:font, margin:0, lineHeight:1.6 }}>
                  {isAr ? meta.desc.ar : meta.desc.fr}
                </p>
              </div>
            </div>

            {/* Progress stepper */}
            {status !== 'cancelled' && (
              <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:isMobile?'18px 14px':'20px 24px', marginBottom:14 }}>
                <h3 style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:1, marginBottom:24, fontFamily:font }}>
                  {isAr ? 'مسار الطلب' : 'Progression'}
                </h3>

                {/* Steps */}
                <div style={{ position:'relative', display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>

                  {/* Track line */}
                  <div style={{
                    position:'absolute', top:14,
                    left: isAr ? 'auto' : '9%', right: isAr ? '9%' : 'auto',
                    width:'82%', height:3, background:C.border, zIndex:0, borderRadius:2,
                  }}>
                    <div style={{
                      height:'100%', borderRadius:2, transition:'width .6s ease',
                      background:`linear-gradient(${isAr?'to left':'to right'}, ${C.green}, ${C.gold})`,
                      width:`${Math.max(0, Math.min((currentStep / 4) * 100, 100))}%`,
                    }} />
                  </div>

                  {STEPS.map((step, i) => {
                    const done   = i <= currentStep;
                    const active = i === currentStep;
                    return (
                      <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', flex:1, zIndex:1 }}>
                        <div style={{
                          width:isMobile?28:32, height:isMobile?28:32, borderRadius:'50%',
                          background: done ? `linear-gradient(135deg, ${C.green}, #1D4939)` : C.bg,
                          border: done ? 'none' : `2px solid ${C.border}`,
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontSize:done?12:11, fontWeight:700,
                          color: done ? '#fff' : C.muted,
                          boxShadow: active ? `0 0 0 5px ${C.green}28` : 'none',
                          transition:'all .3s',
                        }}>
                          {done ? '✓' : i + 1}
                        </div>
                        <div style={{
                          fontSize:isMobile?9:10, fontWeight:600,
                          color: done ? C.green : C.muted,
                          marginTop:7, textAlign:'center', fontFamily:font,
                        }}>
                          {isAr ? step.ar : step.fr}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Special state badges */}
                {(status === 'modified' || status === 'attempt_failed' || status === 'returned') && (
                  <div style={{
                    marginTop:20, padding:'10px 14px', borderRadius:10,
                    background: STATUS_META[status].color + '15',
                    border:`1px solid ${STATUS_META[status].color}40`,
                    display:'flex', gap:8, alignItems:'center',
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={STATUS_META[status].color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}>
                      <path d={STATUS_META[status].icon} />
                    </svg>
                    <span style={{ fontSize:12, color:STATUS_META[status].color, fontFamily:font, fontWeight:600 }}>
                      {isAr ? STATUS_META[status].ar : STATUS_META[status].fr}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Cancelled state */}
            {status === 'cancelled' && (
              <div style={{
                background:isDark?'#2a0a0a':'#FFF5F5',
                border:`1px solid #EF444440`, borderRadius:16,
                padding:isMobile?16:22, textAlign:'center', marginBottom:14,
              }}>
                <div style={{ display:'flex', justifyContent:'center', marginBottom:10 }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
                  </svg>
                </div>
                <h3 style={{ fontSize:16, fontWeight:700, color:'#EF4444', fontFamily:font, marginBottom:4 }}>
                  {isAr ? 'تم إلغاء الطلب' : 'Commande annulée'}
                </h3>
                <p style={{ fontSize:12, color:C.muted, fontFamily:font }}>
                  {isAr ? 'تواصلي مع فريقنا لمزيد من المعلومات' : 'Contactez-nous pour plus d\'informations'}
                </p>
              </div>
            )}

            {/* Contact & new order */}
            <div style={{
              background:C.card, border:`1px solid ${C.border}`, borderRadius:16,
              padding:isMobile?14:18,
              display:'flex', alignItems:'center', justifyContent:'space-between',
              gap:12, flexWrap:'wrap',
            }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:C.text, fontFamily:font, marginBottom:2 }}>
                  {isAr ? 'تحتاجين مساعدة؟' : 'Besoin d\'aide ?'}
                </div>
                <div style={{ fontSize:11, color:C.muted, fontFamily:font }}>
                  {isAr ? 'فريق الدعم متاح 6 أيام في الأسبوع' : 'Notre équipe disponible 6j/7'}
                </div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => router.push('/products')} style={{
                  background:'transparent', color:C.text, border:`1px solid ${C.border}`,
                  borderRadius:10, padding:'9px 14px', fontSize:12, fontWeight:600,
                  cursor:'pointer', fontFamily:font,
                }}>
                  <span style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
                    {isAr ? 'طلب جديد' : 'Nouvelle commande'}
                  </span>
                </button>
                <button onClick={() => router.push('/')} style={{
                  background:`linear-gradient(135deg, ${C.green}, #1D4939)`,
                  color:'#fff', border:'none', borderRadius:10,
                  padding:'9px 16px', fontSize:12, fontWeight:700,
                  cursor:'pointer', fontFamily:font,
                }}>
                  <span style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                    {isAr ? 'تواصلي معنا' : 'Nous contacter'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={<div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', gap:10, fontFamily:'Cairo, sans-serif', fontSize:16, color:'#244D3B' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#244D3B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation:'spin .8s linear infinite' }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>جارٍ التحميل...</div>}>
      <TrackContent />
    </Suspense>
  );
}
