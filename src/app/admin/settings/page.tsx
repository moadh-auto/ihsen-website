'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
const ADMIN_PASSWORD_DEFAULT = 'ihsen2026';



type BiCat = { ar: string; fr: string };
const DEFAULT_CLOTHING_CATS: BiCat[]  = [
  {ar:'فولار',       fr:'Foulards'},
  {ar:'حجاب',        fr:'Hijabs'},
  {ar:'عبايات',      fr:'Abayas'},
  {ar:'هوديز',       fr:'Hoodies'},
];
const DEFAULT_SHOE_CATS: BiCat[]      = [
  {ar:'حذاء رياضي',  fr:'Baskets'},
  {ar:'حذاء كلاسيك', fr:'Chaussures classiques'},
  {ar:'حذاء كاجوال', fr:'Chaussures casual'},
  {ar:'بوط',         fr:'Bottes'},
];
const DEFAULT_ACCESSORY_CATS: BiCat[] = [
  {ar:'حقيبة يد',    fr:'Sac à main'},
  {ar:'قبعة',        fr:'Casquette'},
  {ar:'إيشارب',      fr:'Écharpe'},
  {ar:'نظارات',      fr:'Lunettes'},
  {ar:'مجوهرات',     fr:'Bijoux'},
  {ar:'حزام',        fr:'Ceinture'},
];
const DEFAULT_SOCIAL = { instagram:'', facebook:'', tiktok:'', whatsapp:'', youtube:'' };
const DEFAULT_CONTACT = { phone:'', whatsapp:'', email:'', address:'', hours_ar:'', hours_fr:'' };
const DEFAULT_NOTIF   = { notification_email: '' };

type Toast = { id: number; msg: string; ok: boolean };
let _tid = 0;

// ── Save/load from Supabase site_settings table ────────────────────────────
async function loadSetting(key: string): Promise<string | null> {
  try {
    const { data } = await supabase.from('site_settings').select('value').eq('key', key).maybeSingle();
    return (data as { value: string } | null)?.value ?? null;
  } catch { return null; }
}
async function saveSetting(key: string, value: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('site_settings').upsert({ key, value }, { onConflict:'key' });
    return !error;
  } catch { return false; }
}

export default function SettingsPage() {
  const router = useRouter();
  const [sideOpen,   setSideOpen]  = useState(true);
  const [windowW,    setW]         = useState(1200);
  const [toasts,     setToasts]    = useState<Toast[]>([]);
  const [loading,    setLoading]   = useState(true);
  const [section,    setSection]   = useState<'menu'|'password'|'categories'|'social'|'contact'|'language'>('password');

  // Password
  const [newPw,      setNewPw]     = useState('');
  const [confPw,     setConfPw]    = useState('');
  const [showNew,    setShowNew]   = useState(false);
  const [pwSaving,   setPwSaving]  = useState(false);

  // Categories
  const [clothingCats,      setClothingCats]      = useState<BiCat[]>(DEFAULT_CLOTHING_CATS);
  const [shoeCats,          setShoeCats]          = useState<BiCat[]>(DEFAULT_SHOE_CATS);
  const [accessoryCats,     setAccessoryCats]     = useState<BiCat[]>(DEFAULT_ACCESSORY_CATS);
  const [newClothingAr,     setNewClothingAr]     = useState('');
  const [newClothingFr,     setNewClothingFr]     = useState('');
  const [newShoeAr,         setNewShoeAr]         = useState('');
  const [newShoeFr,         setNewShoeFr]         = useState('');
  const [newAccessoryAr,    setNewAccessoryAr]    = useState('');
  const [newAccessoryFr,    setNewAccessoryFr]    = useState('');
  const [catSaving,         setCatSaving]         = useState(false);

  // Social
  const [social,     setSocial]    = useState(DEFAULT_SOCIAL);
  const [socSaving,  setSocSaving] = useState(false);

  // Contact
  const [contact,    setContact]   = useState(DEFAULT_CONTACT);
  const [conSaving,  setConSaving] = useState(false);
  const [notifEmail, setNotifEmail] = useState('');
  const [notifSaving,setNotifSaving] = useState(false);

  // Language — read from localStorage synchronously to avoid flash
  const [activeLang, setActiveLang] = useState<'ar'|'fr'>(() =>
    typeof window !== 'undefined'
      ? (localStorage.getItem('ihsen_admin_lang') as 'ar'|'fr' | null) ?? 'ar'
      : 'ar'
  );
  const [defaultLang,  setDefaultLang]  = useState<'ar'|'fr'>(activeLang);
  const [langSaving,   setLangSaving]   = useState(false);

  const isAdminAr = activeLang === 'ar';
  const font = isAdminAr ? 'Cairo, sans-serif' : 'Inter, sans-serif';
  const C = {
    bg:'#EEF5F1', sidebar:'#1a3d2e', card:'#FFFFFF', card2:'#F3FAF6',
    border:'#D5E8DC', border2:'#B2CEBE', text:'#172B1E', muted:'#4E6D5C', sub:'#84A695',
    green:'#244D3B', greenL:'#2d5f49', gold:'#AF8E4A', goldL:'#c4a35a',
  };
  const isMobile  = windowW < 1024;
  const isDesktop = windowW >= 1024;

  const showToast = (msg: string, ok = true) => {
    const id = ++_tid;
    setToasts(t => [...t, { id, msg, ok }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  };

  useEffect(() => {
    if (!sessionStorage.getItem('ihsen_admin')) { router.replace('/admin'); return; }
    const upd = () => setW(window.innerWidth);
    upd(); window.addEventListener('resize', upd);
    if (window.innerWidth < 1024) setSideOpen(false);
    if (window.innerWidth < 1024) setSection('menu');

    // Load settings from Supabase
    Promise.all([
      loadSetting('clothing_categories'),
      loadSetting('shoe_categories'),
      loadSetting('accessory_categories'),
      loadSetting('social_links'),
      loadSetting('contact_info'),
      loadSetting('notification_email'),
      loadSetting('admin_lang'),
    ]).then(([cc, sc, ac, soc, con, notif, lang]) => {
      if (cc) try {
        const parsed = JSON.parse(cc);
        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
          setClothingCats(parsed.map((s: string) => ({ ar: s, fr: '' })));
        } else if (Array.isArray(parsed)) { setClothingCats(parsed); }
      } catch { /* keep default */ }
      if (sc) try {
        const parsed = JSON.parse(sc);
        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
          setShoeCats(parsed.map((s: string) => ({ ar: s, fr: '' })));
        } else if (Array.isArray(parsed)) { setShoeCats(parsed); }
      } catch { /* keep default */ }
      if (ac) try {
        const parsed = JSON.parse(ac);
        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
          setAccessoryCats(parsed.map((s: string) => ({ ar: s, fr: '' })));
        } else if (Array.isArray(parsed)) { setAccessoryCats(parsed); }
      } catch { /* keep default */ }
      if (soc)   try { setSocial({ ...DEFAULT_SOCIAL, ...JSON.parse(soc) }); } catch { /* keep default */ }
      if (con)   try { setContact({ ...DEFAULT_CONTACT, ...JSON.parse(con) }); } catch { /* keep default */ }
      if (notif) setNotifEmail(notif);
      // localStorage takes priority (instant), fallback to Supabase value
      const stored = localStorage.getItem('ihsen_admin_lang') as 'ar'|'fr'|null;
      const resolved = stored ?? (lang === 'ar' || lang === 'fr' ? lang as 'ar'|'fr' : null);
      if (resolved) setDefaultLang(resolved);
      setLoading(false);
    });

    return () => window.removeEventListener('resize', upd);
  }, [router]);

  // ── Password change ────────────────────────────────────────────────────────
  const handlePwChange = async () => {
    if (newPw.length < 6) { showToast(isAdminAr ? 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل' : 'Le mot de passe doit contenir au moins 6 caractères', false); return; }
    if (newPw !== confPw)  { showToast(isAdminAr ? 'كلمتا المرور غير متطابقتين' : 'Les mots de passe ne correspondent pas', false); return; }
    setPwSaving(true);
    
    const { error } = await supabase.auth.updateUser({ password: newPw });
    
    setPwSaving(false);
    
    if (error) {
      showToast(isAdminAr ? 'فشل تغيير كلمة المرور' : 'Échec de la modification du mot de passe', false);
    } else {
      localStorage.removeItem('ihsen_custom_pw'); // Clean up old system
      setNewPw(''); setConfPw('');
      showToast(isAdminAr ? 'تم تغيير كلمة المرور بنجاح' : 'Mot de passe modifié avec succès');
    }
  };

  // ── Categories ─────────────────────────────────────────────────────────────
  const allCats = [...clothingCats, ...shoeCats, ...accessoryCats];
  const addClothingCat = () => {
    const ar = newClothingAr.trim();
    if (!ar || allCats.some(c => c.ar === ar)) return;
    setClothingCats(prev => [...prev, { ar, fr: newClothingFr.trim() }]);
    setNewClothingAr(''); setNewClothingFr('');
  };
  const addShoeCat = () => {
    const ar = newShoeAr.trim();
    if (!ar || allCats.some(c => c.ar === ar)) return;
    setShoeCats(prev => [...prev, { ar, fr: newShoeFr.trim() }]);
    setNewShoeAr(''); setNewShoeFr('');
  };
  const addAccessoryCat = () => {
    const ar = newAccessoryAr.trim();
    if (!ar || allCats.some(c => c.ar === ar)) return;
    setAccessoryCats(prev => [...prev, { ar, fr: newAccessoryFr.trim() }]);
    setNewAccessoryAr(''); setNewAccessoryFr('');
  };
  const removeClothingCat  = (ar: string) => setClothingCats(prev => prev.filter(x => x.ar !== ar));
  const removeShoeCat      = (ar: string) => setShoeCats(prev => prev.filter(x => x.ar !== ar));
  const removeAccessoryCat = (ar: string) => setAccessoryCats(prev => prev.filter(x => x.ar !== ar));
  const saveCats = async () => {
    setCatSaving(true);
    const [ok1, ok2, ok3] = await Promise.all([
      saveSetting('clothing_categories',  JSON.stringify(clothingCats)),
      saveSetting('shoe_categories',      JSON.stringify(shoeCats)),
      saveSetting('accessory_categories', JSON.stringify(accessoryCats)),
    ]);
    setCatSaving(false);
    showToast(ok1 && ok2 && ok3 ? (isAdminAr ? 'تم حفظ الفئات' : 'Catégories enregistrées') : (isAdminAr ? 'تعذر الحفظ — تأكد من وجود جدول site_settings في Supabase' : 'Échec de l\'enregistrement'), ok1 && ok2 && ok3);
  };

  // ── Social ─────────────────────────────────────────────────────────────────
  const saveSocial = async () => {
    setSocSaving(true);
    const ok = await saveSetting('social_links', JSON.stringify(social));
    setSocSaving(false);
    showToast(ok ? (isAdminAr ? 'تم حفظ روابط التواصل' : 'Liens sociaux enregistrés') : (isAdminAr ? 'تعذر الحفظ — تأكد من وجود جدول site_settings في Supabase' : 'Échec de l\'enregistrement'), ok);
  };

  // ── Contact ────────────────────────────────────────────────────────────────
  const saveContact = async () => {
    setConSaving(true);
    const ok = await saveSetting('contact_info', JSON.stringify(contact));
    setConSaving(false);
    showToast(ok ? (isAdminAr ? 'تم حفظ معلومات التواصل' : 'Informations de contact enregistrées') : (isAdminAr ? 'تعذر الحفظ — تأكد من وجود جدول site_settings في Supabase' : 'Échec de l\'enregistrement'), ok);
  };

  const saveNotifEmail = async () => {
    setNotifSaving(true);
    const ok = await saveSetting('notification_email', notifEmail.trim());
    setNotifSaving(false);
    showToast(ok ? (isAdminAr ? 'تم حفظ إيميل الإشعارات' : 'Email de notifications enregistré') : (isAdminAr ? 'تعذر الحفظ' : 'Échec de l\'enregistrement'), ok);
  };

  // ── Language ───────────────────────────────────────────────────────────────
  const saveLang = async () => {
    setLangSaving(true);
    // Save to localStorage for instant effect across all admin pages
    localStorage.setItem('ihsen_admin_lang', defaultLang);
    window.dispatchEvent(new Event('ihsen_lang_changed')); // Notify layout to update

    // Also persist to Supabase so it survives clearing localStorage
    const ok = await saveSetting('admin_lang', defaultLang);
    if (ok) {
      setActiveLang(defaultLang);
    }
    setLangSaving(false);
    const newIsAr = defaultLang === 'ar';
    const langLabel = (defaultLang as string) === 'ar' ? 'العربية' : 'Français';
    showToast(ok ? (newIsAr ? `تم تعيين لغة لوحة التحكم: ${langLabel}` : `Langue définie : ${langLabel}`) : (newIsAr ? 'تعذر الحفظ' : 'Échec de l\'enregistrement'), ok);
  };

  // ── Sidebar ────────────────────────────────────────────────────────────────


  // ── Section tabs ───────────────────────────────────────────────────────────
  const TABS: { id: string; ar: string; fr: string; icon: string; href?: string }[] = [
    ...(!isDesktop ? [
      { id:'delivery',   ar:'شركات التوصيل', fr:'Livraison',      icon:'M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0', href: '/admin/delivery' },
      { id:'promos',     ar:'أكواد الخصم',   fr:'Codes Promo',    icon:'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z', href: '/admin/promos' },
    ] : []),
    { id:'password',   ar:'كلمة المرور',   fr:'Mot de passe',  icon:'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
    { id:'categories', ar:'فئات المنتجات', fr:'Catégories',     icon:'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
    { id:'social',     ar:'مواقع التواصل', fr:'Réseaux sociaux', icon:'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' },
    { id:'contact',    ar:'قسم التواصل',   fr:'Contact',        icon:'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { id:'language',   ar:'لغة الموقع',    fr:'Langue',         icon:'M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129' },
  ];

  // ── Helpers ────────────────────────────────────────────────────────────────
  const SL = (iconPath: string, label: string) => (
    <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:14 }}>
      <div style={{ width:3, height:16, borderRadius:2, background:C.gold, flexShrink:0 }} />
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={iconPath}/></svg>
      <span style={{ fontSize:9, fontWeight:800, color:C.sub, textTransform:'uppercase' as const, letterSpacing:1.5, fontFamily:'Inter, sans-serif' }}>{label}</span>
    </div>
  );

  const Inp = ({ label, value, onChange, type='text', dir, placeholder }: { label:string; value:string; onChange:(v:string)=>void; type?:string; dir?:string; placeholder?:string }) => (
    <div>
      <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:5, fontFamily:font }}>{label}</label>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} dir={dir}
        style={{ width:'100%', padding:'10px 13px', borderRadius:10, border:`1.5px solid ${C.border}`, background:'#FAFCFB', color:C.text, fontFamily:font, fontSize:13, boxSizing:'border-box' as const, outline:'none', textAlign: isAdminAr ? 'right' : 'left' }} />
    </div>
  );

  const SaveBtn = ({ onClick, saving, label: _label }: { onClick:()=>void; saving:boolean; label?:string }) => { const label = _label ?? (isAdminAr ? 'حفظ التغييرات' : 'Enregistrer'); return (
    <button onClick={onClick} disabled={saving}
      style={{ padding:'11px 22px', borderRadius:10, border:'none', background: saving ? C.muted : `linear-gradient(135deg, ${C.green}, #1D4939)`, color:'#fff', fontFamily:font, fontSize:13, fontWeight:800, cursor: saving ? 'not-allowed':'pointer', display:'flex', alignItems:'center', gap:7, boxShadow: saving ? 'none' : `0 4px 14px rgba(36,77,59,.3)`, transition:'all .2s' }}>
      {saving
        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation:'spin 1s linear infinite' }}><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
      }
      {saving ? (isAdminAr ? 'جاري الحفظ...' : 'Enregistrement...') : label}
    </button>
  ); };

  const secCard = { background:'#FAFCFB', border:`1px solid ${C.border}`, borderRadius:14, padding:'18px 16px', display:'flex', flexDirection:'column' as const, gap:14 };

  // ── Password show/hide btn ─────────────────────────────────────────────────
  const PwToggle = ({ show, onToggle }: { show:boolean; onToggle:()=>void }) => (
    <button type="button" onClick={onToggle}
      style={{ position:'absolute', top:'50%', transform:'translateY(-50%)', insetInlineEnd:12, background:'none', border:'none', cursor:'pointer', color:C.sub, display:'flex', alignItems:'center' }}>
      {show
        ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
        : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
      }
    </button>
  );

  return (
    <div style={{ display:'flex', height:'100%', minHeight:'100%', background:C.bg, fontFamily:font, direction:isAdminAr?'rtl':'ltr', overflow:'hidden' }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}} @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* Main content */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {/* Header */}
        <div style={{ padding:isMobile?'14px 12px':'18px 24px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:12, flexShrink:0, background:'#fff', boxShadow:'0 1px 0 rgba(36,77,59,.06)' }}>
          {isMobile && section !== 'menu' && (
            <button onClick={() => setSection('menu')} style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:8, padding:'5px 9px', cursor:'pointer', color:C.text, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform:isAdminAr?'scaleX(-1)':'none' }}><polyline points="15 18 9 12 15 6"/></svg>
            </button>
          )}
          <div style={{ width:36, height:36, borderRadius:10, background:`linear-gradient(135deg, ${C.green}, #1D4939)`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.85)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize:isMobile?15:18, fontWeight:800, color:C.text, margin:0 }}>
              {isMobile && section !== 'menu' 
                ? (isAdminAr ? TABS.find(t=>t.id===section)?.ar : TABS.find(t=>t.id===section)?.fr) 
                : (isAdminAr ? 'الإعدادات' : 'Paramètres')}
            </h1>
            <p style={{ fontSize:11, color:C.muted, margin:0 }}>
              {isMobile && section !== 'menu' 
                ? (isAdminAr ? 'إعدادات القسم' : 'Paramètres de section') 
                : (isAdminAr ? 'إدارة الموقع وإعداداته' : 'Gestion du site')}
            </p>
          </div>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding: isMobile?'14px 12px':'24px', display:'flex', flexDirection: isMobile?'column':'row', gap:20, alignItems: isMobile?'stretch':'flex-start' }}>

          {/* Left: section tabs */}
          {(!isMobile || section === 'menu') && (
            <div data-reveal data-reveal-dir="right" style={{ width: isMobile?'100%':220, flexShrink:0, display:'flex', flexDirection:'column', gap:6, paddingBottom: isMobile?8:0 }}>
              {TABS.map(tab => {
                const active = section === tab.id;
                return (
                  <button key={tab.id} onClick={()=>{ if(tab.href) router.push(tab.href); else setSection(tab.id as any); }}
                    style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', borderRadius:12, border:`1.5px solid ${active?C.gold+'60':C.border}`, background: active ? `${C.gold}12` : '#ffffff', color: active ? C.gold : C.text, fontFamily:font, fontSize:14, fontWeight: active ? 800 : 600, cursor:'pointer', transition:'all .18s', textAlign: isAdminAr ? 'right' : 'left', flexShrink: 0, justifyContent: 'flex-start', boxShadow:'0 1px 4px rgba(36,77,59,.03)' }}>
                    <span style={{ background: active ? `${C.gold}20` : C.card2, width:32, height:32, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', color: active ? C.gold : C.muted, flexShrink:0 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d={tab.icon}/>
                      </svg>
                    </span>
                    <span style={{ flex:1 }}>{isAdminAr ? tab.ar : tab.fr}</span>
                    {isMobile && (
                      <span style={{ color:C.muted }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform:isAdminAr?'rotate(180deg)':'none' }}><polyline points="9 18 15 12 9 6"/></svg>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Right: section content */}
          {(!isMobile || section !== 'menu') && (
            <div data-reveal data-reveal-delay="80" style={{ flex:1, minWidth:0, animation:'fadeUp .25s ease' }}>

            {/* ── PASSWORD ── */}
            {section === 'password' && (
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div style={{ background:`linear-gradient(135deg, ${C.green}, #1D4939)`, borderRadius:14, padding:'18px 18px 16px', position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', top:-20, left:-20, width:100, height:100, borderRadius:'50%', background:'rgba(175,142,74,0.12)' }} />
                  <div style={{ fontSize:11, fontWeight:800, color:'rgba(175,142,74,.7)', letterSpacing:'0.1em', textTransform:'uppercase', fontFamily:'Inter', marginBottom:4 }}>{isAdminAr ? 'تغيير كلمة المرور' : 'Changer le mot de passe'}</div>
                  <div style={{ fontSize:14, fontWeight:800, color:'#fff', position:'relative' }}>{isAdminAr ? 'أمان لوحة التحكم' : 'Sécurité du panneau'}</div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,.45)', marginTop:4, position:'relative' }}>{isAdminAr ? 'كلمة المرور مخزنة محلياً على هذا الجهاز' : 'Mot de passe stocké localement sur cet appareil'}</div>
                </div>

                <div style={secCard}>
                  {SL('M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', isAdminAr ? 'تغيير الرقم السري' : 'Changer le mot de passe')}
                  <div style={{ position:'relative' }}>
                    <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:5, fontFamily:font }}>{isAdminAr ? 'كلمة المرور الجديدة' : 'Nouveau mot de passe'}</label>
                    <input type={showNew?'text':'password'} value={newPw} onChange={e=>setNewPw(e.target.value)}
                      style={{ width:'100%', padding:'10px 13px', paddingInlineEnd:38, borderRadius:10, border:`1.5px solid ${C.border}`, background:'#FAFCFB', color:C.text, fontFamily:font, fontSize:13, boxSizing:'border-box' as const, outline:'none', textAlign: isAdminAr ? 'right' : 'left' }} />
                    <PwToggle show={showNew} onToggle={()=>setShowNew(v=>!v)} />
                  </div>
<Inp label={isAdminAr ? "تأكيد كلمة المرور الجديدة" : "Confirmer le mot de passe"} value={confPw} onChange={setConfPw} type="password" />
                  <div style={{ display:'flex', justifyContent:'flex-end' }}>
<SaveBtn onClick={handlePwChange} saving={pwSaving} label={isAdminAr ? "تحديث كلمة المرور" : "Mettre à jour"} />
                  </div>
                </div>
              </div>
            )}

            {/* ── CATEGORIES ── */}
            {section === 'categories' && (
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div style={{ background:`linear-gradient(135deg, #3B82F6, #1D4D9C)`, borderRadius:14, padding:'18px 18px 16px', position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', top:-20, left:-20, width:100, height:100, borderRadius:'50%', background:'rgba(255,255,255,0.08)' }} />
                  <div style={{ fontSize:11, fontWeight:800, color:'rgba(147,197,253,.8)', letterSpacing:'0.1em', textTransform:'uppercase', fontFamily:'Inter', marginBottom:4 }}>{isAdminAr ? 'فئات المنتجات' : 'Catégories de produits'}</div>
                  <div style={{ fontSize:14, fontWeight:800, color:'#fff', position:'relative' }}>{isAdminAr ? 'تنظيم الكتالوج' : 'Organisation du catalogue'}</div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,.45)', marginTop:4, position:'relative' }}>{clothingCats.length + shoeCats.length + accessoryCats.length} {isAdminAr ? 'فئة مضافة حالياً' : 'catégorie(s) ajoutée(s)'}</div>
                </div>

                {/* ── ملابس ── */}
                <div style={secCard}>
                  {SL('M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', isAdminAr ? '👗 فئات الملابس' : '👗 Vêtements')}
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                    {clothingCats.map(cat => (
                      <div key={cat.ar} style={{ display:'flex', alignItems:'center', gap:6, background:`${C.green}12`, border:`1.5px solid ${C.green}40`, borderRadius:100, padding:'5px 12px' }}>
                        <span style={{ fontSize:12, fontWeight:700, color:C.green, fontFamily:'Cairo,sans-serif' }}>{cat.ar}</span>
                        {cat.fr && <><span style={{ fontSize:10, color:`${C.green}80`, fontFamily:'Inter,sans-serif' }}>│</span><span style={{ fontSize:11, color:`${C.green}BB`, fontFamily:'Inter,sans-serif' }}>{cat.fr}</span></>}
                        <button onClick={()=>removeClothingCat(cat.ar)} style={{ background:'none', border:'none', cursor:'pointer', color:'#EF4444', fontSize:14, lineHeight:1, padding:0, display:'flex', alignItems:'center' }}>×</button>
                      </div>
                    ))}
                    {clothingCats.length === 0 && <span style={{ fontSize:12, color:C.sub, fontFamily:font }}>{isAdminAr ? 'لا توجد فئات ملابس' : 'Aucune catégorie vêtements'}</span>}
                  </div>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    <input value={newClothingAr} onChange={e=>setNewClothingAr(e.target.value)}
                      onKeyDown={e=>{ if(e.key==='Enter') addClothingCat(); }}
                      placeholder={isAdminAr ? 'الاسم بالعربية *' : 'Nom en arabe *'}
                      style={{ flex:'1 1 120px', padding:'9px 13px', borderRadius:10, border:`1.5px solid ${C.border}`, background:'#FAFCFB', color:C.text, fontFamily:'Cairo,sans-serif', fontSize:13, outline:'none', direction:'rtl' }} />
                    <input value={newClothingFr} onChange={e=>setNewClothingFr(e.target.value)}
                      onKeyDown={e=>{ if(e.key==='Enter') addClothingCat(); }}
                      placeholder="Nom en français"
                      style={{ flex:'1 1 120px', padding:'9px 13px', borderRadius:10, border:`1.5px solid ${C.border}`, background:'#FAFCFB', color:C.text, fontFamily:'Inter,sans-serif', fontSize:13, outline:'none', direction:'ltr' }} />
                    <button onClick={addClothingCat} style={{ padding:'9px 16px', borderRadius:10, border:`1.5px solid ${C.green}50`, background:`${C.green}10`, color:C.green, fontFamily:font, fontSize:12, fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', gap:5, whiteSpace:'nowrap' as const }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      {isAdminAr ? 'إضافة' : 'Ajouter'}
                    </button>
                  </div>
                </div>

                {/* ── أحذية ── */}
                <div style={secCard}>
                  {SL('M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', isAdminAr ? '👟 فئات الأحذية' : '👟 Chaussures')}
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                    {shoeCats.map(cat => (
                      <div key={cat.ar} style={{ display:'flex', alignItems:'center', gap:6, background:'#78350F12', border:'1.5px solid #78350F40', borderRadius:100, padding:'5px 12px' }}>
                        <span style={{ fontSize:12, fontWeight:700, color:'#78350F', fontFamily:'Cairo,sans-serif' }}>{cat.ar}</span>
                        {cat.fr && <><span style={{ fontSize:10, color:'#78350F80', fontFamily:'Inter,sans-serif' }}>│</span><span style={{ fontSize:11, color:'#78350FBB', fontFamily:'Inter,sans-serif' }}>{cat.fr}</span></>}
                        <button onClick={()=>removeShoeCat(cat.ar)} style={{ background:'none', border:'none', cursor:'pointer', color:'#EF4444', fontSize:14, lineHeight:1, padding:0, display:'flex', alignItems:'center' }}>×</button>
                      </div>
                    ))}
                    {shoeCats.length === 0 && <span style={{ fontSize:12, color:C.sub, fontFamily:font }}>{isAdminAr ? 'لا توجد فئات أحذية' : 'Aucune catégorie chaussures'}</span>}
                  </div>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    <input value={newShoeAr} onChange={e=>setNewShoeAr(e.target.value)}
                      onKeyDown={e=>{ if(e.key==='Enter') addShoeCat(); }}
                      placeholder={isAdminAr ? 'الاسم بالعربية *' : 'Nom en arabe *'}
                      style={{ flex:'1 1 120px', padding:'9px 13px', borderRadius:10, border:`1.5px solid ${C.border}`, background:'#FAFCFB', color:C.text, fontFamily:'Cairo,sans-serif', fontSize:13, outline:'none', direction:'rtl' }} />
                    <input value={newShoeFr} onChange={e=>setNewShoeFr(e.target.value)}
                      onKeyDown={e=>{ if(e.key==='Enter') addShoeCat(); }}
                      placeholder="Nom en français"
                      style={{ flex:'1 1 120px', padding:'9px 13px', borderRadius:10, border:`1.5px solid ${C.border}`, background:'#FAFCFB', color:C.text, fontFamily:'Inter,sans-serif', fontSize:13, outline:'none', direction:'ltr' }} />
                    <button onClick={addShoeCat} style={{ padding:'9px 16px', borderRadius:10, border:'1.5px solid #78350F50', background:'#78350F10', color:'#78350F', fontFamily:font, fontSize:12, fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', gap:5, whiteSpace:'nowrap' as const }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      {isAdminAr ? 'إضافة' : 'Ajouter'}
                    </button>
                  </div>
                </div>

                {/* ── اكسسوارات ── */}
                <div style={secCard}>
                  {SL('M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', isAdminAr ? '👜 فئات الاكسسوارات' : '👜 Accessoires')}
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                    {accessoryCats.map(cat => (
                      <div key={cat.ar} style={{ display:'flex', alignItems:'center', gap:6, background:'#7C3AED12', border:'1.5px solid #7C3AED40', borderRadius:100, padding:'5px 12px' }}>
                        <span style={{ fontSize:12, fontWeight:700, color:'#7C3AED', fontFamily:'Cairo,sans-serif' }}>{cat.ar}</span>
                        {cat.fr && <><span style={{ fontSize:10, color:'#7C3AED80', fontFamily:'Inter,sans-serif' }}>│</span><span style={{ fontSize:11, color:'#7C3AEDBB', fontFamily:'Inter,sans-serif' }}>{cat.fr}</span></>}
                        <button onClick={()=>removeAccessoryCat(cat.ar)} style={{ background:'none', border:'none', cursor:'pointer', color:'#EF4444', fontSize:14, lineHeight:1, padding:0, display:'flex', alignItems:'center' }}>×</button>
                      </div>
                    ))}
                    {accessoryCats.length === 0 && <span style={{ fontSize:12, color:C.sub, fontFamily:font }}>{isAdminAr ? 'لا توجد فئات اكسسوارات' : 'Aucune catégorie accessoires'}</span>}
                  </div>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    <input value={newAccessoryAr} onChange={e=>setNewAccessoryAr(e.target.value)}
                      onKeyDown={e=>{ if(e.key==='Enter') addAccessoryCat(); }}
                      placeholder={isAdminAr ? 'الاسم بالعربية *' : 'Nom en arabe *'}
                      style={{ flex:'1 1 120px', padding:'9px 13px', borderRadius:10, border:`1.5px solid ${C.border}`, background:'#FAFCFB', color:C.text, fontFamily:'Cairo,sans-serif', fontSize:13, outline:'none', direction:'rtl' }} />
                    <input value={newAccessoryFr} onChange={e=>setNewAccessoryFr(e.target.value)}
                      onKeyDown={e=>{ if(e.key==='Enter') addAccessoryCat(); }}
                      placeholder="Nom en français"
                      style={{ flex:'1 1 120px', padding:'9px 13px', borderRadius:10, border:`1.5px solid ${C.border}`, background:'#FAFCFB', color:C.text, fontFamily:'Inter,sans-serif', fontSize:13, outline:'none', direction:'ltr' }} />
                    <button onClick={addAccessoryCat} style={{ padding:'9px 16px', borderRadius:10, border:'1.5px solid #7C3AED50', background:'#7C3AED10', color:'#7C3AED', fontFamily:font, fontSize:12, fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', gap:5, whiteSpace:'nowrap' as const }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      {isAdminAr ? 'إضافة' : 'Ajouter'}
                    </button>
                  </div>
                </div>

                <div style={{ display:'flex', justifyContent:'flex-end' }}>
                  <SaveBtn onClick={saveCats} saving={catSaving} />
                </div>
              </div>
            )}

            {/* ── SOCIAL MEDIA ── */}
            {section === 'social' && (
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div style={{ background:'linear-gradient(135deg, #8B5CF6, #6D28D9)', borderRadius:14, padding:'18px 18px 16px', position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', top:-20, left:-20, width:100, height:100, borderRadius:'50%', background:'rgba(255,255,255,0.08)' }} />
                  <div style={{ fontSize:11, fontWeight:800, color:'rgba(196,181,253,.8)', letterSpacing:'0.1em', textTransform:'uppercase', fontFamily:'Inter', marginBottom:4 }}>{isAdminAr ? 'مواقع التواصل الاجتماعي' : 'Réseaux sociaux'}</div>
                  <div style={{ fontSize:14, fontWeight:800, color:'#fff', position:'relative' }}>{isAdminAr ? 'روابط حضورك الرقمي' : 'Liens de votre présence numérique'}</div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,.45)', marginTop:4, position:'relative' }}>{isAdminAr ? 'تظهر في تذييل الموقع وقسم التواصل' : 'Apparaissent dans le pied de page et la section contact'}</div>
                </div>

                <div style={secCard}>
                  {SL('M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1', isAdminAr ? 'الروابط' : 'Liens')}
                  {([
                    { key:'instagram', label:'Instagram', placeholder:'https://instagram.com/ihsen...' },
                    { key:'facebook',  label:'Facebook',  placeholder:'https://facebook.com/ihsen...' },
                    { key:'tiktok',    label:'TikTok',    placeholder:'https://tiktok.com/@ihsen...' },
                    { key:'whatsapp',  label:'WhatsApp',  placeholder:'https://wa.me/213...' },
                    { key:'youtube',   label:'YouTube',   placeholder:'https://youtube.com/@ihsen...' },
                  ] as const).map(f => (
                    <div key={f.key}>
                      <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:5, fontFamily:'Inter, sans-serif', fontWeight:600 }}>{f.label}</label>
                      <input value={social[f.key]} onChange={e=>setSocial(s=>({...s,[f.key]:e.target.value}))} placeholder={f.placeholder} dir="ltr"
                        style={{ width:'100%', padding:'10px 13px', borderRadius:10, border:`1.5px solid ${C.border}`, background:'#FAFCFB', color:C.text, fontFamily:'Inter, sans-serif', fontSize:12, boxSizing:'border-box' as const, outline:'none' }} />
                    </div>
                  ))}
                  <div style={{ display:'flex', justifyContent:'flex-end' }}>
                    <SaveBtn onClick={saveSocial} saving={socSaving} />
                  </div>
                </div>
              </div>
            )}

            {/* ── CONTACT ── */}
            {section === 'contact' && (
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div style={{ background:'linear-gradient(135deg, #EF4444, #B91C1C)', borderRadius:14, padding:'18px 18px 16px', position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', top:-20, left:-20, width:100, height:100, borderRadius:'50%', background:'rgba(255,255,255,0.08)' }} />
                  <div style={{ fontSize:11, fontWeight:800, color:'rgba(252,165,165,.8)', letterSpacing:'0.1em', textTransform:'uppercase', fontFamily:'Inter', marginBottom:4 }}>{isAdminAr ? 'قسم التواصل' : 'Contact'}</div>
                  <div style={{ fontSize:14, fontWeight:800, color:'#fff', position:'relative' }}>{isAdminAr ? 'معلومات الاتصال بالمتجر' : 'Informations de contact du magasin'}</div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,.45)', marginTop:4, position:'relative' }}>{isAdminAr ? 'تظهر في صفحة التواصل وتذييل الموقع' : 'Apparaissent sur la page contact et dans le pied de page'}</div>
                </div>

                <div style={secCard}>
                  {SL('M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', isAdminAr ? 'بيانات التواصل' : 'Coordonnées')}
                  <div style={{ display:'grid', gridTemplateColumns: isMobile?'1fr':'1fr 1fr', gap:12 }}>
                    <div>
                      <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:5, fontFamily:font }}>{isAdminAr ? 'رقم الهاتف' : 'Téléphone'}</label>
                      <input type="tel" value={contact.phone} onChange={e=>setContact(c=>({...c,phone:e.target.value}))} placeholder="+213 xxx xxx xxx" dir="ltr"
                        style={{ width:'100%', padding:'10px 13px', borderRadius:10, border:`1.5px solid ${C.border}`, background:'#FAFCFB', color:C.text, fontFamily:'Inter, sans-serif', fontSize:13, boxSizing:'border-box' as const, outline:'none' }} />
                    </div>
                    <div>
                      <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:5, fontFamily:'Inter, sans-serif' }}>WhatsApp</label>
                      <input type="tel" value={contact.whatsapp} onChange={e=>setContact(c=>({...c,whatsapp:e.target.value}))} placeholder="+213 xxx xxx xxx" dir="ltr"
                        style={{ width:'100%', padding:'10px 13px', borderRadius:10, border:`1.5px solid ${C.border}`, background:'#FAFCFB', color:C.text, fontFamily:'Inter, sans-serif', fontSize:13, boxSizing:'border-box' as const, outline:'none' }} />
                    </div>
                    <div>
                      <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:5, fontFamily:'Inter, sans-serif' }}>{isAdminAr ? 'البريد الإلكتروني' : 'E-mail'}</label>
                      <input type="email" value={contact.email} onChange={e=>setContact(c=>({...c,email:e.target.value}))} placeholder="contact@ihsen.dz" dir="ltr"
                        style={{ width:'100%', padding:'10px 13px', borderRadius:10, border:`1.5px solid ${C.border}`, background:'#FAFCFB', color:C.text, fontFamily:'Inter, sans-serif', fontSize:13, boxSizing:'border-box' as const, outline:'none' }} />
                    </div>
                    <div>
                      <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:5, fontFamily:font }}>{isAdminAr ? 'العنوان' : 'Adresse'}</label>
                      <input value={contact.address} onChange={e=>setContact(c=>({...c,address:e.target.value}))} placeholder="الجزائر العاصمة..."
                        style={{ width:'100%', padding:'10px 13px', borderRadius:10, border:`1.5px solid ${C.border}`, background:'#FAFCFB', color:C.text, fontFamily:font, fontSize:13, boxSizing:'border-box' as const, outline:'none' }} />
                    </div>
                  </div>
                </div>

                <div style={secCard}>
                  {SL('M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', isAdminAr ? 'ساعات العمل' : 'Heures d\'ouverture')}
                  <div>
                    <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:5, fontFamily:font }}>{isAdminAr ? 'ساعات العمل (عربي)' : 'Heures d\'ouverture (AR)'}</label>
                    <input value={contact.hours_ar} onChange={e=>setContact(c=>({...c,hours_ar:e.target.value}))} placeholder="السبت — الخميس: 9ص — 8م"
                      style={{ width:'100%', padding:'10px 13px', borderRadius:10, border:`1.5px solid ${C.border}`, background:'#FAFCFB', color:C.text, fontFamily:font, fontSize:13, boxSizing:'border-box' as const, outline:'none' }} />
                  </div>
                  <div>
                    <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:5, fontFamily:'Inter, sans-serif' }}>Heures d&apos;ouverture (fr)</label>
                    <input value={contact.hours_fr} onChange={e=>setContact(c=>({...c,hours_fr:e.target.value}))} placeholder="Sam — Jeu : 9h — 20h" dir="ltr"
                      style={{ width:'100%', padding:'10px 13px', borderRadius:10, border:`1.5px solid ${C.border}`, background:'#FAFCFB', color:C.text, fontFamily:'Inter, sans-serif', fontSize:13, boxSizing:'border-box' as const, outline:'none' }} />
                  </div>
                  <div style={{ display:'flex', justifyContent:'flex-end' }}>
                    <SaveBtn onClick={saveContact} saving={conSaving} />
                  </div>
                </div>

                {/* Notification email */}
                <div style={secCard}>
                  {SL('M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', isAdminAr ? 'إيميل إشعارات الرسائل' : 'Email de notifications')}
                  <div style={{ display:'flex', gap:8 }}>
                    <input type="email" value={notifEmail} onChange={e=>setNotifEmail(e.target.value)} dir="ltr"
                      placeholder="your@email.com"
                      style={{ flex:1, padding:'10px 13px', borderRadius:10, border:`1.5px solid ${C.border}`, background:'#FAFCFB', color:C.text, fontFamily:'Inter, sans-serif', fontSize:13, outline:'none' }} />
<SaveBtn onClick={saveNotifEmail} saving={notifSaving} label={isAdminAr ? "حفظ" : "Enregistrer"} />
                  </div>
                </div>

                {/* Preview card */}
                <div style={secCard}>
                  {SL('M15 12a3 3 0 11-6 0 3 3 0 016 0z', isAdminAr ? 'معاينة بطاقة التواصل' : 'Aperçu de la carte contact')}
                  <div style={{ background:`linear-gradient(135deg, ${C.green}08, ${C.green}14)`, border:`1px solid ${C.border}`, borderRadius:12, padding:'16px', display:'flex', flexDirection:'column', gap:10 }}>
                    {contact.phone && (
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:30, height:30, borderRadius:8, background:`${C.green}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                        </div>
                        <span style={{ fontSize:13, color:C.text, fontFamily:'Inter' }}>{contact.phone}</span>
                      </div>
                    )}
                    {contact.email && (
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:30, height:30, borderRadius:8, background:`${C.green}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                        </div>
                        <span style={{ fontSize:13, color:C.text, fontFamily:'Inter' }}>{contact.email}</span>
                      </div>
                    )}
                    {contact.address && (
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:30, height:30, borderRadius:8, background:`${C.green}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><circle cx="12" cy="11" r="3"/></svg>
                        </div>
                        <span style={{ fontSize:13, color:C.text, fontFamily:font }}>{contact.address}</span>
                      </div>
                    )}
                    {contact.hours_ar && (
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:30, height:30, borderRadius:8, background:`${C.green}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        </div>
                        <span style={{ fontSize:13, color:C.text, fontFamily:font }}>{contact.hours_ar}</span>
                      </div>
                    )}
                    {!contact.phone && !contact.email && !contact.address && !contact.hours_ar && (
                      <div style={{ textAlign:'center', color:C.sub, fontSize:12, padding:'8px 0' }}>{isAdminAr ? 'أدخلي البيانات أعلاه لمعاينتها' : 'Entrez les données ci-dessus pour les prévisualiser'}</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── LANGUAGE ── */}
            {section === 'language' && (
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div style={{ background:'linear-gradient(135deg, #0F766E, #0D5048)', borderRadius:14, padding:'18px 18px 16px', position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', top:-20, left:-20, width:100, height:100, borderRadius:'50%', background:'rgba(255,255,255,0.08)' }} />
                  <div style={{ fontSize:11, fontWeight:800, color:'rgba(153,246,228,.8)', letterSpacing:'0.1em', textTransform:'uppercase', fontFamily:'Inter', marginBottom:4 }}>Langue / لغة لوحة التحكم</div>
                  <div style={{ fontSize:14, fontWeight:800, color:'#fff', position:'relative' }}>Interface d&apos;administration / واجهة الإدارة</div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,.45)', marginTop:4, position:'relative' }}>لا تؤثر على موقع المتجر — Ce réglage n&apos;affecte pas le site public</div>
                </div>

                <div style={secCard}>
                  {SL('M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129', 'LANGUE / لغة')}

                  {/* Toggle buttons */}
                  <div style={{ display:'flex', gap:12 }}>
                    {/* Arabic */}
                    <button
                      onClick={() => setDefaultLang('ar')}
                      style={{
                        flex:1, padding:'20px 12px', borderRadius:14,
                        border: defaultLang === 'ar' ? `2px solid ${C.green}` : `1.5px solid ${C.border}`,
                        background: defaultLang === 'ar' ? `${C.green}0F` : '#FAFCFB',
                        cursor:'pointer', transition:'all .18s',
                        display:'flex', flexDirection:'column', alignItems:'center', gap:8,
                      }}>
                      <div style={{ fontSize:30 }}>ع</div>
                      <div style={{ fontFamily:'Cairo, sans-serif', fontSize:15, fontWeight:800, color: defaultLang==='ar' ? C.green : C.text }}>العربية</div>
                      {defaultLang === 'ar' && (
                        <div style={{ width:20, height:20, borderRadius:'50%', background:C.green, display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                      )}
                    </button>

                    {/* French */}
                    <button
                      onClick={() => setDefaultLang('fr')}
                      style={{
                        flex:1, padding:'20px 12px', borderRadius:14,
                        border: defaultLang === 'fr' ? `2px solid #1D4ED8` : `1.5px solid ${C.border}`,
                        background: defaultLang === 'fr' ? '#1D4ED808' : '#FAFCFB',
                        cursor:'pointer', transition:'all .18s',
                        display:'flex', flexDirection:'column', alignItems:'center', gap:8,
                      }}>
                      <div style={{ fontSize:30, fontFamily:'Inter' }}>Fr</div>
                      <div style={{ fontFamily:'Inter, sans-serif', fontSize:15, fontWeight:800, color: defaultLang==='fr' ? '#1D4ED8' : C.text }}>Français</div>
                      {defaultLang === 'fr' && (
                        <div style={{ width:20, height:20, borderRadius:'50%', background:'#1D4ED8', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                      )}
                    </button>
                  </div>

                  <div style={{ display:'flex', justifyContent:'flex-end' }}>
                    <SaveBtn onClick={saveLang} saving={langSaving} label={defaultLang === 'ar' ? 'حفظ اللغة' : 'Enregistrer la langue'} />
                  </div>
                </div>
              </div>
            )}
          </div>
          )}
        </div>
      </div>

      {/* Toasts */}
      <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', zIndex:600, display:'flex', flexDirection:'column', gap:8, alignItems:'center' }}>
        {toasts.map(t => (
          <div key={t.id} style={{ background: t.ok ? '#F0FDF4' : '#FEF2F2', border:`1.5px solid ${t.ok?'#86EFAC':'#FECACA'}`, borderRadius:12, padding:'10px 18px', boxShadow:'0 6px 24px rgba(0,0,0,.12)', fontFamily:font, fontSize:13, color: t.ok ? '#15803D' : '#DC2626', whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:8, direction:'rtl', animation:'fadeUp .2s ease' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={t.ok ? 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' : 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z'}/></svg>
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
