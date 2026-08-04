'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { WILAYAS_2026 } from '@/lib/communes';

/* ── Types ────────────────────────────────────────────────────────────────── */
interface WilayaPrice { home: number; office: number; }
interface DeliveryCompany {
  id:        string;
  name:      string;
  phone:     string;
  active:    boolean;
  isDefault: boolean;
  prices:    Record<string, WilayaPrice>;
}

const DEFAULT_PRICE: WilayaPrice = { home: 600, office: 400 };
const newCompany = (): DeliveryCompany => ({
  id: `dc_${Date.now()}`,
  name: '', phone: '', active: true, isDefault: false,
  prices: Object.fromEntries(WILAYAS_2026.map(w => [w, { ...DEFAULT_PRICE }])),
});

/* ── Nav ──────────────────────────────────────────────────────────────────── */
const NAV = [
  { id:'dashboard', ar:'الرئيسية',     fr:'Accueil',     href:'/admin/dashboard',   iconPath:'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id:'orders',    ar:'الطلبات',      fr:'Commandes',   href:'/admin/orders',       iconPath:'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { id:'products',  ar:'المنتجات',     fr:'Produits',    href:'/admin/products',     iconPath:'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { id:'delivery',  ar:'التوصيل',      fr:'Livraison',   href:'/admin/delivery',     iconPath:'M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0' },
  { id:'promos',    ar:'أكواد الخصم', fr:'Codes promo', href:'/admin/promos',        iconPath:'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z' },
  { id:'messages',  ar:'الرسائل',      fr:'Messages',    href:'/admin/messages',     iconPath:'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { id:'settings',  ar:'الإعدادات',   fr:'Paramètres',  href:'/admin/settings',     iconPath:'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z' },
];

type Toast = { id: number; msg: string; ok: boolean };
let _tid = 0;

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function DeliveryPage() {
  const router = useRouter();
  const [windowW,   setW]         = useState(1200);
  const [sideOpen,  setSideOpen]  = useState(true);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [toasts,    setToasts]    = useState<Toast[]>([]);
  const [companies, setCompanies] = useState<DeliveryCompany[]>([]);
  const [adminLang, setAdminLang] = useState<'ar'|'fr'>('ar');
  const [editComp,  setEditComp]  = useState<DeliveryCompany | null>(null);
  const [search,    setSearch]    = useState('');
  const [bulkHome,  setBulkHome]  = useState('');
  const [bulkOff,   setBulkOff]   = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const C = {
    bg:'#EEF5F1', sidebar:'#1a3d2e', card:'#FFFFFF', card2:'#F3FAF6',
    border:'#D5E8DC', text:'#172B1E', muted:'#4E6D5C', sub:'#84A695',
    green:'#244D3B', gold:'#AF8E4A',
  };
  const isMobile  = windowW < 640;
  const isDesktop = windowW >= 1024;
  const isAdminAr = adminLang === 'ar';
  const font = isAdminAr ? 'Cairo, sans-serif' : 'Inter, sans-serif';
  const dir  = isAdminAr ? 'rtl' : 'ltr';

  const toast = (msg: string, ok = true) => {
    const id = ++_tid;
    setToasts(t => [...t, { id, msg, ok }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  };

  /* ── Load ──────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!sessionStorage.getItem('ihsen_admin')) { router.replace('/admin'); return; }
    setAdminLang((localStorage.getItem('ihsen_admin_lang') as 'ar'|'fr') ?? 'ar');
    const upd = () => setW(window.innerWidth);
    upd(); window.addEventListener('resize', upd);
    if (window.innerWidth < 1024) setSideOpen(false);

    supabase.from('site_settings').select('value').eq('key','delivery_companies').maybeSingle()
      .then(({ data }) => {
        if (data) try { setCompanies(JSON.parse((data as {value:string}).value)); } catch { /* keep empty */ }
        setLoading(false);
      });
    return () => window.removeEventListener('resize', upd);
  }, [router]);

  /* ── Save ──────────────────────────────────────────────────────────────── */
  const saveAll = async (list: DeliveryCompany[]) => {
    setSaving(true);
    const { error } = await supabase.from('site_settings')
      .upsert({ key:'delivery_companies', value: JSON.stringify(list) }, { onConflict:'key' });
    setSaving(false);
    if (!error) { setCompanies(list); toast(isAdminAr ? 'تم الحفظ بنجاح' : 'Enregistré avec succès'); }
    else toast(isAdminAr ? 'تعذر الحفظ' : 'Échec de l\'enregistrement', false);
  };

  /* ── Excel export template (styled) ───────────────────────────────────── */
  const exportTemplate = async (comp: DeliveryCompany) => {
    const XLSX = await import('xlsx-js-style');

    const HDR_BG   = '244D3B';
    const GOLD     = 'AF8E4A';
    const ROW_ALT  = 'EEF5F1';
    const BORDER_C = 'C5DDD1';

    const border = () => ({
      top:    { style: 'thin', color: { rgb: BORDER_C } },
      bottom: { style: 'thin', color: { rgb: BORDER_C } },
      left:   { style: 'thin', color: { rgb: BORDER_C } },
      right:  { style: 'thin', color: { rgb: BORDER_C } },
    });

    const hdrStyle = (bg = HDR_BG) => ({
      font:      { bold: true, color: { rgb: 'FFFFFF' }, sz: 11, name: 'Arial' },
      fill:      { patternType: 'solid', fgColor: { rgb: bg } },
      alignment: { horizontal: 'center', vertical: 'center', readingOrder: 2 },
      border:    border(),
    });

    const cellStyle = (bg: string, align = 'right') => ({
      font:      { sz: 10, name: 'Arial', color: { rgb: '172B1E' } },
      fill:      { patternType: 'solid', fgColor: { rgb: bg } },
      alignment: { horizontal: align, vertical: 'center', readingOrder: 2 },
      border:    border(),
    });

    const numStyle = (bg: string, bold = false) => ({
      font:      { sz: 11, name: 'Arial', bold, color: { rgb: '172B1E' } },
      fill:      { patternType: 'solid', fgColor: { rgb: bg } },
      alignment: { horizontal: 'center', vertical: 'center', readingOrder: 2 },
      border:    border(),
      numFmt:    '#,##0',
    });

    // AOA: row0 = title (merged), row1 = sub-header, row2 = col headers, row3+ = data
    const exportDate = new Date().toLocaleDateString('ar-DZ', { year:'numeric', month:'long', day:'numeric' });
    const aoa: unknown[][] = [
      [`إحسان — أسعار التوصيل : ${comp.name || 'شركة'}`, '', ''],
      [`تاريخ التصدير: ${exportDate}   |   ${WILAYAS_2026.length} ولاية`, '', ''],
      ['الولاية', 'المنزل (دج)', 'المكتب (دج)'],
      ...WILAYAS_2026.map(w => [
        w,
        comp.prices[w]?.home   ?? DEFAULT_PRICE.home,
        comp.prices[w]?.office ?? DEFAULT_PRICE.office,
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!views']  = [{ rightToLeft: true }];
    ws['!cols']   = [{ wch: 26 }, { wch: 18 }, { wch: 18 }];
    ws['!rows']   = [
      { hpx: 38 },
      { hpx: 22 },
      { hpx: 26 },
      ...WILAYAS_2026.map(() => ({ hpx: 20 })),
    ];
    ws['!merges'] = [
      { s: { r:0, c:0 }, e: { r:0, c:2 } },
      { s: { r:1, c:0 }, e: { r:1, c:2 } },
    ];

    const s = (r: number, c: number, style: Record<string,unknown>) => {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (!ws[ref]) ws[ref] = { v:'', t:'s' };
      (ws[ref] as Record<string,unknown>).s = style;
    };

    // Title row
    s(0, 0, { font:{ bold:true, sz:16, color:{ rgb:'FFFFFF' }, name:'Arial' }, fill:{ patternType:'solid', fgColor:{ rgb:HDR_BG } }, alignment:{ horizontal:'center', vertical:'center', readingOrder:2 } });
    [1, 2].forEach(c => s(0, c, { fill:{ patternType:'solid', fgColor:{ rgb:HDR_BG } } }));

    // Sub-header (date/meta)
    s(1, 0, { font:{ sz:10, italic:true, color:{ rgb:'4E6D5C' }, name:'Arial' }, fill:{ patternType:'solid', fgColor:{ rgb:'EEF5F1' } }, alignment:{ horizontal:'center', vertical:'center', readingOrder:2 } });
    [1, 2].forEach(c => s(1, c, { fill:{ patternType:'solid', fgColor:{ rgb:'EEF5F1' } } }));

    // Column headers row
    s(2, 0, hdrStyle());
    s(2, 1, hdrStyle(GOLD));
    s(2, 2, hdrStyle(GOLD));

    // Data rows
    WILAYAS_2026.forEach((_, ri) => {
      const bg = ri % 2 === 0 ? 'FFFFFF' : ROW_ALT;
      const r  = ri + 3;
      s(r, 0, cellStyle(bg));
      s(r, 1, numStyle(bg));
      s(r, 2, numStyle(bg));
    });

    // Summary / total row
    const totalRow = WILAYAS_2026.length + 3;
    const avgHome   = Math.round(WILAYAS_2026.reduce((sum, w) => sum + (comp.prices[w]?.home   ?? DEFAULT_PRICE.home),   0) / WILAYAS_2026.length);
    const avgOffice = Math.round(WILAYAS_2026.reduce((sum, w) => sum + (comp.prices[w]?.office ?? DEFAULT_PRICE.office), 0) / WILAYAS_2026.length);
    const totals: unknown[] = ['المتوسط', avgHome, avgOffice];
    totals.forEach((v, ci) => {
      const ref = XLSX.utils.encode_cell({ r: totalRow, c: ci });
      ws[ref] = {
        v, t: typeof v === 'number' ? 'n' : 's',
        s: {
          font:      { bold:true, sz:11, color:{ rgb:'FFFFFF' }, name:'Arial' },
          fill:      { patternType:'solid', fgColor:{ rgb:HDR_BG } },
          alignment: { horizontal: ci === 0 ? 'right' : 'center', vertical:'center', readingOrder:2 },
          border:    border(),
          ...(ci > 0 ? { numFmt:'#,##0' } : {}),
        },
      };
    });
    (ws['!rows'] as Array<{ hpx:number }>).push({ hpx: 24 });
    ws['!ref'] = XLSX.utils.encode_range({ r:0, c:0 }, { r:totalRow, c:2 });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'أسعار التوصيل');
    XLSX.writeFile(wb, `توصيل_${comp.name || 'شركة'}.xlsx`, { cellStyles: true, compression: true });
  };

  /* ── Excel import ──────────────────────────────────────────────────────── */
  const importExcel = (e: React.ChangeEvent<HTMLInputElement>, comp: DeliveryCompany) => {
    const file = e.target.files?.[0];
    if (!file || !editComp) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      const XLSX = await import('xlsx-js-style');
      const wb = XLSX.read(ev.target?.result, { type:'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string,unknown>>(ws);
      const prices = { ...comp.prices };
      let updated = 0;
      for (const row of rows) {
        const wilaya  = String(row['الولاية'] ?? '').trim();
        const home    = Number(row['المنزل (دج)'] ?? row['home'] ?? 0);
        const office  = Number(row['المكتب (دج)'] ?? row['office'] ?? 0);
        if (wilaya && WILAYAS_2026.includes(wilaya as typeof WILAYAS_2026[number])) {
          prices[wilaya] = { home: home || 0, office: office || 0 };
          updated++;
        }
      }
      setEditComp({ ...comp, prices });
      toast(isAdminAr ? `تم استيراد ${updated} ولاية` : `${updated} wilaya(s) importée(s)`);
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  /* ── Helpers ───────────────────────────────────────────────────────────── */
  const applyBulk = () => {
    if (!editComp) return;
    const h = parseFloat(bulkHome);
    const o = parseFloat(bulkOff);
    const prices = { ...editComp.prices };
    WILAYAS_2026.forEach(w => {
      prices[w] = {
        home:   !isNaN(h) ? h : (prices[w]?.home ?? DEFAULT_PRICE.home),
        office: !isNaN(o) ? o : (prices[w]?.office ?? DEFAULT_PRICE.office),
      };
    });
    setEditComp({ ...editComp, prices });
  };

  const setDefault = (id: string) =>
    setCompanies(prev => prev.map(c => ({ ...c, isDefault: c.id === id })));

  const filteredWilayas = WILAYAS_2026.filter(w =>
    !search || w.includes(search)
  );

  /* ── Sidebar ───────────────────────────────────────────────────────────── */
  const SidebarJSX = (
    <aside style={{ width:sideOpen?(isMobile?'100%':240):60, flexShrink:0, background:C.sidebar, borderInlineEnd:`1px solid ${C.border}`, display:'flex', flexDirection:'column', transition:'width .3s', position:isMobile&&sideOpen?'fixed':'relative', top:0, bottom:0, zIndex:isMobile&&sideOpen?300:'auto', overflowX:'hidden' }}>
      <div style={{ padding:'20px 16px', display:'flex', alignItems:'center', gap:10, borderBottom:'1px solid rgba(255,255,255,0.08)', cursor:'pointer' }} onClick={()=>setSideOpen(!sideOpen)}>
        <Image src="/logos/icon-white.svg" alt="إحسان" width={30} height={30} style={{ flexShrink:0 }} />
        {sideOpen && <div><div style={{ fontWeight:800, fontSize:15, color:'#fff', fontFamily:font, whiteSpace:'nowrap' }}>إحسان — Admin</div><div style={{ fontSize:9, letterSpacing:2, color:C.gold, fontFamily:'Inter', textTransform:'uppercase' }}>{isAdminAr ? 'لوحة التحكم' : 'Tableau de bord'}</div></div>}
      </div>
      <nav style={{ flex:1, padding:'12px 8px', display:'flex', flexDirection:'column', gap:4 }}>
        {NAV.map(item => {
          const active = typeof window!=='undefined' && window.location.pathname.startsWith(item.href);
          return (
            <button key={item.id} onClick={()=>{ router.push(item.href); if(isMobile) setSideOpen(false); }}
              style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', borderRadius:10, cursor:'pointer', background:active?'rgba(175,142,74,0.22)':'transparent', border:active?'1px solid rgba(175,142,74,0.45)':'1px solid transparent', color:active?'#d4a95e':'rgba(255,255,255,0.55)', width:'100%', textAlign: isAdminAr ? 'right' : 'left', transition:'all .2s', fontFamily:font, fontSize:13, fontWeight:active?700:400 }}>
              <span style={{ flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', width:18, height:18 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={item.iconPath}/></svg>
              </span>
              {sideOpen && <span style={{ whiteSpace:'nowrap' }}>{isAdminAr ? item.ar : item.fr}</span>}
            </button>
          );
        })}
      </nav>
      <div style={{ padding:'12px 8px', borderTop:'1px solid rgba(255,255,255,0.08)', display:'flex', flexDirection:'column', gap:4 }}>
        <button onClick={()=>router.push('/')} style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 12px', borderRadius:10, background:'transparent', border:'none', color:'rgba(255,255,255,0.5)', cursor:'pointer', fontFamily:font, fontSize:12, width:'100%' }}>
          <span style={{ flexShrink:0, width:18, height:18, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
          </span>
          {sideOpen && (isAdminAr ? 'عرض الموقع' : 'Voir le site')}
        </button>
        <button onClick={()=>{ sessionStorage.removeItem('ihsen_admin'); router.replace('/admin'); }} style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 12px', borderRadius:10, background:'transparent', border:'none', color:'rgba(239,68,68,0.6)', cursor:'pointer', fontFamily:font, fontSize:12, width:'100%' }}>
          <span style={{ flexShrink:0, width:18, height:18, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
          </span>
          {sideOpen && (isAdminAr ? 'تسجيل الخروج' : 'Déconnexion')}
        </button>
      </div>
    </aside>
  );

  /* ── Editor panel ──────────────────────────────────────────────────────── */
  const EditorJSX = editComp && (
    <div style={{ position:'fixed', inset:0, zIndex:500, display:'flex', alignItems:'stretch' }}>
      <div onClick={()=>setEditComp(null)} style={{ flex:1, background:'rgba(0,0,0,.45)', backdropFilter:'blur(3px)' }} />
      <div style={{ width: isMobile?'100%':700, background:'#fff', display:'flex', flexDirection:'column', overflowY:'auto', boxShadow:'-8px 0 40px rgba(0,0,0,.15)' }}>
        {/* Header */}
        <div style={{ background:`linear-gradient(135deg, ${C.green}, #1D4939)`, padding:'20px 22px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div>
            <div style={{ fontSize:11, color:'rgba(175,142,74,.8)', fontFamily:'Inter', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:3 }}>{isAdminAr ? 'شركة التوصيل' : 'Entreprise de livraison'}</div>
            <div style={{ fontSize:17, fontWeight:800, color:'#fff', fontFamily:font }}>{editComp.name || (isAdminAr ? 'شركة جديدة' : 'Nouvelle entreprise')}</div>
          </div>
          <button onClick={()=>setEditComp(null)} style={{ background:'rgba(255,255,255,.12)', border:'none', borderRadius:9, width:36, height:36, cursor:'pointer', color:'#fff', fontSize:20, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
        </div>

        <div style={{ padding:20, display:'flex', flexDirection:'column', gap:16, flex:1 }}>
          {/* Company name & phone */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {([{k:'name' as const,l:isAdminAr?'اسم الشركة':'Nom',p:'Yalidine, Lex...'},{k:'phone' as const,l:isAdminAr?'رقم الهاتف':'Téléphone',p:'0550 000 000'}]).map(({k,l,p})=>(
              <div key={k}>
                <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:5, fontFamily:font }}>{l}</label>
                <input value={(editComp as Record<string,string>)[k]} placeholder={p}
                  onChange={e=>setEditComp(ec=>ec?{...ec,[k]:e.target.value}:ec)}
                  style={{ width:'100%', padding:'9px 12px', borderRadius:9, border:`1.5px solid ${C.border}`, fontFamily:font, fontSize:13, color:C.text, outline:'none', boxSizing:'border-box' as const }} />
              </div>
            ))}
          </div>

          {/* Bulk set */}
          <div style={{ background:`${C.green}08`, border:`1px solid ${C.border}`, borderRadius:12, padding:'14px 16px' }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:10, fontFamily:font }}>{isAdminAr ? 'تطبيق سعر موحد على جميع الولايات' : 'Appliquer un prix uniforme à toutes les wilayas'}</div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <input type="number" placeholder={isAdminAr ? "المنزل (دج)" : "Domicile (DA)"} value={bulkHome} onChange={e=>setBulkHome(e.target.value)}
                style={{ flex:1, minWidth:100, padding:'8px 10px', borderRadius:8, border:`1.5px solid ${C.border}`, fontFamily:'Inter', fontSize:13, outline:'none' }} />
              <input type="number" placeholder={isAdminAr ? "المكتب (دج)" : "Bureau (DA)"} value={bulkOff} onChange={e=>setBulkOff(e.target.value)}
                style={{ flex:1, minWidth:100, padding:'8px 10px', borderRadius:8, border:`1.5px solid ${C.border}`, fontFamily:'Inter', fontSize:13, outline:'none' }} />
              <button onClick={applyBulk}
                style={{ padding:'8px 16px', borderRadius:8, border:`1.5px solid ${C.green}50`, background:`${C.green}12`, color:C.green, fontFamily:font, fontSize:12, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' as const }}>
                {isAdminAr ? 'تطبيق' : 'Appliquer'}
              </button>
            </div>
          </div>

          {/* Import / Export */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <button onClick={()=>fileRef.current?.click()}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:8, border:`1.5px solid ${C.gold}60`, background:`${C.gold}10`, color:C.gold, fontFamily:font, fontSize:12, fontWeight:700, cursor:'pointer' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
              {isAdminAr ? 'استيراد Excel' : 'Importer Excel'}
            </button>
            <button onClick={()=>exportTemplate(editComp)}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:8, border:`1.5px solid ${C.green}50`, background:`${C.green}10`, color:C.green, fontFamily:font, fontSize:12, fontWeight:700, cursor:'pointer' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              {isAdminAr ? 'تصدير قالب' : 'Exporter modèle'}
            </button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display:'none' }}
              onChange={e=>importExcel(e, editComp)} />
            <div style={{ fontSize:10, color:C.sub, fontFamily:'Inter', display:'flex', alignItems:'center', padding:'0 4px' }}>
              {isAdminAr ? 'الأعمدة: الولاية / المنزل (دج) / المكتب (دج)' : 'Colonnes: Wilaya / Domicile (DA) / Bureau (DA)'}
            </div>
          </div>

          {/* Wilaya search */}
          <input placeholder={isAdminAr ? "🔍 ابحث عن ولاية..." : "🔍 Rechercher une wilaya..."} value={search} onChange={e=>setSearch(e.target.value)}
            style={{ padding:'9px 13px', borderRadius:9, border:`1.5px solid ${C.border}`, fontFamily:font, fontSize:13, outline:'none', width:'100%', boxSizing:'border-box' as const }} />

          {/* Wilaya table */}
          <div style={{ borderRadius:11, border:`1px solid ${C.border}`, overflow:'hidden', flexShrink:0 }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:C.card2 }}>
                  <th style={{ padding:'9px 12px', textAlign:'right', fontFamily:font, color:C.muted, fontWeight:700, borderBottom:`1px solid ${C.border}` }}>{isAdminAr ? 'الولاية' : 'Wilaya'}</th>
                  <th style={{ padding:'9px 8px', textAlign:'center', fontFamily:font, color:'#3B82F6', fontWeight:700, borderBottom:`1px solid ${C.border}`, width:110 }}>{isAdminAr ? '🏠 المنزل (دج)' : '🏠 Domicile (DA)'}</th>
                  <th style={{ padding:'9px 8px', textAlign:'center', fontFamily:font, color:'#8B5CF6', fontWeight:700, borderBottom:`1px solid ${C.border}`, width:110 }}>{isAdminAr ? '🏢 المكتب (دج)' : '🏢 Bureau (DA)'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredWilayas.map((w, i) => {
                  const p = editComp.prices[w] ?? DEFAULT_PRICE;
                  return (
                    <tr key={w} style={{ borderBottom: i < filteredWilayas.length-1 ? `1px solid ${C.border}` : 'none', background: i%2===0?'#fff':'#fafcfb' }}>
                      <td style={{ padding:'6px 12px', fontFamily:font, color:C.text, fontWeight:600 }}>{w}</td>
                      <td style={{ padding:'4px 6px' }}>
                        <input type="number" min="0" max="9999" value={p.home}
                          onChange={e=>{ const v=Math.max(0,parseInt(e.target.value)||0); setEditComp(ec=>ec?{...ec,prices:{...ec.prices,[w]:{...p,home:v}}}:ec); }}
                          style={{ width:'100%', padding:'5px 6px', borderRadius:7, border:`1.5px solid #BFDBFE`, background:'#EFF6FF', color:'#1D4ED8', fontFamily:'Inter', fontSize:12, fontWeight:700, textAlign:'center', outline:'none', boxSizing:'border-box' as const }} />
                      </td>
                      <td style={{ padding:'4px 6px' }}>
                        <input type="number" min="0" max="9999" value={p.office}
                          onChange={e=>{ const v=Math.max(0,parseInt(e.target.value)||0); setEditComp(ec=>ec?{...ec,prices:{...ec.prices,[w]:{...p,office:v}}}:ec); }}
                          style={{ width:'100%', padding:'5px 6px', borderRadius:7, border:`1.5px solid #DDD6FE`, background:'#F5F3FF', color:'#6D28D9', fontFamily:'Inter', fontSize:12, fontWeight:700, textAlign:'center', outline:'none', boxSizing:'border-box' as const }} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer actions */}
        <div style={{ padding:'14px 20px', borderTop:`1px solid ${C.border}`, display:'flex', gap:10, justifyContent:'flex-end', flexShrink:0, background:'#fafcfb' }}>
          <button onClick={()=>setEditComp(null)}
            style={{ padding:'10px 20px', borderRadius:9, border:`1.5px solid ${C.border}`, background:'#fff', color:C.muted, fontFamily:font, fontSize:13, fontWeight:700, cursor:'pointer' }}>
            {isAdminAr ? 'إلغاء' : 'Annuler'}
          </button>
          <button onClick={()=>{
              const exists = companies.find(c=>c.id===editComp.id);
              const updated = exists
                ? companies.map(c=>c.id===editComp.id?editComp:c)
                : [...companies, editComp];
              saveAll(updated); setEditComp(null);
            }}
            style={{ padding:'10px 24px', borderRadius:9, border:'none', background:`linear-gradient(135deg, ${C.green}, #1D4939)`, color:'#fff', fontFamily:font, fontSize:13, fontWeight:800, cursor:'pointer', boxShadow:`0 4px 14px rgba(36,77,59,.3)` }}>
            {isAdminAr ? 'حفظ الشركة' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );

  /* ── Main render ───────────────────────────────────────────────────────── */
  return (
    <div style={{ display:'flex', height:'100vh', background:C.bg, fontFamily:font, direction:dir, overflow:'hidden' }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {SidebarJSX}
      {isMobile && sideOpen && <div onClick={()=>setSideOpen(false)} style={{ position:'fixed', inset:0, background:'#00000060', zIndex:299 }} />}
      {EditorJSX}

      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {/* Header */}
        <div style={{ padding: isMobile?'14px 12px':'18px 24px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:10, flexShrink:0, background:'#fff', boxShadow:'0 1px 0 rgba(36,77,59,.06)' }}>
          {isMobile && <button onClick={()=>setSideOpen(true)} style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:8, padding:'5px 9px', cursor:'pointer', color:C.text, fontSize:16 }}>☰</button>}
          <div style={{ width:36, height:36, borderRadius:10, background:`linear-gradient(135deg, ${C.green}, #1D4939)`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.85)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"/>
            </svg>
          </div>
          <div style={{ flex:1 }}>
            <h1 style={{ fontSize:isMobile?15:18, fontWeight:800, color:C.text, margin:0 }}>{isAdminAr ? 'شركات التوصيل' : 'Livraison'}</h1>
            <p style={{ fontSize:11, color:C.muted, margin:0 }}>{isAdminAr ? `${companies.length} شركة مضافة · ${WILAYAS_2026.length} ولاية` : `${companies.length} entreprise(s) · ${WILAYAS_2026.length} wilayas`}</p>
          </div>
          <button onClick={()=>setEditComp(newCompany())}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:10, border:'none', background:`linear-gradient(135deg, ${C.green}, #1D4939)`, color:'#fff', fontFamily:font, fontSize:13, fontWeight:700, cursor:'pointer', boxShadow:`0 3px 12px rgba(36,77,59,.3)` }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            {!isMobile && (isAdminAr ? 'إضافة شركة' : 'Ajouter')}
          </button>
        </div>

        {/* Content */}
        <div style={{ flex:1, overflowY:'auto', padding: isMobile?'14px':'24px' }}>
          {loading ? (
            <div style={{ textAlign:'center', color:C.sub, fontFamily:font, paddingTop:60 }}>{isAdminAr ? 'جاري التحميل...' : 'Chargement...'}</div>
          ) : companies.length === 0 ? (
            <div style={{ textAlign:'center', paddingTop:60 }}>
              <div style={{ fontSize:48, marginBottom:16 }}>🚚</div>
              <div style={{ fontSize:16, fontWeight:700, color:C.muted, fontFamily:font, marginBottom:8 }}>{isAdminAr ? 'لا توجد شركات توصيل' : 'Aucune entreprise de livraison'}</div>
              <div style={{ fontSize:13, color:C.sub, fontFamily:font, marginBottom:24 }}>{isAdminAr ? 'أضف أولى شركات التوصيل لتحديد الأسعار لكل ولاية' : 'Ajoutez vos entreprises de livraison pour définir les tarifs'}</div>
              <button onClick={()=>setEditComp(newCompany())}
                style={{ padding:'11px 22px', borderRadius:10, border:'none', background:`linear-gradient(135deg, ${C.green}, #1D4939)`, color:'#fff', fontFamily:font, fontSize:14, fontWeight:700, cursor:'pointer' }}>
                {isAdminAr ? '+ إضافة شركة' : '+ Ajouter une entreprise'}
              </button>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns: isDesktop?'repeat(auto-fill,minmax(300px,1fr))':'1fr', gap:16 }}>
              {companies.map((comp, ci) => {
                const avgHome   = Math.round(Object.values(comp.prices).reduce((s,p)=>s+p.home,0)  / Math.max(1,Object.values(comp.prices).length));
                const avgOffice = Math.round(Object.values(comp.prices).reduce((s,p)=>s+p.office,0) / Math.max(1,Object.values(comp.prices).length));
                return (
                  <div key={comp.id} data-reveal data-reveal-delay={String(ci * 80)}>
                  <div style={{ background:'#fff', border:`2px solid ${comp.isDefault?C.gold:C.border}`, borderRadius:14, overflow:'hidden', opacity: comp.active?1:0.55, transition:'all .2s' }}>
                    {/* Card header */}
                    <div style={{ padding:'14px 16px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:40, height:40, borderRadius:10, background:`linear-gradient(135deg, ${C.green}15, ${C.green}25)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>🚚</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:800, fontSize:14, color:C.text, fontFamily:font, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{comp.name || (isAdminAr ? 'بدون اسم' : 'Sans nom')}</div>
                        <div style={{ fontSize:11, color:C.sub, fontFamily:'Inter', marginTop:1 }}>{comp.phone || '—'}</div>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4, flexShrink:0 }}>
                        {comp.isDefault && <span style={{ fontSize:9, background:`${C.gold}18`, border:`1px solid ${C.gold}40`, color:C.gold, borderRadius:100, padding:'2px 8px', fontFamily:'Inter', fontWeight:700, letterSpacing:'0.05em' }}>{isAdminAr ? 'افتراضي' : 'Défaut'}</span>}
                        <span style={{ fontSize:9, background: comp.active?'#F0FDF4':'#FEF2F2', border:`1px solid ${comp.active?'#86EFAC':'#FECACA'}`, color:comp.active?'#15803D':'#DC2626', borderRadius:100, padding:'2px 8px', fontFamily:'Inter', fontWeight:700 }}>{comp.active?(isAdminAr?'نشط':'Actif'):(isAdminAr?'موقوف':'Inactif')}</span>
                      </div>
                    </div>

                    {/* Price preview */}
                    <div style={{ padding:'12px 16px', display:'flex', gap:12 }}>
                      <div style={{ flex:1, textAlign:'center', background:'#EFF6FF', borderRadius:9, padding:'8px 6px' }}>
                        <div style={{ fontSize:9, color:'#3B82F6', fontFamily:'Inter', fontWeight:700, marginBottom:2 }}>{isAdminAr ? '🏠 متوسط المنزل' : '🏠 Moy. domicile'}</div>
                        <div style={{ fontSize:16, fontWeight:800, color:'#1D4ED8', fontFamily:'Inter' }}>{avgHome}<span style={{ fontSize:9 }}>{isAdminAr ? ' دج' : ' DA'}</span></div>
                      </div>
                      <div style={{ flex:1, textAlign:'center', background:'#F5F3FF', borderRadius:9, padding:'8px 6px' }}>
                        <div style={{ fontSize:9, color:'#8B5CF6', fontFamily:'Inter', fontWeight:700, marginBottom:2 }}>{isAdminAr ? '🏢 متوسط المكتب' : '🏢 Moy. bureau'}</div>
                        <div style={{ fontSize:16, fontWeight:800, color:'#6D28D9', fontFamily:'Inter' }}>{avgOffice}<span style={{ fontSize:9 }}>{isAdminAr ? ' دج' : ' DA'}</span></div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ padding:'10px 16px', borderTop:`1px solid ${C.border}`, display:'flex', gap:6, flexWrap:'wrap' }}>
                      <button onClick={()=>setEditComp({...comp})}
                        style={{ flex:1, padding:'7px 10px', borderRadius:8, border:`1.5px solid ${C.green}40`, background:`${C.green}08`, color:C.green, fontFamily:font, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                        {isAdminAr ? 'تعديل الأسعار' : 'Modifier les prix'}
                      </button>
                      {!comp.isDefault && (
                        <button onClick={()=>{ const u=companies.map(c=>({...c,isDefault:c.id===comp.id})); saveAll(u); }}
                          style={{ flex:1, padding:'7px 10px', borderRadius:8, border:`1.5px solid ${C.gold}50`, background:`${C.gold}08`, color:C.gold, fontFamily:font, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                          {isAdminAr ? 'تعيين افتراضي' : 'Définir par défaut'}
                        </button>
                      )}
                      <button onClick={()=>{ const u=companies.map(c=>c.id===comp.id?{...c,active:!c.active}:c); saveAll(u); }}
                        style={{ padding:'7px 10px', borderRadius:8, border:`1.5px solid ${comp.active?'#EF4444':'#10B981'}40`, background: comp.active?'#FEF2F2':'#F0FDF4', color:comp.active?'#DC2626':'#059669', fontFamily:font, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                        {comp.active?(isAdminAr?'إيقاف':'Désactiver'):(isAdminAr?'تفعيل':'Activer')}
                      </button>
                      <button onClick={()=>{ if(confirm(isAdminAr ? 'حذف هذه الشركة؟' : 'Supprimer cette entreprise ?')) saveAll(companies.filter(c=>c.id!==comp.id)); }}
                        style={{ padding:'7px 10px', borderRadius:8, border:'1.5px solid #FCA5A540', background:'#FEF2F2', color:'#DC2626', fontFamily:font, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                        ×
                      </button>
                    </div>
                  </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Info bar */}
      {saving && (
        <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', background:'#1D4939', borderRadius:10, padding:'10px 20px', color:'#fff', fontFamily:font, fontSize:13, boxShadow:'0 6px 24px rgba(0,0,0,.2)' }}>
          {isAdminAr ? 'جاري الحفظ...' : 'Enregistrement...'}
        </div>
      )}

      {/* Toasts */}
      <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', zIndex:700, display:'flex', flexDirection:'column', gap:8, alignItems:'center' }}>
        {toasts.map(t => (
          <div key={t.id} style={{ background: t.ok?'#F0FDF4':'#FEF2F2', border:`1.5px solid ${t.ok?'#86EFAC':'#FECACA'}`, borderRadius:12, padding:'10px 18px', fontFamily:font, fontSize:13, color:t.ok?'#15803D':'#DC2626', display:'flex', alignItems:'center', gap:8, direction:'rtl', animation:'fadeUp .2s ease', whiteSpace:'nowrap' }}>
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
