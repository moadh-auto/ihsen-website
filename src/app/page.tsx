'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { TRUST_BADGES, FEATURED_PRODUCTS, CATEGORIES } from '@/lib/constants';
import { supabase, type Product as DbProduct } from '@/lib/supabase';
import { useCart } from '@/context/CartContext';

const BADGE_META = {
  new:  { ar:'جديد',     fr:'Nouveau',    bg:'#10B981', text:'#fff' },
  hot:  { ar:'رائج',     fr:'Populaire',  bg:'#EF4444', text:'#fff' },
  sale: { ar:'تخفيض',   fr:'Soldes',     bg:'#F59E0B', text:'#fff' },
};

export default function LandingPage() {
  const router = useRouter();

  const [lang,        setLang]       = useState<'ar'|'fr'>('ar');
  const [theme,       setTheme]      = useState<'light'|'dark'>('light');
  const [windowWidth, setWindowWidth] = useState(1200);
  const [hoveredCard, setHoveredCard] = useState<number|null>(null);
  const [navScrolled, setNavScrolled] = useState(false);
  const [social, setSocial] = useState({ instagram:'', facebook:'', tiktok:'', whatsapp:'' });

  const { itemCount, openCart } = useCart();

  // Products from Supabase
  const [products,     setProducts]   = useState<DbProduct[]>([]);
  const [prodLoading,  setProdLoad]   = useState(true);
  const [featuredIds,  setFeaturedIds] = useState<number[]>([]);

  // Contact info from Supabase
  const [contactInfo,  setContactInfo]  = useState({ phone:'', whatsapp:'', email:'', address:'', hours_ar:'', hours_fr:'' });
  const [socialLinks,  setSocialLinks]  = useState({ instagram:'', facebook:'', tiktok:'', whatsapp:'', youtube:'' });

  // Contact form states
  const [cName,     setCName]     = useState('');
  const [cPhone,    setCPhone]    = useState('');
  const [cMsg,      setCMsg]      = useState('');
  const [cSent,     setCsent]     = useState(false);
  const [cSending,  setCsending]  = useState(false);

  // Page loader phases: 'in' → 'out' → 'gone'
  const [loaderPhase, setLoader]     = useState<'in'|'out'|'gone'>('in');
  const loaderTimer                  = useRef<ReturnType<typeof setTimeout>|null>(null);

  // Scroll-reveal animation
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const html = document.documentElement;
    setLang((html.getAttribute('data-lang') as 'ar'|'fr') ?? 'ar');
    setTheme((html.getAttribute('data-theme') as 'light'|'dark') ?? 'light');
    const upd = () => setWindowWidth(window.innerWidth);
    upd();
    window.addEventListener('resize', upd);
    const onScroll = () => setNavScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);

    // Fetch real products from Supabase
    const minDelay = new Promise(r => setTimeout(r, 700)); // minimum loader time
    const fetchProd = supabase.from('products').select('*')
      .eq('active', true).order('sort_order', { ascending: true });
    
    const fetchSoc = supabase.from('site_settings').select('value').eq('key', 'social_links').maybeSingle();

    Promise.all([minDelay, fetchProd, fetchSoc]).then(([, { data: pData }, { data: sData }]) => {
      if (pData && pData.length > 0) setProducts(pData as DbProduct[]);
      if (sData?.value) {
        try { setSocial({ ...social, ...JSON.parse(sData.value) }); } catch {}
      }
      setProdLoad(false);
      setLoader('out');
      loaderTimer.current = setTimeout(() => setLoader('gone'), 600);
    }).catch(() => {
      // Even on error — dismiss the loader so user isn't stuck
      setProdLoad(false);
      setLoader('out');
      loaderTimer.current = setTimeout(() => setLoader('gone'), 600);
    });

    // Fetch contact info, social links, featured product IDs
    supabase.from('site_settings').select('key,value')
      .in('key', ['contact_info','social_links','featured_product_ids'])
      .then(({ data }) => {
        if (!data) return;
        for (const row of data as {key:string;value:string}[]) {
          try {
            if (row.key === 'contact_info')       setContactInfo(prev => ({ ...prev, ...JSON.parse(row.value) }));
            if (row.key === 'social_links')        setSocialLinks(prev => ({ ...prev, ...JSON.parse(row.value) }));
            if (row.key === 'featured_product_ids') setFeaturedIds(JSON.parse(row.value));
          } catch { /* keep default */ }
        }
      });

    // Intersection Observer for scroll-reveal animations
    const observerCb = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const id = (e.target as HTMLElement).dataset.reveal;
          if (id) setRevealed(prev => new Set([...prev, id]));
        }
      });
    };
    const observer = new IntersectionObserver(observerCb, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    // Expose observer on window so we can re-observe after async product load
    (window as unknown as {__ihsenObserver?: IntersectionObserver}).__ihsenObserver = observer;

    // Observe static elements after a short delay
    setTimeout(() => {
      document.querySelectorAll('[data-reveal]').forEach(el => observer.observe(el));
    }, 800);

    return () => {
      window.removeEventListener('resize', upd);
      window.removeEventListener('scroll', onScroll);
      if (loaderTimer.current) clearTimeout(loaderTimer.current);
      observer.disconnect();
      delete (window as unknown as {__ihsenObserver?: IntersectionObserver}).__ihsenObserver;
    };
  }, []);

  // Re-observe product cards after they render (products load async, after the main observer runs)
  useEffect(() => {
    if (prodLoading) return;
    const observer = (window as unknown as {__ihsenObserver?: IntersectionObserver}).__ihsenObserver;
    if (!observer) return;
    // Small delay to let React flush the new DOM nodes
    const t = setTimeout(() => {
      document.querySelectorAll('[data-reveal]').forEach(el => observer.observe(el));
    }, 80);
    return () => clearTimeout(t);
  }, [prodLoading]);

  const isAr      = lang === 'ar';
  const isDark    = theme === 'dark';
  const isMobile  = windowWidth < 640;
  const isDesktop = windowWidth >= 1024;
  const font      = isAr ? 'Cairo, sans-serif' : 'Inter, sans-serif';
  const fontDeco  = 'Cormorant Garamond, serif';

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
    border: isDark ? '#244D3B' : '#E8DFD2',
    text:   isDark ? '#F0EBE3' : '#1a1a1a',
    muted:  isDark ? '#7A9C8A' : '#6B6B6B',
    green:  '#244D3B',
    greenD: '#1D4939',
    hero:   '#0F2419',
    gold:   '#AF8E4A',
    goldL:  '#DAC08B',
  };

  // Scroll to section helper
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Reveal style helper — returns inline style for scroll-reveal elements
  const rv = (id: string, dir: 'up'|'left'|'right'|'fade' = 'up', delay = 0): React.CSSProperties => {
    const vis = revealed.has(id);
    const transforms: Record<string, string> = {
      up:    'translateY(36px)',
      left:  'translateX(-36px)',
      right: 'translateX(36px)',
      fade:  'scale(0.97)',
    };
    return {
      opacity:    vis ? 1 : 0,
      transform:  vis ? 'none' : transforms[dir],
      transition: `opacity 0.65s cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 0.65s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
    };
  };

  // Use real Supabase products when available, fallback to hardcoded
  const allProducts = products.length > 0 ? products : FEATURED_PRODUCTS as unknown as DbProduct[];

  // Homepage showcase: use pinned featured IDs if set, else first 4
  const showcaseProducts = (() => {
    if (featuredIds.length > 0) {
      const pinned = featuredIds.map(id => allProducts.find(p => p.id === id)).filter(Boolean) as DbProduct[];
      if (pinned.length > 0) return pinned.slice(0, 4);
    }
    return allProducts.slice(0, 4);
  })();
  const featuredProducts = allProducts.slice(0, 6);

  // ── Shared nav ────────────────────────────────────────────────────────────
  const Nav = () => (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
      padding: isMobile ? '12px 16px' : '14px 32px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: navScrolled
        ? (isDark ? 'rgba(8,15,10,.96)' : 'rgba(249,246,241,.96)')
        : 'transparent',
      backdropFilter: navScrolled ? 'blur(16px)' : 'none',
      borderBottom: navScrolled ? `1px solid ${C.border}` : '1px solid transparent',
      transition: 'all .35s cubic-bezier(0.32,0.72,0,1)',
    }}>
      {/* Logo */}
      <div style={{ display:'flex', alignItems:'center', gap:9, cursor:'pointer' }} onClick={() => router.push('/')}>
        <Image src={(!navScrolled || isDark) ? '/logos/icon-gold.svg' : '/logos/icon-green.svg'} alt="إحسان" width={isMobile?24:30} height={isMobile?24:30} />
        {!isMobile && (
          <div>
            <div style={{ fontWeight:800, fontSize:16, color: (!navScrolled || isDark) ? C.gold : C.green, fontFamily:'Cairo, sans-serif', lineHeight:1 }}>إحسان</div>
            <div style={{ fontSize:9, letterSpacing:3, color: navScrolled ? C.gold : '#DAC08B', fontFamily:'Inter, sans-serif', textTransform:'uppercase' }}>ihsen</div>
          </div>
        )}
      </div>

      {/* Links — desktop */}
      {isDesktop && (
        <div style={{ display:'flex', gap:24, alignItems:'center' }}>
          {[
            { ar:'المنتجات',   fr:'Produits',          action: () => router.push('/products') },
            { ar:'من نحن',     fr:'Qui sommes-nous',   action: () => scrollTo('about') },
            { ar:'تواصلي معنا',fr:'Contact',           action: () => scrollTo('contact') },
            { ar:'تتبع طلبي',  fr:'Suivre commande',   action: () => router.push('/track') },
          ].map((l, i) => (
            <button key={i} onClick={l.action} style={{
              background:'none', border:'none', cursor:'pointer',
              fontSize:14, fontWeight:600, fontFamily:font,
              color: navScrolled ? C.text : 'rgba(255,255,255,.85)',
              transition:'color .2s',
              padding:'4px 2px',
              position:'relative',
            }}
              onMouseEnter={e => { e.currentTarget.style.color = navScrolled ? C.green : C.gold; }}
              onMouseLeave={e => { e.currentTarget.style.color = navScrolled ? C.text : 'rgba(255,255,255,.85)'; }}
            >{isAr ? l.ar : l.fr}</button>
          ))}
        </div>
      )}

      {/* Right controls */}
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <button onClick={toggleTheme} style={{ background:'none', border:`1px solid ${navScrolled ? C.border : 'rgba(255,255,255,.2)'}`, borderRadius:8, padding:'6px 8px', cursor:'pointer', display:'flex', alignItems:'center' }}>
          {isDark
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={navScrolled?C.text:'#fff'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={navScrolled?C.text:'#fff'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
          }
        </button>
        <button onClick={toggleLang} style={{ background:'none', border:`1px solid ${navScrolled ? C.border : 'rgba(255,255,255,.2)'}`, borderRadius:8, padding:'4px 8px', cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
          <span style={{ fontSize:11, fontFamily:'Inter, sans-serif', fontWeight: isAr ? 800 : 400, color: isAr ? C.gold : (navScrolled ? C.muted : 'rgba(255,255,255,.45)') }}>AR</span>
          <span style={{ fontSize:10, color: navScrolled ? C.border : 'rgba(255,255,255,.25)' }}>|</span>
          <span style={{ fontSize:11, fontFamily:'Inter, sans-serif', fontWeight: isAr ? 400 : 800, color: isAr ? (navScrolled ? C.muted : 'rgba(255,255,255,.45)') : C.gold }}>FR</span>
        </button>
        {/* Cart button */}
        <button onClick={openCart} style={{
          position:'relative', background:'none',
          border:`1px solid ${navScrolled ? C.border : 'rgba(255,255,255,.2)'}`,
          borderRadius:8, padding:'5px 9px', cursor:'pointer', fontSize:16,
          display:'flex', alignItems:'center', color: navScrolled ? C.text : '#fff',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
          {itemCount > 0 && (
            <span style={{
              position:'absolute', top:-6, insetInlineEnd:-6,
              background:C.gold, color:'#0F2419',
              width:18, height:18, borderRadius:'50%',
              fontSize:10, fontWeight:900, fontFamily:'Inter',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 2px 6px rgba(0,0,0,.25)',
            }}>{itemCount > 9 ? '9+' : itemCount}</span>
          )}
        </button>
        <button onClick={() => router.push('/products')} style={{
          background: `linear-gradient(135deg, ${C.gold}, #8B6E35)`,
          color:'#0F2419', border:'none', borderRadius:100,
          padding: isMobile ? '7px 14px' : '9px 20px',
          fontSize: isMobile ? 12 : 13, fontWeight:800, cursor:'pointer', fontFamily:font,
          boxShadow:'0 4px 14px rgba(175,142,74,.35)',
        }}>
          {isAr ? 'تسوقي' : 'Shop'}
        </button>
      </div>
    </nav>
  );

  // ── Shared skeleton shimmer colors (theme-aware) ─────────────────────────
  const skelA = isDark ? '#0f2419' : '#e8f0eb';
  const skelB = isDark ? '#1a3a28' : '#f3f8f5';

  // ── Page Loader ──────────────────────────────────────────────────────────
  const PageLoader = () => (
    <div style={{
      position:'fixed', inset:0, zIndex:9999,
      background:'linear-gradient(145deg, #060e08 0%, #0F2419 55%, #1a3a28 100%)',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:0,
      opacity: loaderPhase === 'out' ? 0 : 1,
      transform: loaderPhase === 'out' ? 'scale(1.04)' : 'scale(1)',
      transition:'opacity 0.55s cubic-bezier(0.76,0,0.24,1), transform 0.55s cubic-bezier(0.76,0,0.24,1)',
      pointerEvents: loaderPhase === 'out' ? 'none' : 'all',
    }}>
      <style>{`
        @keyframes ihsen-logo-glow {
          0%,100% { filter:drop-shadow(0 0 10px rgba(175,142,74,.35)); }
          50%      { filter:drop-shadow(0 0 28px rgba(175,142,74,.8)); }
        }
        @keyframes ihsen-loader-bar {
          0%   { width:0%;   opacity:1; }
          85%  { width:100%; opacity:1; }
          100% { width:100%; opacity:0; }
        }
        @keyframes ihsen-loader-dots {
          0%,80%,100% { opacity:.2; transform:scale(.7); }
          40%          { opacity:1;  transform:scale(1); }
        }
        @keyframes ihsen-loader-fade {
          from { opacity:0; transform:translateY(10px); }
          to   { opacity:1; transform:translateY(0); }
        }
      `}</style>

      {/* Logo */}
      <div style={{ animation:'ihsen-loader-fade .5s ease both', animationDelay:'0ms' }}>
        <Image
          src="/logos/full-vertical-gold.svg"
          alt="إحسان"
          width={88}
          height={120}
          style={{ animation:'ihsen-logo-glow 2s ease-in-out infinite', display:'block' }}
        />
      </div>

      {/* Tagline */}
      <div style={{
        marginTop:20, fontSize:11, letterSpacing:4, color:'rgba(218,192,139,.55)',
        fontFamily:'Cairo, sans-serif', textTransform:'uppercase',
        animation:'ihsen-loader-fade .5s ease both', animationDelay:'120ms',
      }}>
        {isAr ? 'أناقة · احتشام · جزائر' : 'Élégance · Pudeur · Algérie'}
      </div>

      {/* Progress bar */}
      <div style={{
        marginTop:32, width:120, height:2,
        background:'rgba(175,142,74,.18)', borderRadius:1, overflow:'hidden',
        animation:'ihsen-loader-fade .5s ease both', animationDelay:'200ms',
      }}>
        <div style={{
          height:'100%', background:'linear-gradient(90deg, #AF8E4A, #DAC08B)',
          borderRadius:1, animation:'ihsen-loader-bar .65s ease-out .2s both',
        }} />
      </div>

      {/* Dots */}
      <div style={{
        marginTop:20, display:'flex', gap:6,
        animation:'ihsen-loader-fade .5s ease both', animationDelay:'280ms',
      }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            width:5, height:5, borderRadius:'50%', background:'rgba(175,142,74,.5)',
            animation:`ihsen-loader-dots 1.2s ease-in-out infinite`,
            animationDelay:`${i * 200}ms`,
          }} />
        ))}
      </div>
    </div>
  );

  // ── Product Skeleton Card ────────────────────────────────────────────────
  const SkeletonCard = ({ i }: { i: number }) => (
    <div style={{
      background:C.card, borderRadius:isMobile?14:20,
      border:`1px solid ${C.border}`, overflow:'hidden',
      animationDelay:`${i * 80}ms`,
    }}>
      <style>{`
        @keyframes ihsen-web-shimmer {
          from { background-position: 200% 0; }
          to   { background-position: -200% 0; }
        }
        .ihsen-web-skel {
          background: linear-gradient(90deg, ${skelA} 25%, ${skelB} 50%, ${skelA} 75%);
          background-size: 200% 100%;
          animation: ihsen-web-shimmer 1.4s ease-in-out infinite;
          border-radius: 6px;
        }
      `}</style>
      {/* Image area */}
      <div className="ihsen-web-skel" style={{ height:isMobile?140:180, borderRadius:0 }} />
      {/* Info area */}
      <div style={{ padding:isMobile?'12px 12px 14px':'16px 18px 20px', display:'flex', flexDirection:'column', gap:10 }}>
        <div className="ihsen-web-skel" style={{ height:10, width:'35%' }} />
        <div className="ihsen-web-skel" style={{ height:13, width:'75%' }} />
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:4 }}>
          <div className="ihsen-web-skel" style={{ height:17, width:'40%' }} />
          <div className="ihsen-web-skel" style={{ height:30, width:64, borderRadius:100 }} />
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:C.bg, fontFamily:font, direction:isAr?'rtl':'ltr', overflowX:'hidden' }}>
      <style>{`
        html { scroll-behavior: smooth; }
        [data-reveal] { will-change: opacity, transform; }
      `}</style>
      {loaderPhase !== 'gone' && <PageLoader />}
      <Nav />

      {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
      <section style={{
        minHeight: '100vh', position: 'relative', overflow: 'hidden',
        background: `linear-gradient(145deg, #060e08 0%, #0F2419 45%, #1a3a28 100%)`,
        display: 'flex', alignItems: 'center',
      }}>
        {/* Decorative orbs */}
        <div style={{ position:'absolute', top:'15%', left: isAr?'auto':'10%', right: isAr?'10%':'auto', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle, rgba(36,77,59,.5) 0%, transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:'10%', right: isAr?'auto':'5%', left: isAr?'5%':'auto', width:350, height:350, borderRadius:'50%', background:'radial-gradient(circle, rgba(175,142,74,.12) 0%, transparent 70%)', pointerEvents:'none' }} />

        <div style={{ maxWidth:1200, width:'100%', margin:'0 auto', padding: isMobile?'110px 20px 120px':'120px 40px 120px', display:'grid', gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr', gap:40, alignItems:'center' }}>

          {/* Content */}
          <div style={{ order: isAr ? 2 : 1 }}>
            {/* Eyebrow */}
            <div data-reveal="hero-eyebrow" style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(175,142,74,.12)', border:'1px solid rgba(175,142,74,.25)', borderRadius:100, padding:'6px 16px', marginBottom:24, ...rv('hero-eyebrow','up',0) }}>
              <span style={{ fontSize:14 }}>✨</span>
              <span style={{ fontSize:12, fontWeight:700, color:C.goldL, fontFamily:font, letterSpacing:.5 }}>
                {isAr ? 'الأناقة المحتشمة الجزائرية' : 'Mode modeste algérienne'}
              </span>
            </div>

            {/* Heading */}
            <h1 data-reveal="hero-h1" style={{ margin:'0 0 16px', lineHeight:1.1, ...rv('hero-h1','up',100) }}>
              <span style={{ display:'block', fontSize: isMobile?40:isDesktop?64:52, fontWeight:900, color:'#fff', fontFamily:'Cairo, sans-serif' }}>
                {isAr ? 'ملابس محتشمة' : 'Mode'}
              </span>
              <span style={{ display:'block', fontSize: isMobile?46:isDesktop?72:58, fontWeight:900, color:C.gold, fontFamily: isAr?'Cairo, sans-serif':fontDeco, fontStyle: isAr?'normal':'italic' }}>
                {isAr ? 'تُعبّر عنكِ' : 'pudique & chic'}
              </span>
            </h1>

            <p data-reveal="hero-sub" style={{ fontSize: isMobile?14:16, color:'rgba(240,235,227,.65)', marginBottom:36, maxWidth:440, lineHeight:1.7, fontFamily:font, ...rv('hero-sub','up',200) }}>
              {isAr
                ? 'مجموعة حصرية من الفولار، الحجاب، العبايات والهوديز المصممة خصيصاً للمرأة الجزائرية — جودة عالية، توصيل لـ 69 ولاية.'
                : 'Collection exclusive de foulards, hijabs, robes et hoodies pour la femme algérienne — qualité premium, livraison nationale.'}
            </p>

            {/* CTAs */}
            <div data-reveal="hero-cta" style={{ display:'flex', gap:12, flexWrap:'wrap', ...rv('hero-cta','up',300) }}>
              <button onClick={() => router.push('/products')} style={{
                background:`linear-gradient(135deg, ${C.gold}, #8B6E35)`,
                color:'#0F2419', border:'none', borderRadius:100,
                padding: isMobile?'13px 24px':'15px 32px',
                fontSize: isMobile?14:16, fontWeight:800, cursor:'pointer', fontFamily:font,
                boxShadow:'0 8px 28px rgba(175,142,74,.4)',
              }}>
                {isAr ? 'تصفحي المجموعة ←' : 'Voir la collection →'}
              </button>
              <button onClick={() => scrollTo('contact')} style={{
                background:'transparent', color:'rgba(255,255,255,.85)',
                border:'1.5px solid rgba(255,255,255,.2)', borderRadius:100,
                padding: isMobile?'13px 22px':'15px 30px',
                fontSize: isMobile?14:15, fontWeight:600, cursor:'pointer', fontFamily:font,
              }}>
                {isAr ? 'تواصلي معنا' : 'Nous contacter'}
              </button>
            </div>

            {/* Mini stats */}
            {!isMobile && (
              <div data-reveal="hero-stats" style={{ display:'flex', gap:32, marginTop:44, paddingTop:32, borderTop:'1px solid rgba(255,255,255,.08)', ...rv('hero-stats','up',380) }}>
                {[
                  { num:'69', label: isAr?'ولاية':'wilayas' },
                  { num:'+500', label: isAr?'زبونة راضية':'clientes' },
                  { num:'100%', label: isAr?'دفع عند الاستلام':'paiement livraison' },
                ].map((s,i) => (
                  <div key={i}>
                    <div style={{ fontSize:28, fontWeight:900, color:C.gold, fontFamily:'Inter, sans-serif' }}>{s.num}</div>
                    <div style={{ fontSize:12, color:'rgba(255,255,255,.45)', fontFamily:font }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Showcase cards */}
          <div data-reveal="hero-cards" style={{ order: isDesktop ? (isAr?1:2) : 2, position:'relative', height: isDesktop ? 480 : 'auto', padding: isDesktop ? 0 : '10px 0', display:'flex', alignItems:'center', justifyContent:'center', ...rv('hero-cards', isDesktop ? (isAr?'left':'right') : 'up', 150), marginTop: isDesktop ? 0 : (isMobile ? 10 : 30) }}>
            {/* Glow */}
            <div style={{ position:'absolute', width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle, rgba(175,142,74,.18) 0%, transparent 70%)', top:'50%', left:'50%', transform:'translate(-50%,-50%)', pointerEvents:'none' }} />

            {/* 4 product cards in a 2×2 staggered grid */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: isMobile ? 12 : 16, position:'relative', zIndex:1 }}>
                {showcaseProducts.map((p, i) => {
                  const rotations = ['rotate(-2deg)', 'rotate(1.5deg)', 'rotate(2deg)', 'rotate(-1deg)'];
                  const scales    = [1, 1.03, 0.97, 1.02];
                  const thumb     = p.images?.[p.thumbnail_index ?? 0] ?? null;
                  const hasImg    = !!thumb;
                  const col0      = p.colors?.[0] ?? C.hero;
                  const col1      = p.colors?.[1] ?? col0;
                  return (
                    <div key={p.id} onClick={() => router.push(`/products/${p.id}`)}
                      style={{
                        width: isMobile ? 145 : 180, height: isMobile ? 185 : 220, borderRadius:20,
                        background: hasImg
                          ? col0
                          : `linear-gradient(140deg, ${col0}dd, ${col1}88)`,
                        border:'1px solid rgba(255,255,255,.12)',
                        display:'flex', flexDirection:'column',
                        cursor:'pointer', textAlign:'center',
                        transform: `${rotations[i]} scale(${scales[i]})`,
                        boxShadow:'0 16px 48px rgba(0,0,0,.35)',
                        transition:'transform .3s',
                        overflow:'hidden', position:'relative',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.transform = 'rotate(0deg) scale(1.06)')}
                      onMouseLeave={e => (e.currentTarget.style.transform = `${rotations[i]} scale(${scales[i]})`)}
                    >
                      {/* Product image */}
                      {hasImg
                        ? <img src={thumb!} alt={p.name_ar} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                        : null
                      }

                      {/* Gradient overlay for text readability */}
                      <div style={{ position:'absolute', inset:0, background: hasImg
                        ? 'linear-gradient(to top, rgba(0,0,0,.78) 0%, rgba(0,0,0,.22) 55%, rgba(0,0,0,0) 100%)'
                        : 'transparent'
                      }} />

                      {/* Card content */}
                      <div style={{ position:'relative', zIndex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent: hasImg ? 'flex-end' : 'center', height:'100%', gap:6, padding:'12px 10px' }}>
                        {!hasImg && (
                          <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
                        )}
                        {p.badge && (
                          <div style={{ background: BADGE_META[p.badge as keyof typeof BADGE_META]?.bg, color:'#fff', fontSize:10, fontWeight:700, borderRadius:100, padding:'3px 10px', fontFamily:font, alignSelf:'flex-start' }}>
                            {isAr ? BADGE_META[p.badge as keyof typeof BADGE_META]?.ar : BADGE_META[p.badge as keyof typeof BADGE_META]?.fr}
                          </div>
                        )}
                        <div style={{ fontSize:13, fontWeight:700, color:'#fff', fontFamily:'Cairo, sans-serif', lineHeight:1.3, textShadow: hasImg?'0 1px 4px rgba(0,0,0,.6)':'none', width:'100%', textAlign:'right' }}>
                          {isAr ? p.name_ar : p.name_fr}
                        </div>
                        <div style={{ fontSize:14, fontWeight:800, color:C.goldL, fontFamily:'Inter, sans-serif', textShadow: hasImg?'0 1px 4px rgba(0,0,0,.5)':'none', width:'100%', textAlign:'right' }}>
                          {p.price.toLocaleString()} <span style={{ fontSize:11, fontWeight:600, fontFamily:'Cairo,sans-serif' }}>{isAr?'دج':'DA'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
          </div>
        </div>

        {/* Scroll hint */}
        <div style={{ position:'absolute', bottom:28, left:'50%', transform:'translateX(-50%)', display:'flex', flexDirection:'column', alignItems:'center', gap:6, opacity:.45 }}>
          <span style={{ fontSize:11, color:'#fff', fontFamily:font, letterSpacing:2 }}>
            {isAr ? 'اكتشفي' : 'DÉCOUVRIR'}
          </span>
          <div style={{ width:1, height:40, background:'linear-gradient(to bottom, #fff, transparent)' }} />
        </div>
      </section>

      {/* ══ TRUST STRIP ════════════════════════════════════════════════════════ */}
      <section style={{ background: isDark ? '#0a1a0f' : C.green, padding: isMobile?'28px 20px':'24px 40px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', display:'grid', gridTemplateColumns: isMobile?'1fr 1fr':'repeat(4,1fr)', gap: isMobile?16:12 }}>
          {TRUST_BADGES.map((b, i) => (
            <div key={i} data-reveal={`trust-${i}`} style={{ display:'flex', alignItems:'center', gap:12, ...rv(`trust-${i}`,'up', i*80) }}>
              <svg width={isMobile?26:28} height={isMobile?26:28} viewBox="0 0 24 24" fill="none" stroke="#DAC08B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}><path d={(b as {d:string}).d}/></svg>
              <div>
                <div style={{ fontSize: isMobile?12:13, fontWeight:700, color:'#fff', fontFamily:font }}>{isAr ? b.ar : b.fr}</div>
                <div style={{ fontSize:11, color:'rgba(218,192,139,.7)', fontFamily:font }}>{isAr ? b.descAr : b.descFr}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ FEATURED PRODUCTS ══════════════════════════════════════════════════ */}
      <section id="products" style={{ padding: isMobile?'56px 16px':'80px 40px', background: C.bg }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          {/* Section header */}
          <div data-reveal="prod-hdr" style={{ textAlign:'center', marginBottom: isMobile?36:52, ...rv('prod-hdr','up',0) }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.gold, textTransform:'uppercase', letterSpacing:3, marginBottom:10, fontFamily:font }}>
              {isAr ? 'اختياراتنا المميزة' : 'SÉLECTION PREMIUM'}
            </div>
            <h2 style={{ fontSize: isMobile?26:36, fontWeight:900, color:C.text, margin:'0 0 12px', fontFamily:'Cairo, sans-serif' }}>
              {isAr ? 'من مجموعة إحسان' : 'Collection Ihsen'}
            </h2>
            <p style={{ fontSize:14, color:C.muted, maxWidth:420, margin:'0 auto', fontFamily:font, lineHeight:1.6 }}>
              {isAr ? 'قطع مختارة بعناية لتناسب ذوقكِ ومتطلبات حياتكِ اليومية' : 'Pièces sélectionnées avec soin pour votre style de vie'}
            </p>
          </div>

          {/* Category quick-links */}
          <div data-reveal="prod-cats" style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'center', marginBottom: isMobile?28:40, ...rv('prod-cats','up',120) }}>
            {CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => router.push(`/products?cat=${cat.id}`)} style={{
                background:'transparent', border:`1.5px solid ${C.border}`, borderRadius:100,
                padding: isMobile?'7px 16px':'8px 20px',
                fontSize:13, fontWeight:600, cursor:'pointer', color:C.text, fontFamily:font,
                transition:'all .2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.gold; e.currentTarget.style.color = C.gold; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.text; }}
              >
                {isAr ? cat.ar : cat.fr}
              </button>
            ))}
          </div>

          {/* Grid */}
          <div style={{ display:'grid', gridTemplateColumns: isMobile?'1fr 1fr': isDesktop?'repeat(3,1fr)':'repeat(2,1fr)', gap: isMobile?12:20 }}>
            {prodLoading
              ? Array.from({length:6}).map((_,i) => <SkeletonCard key={i} i={i} />)
              : featuredProducts.map((p, i) => {
                  const badge     = (p as DbProduct).badge ?? ((p as unknown as {badge?:string}).badge);
                  const nameAr    = (p as DbProduct).name_ar    ?? (p as unknown as {nameAr:string}).nameAr;
                  const nameFr    = (p as DbProduct).name_fr    ?? (p as unknown as {nameFr:string}).nameFr;
                  const pColors   = (p as DbProduct).colors     ?? [];
                  const thumbnail = (p as DbProduct).images?.[((p as DbProduct).thumbnail_index ?? 0)] ?? null;
                  const badgeMeta = badge ? BADGE_META[badge as keyof typeof BADGE_META] : null;
                  const hovered   = hoveredCard === p.id;
                  const origPrice = badge === 'sale' ? Math.round(p.price * 1.2) : (p as DbProduct).original_price ?? null;
                  const inStock   = (p as DbProduct).in_stock ?? true;

                  const cardId = `prod-card-${p.id}`;
                  return (
                    <div key={p.id}
                      data-reveal={cardId}
                      onClick={() => router.push(`/products/${p.id}`)}
                      onMouseEnter={() => setHoveredCard(p.id)}
                      onMouseLeave={() => setHoveredCard(null)}
                      style={{
                        background:C.card, borderRadius:isMobile?14:20,
                        border:`1px solid ${hovered ? C.gold+'60' : C.border}`,
                        overflow:'hidden', cursor:'pointer',
                        transform: revealed.has(cardId)
                          ? (hovered ? 'translateY(-4px)' : 'none')
                          : 'translateY(36px)',
                        opacity: revealed.has(cardId) ? 1 : 0,
                        boxShadow:hovered ? '0 16px 48px rgba(0,0,0,.12)' : '0 2px 8px rgba(0,0,0,.04)',
                        transition:`opacity 0.55s cubic-bezier(0.22,1,0.36,1) ${i*80}ms, transform 0.55s cubic-bezier(0.22,1,0.36,1) ${i*80}ms, border .25s, box-shadow .25s`,
                      }}>

                      {/* Product visual */}
                      <div style={{
                        height:isMobile?140:180, position:'relative',
                        background: thumbnail ? 'transparent' : `linear-gradient(140deg, ${pColors[0]??'#244D3B'}cc, ${pColors[1]??pColors[0]??'#AF8E4A'}55)`,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:isMobile?52:64, overflow:'hidden',
                      }}>
                        <div style={{ position:'absolute', inset:0, background:hovered?'rgba(0,0,0,.08)':'transparent', transition:'background .25s', zIndex:1 }} />
                        {thumbnail
                          ? <img src={thumbnail} alt={nameAr} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block', transform:hovered?'scale(1.04)':'scale(1)', transition:'transform .3s cubic-bezier(0.32,0.72,0,1)' }} />
                          : <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ transform:hovered?'scale(1.1)':'scale(1)', transition:'transform .25s', position:'relative', zIndex:1 }}><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
                        }
                        {badgeMeta && (
                          <div style={{ position:'absolute', top:10, insetInlineStart:10, zIndex:2, background:badgeMeta.bg, color:'#fff', fontSize:10, fontWeight:800, borderRadius:100, padding:'3px 10px', fontFamily:font }}>
                            {isAr ? badgeMeta.ar : badgeMeta.fr}
                          </div>
                        )}
                        {!inStock && (
                          <div style={{ position:'absolute', inset:0, zIndex:3, background:'rgba(0,0,0,.5)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <span style={{ background:'#EF4444', color:'#fff', fontSize:11, fontWeight:800, borderRadius:100, padding:'5px 16px', fontFamily:'Cairo, sans-serif', boxShadow:'0 2px 8px rgba(0,0,0,.3)' }}>{isAr?'نفد المخزون':'Épuisé'}</span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div style={{ padding:isMobile?'12px 12px 14px':'16px 18px 20px' }}>
                        <div style={{ fontSize:11, color:C.gold, fontWeight:700, marginBottom:4, fontFamily:font }}>{p.category}</div>
                        <div style={{ fontSize:isMobile?13:14, fontWeight:700, color:C.text, marginBottom:8, fontFamily:'Cairo, sans-serif', lineHeight:1.35 }}>
                          {isAr ? nameAr : nameFr}
                        </div>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
                          <div>
                            <span style={{ fontSize:isMobile?15:17, fontWeight:900, color:C.green, fontFamily:'Inter, sans-serif' }}>{p.price.toLocaleString()}</span>
                            <span style={{ fontSize:11, color:C.muted, fontFamily:font, marginInlineStart:3 }}>{isAr?'دج':'DA'}</span>
                            {origPrice && <span style={{ fontSize:11, color:C.muted, textDecoration:'line-through', marginInlineStart:6, fontFamily:'Inter' }}>{String(origPrice)}</span>}
                          </div>
                          {!inStock
                            ? <span style={{ fontSize:isMobile?11:12, color:'#EF4444', fontFamily:font, fontWeight:700 }}>{isAr?'نفد':'Épuisé'}</span>
                            : <button onClick={e => { e.stopPropagation(); router.push(`/products/${p.id}`); }}
                                style={{ background:hovered?C.green:'transparent', color:hovered?'#fff':C.green, border:`1.5px solid ${C.green}`, borderRadius:100, padding:isMobile?'5px 12px':'6px 14px', fontSize:isMobile?11:12, fontWeight:700, cursor:'pointer', fontFamily:font, transition:'all .2s', whiteSpace:'nowrap' }}>
                                {isAr?'اطلبي':'Choisir'}
                              </button>
                          }
                        </div>
                      </div>
                    </div>
                  );
                })
            }
          </div>

          {/* View all */}
          <div data-reveal="prod-more" style={{ textAlign:'center', marginTop: isMobile?32:44, ...rv('prod-more','up',0) }}>
            <button onClick={() => router.push('/products')} style={{
              background:'transparent', border:`2px solid ${C.green}`,
              color:C.green, borderRadius:100, padding: isMobile?'12px 28px':'14px 36px',
              fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:font,
              transition:'all .2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = C.green; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.green; }}
            >
              {isAr ? 'عرض جميع المنتجات ←' : 'Voir tous les produits →'}
            </button>
          </div>
        </div>
      </section>

      {/* ══ ABOUT ══════════════════════════════════════════════════════════════ */}
      <section id="about" style={{ padding: isMobile?'56px 16px':'80px 40px', background: isDark ? '#060e08' : '#fff' }}>
        <div style={{ maxWidth:1000, margin:'0 auto', display:'grid', gridTemplateColumns: isDesktop?'1fr 1fr':'1fr', gap: isMobile?40:60, alignItems:'center' }}>

          {/* Text */}
          <div data-reveal="about-text" style={{ order: isAr ? 2 : 1, ...rv('about-text', isAr?'right':'left', 0) }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.gold, textTransform:'uppercase', letterSpacing:3, marginBottom:12, fontFamily:font }}>
              {isAr ? 'من نحن' : 'QUI SOMMES-NOUS'}
            </div>
            <h2 style={{ fontSize: isMobile?26:36, fontWeight:900, color:C.text, margin:'0 0 16px', fontFamily:'Cairo, sans-serif', lineHeight:1.2 }}>
              {isAr ? 'إحسان — لأنكِ تستحقين الأفضل' : 'Ihsen — Vous méritez le meilleur'}
            </h2>
            <p style={{ fontSize:14, color:C.muted, lineHeight:1.8, marginBottom:24, fontFamily:font }}>
              {isAr
                ? 'إحسان هي علامة تجارية جزائرية متخصصة في الملابس النسائية المحتشمة. نؤمن بأن الحشمة والأناقة لا يتعارضان — بل يتكاملان. كل قطعة في مجموعتنا صُممت لتعكس شخصيتكِ وتمنحكِ الراحة والثقة في آنٍ واحد.'
                : "Ihsen est une marque algérienne spécialisée dans la mode féminine pudique. Nous croyons que pudeur et élégance sont complémentaires. Chaque pièce de notre collection est conçue pour refléter votre personnalité."}
            </p>

            {/* Values */}
            <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:14 }}>
              {[
                { d:'M12 2a10 10 0 100 20A10 10 0 0012 2zm0 0c0 5-3 9-6 11m6-11c0 5 3 9 6 11M2 12h20', ar:'مواد طبيعية عالية الجودة',   fr:'Matières naturelles premium' },
                { d:'M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M12 10v8m-4-4h8', ar:'تصميم عصري ومحتشم',           fr:'Design moderne et pudique' },
                { d:'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z', ar:'مصنوعة للمرأة الجزائرية',    fr:'Faite pour la femme algérienne' },
                { d:'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z', ar:'دعم محلي — صنع في الجزائر',    fr:'Soutien local — Made in Algeria' },
              ].map((v, i) => (
                <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0, marginTop:1 }}><path d={v.d}/></svg>
                  <span style={{ fontSize:12, color:C.muted, fontFamily:font, lineHeight:1.5 }}>{isAr ? v.ar : v.fr}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Decorative visual */}
          <div data-reveal="about-vis" style={{ order: isAr?1:2, display:'flex', alignItems:'center', justifyContent:'center', ...rv('about-vis', isAr?'left':'right', 150) }}>
            <div style={{
              width: isMobile?260:340, height: isMobile?300:400, borderRadius:28,
              background:`linear-gradient(145deg, ${C.green}, ${C.hero})`,
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
              boxShadow:`0 32px 80px rgba(15,36,25,.4), inset 0 1px 0 rgba(255,255,255,.06)`,
              position:'relative', overflow:'hidden',
              border:'1px solid rgba(175,142,74,.2)',
            }}>
              {/* Inner glow */}
              <div style={{ position:'absolute', top:'-30%', left:'50%', transform:'translateX(-50%)', width:'80%', height:'60%', borderRadius:'50%', background:'radial-gradient(circle, rgba(175,142,74,.15) 0%, transparent 70%)', pointerEvents:'none' }} />
              <Image
                src="/logos/full-vertical-gold.svg"
                alt="إحسان"
                width={isMobile?100:130}
                height={isMobile?137:178}
                style={{ filter:'drop-shadow(0 0 24px rgba(175,142,74,.5))', position:'relative', zIndex:1 }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ══ CONTACT ════════════════════════════════════════════════════════════ */}
      <section id="contact" style={{ padding: isMobile?'60px 16px':'90px 40px', background: isDark ? '#060e08' : '#F8F4EF', position:'relative', overflow:'hidden' }}>
        {/* Ambient orbs */}
        <div style={{ position:'absolute', top:'-10%', right:'-5%', width:500, height:500, borderRadius:'50%', background:`radial-gradient(circle, ${C.green}18 0%, transparent 65%)`, pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:'-10%', left:'-5%', width:400, height:400, borderRadius:'50%', background:`radial-gradient(circle, ${C.gold}0A 0%, transparent 65%)`, pointerEvents:'none' }} />

        <div style={{ maxWidth:1080, margin:'0 auto', position:'relative' }}>
          {/* Section label */}
          <div data-reveal="contact-hdr" style={{ textAlign:'center', marginBottom: isMobile?36:56, ...rv('contact-hdr','up',0) }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:`${C.gold}12`, border:`1px solid ${C.gold}30`, borderRadius:100, padding:'5px 16px', marginBottom:14 }}>
              <div style={{ width:5, height:5, borderRadius:'50%', background:C.gold }} />
              <span style={{ fontSize:10, fontWeight:700, color:C.gold, textTransform:'uppercase' as const, letterSpacing:3, fontFamily:'Inter' }}>
                {isAr ? 'تواصلي معنا' : 'CONTACTEZ-NOUS'}
              </span>
            </div>
            <h2 style={{ fontSize:isMobile?26:38, fontWeight:900, color:C.text, margin:0, fontFamily:'Cairo, sans-serif', lineHeight:1.15 }}>
              {isAr ? 'نحن هنا لمساعدتكِ' : 'Nous sommes là pour vous'}
            </h2>
          </div>

          {/* Two-column layout */}
          <div style={{ display:'grid', gridTemplateColumns: isMobile?'1fr':'5fr 7fr', gap: isMobile?20:28, alignItems:'stretch' }}>

            {/* ── LEFT: Info card ── */}
            <div data-reveal="contact-info" style={{ background:`linear-gradient(160deg, ${C.green} 0%, #0F2419 100%)`, borderRadius:24, padding: isMobile?'28px 22px':'36px 30px', display:'flex', flexDirection:'column', gap:28, position:'relative', overflow:'hidden', boxShadow:`0 24px 60px rgba(15,36,25,.35)`, ...rv('contact-info', isAr?'right':'left', 80) }}>
              {/* Inner texture */}
              <div style={{ position:'absolute', top:-40, left:-40, width:200, height:200, borderRadius:'50%', background:'rgba(175,142,74,.08)', pointerEvents:'none' }} />
              <div style={{ position:'absolute', bottom:-30, right:-30, width:160, height:160, borderRadius:'50%', background:'rgba(175,142,74,.05)', pointerEvents:'none' }} />

              {/* Brand header */}
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:C.gold, letterSpacing:3, textTransform:'uppercase' as const, fontFamily:'Inter', marginBottom:6, opacity:.8 }}>
                  {isAr ? 'معلومات التواصل' : 'Informations'}
                </div>
                <h3 style={{ fontSize:20, fontWeight:900, color:'#fff', margin:0, fontFamily:'Cairo, sans-serif', lineHeight:1.2 }}>
                  {isAr ? 'تحدثي إلينا' : 'Parlez-nous'}
                </h3>
                <p style={{ fontSize:12, color:'rgba(255,255,255,.45)', margin:'8px 0 0', fontFamily:font, lineHeight:1.6 }}>
                  {isAr ? 'فريقنا متاح للإجابة على كل استفساراتكِ' : 'Notre équipe est disponible pour répondre à vos questions'}
                </p>
              </div>

              {/* Info items */}
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                {([
                  contactInfo.phone    && { icon:'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z', label:isAr?'الهاتف':'Téléphone', value:contactInfo.phone,    href:`tel:${contactInfo.phone}`,    ltr:true  },
                  contactInfo.whatsapp && { icon:'M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z', label:'WhatsApp',           value:contactInfo.whatsapp, href:`https://wa.me/${contactInfo.whatsapp.replace(/\D/g,'')}`, ltr:true },
                  contactInfo.email    && { icon:'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', label:isAr?'البريد':'Email', value:contactInfo.email,    href:`mailto:${contactInfo.email}`, ltr:true  },
                  contactInfo.address  && { icon:'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z', label:isAr?'العنوان':'Adresse', value:contactInfo.address, href:null, ltr:false },
                  (contactInfo.hours_ar||contactInfo.hours_fr) && { icon:'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', label:isAr?'ساعات العمل':'Horaires', value: isAr?(contactInfo.hours_ar||contactInfo.hours_fr):(contactInfo.hours_fr||contactInfo.hours_ar), href:null, ltr:false },
                ].filter(Boolean) as {icon:string;label:string;value:string;href:string|null;ltr:boolean}[]).map((item, i) => {
                  const inner = (
                    <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                      <div style={{ width:36, height:36, borderRadius:10, background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.12)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon}/></svg>
                      </div>
                      <div>
                        <div style={{ fontSize:9, fontWeight:700, color:'rgba(175,142,74,.7)', textTransform:'uppercase' as const, letterSpacing:1.5, fontFamily:'Inter', marginBottom:2 }}>{item.label}</div>
                        <div style={{ fontSize:13, color:'rgba(255,255,255,.85)', fontFamily: item.ltr?'Inter':font, direction: item.ltr?'ltr':'inherit', lineHeight:1.5 }}>{item.value}</div>
                      </div>
                    </div>
                  );
                  return item.href ? <a key={i} href={item.href} target={item.href.startsWith('http')?'_blank':undefined} rel="noopener noreferrer" style={{ textDecoration:'none' }}>{inner}</a> : inner;
                })}
              </div>

              {/* Social links */}
              {(socialLinks.instagram||socialLinks.facebook||socialLinks.tiktok||socialLinks.whatsapp||socialLinks.youtube) && (
                <div>
                  <div style={{ fontSize:9, fontWeight:700, color:'rgba(175,142,74,.7)', textTransform:'uppercase' as const, letterSpacing:1.5, fontFamily:'Inter', marginBottom:12 }}>
                    {isAr ? 'تابعينا' : 'Suivez-nous'}
                  </div>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    {([
                      socialLinks.instagram && { href:socialLinks.instagram, d:'M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z M4 6a2 2 0 100-4 2 2 0 000 4z' },
                      socialLinks.facebook  && { href:socialLinks.facebook,  d:'M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z' },
                      socialLinks.tiktok    && { href:socialLinks.tiktok,    d:'M9 12a4 4 0 104 4V4a5 5 0 005 5' },
                      socialLinks.youtube   && { href:socialLinks.youtube,   d:'M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z' },
                    ].filter(Boolean) as {href:string;d:string}[]).map((s,i) => (
                      <a key={i} href={s.href} target="_blank" rel="noopener noreferrer"
                        style={{ width:34, height:34, borderRadius:9, background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.12)', display:'flex', alignItems:'center', justifyContent:'center', transition:'background .2s, border .2s' }}
                        onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='rgba(175,142,74,.18)';(e.currentTarget as HTMLElement).style.borderColor='rgba(175,142,74,.4)';}}
                        onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='rgba(255,255,255,.07)';(e.currentTarget as HTMLElement).style.borderColor='rgba(255,255,255,.12)';}}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.6)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={s.d}/></svg>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── RIGHT: Form card ── */}
            <div data-reveal="contact-form" style={{ background: isDark?'#0f2419':'#fff', borderRadius:24, padding: isMobile?'28px 22px':'36px 32px', border:`1px solid ${isDark?C.green+'40':C.border}`, boxShadow:'0 8px 40px rgba(0,0,0,.07)', display:'flex', flexDirection:'column', gap:20, ...rv('contact-form', isAr?'left':'right', 160) }}>
              {cSent ? (
                /* Success state */
                <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, padding:'40px 20px', textAlign:'center' }}>
                  <div style={{ width:64, height:64, borderRadius:'50%', background:`${C.green}14`, border:`2px solid ${C.green}30`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  </div>
                  <div>
                    <div style={{ fontSize:18, fontWeight:800, color:C.text, fontFamily:'Cairo, sans-serif', marginBottom:6 }}>
                      {isAr ? 'تم الإرسال بنجاح!' : 'Message envoyé !'}
                    </div>
                    <div style={{ fontSize:13, color:C.muted, fontFamily:font, lineHeight:1.6 }}>
                      {isAr ? 'شكراً لتواصلكِ — سنرد عليكِ في أقرب وقت ممكن.' : 'Merci de nous avoir contactés — nous vous répondrons dès que possible.'}
                    </div>
                  </div>
                  <button onClick={()=>{setCsent(false);setCName('');setCPhone('');setCMsg('');}}
                    style={{ marginTop:8, padding:'10px 24px', borderRadius:10, border:`1.5px solid ${C.green}40`, background:'transparent', color:C.green, fontFamily:font, fontSize:13, fontWeight:700, cursor:'pointer' }}>
                    {isAr ? 'إرسال رسالة أخرى' : 'Envoyer un autre message'}
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <div style={{ fontSize:10, fontWeight:700, color:C.gold, letterSpacing:3, textTransform:'uppercase' as const, fontFamily:'Inter', marginBottom:6, opacity:.85 }}>
                      {isAr ? 'أرسلي رسالة' : 'Envoyez un message'}
                    </div>
                    <h3 style={{ fontSize:20, fontWeight:900, color:C.text, margin:0, fontFamily:'Cairo, sans-serif' }}>
                      {isAr ? 'كيف يمكننا مساعدتكِ؟' : 'Comment pouvons-nous vous aider ?'}
                    </h3>
                  </div>

                  {/* Name */}
                  <div>
                    <label style={{ fontSize:11, fontWeight:600, color:C.muted, display:'block', marginBottom:7, fontFamily:font }}>
                      {isAr ? 'الاسم الكامل' : 'Nom complet'}
                    </label>
                    <div style={{ position:'relative' }}>
                      <svg style={{ position:'absolute', top:'50%', transform:'translateY(-50%)', [isAr?'right':'left']:12, pointerEvents:'none' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      <input value={cName} onChange={e=>setCName(e.target.value)} placeholder={isAr?'أميرة بن علي...':'Amira Ben Ali...'}
                        style={{ width:'100%', padding: isAr?'11px 36px 11px 14px':'11px 14px 11px 36px', borderRadius:12, border:`1.5px solid ${C.border}`, background: isDark?'#162a1e':'#FAFCFB', color:C.text, fontFamily:font, fontSize:13, boxSizing:'border-box' as const, outline:'none', transition:'border .15s' }}
                        onFocus={e=>e.currentTarget.style.borderColor=C.green}
                        onBlur={e=>e.currentTarget.style.borderColor=C.border} />
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label style={{ fontSize:11, fontWeight:600, color:C.muted, display:'block', marginBottom:7, fontFamily:font }}>
                      {isAr ? 'رقم الهاتف' : 'Téléphone'}
                    </label>
                    <div style={{ position:'relative' }}>
                      <svg style={{ position:'absolute', top:'50%', transform:'translateY(-50%)', [isAr?'right':'left']:12, pointerEvents:'none' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                      <input type="tel" value={cPhone} onChange={e=>setCPhone(e.target.value)} dir="ltr" placeholder="05XX XXX XXX"
                        style={{ width:'100%', padding: isAr?'11px 36px 11px 14px':'11px 14px 11px 36px', borderRadius:12, border:`1.5px solid ${C.border}`, background: isDark?'#162a1e':'#FAFCFB', color:C.text, fontFamily:'Inter', fontSize:13, boxSizing:'border-box' as const, outline:'none', transition:'border .15s' }}
                        onFocus={e=>e.currentTarget.style.borderColor=C.green}
                        onBlur={e=>e.currentTarget.style.borderColor=C.border} />
                    </div>
                  </div>

                  {/* Message */}
                  <div style={{ flex:1 }}>
                    <label style={{ fontSize:11, fontWeight:600, color:C.muted, display:'block', marginBottom:7, fontFamily:font }}>
                      {isAr ? 'رسالتكِ' : 'Votre message'}
                    </label>
                    <textarea value={cMsg} onChange={e=>setCMsg(e.target.value)} rows={4}
                      placeholder={isAr?'كيف يمكننا مساعدتكِ؟...':'Comment pouvons-nous vous aider ?...'}
                      style={{ width:'100%', padding:'11px 14px', borderRadius:12, border:`1.5px solid ${C.border}`, background: isDark?'#162a1e':'#FAFCFB', color:C.text, fontFamily:font, fontSize:13, boxSizing:'border-box' as const, outline:'none', resize:'none' as const, transition:'border .15s', lineHeight:1.6 }}
                      onFocus={e=>e.currentTarget.style.borderColor=C.green}
                      onBlur={e=>e.currentTarget.style.borderColor=C.border} />
                  </div>

                  {/* Send button */}
                  <button
                    disabled={cSending || !cName.trim() || !cMsg.trim()}
                    onClick={async()=>{
                      if(!cName.trim()||!cMsg.trim()) return;
                      setCsending(true);
                      try {
                        await fetch('/api/contact', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ name: cName, phone: cPhone, message: cMsg }),
                        });
                      } catch { /* ignore */ }
                      await new Promise(r=>setTimeout(r,600));
                      setCsending(false);
                      setCsent(true);
                    }}
                    style={{ padding:'14px 28px', borderRadius:14, border:'none', background: (cSending||!cName.trim()||!cMsg.trim()) ? C.muted : `linear-gradient(135deg, ${C.green}, #0F2419)`, color:'#fff', fontFamily:font, fontSize:14, fontWeight:800, cursor:(cSending||!cName.trim()||!cMsg.trim())?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:9, boxShadow:(cSending||!cName.trim()||!cMsg.trim())?'none':`0 6px 24px rgba(36,77,59,.4)`, transition:'all .2s' }}>
                    {cSending ? (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation:'spin 1s linear infinite' }}><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    )}
                    {cSending ? (isAr?'جارٍ الإرسال...':'Envoi en cours...') : (isAr?'إرسال الرسالة':'Envoyer le message')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ═════════════════════════════════════════════════════════════ */}
      <footer style={{ background:'#060e08', padding: isMobile?'40px 20px 24px':'56px 40px 28px', borderTop:'1px solid rgba(36,77,59,.4)' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ display:'grid', gridTemplateColumns: isMobile?'1fr':'1fr 1fr 1fr', gap: isMobile?32:40, marginBottom: isMobile?36:48 }}>

            {/* Brand */}
            <div data-reveal="footer-brand" style={{ ...rv('footer-brand','up',0) }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                <Image src="/logos/icon-gold.svg" alt="إحسان" width={28} height={28} />
                <div>
                  <div style={{ fontWeight:800, fontSize:16, color:'#fff', fontFamily:'Cairo, sans-serif' }}>إحسان</div>
                  <div style={{ fontSize:9, letterSpacing:3, color:C.gold, fontFamily:'Inter', textTransform:'uppercase' }}>ihsen</div>
                </div>
              </div>
              <p style={{ fontSize:12, color:'rgba(255,255,255,.35)', fontFamily:font, lineHeight:1.7, maxWidth:220 }}>
                {isAr ? 'ملابس محتشمة للمرأة الجزائرية — جودة، أناقة، وراحة.' : 'Mode modeste pour la femme algérienne — qualité, élégance, confort.'}
              </p>
            </div>

            {/* Links */}
            <div data-reveal="footer-links" style={{ ...rv('footer-links','up',80) }}>
              <div style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,.4)', textTransform:'uppercase', letterSpacing:1.5, marginBottom:16, fontFamily:font }}>
                {isAr ? 'روابط' : 'Liens'}
              </div>
              {[
                { ar:'المنتجات', fr:'Produits', href:'/products' },
                { ar:'تتبع الطلب', fr:'Suivre commande', href:'/track' },
              ].map(l => (
                <button key={l.href} onClick={() => router.push(l.href)} style={{ display:'block', background:'none', border:'none', cursor:'pointer', fontSize:13, color:'rgba(255,255,255,.55)', fontFamily:font, marginBottom:10, padding:0, textAlign: isAr?'right':'left' }}>
                  {isAr ? l.ar : l.fr}
                </button>
              ))}
            </div>

            {/* Info */}
            <div data-reveal="footer-info" style={{ ...rv('footer-info','up',160) }}>
              <div style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,.4)', textTransform:'uppercase', letterSpacing:1.5, marginBottom:16, fontFamily:font }}>
                {isAr ? 'معلومات' : 'Infos'}
              </div>
              {[
                { ar:'توصيل لـ 69 ولاية', fr:'Livraison 69 wilayas' },
                { ar:'الدفع عند الاستلام', fr:'Paiement à la livraison' },
                { ar:'إرجاع مجاني خلال 7 أيام', fr:'Retour gratuit 7 jours' },
              ].map((l,i) => (
                <div key={i} style={{ fontSize:12, color:'rgba(255,255,255,.45)', fontFamily:font, marginBottom:8 }}>{isAr?l.ar:l.fr}</div>
              ))}
            </div>
          </div>

          {/* Bottom */}
          <div style={{ borderTop:'1px solid rgba(255,255,255,.06)', paddingTop:20, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
            <span style={{ fontSize:11, color:'rgba(255,255,255,.25)', fontFamily:font }}>
              © 2026 إحسان — جميع الحقوق محفوظة
            </span>
            <div style={{ display:'flex', gap:16, alignItems:'center' }}>
              {social.instagram && (
                <a href={social.instagram} target="_blank" rel="noopener noreferrer" style={{ color:'#AF8E4A', opacity:0.5, transition:'all 0.3s' }} onMouseEnter={e=>{e.currentTarget.style.opacity='1'; e.currentTarget.style.color='#E1306C';}} onMouseLeave={e=>{e.currentTarget.style.opacity='0.5'; e.currentTarget.style.color='#AF8E4A';}}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                </a>
              )}
              {social.facebook && (
                <a href={social.facebook} target="_blank" rel="noopener noreferrer" style={{ color:'#AF8E4A', opacity:0.5, transition:'all 0.3s' }} onMouseEnter={e=>{e.currentTarget.style.opacity='1'; e.currentTarget.style.color='#1877F2';}} onMouseLeave={e=>{e.currentTarget.style.opacity='0.5'; e.currentTarget.style.color='#AF8E4A';}}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                </a>
              )}
              {social.tiktok && (
                <a href={social.tiktok} target="_blank" rel="noopener noreferrer" style={{ color:'#AF8E4A', opacity:0.5, transition:'all 0.3s' }} onMouseEnter={e=>{e.currentTarget.style.opacity='1'; e.currentTarget.style.color='#ffffff';}} onMouseLeave={e=>{e.currentTarget.style.opacity='0.5'; e.currentTarget.style.color='#AF8E4A';}}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"></path></svg>
                </a>
              )}
              {social.whatsapp && (
                <a href={social.whatsapp} target="_blank" rel="noopener noreferrer" style={{ color:'#AF8E4A', opacity:0.5, transition:'all 0.3s' }} onMouseEnter={e=>{e.currentTarget.style.opacity='1'; e.currentTarget.style.color='#25D366';}} onMouseLeave={e=>{e.currentTarget.style.opacity='0.5'; e.currentTarget.style.color='#AF8E4A';}}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                </a>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
