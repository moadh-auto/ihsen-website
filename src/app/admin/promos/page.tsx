'use client';
import { useEffect, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { PROMO_CODES, type PromoCode, type PromoType, type PromoCategory } from '@/lib/constants';
import { supabase } from '@/lib/supabase';

// Map Supabase snake_case → local camelCase
const rowToPromo = (r: Record<string, unknown>): PromoCode => ({
  code:       r.code as string,
  type:       r.type as PromoType,
  value:      r.value as number,
  minOrder:   r.min_order as number,
  maxUses:    r.max_uses as number,
  active:     r.active as boolean,
  descAr:     r.desc_ar as string,
  descFr:     r.desc_fr as string,
  usedCount:  r.used_count as number,
  category:   (r.category as PromoCategory) ?? 'general',
  expiresAt:  r.expires_at as string | null,
});
const promoToRow = (p: PromoCode) => ({
  code:       p.code.toUpperCase(),
  type:       p.type,
  value:      p.value,
  min_order:  p.minOrder,
  max_uses:   p.maxUses,
  active:     p.active,
  desc_ar:    p.descAr,
  desc_fr:    p.descFr,
  category:   p.category ?? 'general',
  expires_at: p.expiresAt ?? null,
});

const CATEGORY_META: Record<PromoCategory, { ar: string; fr: string; icon: string; color: string }> = {
  influencer: { ar: 'كولاب مؤثر', fr: 'Influenceur', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', color: '#8B5CF6' },
  campaign:   { ar: 'حملة ترويجية', fr: 'Campagne', icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.952 9.168-5', color: '#3B82F6' },
  seasonal:   { ar: 'موسمي', fr: 'Saisonnier', icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z', color: '#F59E0B' },
  general:    { ar: 'عام', fr: 'Général', icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z', color: '#6B7280' },
};

const NAV = [
  { id:'dashboard', ar:'الرئيسية',     fr:'Accueil',     href:'/admin/dashboard',
    iconPath:'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id:'orders',    ar:'الطلبات',      fr:'Commandes',   href:'/admin/orders',
    iconPath:'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { id:'products',  ar:'المنتجات',     fr:'Produits',    href:'/admin/products',
    iconPath:'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { id:'delivery',  ar:'التوصيل',      fr:'Livraison',   href:'/admin/delivery',
    iconPath:'M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0' },
  { id:'promos',    ar:'أكواد الخصم', fr:'Codes promo', href:'/admin/promos',
    iconPath:'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z' },
  { id:'messages',  ar:'الرسائل',      fr:'Messages',    href:'/admin/messages',
    iconPath:'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { id:'settings',  ar:'الإعدادات',   fr:'Paramètres',  href:'/admin/settings',
    iconPath:'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z' },
];

const TYPE_META: Record<PromoType, { ar: string; fr: string; icon: string; color: string }> = {
  percent:  { ar:'نسبة مئوية', fr:'Pourcentage', icon:'%', color:'#8B5CF6' },
  fixed:    { ar:'مبلغ ثابت', fr:'Montant fixe', icon:'دج', color:'#3B82F6' },
  shipping: { ar:'توصيل مجاني', fr:'Livraison gratuite', icon:'M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2-1 2 1 2-1 2 1 2-1 2 1V6m2 10V5a1 1 0 011-1h2a1 1 0 011 1v1m-4 14l4-1 4 1V9', color:'#10B981' },
};

const EMPTY: PromoCode = { code:'', type:'percent', value:10, minOrder:0, maxUses:0, active:true, descAr:'', descFr:'', category:'general', usedCount:0, expiresAt:null };

export default function PromosPage() {
  const router = useRouter();
  const [promos,    setPromos]    = useState<PromoCode[]>(PROMO_CODES as PromoCode[]);
  const [form,      setForm]      = useState<PromoCode|null>(null);
  const [isNew,     setIsNew]     = useState(false);
  const [sideOpen,  setSideOpen]  = useState(true);
  const [windowW,   setW]         = useState(1200);
  const [toast,     setToast]     = useState('');
  const [copied,    setCopied]    = useState('');
  const [deleteConf,setDeleteConf] = useState<string|null>(null);
  const [adminLang, setAdminLang] = useState<'ar'|'fr'>('ar');

  const loadPromos = async () => {
    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: true });
    if (!error && data && data.length > 0) {
      setPromos(data.map(rowToPromo));
    }
  };

  useEffect(() => {
    if (!sessionStorage.getItem('ihsen_admin')) { router.replace('/admin'); return; }
    setAdminLang((localStorage.getItem('ihsen_admin_lang') as 'ar'|'fr') ?? 'ar');
    const upd = () => setW(window.innerWidth);
    upd();
    window.addEventListener('resize', upd);
    if (window.innerWidth < 1024) setSideOpen(false);
    loadPromos();
    return () => window.removeEventListener('resize', upd);
  }, [router]);

  const isMobile  = windowW < 640;
  const isDesktop = windowW >= 1024;
  const C = { bg:'#EEF5F1', sidebar:'#1a3d2e', card:'#FFFFFF', card2:'#F3FAF6', border:'#D5E8DC', border2:'#B2CEBE', text:'#172B1E', muted:'#4E6D5C', sub:'#84A695', green:'#244D3B', greenL:'#2d5f49', gold:'#AF8E4A', goldL:'#c4a35a' };
  const isAdminAr = adminLang === 'ar';
  const font = isAdminAr ? 'Cairo, sans-serif' : 'Inter, sans-serif';
  const dir  = isAdminAr ? 'rtl' : 'ltr';

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const copyLink = (code: string) => {
    const url = `${window.location.origin}/order?promo=${code}`;
    navigator.clipboard.writeText(url);
    setCopied(code);
    setTimeout(() => setCopied(''), 2000);
    showToast(isAdminAr ? 'تم نسخ الرابط' : 'Lien copié');
  };

  const savePromo = async () => {
    if (!form) return;
    if (!form.code.trim()) { showToast(isAdminAr ? 'أدخلي كود الخصم' : 'Entrez le code promo'); return; }
    if (form.value <= 0 && form.type !== 'shipping') { showToast(isAdminAr ? 'القيمة يجب أن تكون أكبر من 0' : 'La valeur doit être supérieure à 0'); return; }
    const cleanCode = form.code.toUpperCase();
    if (isNew) {
      const dup = promos.find(p => p.code.toUpperCase() === cleanCode);
      if (dup) { showToast(isAdminAr ? 'هذا الكود موجود مسبقاً' : 'Ce code existe déjà'); return; }
      const row = promoToRow({ ...form, code: cleanCode });
      const { error } = await supabase.from('promo_codes').insert(row);
      if (error) console.warn('Promo insert error:', error);
      setPromos(prev => [...prev, { ...form, code: cleanCode }]);
      showToast(isAdminAr ? 'تم إضافة كود الخصم' : 'Code promo ajouté');
    } else {
      const row = promoToRow(form);
      const { error } = await supabase.from('promo_codes').update(row).eq('code', form.code);
      if (error) console.warn('Promo update error:', error);
      setPromos(prev => prev.map(p => p.code === form.code ? { ...form } : p));
      showToast(isAdminAr ? 'تم حفظ التعديلات' : 'Modifications enregistrées');
    }
    setForm(null);
  };

  const toggleActive = async (code: string) => {
    const promo = promos.find(p => p.code === code);
    if (!promo) return;
    const newActive = !promo.active;
    const { error } = await supabase.from('promo_codes').update({ active: newActive }).eq('code', code);
    if (error) console.warn('Promo toggle error:', error);
    setPromos(prev => prev.map(p => p.code === code ? { ...p, active: newActive } : p));
    showToast(promo.active ? (isAdminAr ? 'تم تعطيل الكود' : 'Code désactivé') : (isAdminAr ? 'تم تفعيل الكود' : 'Code activé'));
  };

  const deletePromo = async (code: string) => {
    const { error } = await supabase.from('promo_codes').delete().eq('code', code);
    if (error) console.warn('Promo delete error:', error);
    setPromos(prev => prev.filter(p => p.code !== code));
    setDeleteConf(null);
    if (form?.code === code) setForm(null);
    showToast(isAdminAr ? '🗑 تم حذف الكود' : '🗑 Code supprimé');
  };

  const Sidebar = () => (
    <aside style={{ width: sideOpen?(isMobile?'100%':240):60, flexShrink:0, background:C.sidebar, borderInlineEnd:`1px solid ${C.border}`, display:'flex', flexDirection:'column', transition:'width .3s', position:isMobile&&sideOpen?'fixed':'relative', top:0, bottom:0, zIndex:isMobile&&sideOpen?300:'auto', overflowX:'hidden' }}>
      <div style={{ padding:'20px 16px', display:'flex', alignItems:'center', gap:10, borderBottom:'1px solid rgba(255,255,255,0.08)', cursor:'pointer' }} onClick={() => setSideOpen(!sideOpen)}>
        <Image src="/logos/icon-white.svg" alt="إحسان" width={30} height={30} style={{ flexShrink:0 }} />
        {sideOpen && <div><div style={{ fontWeight:800, fontSize:15, color:'#fff', fontFamily:'Cairo, sans-serif', whiteSpace:'nowrap' }}>إحسان — Admin</div><div style={{ fontSize:9, letterSpacing:2, color:C.gold, fontFamily:'Inter', textTransform:'uppercase' }}>{isAdminAr ? 'لوحة التحكم' : 'Tableau de bord'}</div></div>}
      </div>
      <nav style={{ flex:1, padding:'12px 8px', display:'flex', flexDirection:'column', gap:4 }}>
        {NAV.map(item => {
          const active = typeof window!=='undefined' && window.location.pathname.startsWith(item.href);
          return (
            <button key={item.id} onClick={() => { router.push(item.href); if(isMobile) setSideOpen(false); }} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', borderRadius:10, cursor:'pointer', background:active?'rgba(175,142,74,0.22)':'transparent', border:active?'1px solid rgba(175,142,74,0.45)':'1px solid transparent', color:active?'#d4a95e':'rgba(255,255,255,0.55)', width:'100%', textAlign: isAdminAr ? 'right' : 'left', transition:'all .2s cubic-bezier(0.22,1,0.36,1)', fontFamily:font, fontSize:13, fontWeight:active?700:400 }}
              onMouseEnter={e=>{ if(!active) { e.currentTarget.style.background='rgba(255,255,255,0.07)'; e.currentTarget.style.color='rgba(255,255,255,0.85)'; } }}
              onMouseLeave={e=>{ if(!active) { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='rgba(255,255,255,0.55)'; } }}>
              <span style={{ flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', width:18, height:18 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d={item.iconPath} />
                </svg>
              </span>
              {sideOpen && <span style={{ whiteSpace:'nowrap' }}>{isAdminAr ? item.ar : item.fr}</span>}
            </button>
          );
        })}
      </nav>
      <div style={{ padding:'12px 8px', borderTop:'1px solid rgba(255,255,255,0.08)', display:'flex', flexDirection:'column', gap:4 }}>
        <button onClick={() => router.push('/')} style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 12px', borderRadius:10, background:'transparent', border:'none', color:'rgba(255,255,255,0.5)', cursor:'pointer', fontFamily:font, fontSize:12, width:'100%' }}>
          <span style={{ flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', width:18, height:18 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
            </svg>
          </span>
          {sideOpen&&(isAdminAr ? 'عرض الموقع' : 'Voir le site')}
        </button>
        <button onClick={() => { sessionStorage.removeItem('ihsen_admin'); router.replace('/admin'); }} style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 12px', borderRadius:10, background:'transparent', border:'none', color:'rgba(239,68,68,0.6)', cursor:'pointer', fontFamily:font, fontSize:12, width:'100%' }}>
          <span style={{ flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', width:18, height:18 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
          </span>
          {sideOpen&&(isAdminAr ? 'تسجيل الخروج' : 'Déconnexion')}
        </button>
      </div>
    </aside>
  );

  const pInpS = (label: string, val: string|number, onChange: (v:string)=>void, opts?: { type?:string; placeholder?:string; fam?:string; disabled?:boolean; extra?: React.CSSProperties }) => (
    <div>
      <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:5, fontFamily: opts?.fam ?? font }}>{label}</label>
      <input type={opts?.type ?? 'text'} value={val} placeholder={opts?.placeholder} disabled={opts?.disabled}
        onChange={e => onChange(e.target.value)}
        style={{ width:'100%', padding:'10px 13px', borderRadius:10, border:`1.5px solid ${C.border}`, background: opts?.disabled ? `${C.border}40` : '#FAFCFB', color:C.text, fontFamily: opts?.fam ?? font, fontSize:13, boxSizing:'border-box' as const, outline:'none', opacity: opts?.disabled ? .6 : 1, cursor: opts?.disabled ? 'not-allowed' : 'text', ...(opts?.extra ?? {}) }} />
    </div>
  );
  const pSLc = (iconPath: string, label: string) => (
    <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:12 }}>
      <div style={{ width:3, height:16, borderRadius:2, background:C.gold, flexShrink:0 }} />
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={iconPath}/></svg>
      <span style={{ fontSize:9, fontWeight:800, color:C.sub, textTransform:'uppercase' as const, letterSpacing:1.5, fontFamily:'Inter, sans-serif' }}>{label}</span>
    </div>
  );
  const pSecC: CSSProperties = { background:'#FAFCFB', border:`1px solid ${C.border}`, borderRadius:14, padding:'14px 13px', display:'flex', flexDirection:'column', gap:12 };

  const FormPanel = () => !form ? null : (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, overflow:'hidden', display:'flex', flexDirection:'column' }}>

      {/* ── Hero header ── */}
      <div style={{ background:`linear-gradient(135deg, ${C.green} 0%, #1D4939 100%)`, padding:'18px 18px 16px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', insetInlineEnd:-18, top:-18, width:90, height:90, borderRadius:'50%', background:'rgba(175,142,74,0.14)', pointerEvents:'none' }} />
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', position:'relative' }}>
          <div>
            <div style={{ fontFamily:'Inter, monospace', fontWeight:900, fontSize:20, color:C.gold, letterSpacing:3, lineHeight:1.1 }}>
              {form.code || (isNew ? (isAdminAr ? 'كود جديد' : 'Nouveau code') : '—')}
            </div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)', fontFamily:font, marginTop:4, display:'flex', alignItems:'center', gap:6 }}>
              {isNew
                ? <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> {isAdminAr ? 'إضافة كود خصم جديد' : 'Ajouter un nouveau code'}</>
                : <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg> {isAdminAr ? 'تعديل الكود' : 'Modifier le code'}</>
              }
            </div>
          </div>
          <button onClick={() => setForm(null)}
            style={{ background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:8, width:32, height:32, cursor:'pointer', color:'rgba(255,255,255,.75)', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1, flexShrink:0 }}>×</button>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ padding:'14px', display:'flex', flexDirection:'column', gap:12 }}>

        {/* كود الخصم */}
        <div style={pSecC}>
          {pSLc('M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z', isAdminAr ? 'كود الخصم' : 'Code promo')}
          {pInpS(isAdminAr ? 'الكود *' : 'Code *', form.code,
            v => setForm({...form, code: v.toUpperCase().replace(/\s/g,'')}),
            { fam:'Inter, monospace', disabled:!isNew, extra:{ fontWeight:800, letterSpacing:2.5, fontSize:14 } })}

          <div>
            <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:8, fontFamily:font }}>{isAdminAr ? 'نوع الخصم *' : 'Type de remise *'}</label>
            <div style={{ display:'flex', gap:6 }}>
              {(Object.entries(TYPE_META) as [PromoType, typeof TYPE_META[PromoType]][]).map(([t, m]) => (
                <button key={t} onClick={() => setForm({...form, type:t, value: t==='shipping'?0:form.value})} style={{
                  flex:1, padding:'9px 6px', borderRadius:10, cursor:'pointer', fontFamily:font, fontSize:12, fontWeight:700,
                  background: form.type===t ? `${m.color}22` : 'transparent',
                  border: `1.5px solid ${form.type===t ? m.color : C.border}`,
                  color: form.type===t ? m.color : C.muted, transition:'all .15s',
                  display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                }}>
                  {m.icon === '%' || m.icon === 'دج'
                    ? <span style={{ fontFamily:'Inter', fontWeight:900, fontSize:14 }}>{m.icon}</span>
                    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={m.icon}/></svg>
                  }
                  <span style={{ fontSize:10 }}>{isAdminAr ? m.ar : m.fr}</span>
                </button>
              ))}
            </div>
          </div>

          {form.type !== 'shipping' && (
            pInpS(form.type==='percent' ? (isAdminAr ? 'النسبة (%)' : 'Pourcentage (%)') : (isAdminAr ? 'المبلغ (دج)' : 'Montant (DA)'), form.value,
              v => setForm({...form, value: Number(v)}),
              { type:'number', fam:'Inter, sans-serif' })
          )}
        </div>

        {/* الإعدادات */}
        <div style={pSecC}>
          {pSLc('M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', isAdminAr ? 'الإعدادات' : 'Paramètres')}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {pInpS(isAdminAr ? 'الحد الأدنى (دج)' : 'Montant min. (DA)', form.minOrder,
              v => setForm({...form, minOrder: Number(v)}),
              { type:'number', fam:'Inter, sans-serif' })}
            {pInpS(isAdminAr ? 'الحد الأقصى للاستخدام' : 'Utilisation max.', form.maxUses,
              v => setForm({...form, maxUses: Number(v)}),
              { type:'number', fam:'Inter, sans-serif' })}
          </div>
          <div>
            <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:5, fontFamily:font }}>{isAdminAr ? 'تاريخ الانتهاء' : 'Date d\'expiration'}</label>
            <input type="date" value={form.expiresAt?.slice(0,10) ?? ''}
              onChange={e => setForm({...form, expiresAt: e.target.value || null})}
              style={{ width:'100%', padding:'10px 13px', borderRadius:10, border:`1.5px solid ${C.border}`, background:'#FAFCFB', color:C.text, fontFamily:'Inter, sans-serif', fontSize:13, boxSizing:'border-box' as const, outline:'none', colorScheme:'light' }} />
          </div>
          <div>
            <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:8, fontFamily:font }}>{isAdminAr ? 'تصنيف الكود' : 'Catégorie'}</label>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
              {(Object.entries(CATEGORY_META) as [PromoCategory, typeof CATEGORY_META[PromoCategory]][]).map(([cat, m]) => (
                <button key={cat} onClick={() => setForm({...form, category:cat})} style={{
                  padding:'8px 8px', borderRadius:10, cursor:'pointer', fontFamily:font, fontSize:11, fontWeight:700,
                  background: form.category===cat ? `${m.color}22` : 'transparent',
                  border: `1.5px solid ${form.category===cat ? m.color : C.border}`,
                  color: form.category===cat ? m.color : C.muted, transition:'all .15s',
                  display:'flex', alignItems:'center', gap:5,
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={m.icon}/></svg> {isAdminAr ? m.ar : m.fr}
                </button>
              ))}
            </div>
          </div>
          {/* Active toggle */}
          <button onClick={() => setForm({...form, active: !form.active})}
            style={{ padding:'10px 13px', borderRadius:10, border:`1.5px solid ${form.active?'#10B98160':C.border}`, background:form.active?'#10B98112':'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between', transition:'all .2s' }}>
            <span style={{ fontFamily:font, fontSize:12, color:C.text, fontWeight:600 }}>{isAdminAr ? 'الكود مفعّل' : 'Code actif'}</span>
            <div style={{ width:38, height:22, borderRadius:11, background:form.active?'#10B981':C.border, position:'relative', transition:'background .2s', flexShrink:0 }}>
              <div style={{ position:'absolute', top:3, insetInlineStart:form.active?19:3, width:16, height:16, borderRadius:'50%', background:'#fff', transition:'all .2s', boxShadow:'0 1px 3px rgba(0,0,0,.2)' }} />
            </div>
          </button>
        </div>

        {/* الوصف */}
        <div style={pSecC}>
          {pSLc('M4 6h16M4 12h16M4 18h7', isAdminAr ? 'الوصف' : 'Description')}
          {pInpS(isAdminAr ? 'الوصف بالعربية' : 'Description (AR)', form.descAr, v => setForm({...form, descAr:v}), { placeholder:isAdminAr ? 'مثال: خصم 10% على الطلب' : 'مثال: ...' })}
          {pInpS('Description (FR)', form.descFr, v => setForm({...form, descFr:v}), { fam:'Inter, sans-serif', placeholder:'Ex: 10% de réduction' })}
        </div>

        {/* Save */}
        <button onClick={savePromo}
          style={{ width:'100%', padding:'13px', background:`linear-gradient(135deg, ${C.green} 0%, #1D4939 100%)`, border:'none', borderRadius:11, color:'#fff', fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:font, boxShadow:`0 4px 16px rgba(36,77,59,.35)`, display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
          {isNew
            ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> {isAdminAr ? 'إضافة الكود' : 'Ajouter'}</>
            : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> {isAdminAr ? 'حفظ التعديلات' : 'Enregistrer'}</>
          }
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ height:'100vh', overflow:'hidden', display:'flex', background:C.bg, fontFamily:font, direction:dir, color:C.text }}>
      {isMobile && sideOpen && <div onClick={() => setSideOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', zIndex:200 }} />}
      <Sidebar />

      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {/* Topbar */}
        <div style={{ background:'#ffffff', borderBottom:`1px solid ${C.border}`, padding:'12px 20px', display:'flex', alignItems:'center', gap:12, position:'sticky', top:0, zIndex:100, boxShadow:'0 1px 0 rgba(36,77,59,.06)' }}>
          {!isDesktop && <button onClick={() => setSideOpen(!sideOpen)} style={{ background:'none', border:'none', cursor:'pointer', color:C.muted, fontSize:20 }}>☰</button>}
          <div style={{ flex:1 }}>
            <div style={{ fontSize:16, fontWeight:800, color:C.text }}>{isAdminAr ? 'أكواد الخصم' : 'Codes promo'}</div>
            <div style={{ fontSize:11, color:C.muted }}>{promos.filter(p=>p.active).length} {isAdminAr ? 'مفعّل' : 'actifs'} · {promos.length} {isAdminAr ? 'إجمالي' : 'total'}</div>
          </div>
          <button onClick={() => { setIsNew(true); setForm({...EMPTY}); }} style={{ background:`linear-gradient(135deg, ${C.gold}, #8B6E35)`, border:'none', borderRadius:100, padding:'8px 18px', color:'#0F2419', fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:font }}>
            + {isAdminAr ? 'كود جديد' : 'Ajouter un code'}
          </button>
        </div>

        <div style={{ flex:1, padding:isMobile?'16px':'20px 24px', display:'flex', gap:20, alignItems:'flex-start', overflowY:'auto' }}>

          {/* List */}
          <div style={{ flex:1, display:'flex', flexDirection:'column', gap:10 }}>

            {/* Stats header */}
            {promos.length > 0 && (
              <div data-reveal style={{ display:'grid', gridTemplateColumns:`repeat(${isMobile?2:4}, 1fr)`, gap:10, marginBottom:4 }}>
                {[
                  { label: isAdminAr ? 'إجمالي الأكواد' : 'Total codes', value: promos.length, color: C.green, d:'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z' },
                  { label: isAdminAr ? 'مفعّلة' : 'Actifs', value: promos.filter(p=>p.active).length, color:'#10B981', d:'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
                  { label: isAdminAr ? 'إجمالي الاستخدام' : 'Utilisations totales', value: promos.reduce((s,p)=>(s + (p.usedCount??0)), 0), color: C.gold, d:'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
                  { label: isAdminAr ? 'أكثر استخداماً' : 'Plus utilisé', value: promos.reduce((best,p)=> (p.usedCount??0)>(best.usedCount??0)?p:best, promos[0])?.code ?? '—', color:'#8B5CF6', d:'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z', isText:true },
                ].map((s,i) => (
                  <div key={i} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:'12px 14px' }}>
                    <div style={{ fontSize:11, color:C.muted, marginBottom:4, display:'flex', alignItems:'center', gap:5 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={(s as {d:string}).d}/></svg>
                      {s.label}
                    </div>
                    <div style={{ fontSize: (s as {isText?:boolean}).isText ? 13 : 22, fontWeight:800, color:s.color, fontFamily:(s as {isText?:boolean}).isText?'Cairo,sans-serif':'Inter' }}>
                      {String(s.value)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {promos.map((p, pi) => {
              const tm = TYPE_META[p.type];
              const cm = CATEGORY_META[p.category ?? 'general'];
              const promoVal = p.type==='shipping' ? (isAdminAr ? 'توصيل مجاني' : 'Livraison gratuite') : p.type==='percent' ? `${p.value}%` : `${p.value.toLocaleString()} ${isAdminAr ? 'دج' : 'DA'}`;
              const promoUrl = typeof window!=='undefined' ? `${window.location.origin}/order?promo=${p.code}` : `/order?promo=${p.code}`;
              const usedCount = p.usedCount ?? 0;
              const maxUses = p.maxUses ?? 0;
              const usagePercent = maxUses > 0 ? Math.min(100, Math.round(usedCount / maxUses * 100)) : null;
              return (
                <div key={p.code} data-reveal data-reveal-delay={String(pi * 60)}>
                <div style={{
                  background:C.card, border:`1px solid ${p.active ? C.border : `${C.border}50`}`,
                  borderRadius:14, padding:'14px 16px', opacity: p.active ? 1 : .6,
                  transition:'opacity .2s, border-color .2s',
                }}>
                  {/* Row 1: code + badges + actions */}
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10, gap:8, flexWrap:'wrap' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                      <span style={{ fontSize:15, fontWeight:900, color:C.gold, fontFamily:'Inter, monospace', letterSpacing:2 }}>{p.code}</span>
                      <span style={{ background:`${tm.color}20`, color:tm.color, borderRadius:6, padding:'2px 8px', fontSize:10, fontWeight:700 }}>{isAdminAr ? tm.ar : tm.fr}</span>
                      <span style={{ background:`${cm.color}18`, color:cm.color, borderRadius:6, padding:'2px 8px', fontSize:10, fontWeight:700, display:'inline-flex', alignItems:'center', gap:4 }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={cm.icon}/></svg>
                        {isAdminAr ? cm.ar : cm.fr}
                      </span>
                      <span style={{ background: p.active ? '#10B98118' : '#6B728018', color: p.active ? '#10B981' : '#6B7280', borderRadius:6, padding:'2px 8px', fontSize:10, fontWeight:700 }}>
                        {p.active ? (isAdminAr ? 'مفعّل' : 'Actif') : (isAdminAr ? 'معطّل' : 'Inactif')}
                      </span>
                    </div>
                    {/* Actions — uniform 30px square buttons */}
                    <div style={{ display:'flex', gap:6, alignItems:'center', flexShrink:0 }}>
                      <button onClick={() => copyLink(p.code)} title={isAdminAr ? "نسخ الرابط" : "Copier le lien"} style={{ width:30, height:30, borderRadius:7, border:`1px solid ${C.border}`, background:'transparent', color: copied===p.code ? '#10B981' : C.muted, cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        {copied===p.code ? '✓' : '⎘'}
                      </button>
                      <button onClick={() => toggleActive(p.code)} style={{ height:30, padding:'0 10px', borderRadius:7, border:`1px solid ${C.border}`, background:'transparent', color:C.muted, cursor:'pointer', fontSize:11, fontFamily:font, whiteSpace:'nowrap', flexShrink:0 }}>
                        {p.active ? (isAdminAr ? 'تعطيل' : 'Désactiver') : (isAdminAr ? 'تفعيل' : 'Activer')}
                      </button>
                      <button onClick={() => { setIsNew(false); setForm({...p}); }} style={{ width:30, height:30, borderRadius:7, border:`1px solid ${C.border2}`, background:`${C.green}25`, color:C.gold, cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>✎</button>
                      <button onClick={() => setDeleteConf(p.code)} style={{ width:30, height:30, borderRadius:7, border:'1px solid rgba(239,68,68,.3)', background:'rgba(239,68,68,.08)', color:'#EF4444', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>✕</button>
                    </div>
                  </div>

                  {/* Row 2: info + link */}
                  <div style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap', marginBottom: 10 }}>
                    {p.descAr && <span style={{ fontSize:12, color:C.text }}>{p.descAr}</span>}
                    <span style={{ fontSize:11, color:C.muted }}>
                      {isAdminAr ? 'القيمة:' : 'Valeur:'} <strong style={{ color:tm.color }}>{promoVal}</strong>
                    </span>
                    {p.minOrder > 0 && (
                      <span style={{ fontSize:11, color:C.muted }}>
                        {isAdminAr ? 'الحد:' : 'Min:'} <strong style={{ color:C.text }}>{p.minOrder.toLocaleString()} {isAdminAr ? 'دج' : 'DA'}</strong>
                      </span>
                    )}
                    {p.expiresAt && (
                      <span style={{ fontSize:11, color: new Date(p.expiresAt) < new Date() ? '#EF4444' : C.muted }}>
                        {isAdminAr ? '⏰ ينتهي:' : '⏰ Expire:'} <strong>{new Date(p.expiresAt).toLocaleDateString(isAdminAr ? 'ar-DZ' : 'fr-DZ')}</strong>
                      </span>
                    )}
                    <code style={{ fontSize:10, color:'#64B5F6', fontFamily:'monospace', background:'#3B82F610', padding:'2px 6px', borderRadius:4, maxWidth:isMobile?160:240, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {promoUrl}
                    </code>
                  </div>

                  {/* Row 3: usage bar */}
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:11, color:C.muted, flexShrink:0 }}>
                      {isAdminAr ? 'الاستخدام:' : 'Utilisations:'}
                      <strong style={{ color: usedCount > 0 ? C.gold : C.muted, marginInlineStart:4, fontFamily:'Inter' }}>
                        {usedCount}
                      </strong>
                      {maxUses > 0 && <span style={{ color:C.muted }}>/{maxUses}</span>}
                    </span>
                    {maxUses > 0 && (
                      <div style={{ flex:1, height:5, background:`${C.border}80`, borderRadius:3, overflow:'hidden' }}>
                        <div style={{
                          height:'100%', borderRadius:3,
                          width:`${usagePercent}%`,
                          background: usagePercent! >= 90 ? '#EF4444' : usagePercent! >= 60 ? '#F59E0B' : C.gold,
                          transition:'width .4s ease',
                        }} />
                      </div>
                    )}
                    {maxUses === 0 && usedCount > 0 && (
                      <div style={{ flex:1, height:5, background:`${C.gold}30`, borderRadius:3 }}>
                        <div style={{ height:'100%', width:'100%', borderRadius:3, background:`${C.gold}60` }} />
                      </div>
                    )}
                  </div>
                </div>
                </div>
              );
            })}

            {promos.length === 0 && (
              <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:'48px 24px', textAlign:'center', color:C.muted }}>
                <div style={{ width:48, height:48, borderRadius:12, background:`${C.border}50`, margin:'0 auto 14px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <div style={{ width:20, height:20, border:`2px solid ${C.muted}`, borderRadius:4 }} />
                </div>
                <div style={{ fontSize:14, color:C.text, marginBottom:6 }}>{isAdminAr ? 'لا توجد أكواد خصم' : 'Aucun code promo'}</div>
                <div style={{ fontSize:12, color:C.muted, marginBottom:16 }}>{isAdminAr ? 'أضيفي كوداً لتفعيل العروض الترويجية' : 'Ajoutez un code pour activer les promotions'}</div>
                <button onClick={() => { setIsNew(true); setForm({...EMPTY}); }} style={{ background:C.green, border:'none', borderRadius:100, padding:'10px 22px', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:font }}>{isAdminAr ? '+ كود جديد' : '+ Ajouter un code'}</button>
              </div>
            )}
          </div>

          {/* Form panel (desktop) */}
          {isDesktop && form && (
            <div style={{ width:340, flexShrink:0, position:'sticky', top:0 }}>
              <FormPanel />
            </div>
          )}
        </div>

        {/* Mobile form sheet */}
        {!isDesktop && form && (
          <>
            <div onClick={() => setForm(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:300 }} />
            <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:400, background:C.bg, borderRadius:'20px 20px 0 0', padding:'0 16px 32px', maxHeight:'90vh', overflowY:'auto' }}>
              <div style={{ display:'flex', justifyContent:'center', padding:'12px 0 6px' }}>
                <div style={{ width:40, height:4, borderRadius:2, background:C.border }} />
              </div>
              <FormPanel />
            </div>
          </>
        )}

        {/* Delete confirmation modal */}
        {deleteConf && (
          <>
            <div onClick={() => setDeleteConf(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', zIndex:500 }} />
            <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', zIndex:600, background:C.card, border:`1px solid ${C.border}`, borderRadius:20, padding:'28px', width:'min(360px,90vw)', textAlign:'center' }}>
              <div style={{ width:44, height:44, borderRadius:12, background:'rgba(239,68,68,.12)', border:'1px solid rgba(239,68,68,.3)', margin:'0 auto 14px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, color:'#EF4444' }}>✕</div>
              <div style={{ fontSize:16, fontWeight:800, color:C.text, marginBottom:8 }}>{isAdminAr ? 'تأكيد الحذف' : 'Confirmer la suppression'}</div>
              <div style={{ fontSize:13, color:C.muted, marginBottom:20 }}>{isAdminAr ? 'سيتم حذف الكود' : 'Le code'} <strong style={{ color:C.gold }}>{deleteConf}</strong> {isAdminAr ? 'نهائياً' : 'sera supprimé définitivement'}</div>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={() => setDeleteConf(null)} style={{ flex:1, padding:'11px', borderRadius:10, background:`${C.border}40`, border:`1px solid ${C.border}`, color:C.text, cursor:'pointer', fontFamily:font, fontSize:13, fontWeight:600 }}>{isAdminAr ? 'إلغاء' : 'Annuler'}</button>
                <button onClick={() => deletePromo(deleteConf)} style={{ flex:1, padding:'11px', borderRadius:10, background:'rgba(239,68,68,.15)', border:'1px solid rgba(239,68,68,.4)', color:'#EF4444', cursor:'pointer', fontFamily:font, fontSize:13, fontWeight:800 }}>{isAdminAr ? 'حذف' : 'Supprimer'}</button>
              </div>
            </div>
          </>
        )}
      </div>

      {toast && (
        <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', background:'#0f2419', border:'1px solid #244D3B', borderRadius:100, padding:'10px 24px', color:'#10B981', fontFamily:font, fontWeight:700, fontSize:13, zIndex:999, boxShadow:'0 8px 24px rgba(0,0,0,.4)', whiteSpace:'nowrap' }}>
          {toast}
        </div>
      )}
    </div>
  );
}
