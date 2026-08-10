'use client';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase, Order } from '@/lib/supabase';

const C = {
  bg:      '#EEF5F1',
  sidebar: '#1a3d2e',
  card:    '#FFFFFF',
  card2:   '#F3FAF6',
  border:  '#D5E8DC',
  border2: '#B2CEBE',
  text:    '#172B1E',
  muted:   '#4E6D5C',
  sub:     '#84A695',
  green:   '#244D3B',
  greenL:  '#2d5f49',
  gold:    '#AF8E4A',
  goldL:   '#c4a35a',
};

const ALL_NAV = [
  { id:'dashboard', ar:'الرئيسية',     fr:'Accueil',      href:'/admin/dashboard', iconPath:'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id:'orders',    ar:'الطلبات',      fr:'Commandes',    href:'/admin/orders',    iconPath:'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { id:'products',  ar:'المنتجات',     fr:'Produits',     href:'/admin/products',  iconPath:'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { id:'delivery',  ar:'التوصيل',      fr:'Livraison',    href:'/admin/delivery',  iconPath:'M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0' },
  { id:'promos',    ar:'أكواد الخصم', fr:'Promotions',   href:'/admin/promos',    iconPath:'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z' },
  { id:'settings',  ar:'الإعدادات',   fr:'Paramètres',   href:'/admin/settings',  iconPath:'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z' },
];

const BOTTOM_NAV = [
  { id: 'dashboard', href: '/admin/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', ar: 'الرئيسية', fr: 'Accueil' },
  { id: 'orders',    href: '/admin/orders',    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', ar: 'الطلبات', fr: 'Commandes' },
  { id: 'add',       href: '/admin/products?action=add', icon: 'M12 5v14M5 12h14', ar: 'إضافة', fr: 'Ajouter', isAction: true },
  { id: 'products',  href: '/admin/products',  icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', ar: 'المنتجات', fr: 'Produits' },
  { id: 'settings',  href: '/admin/settings',  icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z', ar: 'الإعدادات', fr: 'Paramètres' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [sideOpen, setSideOpen] = useState(true);
  const [windowW, setW] = useState(1200);
  const [adminLang, setAdminLang] = useState<'ar'|'fr'>('ar');
  const [notifOpen, setNotif] = useState(false);
  const [notifOrders, setNotifOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const getLang = () => (localStorage.getItem('ihsen_admin_lang') as 'ar'|'fr') ?? 'ar';
      setAdminLang(getLang());
      
      const upd = () => setW(window.innerWidth);
      upd();
      window.addEventListener('resize', upd);
      if (window.innerWidth < 1024) setSideOpen(false);
      setMounted(true);

      // Fetch orders for notifications
      supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(20)
        .then(({ data, error }) => {
          if (!error && data) setNotifOrders(data as Order[]);
        });

      // Listen for language changes from settings
      const onLangChange = () => setAdminLang(getLang());
      window.addEventListener('ihsen_lang_changed', onLangChange);

      return () => {
        window.removeEventListener('resize', upd);
        window.removeEventListener('ihsen_lang_changed', onLangChange);
      };
    }
  }, []);

  // Update language when navigating just in case it was changed in another tab
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAdminLang((localStorage.getItem('ihsen_admin_lang') as 'ar'|'fr') ?? 'ar');
    }
  }, [pathname]);

  // Exclude layout for the root /admin login page
  if (pathname === '/admin') {
    return <>{children}</>;
  }

  const isMobileTablet = windowW < 1024; // Mobile & Tablet (Bottom Nav)
  const isDesktop = windowW >= 1024;    // Desktop (Sidebar)
  
  const isAdminAr = adminLang === 'ar';
  const font = isAdminAr ? 'Cairo, sans-serif' : 'Inter, sans-serif';
  const dir  = isAdminAr ? 'rtl' : 'ltr';

  const title = ALL_NAV.find(x => pathname.startsWith(x.href))?.ar || 'إحسان';
  const titleFr = ALL_NAV.find(x => pathname.startsWith(x.href))?.fr || 'Ihsen';

  return (
    <div style={{ display:'flex', height:'100vh', background:C.bg, fontFamily:font, direction:dir, overflow:'hidden', color:C.text }}>
      <style>{`
        @keyframes ihsenFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes ihsenSlideUp { from { opacity: 0; transform: translateY(15px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes ihsenSlideDown { from { opacity: 0; transform: translateY(-15px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes ihsenScaleIn { from { opacity: 0; transform: scale(0.95) } to { opacity: 1; transform: scale(1) } }
        @keyframes panelSlideRight { from { transform: translateX(100%) } to { transform: translateX(0) } }
        @keyframes panelSlideLeft { from { transform: translateX(-100%) } to { transform: translateX(0) } }
        @keyframes panelSlideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
        
        .panel-anim-desktop-ar { animation: panelSlideLeft 0.35s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .panel-anim-desktop-fr { animation: panelSlideRight 0.35s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .panel-anim-mobile { animation: panelSlideUp 0.35s cubic-bezier(0.22, 1, 0.36, 1) both; }
        
        .page-transition { 
          animation: ihsenSlideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) both; 
          display: flex; flex: 1; flex-direction: column; overflow: hidden; 
        }
        .topbar-anim {
          animation: ihsenSlideDown 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .bottom-nav-anim {
          animation: ihsenSlideUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        
        /* Smooth scrolling for main content */
        .main-scroll::-webkit-scrollbar { width: 6px; }
        .main-scroll::-webkit-scrollbar-track { background: transparent; }
        .main-scroll::-webkit-scrollbar-thumb { background: rgba(36,77,59,0.2); border-radius: 10px; }
        .main-scroll::-webkit-scrollbar-thumb:hover { background: rgba(36,77,59,0.4); }
      `}</style>

      {/* Desktop Sidebar */}
      {!isMobileTablet && (
        <aside style={{ 
          width: sideOpen ? 240 : 68, 
          flexShrink: 0, 
          background: C.sidebar, 
          borderInlineEnd: `1px solid ${C.border}`, 
          display: 'flex', 
          flexDirection: 'column', 
          transition: !mounted ? 'none' : 'width .3s cubic-bezier(0.32,0.72,0,1)', 
          position: 'relative', 
          zIndex: 300,
          overflow: 'hidden'
        }}>
          {/* Logo */}
          <div style={{ padding:'20px 16px', display:'flex', alignItems:'center', gap:10, borderBottom:'1px solid rgba(255,255,255,0.08)', cursor:'pointer' }} onClick={() => setSideOpen(!sideOpen)}>
            <Image src="/logos/icon-white.svg" alt="إحسان" width={30} height={30} style={{ flexShrink:0 }} />
            <div style={{ opacity: sideOpen ? 1 : 0, transition: 'opacity .2s', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              <div style={{ fontWeight:800, fontSize:15, color:'#fff', fontFamily:'Cairo, sans-serif' }}>إحسان — Admin</div>
              <div style={{ fontSize:9, letterSpacing:2, color:C.gold, fontFamily:'Inter', textTransform:'uppercase' }}>{isAdminAr ? 'لوحة التحكم' : 'Tableau de bord'}</div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex:1, padding:'12px 8px', display:'flex', flexDirection:'column', gap:4 }}>
            {ALL_NAV.map(item => {
              const active = pathname.startsWith(item.href) && (item.href !== '/admin/dashboard' || pathname === item.href);
              return (
                <button key={item.id} onClick={() => router.push(item.href)} style={{
                  display:'flex', alignItems:'center', gap:12, padding:'10px 12px', borderRadius:10, cursor:'pointer',
                  background: active ? 'rgba(175,142,74,0.22)' : 'transparent',
                  border: active ? '1px solid rgba(175,142,74,0.45)' : '1px solid transparent',
                  color: active ? '#d4a95e' : 'rgba(255,255,255,0.55)',
                  width: '100%', textAlign: isAdminAr ? 'right' : 'left', transition: 'all .2s',
                  fontSize: 13, fontWeight: active ? 700 : 400
                }}
                onMouseEnter={e => { if(!active) e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
                onMouseLeave={e => { if(!active) e.currentTarget.style.background = 'transparent'; }}
                title={isAdminAr ? item.ar : item.fr}>
                  <span style={{ flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', width:20, height:20 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d={item.iconPath} />
                    </svg>
                  </span>
                  <span style={{ whiteSpace:'nowrap', opacity: sideOpen ? 1 : 0, transition: 'opacity .2s' }}>{isAdminAr ? item.ar : item.fr}</span>
                </button>
              );
            })}
          </nav>
        </aside>
      )}

      {/* Main Content Area */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', position: 'relative' }}>
        
        {/* Topbar */}
        <div className="topbar-anim" style={{ background:'#ffffff', borderBottom:`1px solid ${C.border}`, padding:'10px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100, boxShadow:'0 1px 8px rgba(36,77,59,.05)' }}>
          {/* Right side (RTL) — title */}
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:`linear-gradient(135deg, ${C.green}, #1D4939)`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.85)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
            </div>
            <div>
              <div style={{ fontSize:15, fontWeight:800, color:C.text, lineHeight:1.2 }}>{isAdminAr ? title : titleFr}</div>
              <div style={{ fontSize:10.5, color:C.sub, marginTop:1 }}>{new Date().toLocaleDateString(isAdminAr ? 'ar-DZ' : 'fr-DZ', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</div>
            </div>
          </div>

          {/* Left side (RTL) — Actions */}
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <button onClick={() => router.push('/admin/messages')} style={{ width:36, height:36, borderRadius:10, background:pathname.includes('/messages') ? C.card2 : 'none', border:`1px solid ${C.border}`, color:pathname.includes('/messages') ? C.text : C.muted, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', transition:'all .2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = C.card2; e.currentTarget.style.color = C.text; }}
              onMouseLeave={e => { if(!pathname.includes('/messages')) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = C.muted; } }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
            </button>
            <div style={{ position:'relative' }}>
              <button onClick={() => setNotif(!notifOpen)} style={{ width:36, height:36, borderRadius:10, background: notifOpen ? `${C.gold}15` : 'none', border:`1px solid ${notifOpen ? C.gold : C.border}`, color: notifOpen ? C.gold : C.muted, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', transition:'all .2s' }}
                onMouseEnter={e => { if(!notifOpen) { e.currentTarget.style.background = C.card2; e.currentTarget.style.color = C.text; } }}
                onMouseLeave={e => { if(!notifOpen) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = C.muted; } }}>
                <span className={!notifOpen ? 'ihsen-bell-ring' : ''} style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
                </span>
                {notifOrders.filter(o => o.status === 'pending' || o.status === 'reviewing').length > 0 && (
                  <div style={{ position:'absolute', top:6, right:8, width:8, height:8, background:'#EF4444', borderRadius:'50%', border:'2px solid #fff' }} />
                )}
              </button>

              {/* Notifications Dropdown */}
              {notifOpen && (
                <>
                  <div onClick={() => setNotif(false)} style={{ position:'fixed', inset:0, zIndex:190 }} />
                  <div style={{ position:'absolute', top:'calc(100% + 8px)', right:isAdminAr?'auto':0, left:isAdminAr?0:'auto', width:300, background:C.card, border:`1px solid ${C.border}`, borderRadius:14, boxShadow:'0 12px 36px rgba(0,0,0,.13)', zIndex:200, overflow:'hidden', animation: 'ihsenSlideUp 0.2s cubic-bezier(0.22,1,0.36,1)' }}>
                    <div style={{ padding:'12px 16px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div style={{ fontSize:13, fontWeight:800, color:C.text }}>{isAdminAr ? 'الإشعارات' : 'Notifications'}</div>
                      <span style={{ fontSize:10, background:`${C.gold}20`, color:C.gold, borderRadius:100, padding:'2px 8px', fontWeight:700 }}>
                        {notifOrders.filter(o => o.status==='pending' || o.status==='reviewing').length} {isAdminAr ? 'معلق' : 'en attente'}
                      </span>
                    </div>
                    <div style={{ maxHeight:320, overflowY:'auto' }}>
                      {notifOrders.filter(o => o.status==='pending' || o.status==='reviewing').length === 0 ? (
                        <div style={{ padding:30, textAlign:'center', color:C.sub, fontSize:12 }}>
                          {isAdminAr ? 'لا توجد إشعارات جديدة' : 'Aucune nouvelle notification'}
                        </div>
                      ) : (
                        notifOrders.filter(o => o.status==='pending' || o.status==='reviewing').slice(0,5).map(o => (
                          <div key={o.id} onClick={() => { setNotif(false); router.push('/admin/orders?id=' + o.id); }} style={{ padding:'12px 16px', borderBottom:`1px solid ${C.border}`, cursor:'pointer', display:'flex', gap:10, alignItems:'flex-start', background:C.card, transition:'background .2s' }} onMouseEnter={e => e.currentTarget.style.background = C.card2} onMouseLeave={e => e.currentTarget.style.background = C.card}>
                            <div style={{ width:32, height:32, borderRadius:8, background:`${C.gold}15`, color:C.gold, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
                            </div>
                            <div>
                              <div style={{ fontSize:12, fontWeight:700, color:C.text }}>{isAdminAr ? 'طلب جديد' : 'Nouvelle commande'} #{o.id.slice(0,5)}</div>
                              <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{o.customer_name} • {o.total} د.ج</div>
                              <div style={{ fontSize:10, color:C.sub, marginTop:4 }}>{new Date(o.created_at).toLocaleDateString(isAdminAr ? 'ar-DZ' : 'fr-DZ')}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div onClick={() => { setNotif(false); router.push('/admin/orders'); }} style={{ padding:'10px', textAlign:'center', background:C.card2, fontSize:11, fontWeight:700, color:C.green, cursor:'pointer' }}>
                      {isAdminAr ? 'عرض كل الطلبات' : 'Voir toutes les commandes'}
                    </div>
                  </div>
                </>
              )}
            </div>
            <button onClick={() => { sessionStorage.removeItem('ihsen_admin'); router.replace('/admin'); }} style={{ padding:isMobileTablet?'0 8px':'0 12px', height:36, borderRadius:10, background:'#EF444410', border:'1px solid #EF444425', color:'#EF4444', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:font, transition:'all 0.2s', display:'flex', alignItems:'center', gap:isMobileTablet?0:6 }}
              onMouseEnter={e => e.currentTarget.style.background = '#EF444420'}
              onMouseLeave={e => e.currentTarget.style.background = '#EF444410'}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform:isAdminAr?'rotate(180deg)':'none' }}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              {!isMobileTablet && (isAdminAr ? 'خروج' : 'Déconnexion')}
            </button>
          </div>
        </div>

        {/* Page Content with key to trigger animation on route change */}
        <div key={pathname} className="page-transition main-scroll" style={{ flex: 1, overflowY: 'auto' }}>
          {children}
        </div>

        {/* Bottom Nav for Mobile/Tablet */}
        {isMobileTablet && (
          <div className="bottom-nav-anim" style={{ 
            background: '#ffffff', borderTop: '1px solid rgba(36,77,59,0.08)', 
            display: 'flex', justifyContent: 'space-around', alignItems: 'center', 
            padding: '10px 8px', paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))', 
            zIndex: 400, boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.04)', 
            direction: isAdminAr ? 'rtl' : 'ltr', flexShrink: 0 
          }}>
            {BOTTOM_NAV.map(item => {
              const active = pathname === item.href || (item.id !== 'dashboard' && pathname?.startsWith(item.href));
              
              if (item.isAction) {
                return (
                  <button key={item.id} onClick={() => router.push(item.href)} 
                    style={{ 
                      width: 52, height: 52, borderRadius: 26, flexShrink: 0,
                      background: `linear-gradient(135deg, ${C.gold}, ${C.goldL})`, 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      border: '4px solid #fff', cursor: 'pointer', color: '#fff', 
                      transform: 'translateY(-20px)', boxShadow: '0 8px 16px rgba(175, 142, 74, 0.3)',
                      transition: 'transform 0.2s'
                    }}
                    onMouseEnter={(e:any) => e.currentTarget.style.transform = 'translateY(-22px) scale(1.05)'}
                    onMouseLeave={(e:any) => e.currentTarget.style.transform = 'translateY(-20px) scale(1)'}
                    >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d={item.icon}/>
                    </svg>
                  </button>
                );
              }

              return (
                <button key={item.id} onClick={() => router.push(item.href)} 
                  style={{ 
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, 
                    background: 'transparent', border: 'none', cursor: 'pointer', 
                    color: active ? C.green : '#9ca3af', flex: 1,
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e:any) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e:any) => e.currentTarget.style.transform = 'translateY(0px)'}
                  >
                  <div style={{
                    width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: active ? `${C.green}15` : 'transparent',
                    color: active ? C.green : '#9ca3af',
                    transition: 'all 0.2s',
                    transform: active ? 'translateY(-2px)' : 'none'
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d={item.icon}/>
                    </svg>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, fontFamily: font }}>
                    {isAdminAr ? item.ar : item.fr}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
