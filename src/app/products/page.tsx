'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { FEATURED_PRODUCTS, CATEGORIES, TRUST_BADGES } from '@/lib/constants';
import { supabase, type Product as DbProduct } from '@/lib/supabase';
import { useCart } from '@/context/CartContext';

const BADGE_META = {
  new:  { ar:'جديد',   fr:'Nouveau',   bg:'#10B981' },
  hot:  { ar:'رائج',   fr:'Populaire', bg:'#EF4444' },
  sale: { ar:'تخفيض',  fr:'Soldes',    bg:'#F59E0B' },
};

const SORT_OPTIONS = [
  { id:'default',    ar:'الافتراضي',           fr:'Par défaut' },
  { id:'price_asc',  ar:'السعر: من الأقل',     fr:'Prix croissant' },
  { id:'price_desc', ar:'السعر: من الأعلى',    fr:'Prix décroissant' },
  { id:'newest',     ar:'الأحدث',              fr:'Nouveautés' },
] as const;

const PRICE_RANGES = [
  { id:'all',   ar:'كل الأسعار',       fr:'Tous les prix',   min:0,    max:Infinity },
  { id:'low',   ar:'أقل من 2000 دج',   fr:'Moins de 2000',   min:0,    max:1999 },
  { id:'mid',   ar:'2000 – 3500 دج',   fr:'2000 – 3500',     min:2000, max:3500 },
  { id:'high',  ar:'أكثر من 3500 دج',  fr:'Plus de 3500',    min:3501, max:Infinity },
] as const;

const CAT_ID_TO_AR: Record<string,string> = {
  foulard:'فولار', hijab:'حجاب', abaya:'عبايات', hoodie:'هوديز',
};

// Extract every unique color across all products
const ALL_COLORS = Array.from(
  new Set(FEATURED_PRODUCTS.flatMap(p => [...p.colors]))
);

function ProductsContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [lang,        setLang]      = useState<'ar'|'fr'>('ar');
  const [theme,       setTheme]     = useState<'light'|'dark'>('light');
  const [windowWidth, setW]         = useState(1200);
  const [navScrolled, setNS]        = useState(false);

  // Filters
  const [activeCat,     setActiveCat]    = useState('all');
  const [priceRange,    setPriceRange]   = useState('all');
  const [selColors,     setSelColors]    = useState<string[]>([]);
  const [selBadges,     setSelBadges]    = useState<string[]>([]);
  const [sortBy,        setSortBy]       = useState<typeof SORT_OPTIONS[number]['id']>('default');
  const [search,        setSearch]       = useState('');
  const [drawerOpen,    setDrawerOpen]   = useState(false);

  // Hover
  const [hovCard, setHovCard] = useState<number|null>(null);

  // Real products from Supabase
  const [dbProducts, setDbProducts] = useState<DbProduct[]>([]);
  const [loading,    setLoading]    = useState(true);

  // Page loader state machine: 'in' = visible, 'out' = fading, 'gone' = removed
  const [loaderPhase, setLoaderPhase] = useState<'in'|'out'|'gone'>('in');

  useEffect(() => {
    const html = document.documentElement;
    setLang((html.getAttribute('data-lang') as 'ar'|'fr') ?? 'ar');
    setTheme((html.getAttribute('data-theme') as 'light'|'dark') ?? 'light');
    const upd = () => setW(window.innerWidth);
    upd();
    window.addEventListener('resize', upd);
    window.addEventListener('scroll', () => setNS(window.scrollY > 20));
    const cat = searchParams.get('cat');
    if (cat) setActiveCat(cat);

    // Fetch from Supabase with minimum 700ms loader display
    const minDelay = new Promise<void>(r => setTimeout(r, 700));
    const fetchData = supabase.from('products').select('*')
      .eq('active', true).order('sort_order', { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) setDbProducts(data as DbProduct[]);
        setLoading(false);
      });
    Promise.all([minDelay, fetchData]).then(() => {
      setLoaderPhase('out');
      setTimeout(() => setLoaderPhase('gone'), 600);
    });

    return () => window.removeEventListener('resize', upd);
  }, [searchParams]);

  const isAr  = lang === 'ar';
  const isDark = theme === 'dark';
  const isMobile  = windowWidth < 640;
  const isTablet  = windowWidth >= 640 && windowWidth < 1024;
  const isDesktop = windowWidth >= 1024;
  const font = isAr ? 'Cairo, sans-serif' : 'Inter, sans-serif';

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

  const C = {
    bg:     isDark ? '#080f0a' : '#F9F6F1',
    card:   isDark ? '#0f2419' : '#FFFFFF',
    panel:  isDark ? '#0a1810' : '#FFFFFF',
    border: isDark ? '#244D3B' : '#E8DFD2',
    text:   isDark ? '#F0EBE3' : '#1a1a1a',
    muted:  isDark ? '#7A9C8A' : '#6B6B6B',
    green:  '#244D3B',
    greenD: '#1D4939',
    gold:   '#AF8E4A',
    goldL:  '#DAC08B',
  };

  // ── Filtering + Sorting ────────────────────────────────────────────
  const priceRangeMeta = PRICE_RANGES.find(p => p.id === priceRange)!;

  // Use real Supabase data when available, fallback to hardcoded
  const sourceProducts = dbProducts.length > 0
    ? dbProducts.map(p => ({
        id: p.id, price: p.price, category: p.category,
        nameAr: p.name_ar, nameFr: p.name_fr,
        colors: p.colors, badge: p.badge ?? undefined,
        images: p.images, thumbnail_index: p.thumbnail_index,
        emoji: p.emoji, in_stock: p.in_stock ?? true,
        original_price: p.original_price,
      }))
    : FEATURED_PRODUCTS;

  const filtered = sourceProducts
    .filter(p => {
      if (activeCat !== 'all' && p.category !== CAT_ID_TO_AR[activeCat]) return false;
      if (p.price < priceRangeMeta.min || p.price > priceRangeMeta.max) return false;
      if (selColors.length && !selColors.some(c => p.colors.includes(c as never))) return false;
      if (selBadges.length && !selBadges.includes(p.badge ?? '')) return false;
      const q = search.trim().toLowerCase();
      if (q && !p.nameAr.includes(q) && !p.nameFr.toLowerCase().includes(q)) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'price_asc')  return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      if (sortBy === 'newest')     return b.id - a.id;
      return 0;
    });

  const skelA = isDark ? '#0f2419' : '#e8f0eb';
  const skelB = isDark ? '#1a3a28' : '#f3f8f5';

  // Count active filters (excluding category which is shown as tabs)
  const activeFilterCount =
    (priceRange !== 'all' ? 1 : 0) +
    selColors.length +
    selBadges.length +
    (sortBy !== 'default' ? 1 : 0);

  const clearAll = () => {
    setPriceRange('all');
    setSelColors([]);
    setSelBadges([]);
    setSortBy('default');
    setSearch('');
  };

  const toggleColor = (c: string) =>
    setSelColors(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  const toggleBadge = (b: string) =>
    setSelBadges(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]);

  const cols = isMobile ? 2 : isTablet ? 2 : 3;

  const { itemCount, openCart } = useCart();

  // ── Filter Panel ───────────────────────────────────────────────────
  const FilterPanel = ({ inDrawer = false }: { inDrawer?: boolean }) => (
    <div style={{ fontFamily: font }}>
      {/* Sort */}
      <div style={{ marginBottom: inDrawer ? 24 : 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12, fontFamily: font }}>
          {isAr ? 'ترتيب حسب' : 'Trier par'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {SORT_OPTIONS.map(s => {
            const active = sortBy === s.id;
            return (
              <button key={s.id} onClick={() => setSortBy(s.id)} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: active ? `${C.green}18` : 'transparent',
                border: `1px solid ${active ? C.green : 'transparent'}`,
                borderRadius: 8, padding: '7px 10px', cursor: 'pointer',
                color: active ? C.green : C.text, fontSize: 13, fontWeight: active ? 700 : 400,
                fontFamily: font, textAlign: isAr ? 'right' : 'left', width: '100%',
                transition: 'all .15s',
              }}>
                <span style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${active ? C.green : C.border}`, background: active ? C.green : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {active && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'block' }} />}
                </span>
                {isAr ? s.ar : s.fr}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ height: 1, background: C.border, marginBottom: 20 }} />

      {/* Price */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12, fontFamily: font }}>
          {isAr ? 'نطاق السعر' : 'Fourchette de prix'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {PRICE_RANGES.map(r => {
            const active = priceRange === r.id;
            return (
              <button key={r.id} onClick={() => setPriceRange(r.id)} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: active ? `${C.gold}18` : 'transparent',
                border: `1px solid ${active ? C.gold : 'transparent'}`,
                borderRadius: 8, padding: '7px 10px', cursor: 'pointer',
                color: active ? C.gold : C.text, fontSize: 13, fontWeight: active ? 700 : 400,
                fontFamily: font, textAlign: isAr ? 'right' : 'left', width: '100%',
                transition: 'all .15s',
              }}>
                <span style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${active ? C.gold : C.border}`, background: active ? C.gold : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {active && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'block' }} />}
                </span>
                {isAr ? r.ar : r.fr}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ height: 1, background: C.border, marginBottom: 20 }} />

      {/* Badges */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12, fontFamily: font }}>
          {isAr ? 'العروض' : 'Promotions'}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(BADGE_META).map(([key, meta]) => {
            const active = selBadges.includes(key);
            return (
              <button key={key} onClick={() => toggleBadge(key)} style={{
                padding: '5px 14px', borderRadius: 100, cursor: 'pointer', fontFamily: font,
                fontSize: 12, fontWeight: 700, border: 'none', transition: 'all .15s',
                background: active ? meta.bg : `${meta.bg}22`,
                color: active ? '#fff' : meta.bg,
                boxShadow: active ? `0 2px 8px ${meta.bg}50` : 'none',
              }}>
                {isAr ? meta.ar : meta.fr}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ height: 1, background: C.border, marginBottom: 20 }} />

      {/* Colors */}
      <div style={{ marginBottom: inDrawer ? 8 : 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12, fontFamily: font }}>
          {isAr ? 'الألوان المتاحة' : 'Couleurs disponibles'}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {ALL_COLORS.map(col => {
            const active = selColors.includes(col);
            return (
              <button key={col} onClick={() => toggleColor(col)} title={col} style={{
                width: 26, height: 26, borderRadius: '50%', background: col, cursor: 'pointer',
                border: active ? `2.5px solid ${C.gold}` : `2.5px solid transparent`,
                outline: active ? `2px solid ${C.gold}55` : '2px solid transparent',
                transition: 'all .15s',
                transform: active ? 'scale(1.2)' : 'scale(1)',
              }} />
            );
          })}
        </div>
        {selColors.length > 0 && (
          <button onClick={() => setSelColors([])} style={{ marginTop: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: C.muted, fontFamily: font, textDecoration: 'underline' }}>
            {isAr ? 'مسح الألوان' : 'Effacer couleurs'}
          </button>
        )}
      </div>
    </div>
  );

  // ── Page Loader Component ──────────────────────────────────────────────
  const PageLoader = () => (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'linear-gradient(145deg, #060e08, #0F2419, #1a3a28)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20,
      opacity: loaderPhase === 'out' ? 0 : 1,
      transform: loaderPhase === 'out' ? 'scale(1.04)' : 'scale(1)',
      transition: 'opacity 0.55s cubic-bezier(0.76,0,0.24,1), transform 0.55s cubic-bezier(0.76,0,0.24,1)',
      pointerEvents: loaderPhase === 'out' ? 'none' : 'all',
    }}>
      <style>{`
        @keyframes ihsen-ldr-glow { 0%,100%{filter:drop-shadow(0 0 14px #AF8E4A88)} 50%{filter:drop-shadow(0 0 28px #AF8E4Acc)} }
        @keyframes ihsen-ldr-bar  { from{width:0%} to{width:100%} }
        @keyframes ihsen-ldr-dot  { 0%,80%,100%{opacity:.25;transform:scale(.8)} 40%{opacity:1;transform:scale(1.15)} }
      `}</style>
      {/* Logo */}
      <div style={{ animation: 'ihsen-ldr-glow 2s ease-in-out infinite' }}>
        <Image src="/logos/full-vertical-gold.svg" alt="إحسان" width={80} height={80} priority />
      </div>
      {/* Tagline */}
      <div style={{ color: '#AF8E4A', fontSize: 12, letterSpacing: 4, textTransform: 'uppercase', fontFamily: 'Inter, sans-serif', opacity: .75 }}>
        {isAr ? 'جاري التحميل...' : 'Chargement...'}
      </div>
      {/* Gold progress bar */}
      <div style={{ width: 180, height: 2, background: 'rgba(175,142,74,.15)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', background: 'linear-gradient(90deg, #AF8E4A, #DAC08B, #AF8E4A)', backgroundSize: '200% 100%', borderRadius: 2, animation: 'ihsen-ldr-bar 0.65s cubic-bezier(0.25,1,0.5,1) 0.1s forwards', width: '0%' }} />
      </div>
      {/* 3 dots */}
      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#AF8E4A', animation: `ihsen-ldr-dot 1.1s ease-in-out ${i * 0.2}s infinite` }} />
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: font, direction: isAr ? 'rtl' : 'ltr' }}>

      {/* Page Loader */}
      {loaderPhase !== 'gone' && <PageLoader />}

      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        padding: isMobile ? '12px 16px' : '14px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: navScrolled
          ? (isDark ? 'rgba(8,15,10,.96)' : 'rgba(249,246,241,.96)')
          : (isDark ? 'rgba(8,15,10,.8)' : 'rgba(249,246,241,.8)'),
        backdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${navScrolled ? C.border : 'transparent'}`,
        transition: 'all .3s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }} onClick={() => router.push('/')}>
          <Image src={isDark ? '/logos/icon-gold.svg' : '/logos/icon-green.svg'} alt="إحسان" width={isMobile ? 24 : 28} height={isMobile ? 24 : 28} />
          {!isMobile && (
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: isDark ? C.gold : C.green, fontFamily: 'Cairo, sans-serif', lineHeight: 1 }}>إحسان</div>
              <div style={{ fontSize: 9, letterSpacing: 3, color: C.gold, fontFamily: 'Inter', textTransform: 'uppercase' }}>ihsen</div>
            </div>
          )}
        </div>

        {isDesktop && (
          <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: 'Cairo, sans-serif' }}>
              {isAr ? 'كامل المجموعة' : 'Collection complète'}
            </div>
            <div style={{ fontSize: 11, color: C.muted, fontFamily: font }}>
              {filtered.length} {isAr ? 'منتج' : 'produit(s)'}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={toggleTheme} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, padding: '5px 8px', cursor: 'pointer', display:'flex', alignItems:'center', justifyContent:'center', width:30, height:28 }}>
            {isDark
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
            }
          </button>
          <button onClick={toggleLang} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, padding: '5px 10px', cursor: 'pointer', color: C.gold, fontWeight: 700, fontSize: 11, fontFamily: font }}>
            {isAr ? 'FR' : 'AR'}
          </button>
          {/* Cart button */}
          <button onClick={openCart} style={{
            position: 'relative', background: 'none', border: `1px solid ${C.border}`,
            borderRadius: 8, padding: '5px 9px', cursor: 'pointer', fontSize: 16,
            display: 'flex', alignItems: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
            {itemCount > 0 && (
              <span style={{
                position: 'absolute', top: -6, insetInlineEnd: -6,
                background: C.gold, color: '#0F2419',
                width: 18, height: 18, borderRadius: '50%',
                fontSize: 10, fontWeight: 900, fontFamily: 'Inter',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,.25)',
              }}>{itemCount > 9 ? '9+' : itemCount}</span>
            )}
          </button>
          <button onClick={() => router.push('/track')} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 100, padding: isMobile ? '5px 12px' : '7px 16px', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: C.text, fontFamily: font }}>
            {isAr ? 'تتبع' : 'Suivre'}
          </button>
        </div>
      </nav>

      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(145deg, #060e08, #0F2419, #1a3a28)',
        paddingTop: isMobile ? 90 : 100, paddingBottom: isMobile ? 32 : 44,
        paddingLeft: isMobile ? 20 : 40, paddingRight: isMobile ? 20 : 40,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(36,77,59,.4) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 14 : 20, alignItems: isMobile ? 'stretch' : 'center' }}>
            {/* Title */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#DAC08B', textTransform: 'uppercase', letterSpacing: 3, marginBottom: 6, fontFamily: font }}>
                {isAr ? 'مجموعة إحسان' : 'COLLECTION IHSEN'}
              </div>
              <h1 style={{ fontSize: isMobile ? 26 : 34, fontWeight: 900, color: '#fff', margin: 0, fontFamily: 'Cairo, sans-serif' }}>
                {isAr ? 'جميع المنتجات' : 'Tous les produits'}
              </h1>
            </div>
            {/* Search */}
            <div style={{ position: 'relative', width: isMobile ? '100%' : 300 }}>
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder={isAr ? 'ابحثي عن منتج...' : 'Rechercher...'}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: isAr ? '10px 38px 10px 14px' : '10px 14px 10px 38px',
                  borderRadius: 100, border: '1.5px solid rgba(255,255,255,.15)',
                  background: 'rgba(255,255,255,.07)', backdropFilter: 'blur(10px)',
                  color: '#fff', fontSize: 13, fontFamily: font, outline: 'none',
                }}
              />
              <span style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', [isAr ? 'right' : 'left']: 13, display: 'flex', alignItems: 'center', opacity: .5 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </span>
              {search && (
                <button onClick={() => setSearch('')} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', [isAr ? 'left' : 'right']: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.5)', fontSize: 16 }}>×</button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── BODY: sidebar + grid ─────────────────────────────────────────── */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '20px 16px 60px' : '28px 32px 80px', display: 'flex', gap: 28, alignItems: 'flex-start' }}>

        {/* ── SIDEBAR (desktop only) ─────────────────────────────────────── */}
        {isDesktop && (
          <aside data-reveal data-reveal-dir="right" style={{
            width: 230, flexShrink: 0, position: 'sticky', top: 80,
            background: C.panel, border: `1px solid ${C.border}`,
            borderRadius: 18, padding: 22,
            boxShadow: isDark ? 'none' : '0 2px 16px rgba(0,0,0,.06)',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: C.text, fontFamily: font }}>
                {isAr ? '🎛 الفلاتر' : '🎛 Filtres'}
              </span>
              {activeFilterCount > 0 && (
                <button onClick={clearAll} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: C.gold, fontFamily: font, fontWeight: 700 }}>
                  {isAr ? 'مسح الكل' : 'Tout effacer'} ({activeFilterCount})
                </button>
              )}
            </div>
            <FilterPanel />
          </aside>
        )}

        {/* ── MAIN ───────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Category tabs + mobile filter button */}
          <div data-reveal style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
            {[{ id: 'all', ar: 'الكل', fr: 'Tous' }, ...CATEGORIES].map(cat => {
              const active = activeCat === cat.id;
              return (
                <button key={cat.id}
                  onClick={() => { setActiveCat(cat.id); router.replace(`/products${cat.id !== 'all' ? `?cat=${cat.id}` : ''}`, { scroll: false }); }}
                  style={{
                    padding: isMobile ? '7px 14px' : '8px 20px', borderRadius: 100,
                    border: active ? 'none' : `1.5px solid ${C.border}`,
                    background: active ? `linear-gradient(135deg, ${C.green}, ${C.greenD})` : 'transparent',
                    color: active ? '#fff' : C.text,
                    fontSize: isMobile ? 12 : 13, fontWeight: active ? 700 : 500,
                    cursor: 'pointer', fontFamily: font, transition: 'all .2s',
                    boxShadow: active ? '0 4px 16px rgba(36,77,59,.35)' : 'none',
                  }}>
                  {isAr ? cat.ar : cat.fr}
                </button>
              );
            })}

            {/* Mobile filter button */}
            {!isDesktop && (
              <button onClick={() => setDrawerOpen(true)} style={{
                marginInlineStart: 'auto',
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 100,
                border: `1.5px solid ${activeFilterCount > 0 ? C.gold : C.border}`,
                background: activeFilterCount > 0 ? `${C.gold}15` : 'transparent',
                color: activeFilterCount > 0 ? C.gold : C.text,
                fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: font,
              }}>
                <span style={{ display:'inline-flex', alignItems:'center', gap:5 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
                  {isAr ? 'فلتر' : 'Filtrer'}
                </span>
                {activeFilterCount > 0 && (
                  <span style={{ background: C.gold, color: '#fff', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>
                    {activeFilterCount}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Active filter chips */}
          {(activeFilterCount > 0 || search) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              {priceRange !== 'all' && (
                <Chip label={isAr ? PRICE_RANGES.find(r => r.id === priceRange)!.ar : PRICE_RANGES.find(r => r.id === priceRange)!.fr} onRemove={() => setPriceRange('all')} C={C} font={font} />
              )}
              {selBadges.map(b => (
                <Chip key={b} label={isAr ? BADGE_META[b as keyof typeof BADGE_META].ar : BADGE_META[b as keyof typeof BADGE_META].fr} onRemove={() => toggleBadge(b)} C={C} font={font} />
              ))}
              {selColors.map(col => (
                <Chip key={col} label="" color={col} onRemove={() => toggleColor(col)} C={C} font={font} />
              ))}
              {sortBy !== 'default' && (
                <Chip label={isAr ? SORT_OPTIONS.find(s => s.id === sortBy)!.ar : SORT_OPTIONS.find(s => s.id === sortBy)!.fr} onRemove={() => setSortBy('default')} C={C} font={font} />
              )}
              {search && (
                <Chip label={`"${search}"`} onRemove={() => setSearch('')} C={C} font={font} />
              )}
              <button onClick={clearAll} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: C.muted, fontFamily: font, textDecoration: 'underline', padding: '2px 4px' }}>
                {isAr ? 'مسح الكل' : 'Tout effacer'}
              </button>
            </div>
          )}

          {/* Result info */}
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 18, fontFamily: font }}>
            {filtered.length === 0
              ? (isAr ? 'لا توجد نتائج' : 'Aucun résultat')
              : `${filtered.length} ${isAr ? 'منتج' : 'produit(s)'}`}
          </div>

          {/* Skeleton CSS */}
          <style>{`
            @keyframes ihsen-prod-shimmer {
              from { background-position: 200% 0; }
              to   { background-position: -200% 0; }
            }
            .ihsen-prod-skel {
              background: linear-gradient(90deg, ${skelA} 25%, ${skelB} 50%, ${skelA} 75%);
              background-size: 200% 100%;
              animation: ihsen-prod-shimmer 1.4s ease-in-out infinite;
              border-radius: 6px;
            }
          `}</style>

          {/* Grid */}
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: isMobile ? 12 : 18 }}>
              {Array.from({ length: cols * 2 }).map((_, i) => (
                <div key={i} style={{ background: C.card, borderRadius: isMobile ? 14 : 20, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                  <div className="ihsen-prod-skel" style={{ height: isMobile ? 140 : 180, borderRadius: 0 }} />
                  <div style={{ padding: isMobile ? '12px 12px 14px' : '14px 16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div className="ihsen-prod-skel" style={{ height: 10, width: '35%' }} />
                    <div className="ihsen-prod-skel" style={{ height: 14, width: '80%' }} />
                    <div className="ihsen-prod-skel" style={{ height: 11, width: '60%' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                      <div className="ihsen-prod-skel" style={{ height: 16, width: '38%' }} />
                      <div className="ihsen-prod-skel" style={{ height: 30, width: 70, borderRadius: 100 }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: C.muted, fontFamily: font }}>
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#AF8E4A" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 14, opacity: 0.6 }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8 }}>
                {isAr ? 'لا توجد منتجات بهذه المواصفات' : 'Aucun produit trouvé'}
              </div>
              <div style={{ fontSize: 13, marginBottom: 20 }}>
                {isAr ? 'جربي تعديل الفلاتر أو مسحها' : 'Essayez de modifier vos filtres'}
              </div>
              <button onClick={clearAll} style={{ background: C.green, color: '#fff', border: 'none', borderRadius: 100, padding: '10px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: font }}>
                {isAr ? 'مسح جميع الفلاتر' : 'Effacer tous les filtres'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: isMobile ? 12 : 18 }}>
              {filtered.map((p, i) => {
                const thumbnail = (p as {images?:string[]; thumbnail_index?:number}).images?.[(p as {thumbnail_index?:number}).thumbnail_index ?? 0] ?? null;
                const badgeMeta = p.badge ? BADGE_META[p.badge as keyof typeof BADGE_META] : null;
                const hovered   = hovCard === p.id;
                const origPrice = p.badge === 'sale' ? Math.round(p.price * 1.2) : null;
                return (
                  <div key={p.id} data-reveal data-reveal-delay={String(Math.min(i * 60, 360))}>
                  <div
                    onClick={() => router.push(`/products/${p.id}`)}
                    onMouseEnter={() => setHovCard(p.id)}
                    onMouseLeave={() => setHovCard(null)}
                    style={{
                      background: C.card, borderRadius: isMobile ? 14 : 20,
                      border: `1px solid ${hovered ? C.gold + '60' : C.border}`,
                      overflow: 'hidden', cursor: 'pointer',
                      transform: hovered ? 'translateY(-5px)' : 'none',
                      boxShadow: hovered ? '0 20px 56px rgba(0,0,0,.13)' : '0 2px 8px rgba(0,0,0,.04)',
                      transition: 'all .25s cubic-bezier(0.32,0.72,0,1)',
                    }}>
                    <div style={{
                      height: isMobile ? 140 : 180, position: 'relative',
                      background: thumbnail ? 'transparent' : `linear-gradient(140deg, ${p.colors[0]}cc, ${p.colors[1] ?? p.colors[0]}55)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: isMobile ? 52 : 64, overflow: 'hidden',
                    }}>
                      <div style={{ position: 'absolute', inset: 0, background: hovered ? 'rgba(0,0,0,.06)' : 'transparent', transition: 'background .25s', zIndex: 1 }} />
                      {thumbnail
                        ? <img src={thumbnail} alt={p.nameAr} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transform: hovered ? 'scale(1.05)' : 'scale(1)', transition: 'transform .3s cubic-bezier(0.32,0.72,0,1)' }} />
                        : <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ transform: hovered ? 'scale(1.1)' : 'scale(1)', transition: 'transform .3s', position: 'relative', zIndex: 1 }}><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
                      }
                      {badgeMeta && (
                        <div style={{ position: 'absolute', top: 10, insetInlineStart: 10, zIndex: 2, background: badgeMeta.bg, color: '#fff', fontSize: 10, fontWeight: 800, borderRadius: 100, padding: '3px 10px', fontFamily: font }}>
                          {isAr ? badgeMeta.ar : badgeMeta.fr}
                        </div>
                      )}
                      {(p as {in_stock?:boolean|null}).in_stock == false && (
                        <div style={{ position:'absolute', inset:0, zIndex:3, background:'rgba(0,0,0,.5)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <span style={{ background:'#EF4444', color:'#fff', fontSize:11, fontWeight:800, borderRadius:100, padding:'5px 16px', fontFamily:'Cairo, sans-serif', letterSpacing:.3, boxShadow:'0 2px 8px rgba(0,0,0,.3)' }}>{isAr?'نفد المخزون':'Épuisé'}</span>
                        </div>
                      )}
                      <div style={{ position: 'absolute', top: 10, insetInlineEnd: 10, zIndex: 2, width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,.18)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>🤍</div>
                    </div>

                    <div style={{ padding: isMobile ? '12px 12px 14px' : '14px 16px 18px' }}>
                      {(p as {in_stock?:boolean|null}).in_stock == false && (
                        <div style={{ display:'inline-flex', alignItems:'center', gap:4, background:'#EF444412', border:'1px solid #EF444430', borderRadius:100, padding:'2px 10px', marginBottom:7 }}>
                          <div style={{ width:6, height:6, borderRadius:'50%', background:'#EF4444' }} />
                          <span style={{ fontSize:10, color:'#EF4444', fontFamily:'Cairo, sans-serif', fontWeight:700 }}>{isAr?'نفد المخزون':'Épuisé'}</span>
                        </div>
                      )}
                      <div style={{ fontSize: 10, color: C.gold, fontWeight: 700, marginBottom: 3, fontFamily: font, textTransform: 'uppercase', letterSpacing: .5 }}>{p.category}</div>
                      <div style={{ fontSize: isMobile ? 12 : 14, fontWeight: 700, color: C.text, marginBottom: 8, fontFamily: 'Cairo, sans-serif', lineHeight: 1.3, minHeight: 36 }}>
                        {isAr ? p.nameAr : p.nameFr}
                      </div>
                      <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
                        {p.colors.slice(0, 5).map((col, ci) => (
                          <div key={ci} style={{ width: 13, height: 13, borderRadius: '50%', background: col, border: `1.5px solid ${C.border}` }} />
                        ))}
                        {p.colors.length > 5 && <div style={{ width: 13, height: 13, borderRadius: '50%', background: C.border, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, color: C.muted }}>+{p.colors.length - 5}</div>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <span style={{ fontSize: isMobile ? 14 : 16, fontWeight: 900, color: C.green, fontFamily: 'Inter' }}>{p.price.toLocaleString()}</span>
                          <span style={{ fontSize: 11, color: C.muted, marginInlineStart: 3, fontFamily: font }}>{isAr ? 'دج' : 'DA'}</span>
                          {origPrice && <div style={{ fontSize: 10, color: C.muted, textDecoration: 'line-through', fontFamily: 'Inter' }}>{origPrice.toLocaleString()}</div>}
                        </div>
                        {(p as {in_stock?:boolean|null}).in_stock == false
                          ? <span style={{ fontSize: isMobile?11:12, color:'#EF4444', fontFamily:font, fontWeight:700 }}>{isAr?'نفد':'Épuisé'}</span>
                          : <button onClick={e => { e.stopPropagation(); router.push(`/products/${p.id}`); }} style={{
                              background: hovered ? C.green : 'transparent', color: hovered ? '#fff' : C.green,
                              border: `1.5px solid ${C.green}`, borderRadius: 100,
                              padding: isMobile ? '5px 11px' : '6px 14px',
                              fontSize: isMobile ? 11 : 12, fontWeight: 700, cursor: 'pointer', fontFamily: font,
                              transition: 'all .2s', whiteSpace: 'nowrap',
                            }}>
                              {isAr ? 'اطلبي' : 'Choisir'}
                            </button>
                        }
                      </div>
                    </div>
                  </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Trust strip */}
          <div data-reveal style={{ marginTop: isMobile ? 48 : 60, padding: isMobile ? '22px 16px' : '26px 28px', background: isDark ? '#0a1810' : C.green, borderRadius: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: 16 }}>
              {TRUST_BADGES.map((b, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#DAC08B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d={(b as {d:string}).d}/></svg>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', fontFamily: font }}>{isAr ? b.ar : b.fr}</div>
                    <div style={{ fontSize: 10, color: 'rgba(218,192,139,.65)', fontFamily: font }}>{isAr ? b.descAr : b.descFr}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── MOBILE FILTER DRAWER ─────────────────────────────────────────── */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div onClick={() => setDrawerOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 300, backdropFilter: 'blur(3px)' }} />
          {/* Drawer */}
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 400,
            background: C.panel, borderRadius: '22px 22px 0 0',
            padding: '0 20px 32px', maxHeight: '85vh', overflowY: 'auto',
            boxShadow: '0 -8px 40px rgba(0,0,0,.25)',
            animation: 'slideUp .3s cubic-bezier(0.32,0.72,0,1)',
          }}>
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 6px' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: C.border }} />
            </div>
            {/* Title */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22, paddingTop: 4 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: C.text, fontFamily: font }}>
                {isAr ? '🎛 الفلاتر والترتيب' : '🎛 Filtres & Tri'}
              </span>
              <button onClick={() => setDrawerOpen(false)} style={{ background: `${C.border}60`, border: 'none', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', fontSize: 16, color: C.text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <FilterPanel inDrawer />
            {/* Apply button */}
            <button onClick={() => setDrawerOpen(false)} style={{
              width: '100%', marginTop: 24,
              background: `linear-gradient(135deg, ${C.green}, ${C.greenD})`,
              color: '#fff', border: 'none', borderRadius: 100,
              padding: '13px', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: font,
              boxShadow: '0 6px 20px rgba(36,77,59,.4)',
            }}>
              {isAr ? `عرض ${filtered.length} منتج` : `Voir ${filtered.length} produit(s)`}
            </button>
          </div>
        </>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>

      {/* Footer */}
      <footer style={{ background: '#060e08', padding: isMobile ? '22px 20px' : '26px 40px', borderTop: '1px solid rgba(36,77,59,.3)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Image src="/logos/icon-gold.svg" alt="إحسان" width={18} height={18} />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.4)', fontFamily: 'Cairo, sans-serif' }}>إحسان © 2026</span>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'rgba(255,255,255,.35)', fontFamily: font }}>{isAr ? 'الرئيسية' : 'Accueil'}</button>
            <button onClick={() => router.push('/track')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'rgba(255,255,255,.35)', fontFamily: font }}>{isAr ? 'تتبع الطلب' : 'Suivre'}</button>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── Chip component ─────────────────────────────────────────────────────────
function Chip({ label, color, onRemove, C, font }: { label: string; color?: string; onRemove: () => void; C: Record<string,string>; font: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: `${C.green}18`, border: `1px solid ${C.green}40`, borderRadius: 100, padding: color ? '3px 10px 3px 6px' : '3px 10px', fontSize: 11, color: C.green, fontFamily: font, fontWeight: 600 }}>
      {color && <div style={{ width: 14, height: 14, borderRadius: '50%', background: color, border: `1.5px solid ${C.border}`, flexShrink: 0 }} />}
      {label}
      <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.green, fontSize: 14, lineHeight: 1, padding: '0 0 0 2px', opacity: .7 }}>×</button>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#080f0a', fontFamily: 'Cairo, sans-serif', color: '#DAC08B', fontSize: 16 }}>
        جاري التحميل...
      </div>
    }>
      <ProductsContent />
    </Suspense>
  );
}
