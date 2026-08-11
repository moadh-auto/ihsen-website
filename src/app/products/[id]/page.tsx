'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { FEATURED_PRODUCTS, CATEGORIES } from '@/lib/constants';
import { useCart } from '@/context/CartContext';
import { supabase, type Product as DbProduct } from '@/lib/supabase';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const product = FEATURED_PRODUCTS.find(p => p.id === id) ?? FEATURED_PRODUCTS[0];
  const related = FEATURED_PRODUCTS.filter(p => p.id !== product.id && p.category === product.category).slice(0, 3);
  const otherRelated = related.length < 3
    ? [...related, ...FEATURED_PRODUCTS.filter(p => p.id !== product.id && p.category !== product.category)].slice(0, 4)
    : related.slice(0, 4);

  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedSize, setSelectedSize] = useState('M');
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [added, setAdded] = useState(false);
  const [lang, setLang] = useState('ar');
  const [theme, setTheme] = useState('light');
  const [sizeChartOpen, setSizeChartOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(1200);
  const [social, setSocial] = useState({ instagram:'', facebook:'', tiktok:'', whatsapp:'', telegram:'' });

  // Real product from Supabase
  const [dbProduct, setDbProduct]     = useState<DbProduct | null>(null);
  const [productLoading, setProdLoad] = useState(true);
  const [imgLoading, setImgLoading]   = useState(true);
  const autoRotateRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const html = document.documentElement;
    setLang(html.getAttribute('data-lang') ?? 'ar');
    setTheme(html.getAttribute('data-theme') ?? 'light');
    const upd = () => setWindowWidth(window.innerWidth);
    upd();
    window.addEventListener('resize', upd);

    const io = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } }),
      { threshold: 0.1, rootMargin: '0px 0px -30px 0px' }
    );
    document.querySelectorAll('.reveal').forEach(el => io.observe(el));

    // Fetch real product from Supabase
    const fetchProd = supabase.from('products').select('*').eq('id', id).single();
    const fetchSoc = supabase.from('site_settings').select('value').eq('key', 'social_links').maybeSingle();

    Promise.all([fetchProd, fetchSoc]).then(([{ data: pData }, { data: sData }]) => {
      if (pData) setDbProduct(pData as DbProduct);
      if (sData?.value) {
        try { setSocial({ ...social, ...JSON.parse(sData.value) }); } catch {}
      }
      setProdLoad(false);
    });

    return () => { io.disconnect(); window.removeEventListener('resize', upd); };
  }, [id]);

  // Auto-rotate images every 3.5s
  const productImages = dbProduct?.images?.length ? dbProduct.images : [];
  useEffect(() => {
    if (productImages.length < 2) return;
    autoRotateRef.current = setInterval(() => {
      setActiveImg(i => (i + 1) % productImages.length);
    }, 3500);
    return () => { if (autoRotateRef.current) clearInterval(autoRotateRef.current); };
  }, [productImages.length]);

  // Switch to color-specific image when color changes
  useEffect(() => {
    if (!dbProduct?.color_images) return;
    const colorHex = dbProduct.colors?.[selectedColor];
    if (colorHex && dbProduct.color_images[colorHex] !== undefined) {
      setActiveImg(dbProduct.color_images[colorHex]);
    }
  }, [selectedColor, dbProduct]);

  // Auto-select first available size when color changes
  useEffect(() => {
    if (!dbProduct?.stock) return;
    const colorHex = dbProduct.colors?.[selectedColor];
    if (!colorHex) return;
    const currentQty = dbProduct.stock[`${colorHex}:${selectedSize}`] ?? 0;
    if (currentQty === 0) {
      const firstAvail = SIZES.find(s => (dbProduct.stock![`${colorHex}:${s}`] ?? 0) > 0);
      if (firstAvail) setSelectedSize(firstAvail);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedColor, dbProduct]);

  const toggleTheme = () => {
    const html = document.documentElement;
    const dark = html.getAttribute('data-theme') === 'dark';
    html.setAttribute('data-theme', dark ? 'light' : 'dark');
    setTheme(dark ? 'light' : 'dark');
  };

  const toggleLang = () => {
    const html = document.documentElement;
    const isAr = html.getAttribute('data-lang') === 'ar';
    html.setAttribute('data-lang', isAr ? 'fr' : 'ar');
    html.setAttribute('dir', isAr ? 'ltr' : 'rtl');
    html.setAttribute('lang', isAr ? 'fr' : 'ar');
    setLang(isAr ? 'fr' : 'ar');
  };

  const { addItem, openCart } = useCart();

  // ── Stock helpers ──────────────────────────────────────────────────────────
  const getStock = (colorIdx: number, size: string): number => {
    if (!dbProduct?.stock) return Infinity; // no tracking → always available
    const colorHex = dbProduct.colors?.[colorIdx];
    if (!colorHex) return Infinity;
    return dbProduct.stock[`${colorHex}:${size}`] ?? 0;
  };
  const isColorSoldOut = (colorIdx: number): boolean => {
    if (!dbProduct?.stock) return false;
    return SIZES.every(s => getStock(colorIdx, s) === 0);
  };
  const selectedStockQty = getStock(selectedColor, selectedSize);
  const isSelectedOOS = dbProduct?.stock !== undefined && dbProduct?.stock !== null && selectedStockQty === 0;

  // ── Unified display product: Supabase first, FEATURED_PRODUCTS fallback ──
  const dp = {
    id:            dbProduct?.id            ?? product.id,
    nameAr:        dbProduct?.name_ar       ?? product.nameAr,
    nameFr:        dbProduct?.name_fr       ?? product.nameFr,
    emoji:         dbProduct?.emoji         ?? (product as Record<string, unknown>).emoji as string ?? '🛍️',
    colors:        (dbProduct?.colors?.length ?? 0) > 0 ? dbProduct!.colors : product.colors,
    price:         dbProduct?.price         ?? product.price,
    originalPrice: dbProduct?.original_price ?? null,
    badge:         dbProduct?.badge         ?? product.badge ?? null,
    category:      dbProduct?.category      ?? product.category,
    in_stock:      dbProduct?.in_stock      ?? true,
  };

  const handleOrder = () => {
    router.push(`/order?product=${dp.id}&color=${selectedColor}&size=${selectedSize}&qty=${qty}`);
  };

  const handleAddToCart = () => {
    const thumbnail = dbProduct?.images?.[dbProduct.thumbnail_index ?? 0] ?? undefined;
    addItem({
      productId:  dp.id,
      nameAr:     dp.nameAr,
      nameFr:     dp.nameFr,
      emoji:      dp.emoji,
      image:      thumbnail,
      color:      dp.colors[selectedColor] ?? dp.colors[0],
      colorIndex: selectedColor,
      size:       selectedSize,
      qty,
      price:      dp.price,
      category:   dp.category,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
    openCart();
  };

  const isDark = theme === 'dark';
  const isAr = lang === 'ar';

  const name = isAr ? dp.nameAr : dp.nameFr;
  const category = isAr
    ? CATEGORIES.find(c => c.ar === dp.category)?.ar ?? dp.category
    : CATEGORIES.find(c => c.ar === dp.category)?.fr ?? dp.category;

  const discountPct = dp.originalPrice && dp.originalPrice > dp.price
    ? Math.round((1 - dp.price / dp.originalPrice) * 100)
    : null;

  const thumbColors = [dp.colors[0] ?? '#244D3B', '#F5F0E8', '#1a1a2e', '#AF8E4A'];

  const bg = isDark ? '#111111' : '#FAFAF8';
  const surface = isDark ? '#1A1A1A' : '#FFFFFF';
  const text = isDark ? '#F5F5F3' : '#0C0C0A';
  const sub = isDark ? '#9CA3AF' : '#6B7280';
  const border = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';

  const isMobile = windowWidth < 640;
  const font  = isAr ? 'Cairo, sans-serif' : 'Inter, sans-serif';

  const SIZE_CHART = {
    headers: { ar: ['المقاس','الصدر (سم)','الخصر (سم)','الأرداف (سم)','الطول التقريبي'], fr: ['Taille','Poitrine (cm)','Taille (cm)','Hanches (cm)','Longueur approx.'] },
    rows: [
      { size:'XS',  vals:['76–80',  '60–64',  '84–88',  '155–160'] },
      { size:'S',   vals:['80–84',  '64–68',  '88–92',  '158–163'] },
      { size:'M',   vals:['84–88',  '68–72',  '92–96',  '160–165'] },
      { size:'L',   vals:['88–94',  '72–78',  '96–102', '162–167'] },
      { size:'XL',  vals:['94–100', '78–84',  '102–108','164–169'] },
      { size:'XXL', vals:['100–108','84–92',  '108–116','166–171'] },
    ],
  };

  const SizeChartModal = () => {
    if (!sizeChartOpen) return null;
    const isDark2 = theme === 'dark';
    const C2 = {
      bg:     isDark2 ? '#0f2419' : '#FFFFFF',
      border: isDark2 ? '#244D3B' : '#E8DFD2',
      text:   isDark2 ? '#F0EBE3' : '#1a1a1a',
      muted:  isDark2 ? '#7A9C8A' : '#6B6B6B',
      header: isDark2 ? '#1D4939' : '#F0F9F4',
      sel:    isDark2 ? '#244D3B44' : '#EAF5EE',
    };
    return (
      <>
        <div onClick={() => setSizeChartOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:500, backdropFilter:'blur(4px)' }} />
        <div style={{
          position:'fixed', zIndex:600,
          bottom: isMobile ? 0 : '50%',
          left:   isMobile ? 0 : '50%',
          right:  isMobile ? 0 : 'auto',
          transform: isMobile ? 'none' : 'translate(-50%, 50%)',
          width:  isMobile ? '100%' : 'min(640px, 96vw)',
          maxHeight: isMobile ? '90vh' : '85vh',
          overflowY: 'auto',
          background: C2.bg,
          borderRadius: isMobile ? '22px 22px 0 0' : 20,
          boxShadow: '0 24px 80px rgba(0,0,0,.35)',
          padding: isMobile ? '0 0 32px' : '0 0 28px',
        }}>
          {isMobile && (
            <div style={{ display:'flex', justifyContent:'center', padding:'12px 0 4px' }}>
              <div style={{ width:40, height:4, borderRadius:2, background:C2.border }} />
            </div>
          )}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding: isMobile?'14px 20px 10px':'20px 24px 14px', borderBottom:`1px solid ${C2.border}` }}>
            <div>
              <div style={{ fontSize: isMobile?15:17, fontWeight:800, color:C2.text, fontFamily:'Cairo, sans-serif', display:'flex', alignItems:'center', gap:8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#244D3B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/></svg>
                {isAr ? 'جدول المقاسات' : 'Guide des tailles'}
              </div>
              <div style={{ fontSize:11, color:C2.muted, marginTop:2, fontFamily:font }}>
                {isAr ? 'قيسي نفسك واختاري المقاس المناسب' : 'Mesurez-vous et choisissez votre taille'}
              </div>
            </div>
            <button onClick={() => setSizeChartOpen(false)} style={{ width:32, height:32, borderRadius:'50%', background:C2.border, border:'none', cursor:'pointer', fontSize:18, color:C2.text, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>×</button>
          </div>
          <div style={{ margin:'14px 20px', background: isDark2?'#1D4939':'#FFF8EC', border:`1px solid ${isDark2?'#AF8E4A40':'#AF8E4A30'}`, borderRadius:12, padding:'10px 14px', display:'flex', gap:10, alignItems:'flex-start' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#AF8E4A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <div style={{ fontSize:12, color: isDark2?'#DAC08B':'#7A5A20', fontFamily:font, lineHeight:1.6 }}>
              {isAr
                ? 'قيسي الصدر تحت الإبطين مباشرة، والخصر عند أضيق نقطة، والأرداف عند أوسع نقطة.'
                : 'Mesurez la poitrine sous les aisselles, la taille au point le plus étroit, les hanches au point le plus large.'}
            </div>
          </div>
          <div style={{ overflowX:'auto', padding:'0 20px' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize: isMobile?12:13, fontFamily:font }}>
              <thead>
                <tr>
                  {(isAr ? SIZE_CHART.headers.ar : SIZE_CHART.headers.fr).map((h, i) => (
                    <th key={i} style={{
                      padding:'10px 12px', textAlign:'center', fontWeight:700,
                      background: C2.header, color: '#244D3B',
                      borderBottom:`2px solid ${C2.border}`,
                      fontSize: isMobile?11:12,
                      whiteSpace:'nowrap',
                      borderRadius: i===0 ? (isAr?'0 8px 0 0':'8px 0 0 0') : i===4 ? (isAr?'8px 0 0 0':'0 8px 0 0') : undefined,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SIZE_CHART.rows.map((row, ri) => {
                  const isSelected = row.size === selectedSize;
                  return (
                    <tr key={row.size}
                      onClick={() => { setSelectedSize(row.size); setSizeChartOpen(false); }}
                      style={{ cursor:'pointer', background: isSelected ? C2.sel : (ri%2===0 ? 'transparent' : isDark2?'rgba(255,255,255,.02)':'rgba(0,0,0,.015)'), transition:'background .15s' }}>
                      <td style={{ padding:'10px 12px', textAlign:'center', fontWeight:800, color: isSelected?'#244D3B':C2.text, fontFamily:'Inter, monospace', borderBottom:`1px solid ${C2.border}` }}>
                        <div style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
                          {isSelected && <span style={{ fontSize:10 }}>✓</span>}
                          {row.size}
                          {isSelected && <span style={{ fontSize:9, background:'#244D3B', color:'#fff', borderRadius:100, padding:'1px 6px', fontFamily:font }}>{isAr?'مختار':'Sélec.'}</span>}
                        </div>
                      </td>
                      {row.vals.map((v, vi) => (
                        <td key={vi} style={{ padding:'10px 12px', textAlign:'center', color: isSelected?C2.text:C2.muted, borderBottom:`1px solid ${C2.border}`, fontFamily:'Inter' }}>{v}</td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ padding:'14px 20px 0', fontSize:11, color:C2.muted, fontFamily:font, textAlign:'center' }}>
            {isAr
              ? 'اضغطي على مقاس لتحديده مباشرة · المقاسات تقريبية وقد تختلف حسب القطعة'
              : 'Cliquez sur une taille pour la sélectionner · Les mesures sont approximatives'}
          </div>
        </div>
      </>
    );
  };

  return (
    <>
      <SizeChartModal />
      <nav style={{
        position: 'fixed', top: '10px', left: '50%', transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)', maxWidth: '1380px', height: '68px',
        zIndex: 9000, display: 'flex', alignItems: 'center', padding: '0 20px', gap: '16px',
        background: isDark ? 'rgba(17,17,17,0.92)' : 'rgba(250,250,248,0.92)',
        backdropFilter: 'blur(24px) saturate(1.8)',
        border: `1px solid rgba(175,142,74,0.12)`, borderRadius: '18px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.07)',
        transition: 'background 0.4s ease',
      }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', flexShrink: 0 }}>
          <Image src={isDark ? '/logos/icon-gold.svg' : '/logos/icon-green.svg'} alt="إحسان" width={34} height={38} />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
            <span style={{ fontSize: '17px', fontWeight: 900, color: isDark ? '#AF8E4A' : '#244D3B' }}>إحسان</span>
            <span style={{ fontSize: '10px', fontWeight: 600, color: '#AF8E4A', letterSpacing: '2.5px', fontFamily: 'Inter, sans-serif' }}>ihsen</span>
          </div>
        </a>

        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flex: 1, justifyContent: 'center' }}>
            {CATEGORIES.map(cat => (
              <a key={cat.id} href={`/#${cat.id}`} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 13px', borderRadius: '10px', textDecoration: 'none', fontSize: '14px', fontWeight: 700, color: sub, transition: 'all 0.18s' }}>
                {(cat as Record<string, unknown>).emoji as string ?? ''} {isAr ? cat.ar : cat.fr}
              </a>
            ))}
          </div>
        )}
        {isMobile && <div style={{ flex: 1 }} />}

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <button onClick={toggleLang} style={{ height: '38px', minWidth: '38px', padding: '0 10px', borderRadius: '10px', border: `1px solid ${border}`, background: surface, cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: sub }}>
            {isAr ? 'FR' : 'AR'}
          </button>
          <button onClick={toggleTheme} style={{ height: '38px', minWidth: '38px', borderRadius: '10px', border: `1px solid ${border}`, background: surface, cursor: 'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            {isDark
              ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
            }
          </button>
          <button onClick={handleOrder} style={{ height: '38px', padding: '0 18px', borderRadius: '10px', background: '#244D3B', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 800, fontFamily: 'Cairo, sans-serif' }}>
            {isAr ? 'اطلبي الآن' : 'Commander'}
          </button>
        </div>
      </nav>

      <main style={{ background: bg, minHeight: '100vh', color: text, paddingTop: isMobile ? '88px' : '100px', transition: 'background 0.4s, color 0.4s', overflowX: 'hidden' }}>

        <div style={{ maxWidth: '1240px', margin: '0 auto', padding: isMobile ? '0 12px 16px' : '0 20px 24px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: isMobile ? '11px' : '13px', color: sub, flexWrap: 'wrap' }}>
          <a href="/" style={{ color: '#AF8E4A', textDecoration: 'none', fontWeight: 600 }}>
            {isAr ? 'الرئيسية' : 'Accueil'}
          </a>
          <span style={{ opacity: 0.4 }}>›</span>
          <span>{category}</span>
          <span style={{ opacity: 0.4 }}>›</span>
          <span style={{ color: text, fontWeight: 600 }}>{name}</span>
        </div>

        <div style={{ maxWidth: '1240px', margin: '0 auto', padding: isMobile ? '0 12px' : '0 20px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '24px' : '64px', alignItems: 'start' }}>

          <div className="reveal" style={{ display: 'flex', flexDirection: isAr ? 'row-reverse' : 'row', gap: '12px' }}>
            <style>{`
              @keyframes ihsen-shimmer{from{background-position:200% 0}to{background-position:-200% 0}}
              .ihsen-img-skel{background:linear-gradient(90deg,#e8f0eb 25%,#f3f8f5 50%,#e8f0eb 75%);background-size:200% 100%;animation:ihsen-shimmer 1.4s ease-in-out infinite;}
              @keyframes ihsen-img-fade{from{opacity:0;transform:scale(1.03)}to{opacity:1;transform:scale(1)}}
              .ihsen-img-enter{animation:ihsen-img-fade .45s cubic-bezier(0.22,1,0.36,1) forwards;}
            `}</style>

            <div style={{ display: isMobile ? 'none' : 'flex', flexDirection: 'column', gap: '10px' }}>
              {productLoading
                ? Array.from({length:3}).map((_,i) => (
                    <div key={i} className="ihsen-img-skel" style={{ width:72, height:90, borderRadius:12 }} />
                  ))
                : productImages.length > 0
                  ? productImages.map((url, i) => (
                      <button key={i} onClick={() => {
                        setActiveImg(i);
                        if (autoRotateRef.current) clearInterval(autoRotateRef.current);
                        if (productImages.length > 1) {
                          autoRotateRef.current = setInterval(() => {
                            setActiveImg(prev => (prev + 1) % productImages.length);
                          }, 3500);
                        }
                      }} style={{
                        width: '72px', height: '90px', borderRadius: '12px', cursor: 'pointer',
                        border: activeImg === i ? '2px solid #AF8E4A' : `2px solid ${border}`,
                        overflow: 'hidden', padding: 0, flexShrink: 0,
                        boxShadow: activeImg === i ? '0 4px 16px rgba(175,142,74,0.3)' : 'none',
                        transition: 'border .2s, box-shadow .2s',
                      }}>
                        <img src={url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                      </button>
                    ))
                  : thumbColors.map((color, i) => (
                      <button key={i} onClick={() => setActiveImg(i)} style={{
                        width: '72px', height: '90px', borderRadius: '12px', cursor: 'pointer',
                        border: activeImg === i ? '2px solid #AF8E4A' : `2px solid ${border}`,
                        background: `linear-gradient(135deg, ${color} 0%, ${color}AA 100%)`,
                        transition: 'all 0.2s', flexShrink: 0,
                        boxShadow: activeImg === i ? '0 4px 16px rgba(175,142,74,0.3)' : 'none',
                      }} />
                    ))
              }
            </div>

            <div style={{
              flex: 1, borderRadius: '24px', overflow: 'hidden', aspectRatio: '4/5',
              background: productImages.length > 0
                ? '#f0f4f1'
                : `linear-gradient(135deg, ${dp.colors[0] ?? '#244D3B'} 0%, ${dp.colors[1] ?? '#AF8E4A'}66 50%, ${dp.colors[0] ?? '#1D4939'}AA 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
              boxShadow: '0 24px 64px rgba(0,0,0,0.14)',
            }}>
              {productLoading ? (
                <div className="ihsen-img-skel" style={{ position:'absolute', inset:0, borderRadius:24 }} />
              ) : productImages.length > 0 ? (
                <>
                  <img
                    key={activeImg}
                    src={productImages[activeImg]}
                    alt={dbProduct?.name_ar ?? ''}
                    className="ihsen-img-enter"
                    onLoad={() => setImgLoading(false)}
                    style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
                  />
                  {imgLoading && <div className="ihsen-img-skel" style={{ position:'absolute', inset:0 }} />}
                  {productImages.length > 1 && (
                    <div style={{ position:'absolute', bottom:14, left:'50%', transform:'translateX(-50%)', display:'flex', gap:6 }}>
                      {productImages.map((_,i) => (
                        <button key={i} onClick={() => setActiveImg(i)} style={{
                          width: i===activeImg ? 20 : 7, height:7, borderRadius:4,
                          background: i===activeImg ? '#AF8E4A' : 'rgba(255,255,255,0.55)',
                          border:'none', cursor:'pointer', padding:0,
                          transition:'all .3s cubic-bezier(0.22,1,0.36,1)',
                        }} />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {dp.badge && (
                    <div style={{
                      position: 'absolute', top: '16px', [isAr ? 'right' : 'left']: '16px',
                      background: dp.badge === 'new' ? '#244D3B' : dp.badge === 'hot' ? '#AF8E4A' : '#DC2626',
                      color: '#fff', padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 800,
                      fontFamily: 'Inter, sans-serif', letterSpacing: '1.5px', textTransform: 'uppercase',
                    }}>
                      {dp.badge === 'new' ? 'NEW' : dp.badge === 'hot' ? 'HOT' : 'SALE'}
                    </div>
                  )}
                  <span style={{ fontSize: '96px', filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.2))' }}>
                    {dp.emoji}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="reveal" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            <style>{`
              @keyframes ihsen-right-shimmer{from{background-position:200% 0}to{background-position:-200% 0}}
              .ihsen-rskel{
                background:linear-gradient(90deg,${isDark?'#0f2419':'#e8f0eb'} 25%,${isDark?'#1a3a28':'#f3f8f5'} 50%,${isDark?'#0f2419':'#e8f0eb'} 75%);
                background-size:200% 100%;
                animation:ihsen-right-shimmer 1.4s ease-in-out infinite;
                border-radius:8px;
              }
            `}</style>

            {productLoading ? (
              <div style={{ display:'flex', flexDirection:'column', gap:28 }}>
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  <div className="ihsen-rskel" style={{ height:12, width:'30%' }} />
                  <div className="ihsen-rskel" style={{ height:30, width:'85%' }} />
                  <div className="ihsen-rskel" style={{ height:22, width:'60%' }} />
                </div>
                <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                  <div className="ihsen-rskel" style={{ height:40, width:'42%' }} />
                  <div className="ihsen-rskel" style={{ height:22, width:'22%', opacity:.6 }} />
                  <div className="ihsen-rskel" style={{ height:22, width:'14%', opacity:.5 }} />
                </div>
                <div className="ihsen-rskel" style={{ height:1, width:'100%', opacity:.4 }} />
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  <div className="ihsen-rskel" style={{ height:12, width:'28%' }} />
                  <div style={{ display:'flex', gap:10 }}>
                    {[1,2,3,4].map(i => <div key={i} className="ihsen-rskel" style={{ width:38, height:38, borderRadius:'50%' }} />)}
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  <div className="ihsen-rskel" style={{ height:12, width:'22%' }} />
                  <div style={{ display:'flex', gap:8 }}>
                    {['XS','S','M','L','XL','XXL'].map(s => <div key={s} className="ihsen-rskel" style={{ height:36, width:52, borderRadius:10 }} />)}
                  </div>
                </div>
                <div style={{ display:'flex', gap:16, alignItems:'center' }}>
                  <div className="ihsen-rskel" style={{ height:12, width:'16%' }} />
                  <div className="ihsen-rskel" style={{ height:44, width:128, borderRadius:12 }} />
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  <div className="ihsen-rskel" style={{ height:56, width:'100%', borderRadius:14 }} />
                  <div className="ihsen-rskel" style={{ height:50, width:'100%', borderRadius:14, opacity:.6 }} />
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  {[1,2,3,4].map(i => <div key={i} className="ihsen-rskel" style={{ height:46, borderRadius:10 }} />)}
                </div>
              </div>
            ) : (
              <>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#AF8E4A', letterSpacing: '2px', textTransform: 'uppercase', fontFamily: 'Inter, sans-serif' }}>
                {category}
              </span>
              <h1 style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 900, color: text, margin: '8px 0 0', lineHeight: 1.25, fontFamily: isAr ? 'Cairo, sans-serif' : 'Inter, sans-serif', wordBreak: 'break-word' }}>
                {name}
              </h1>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
              <span style={{ fontSize: isMobile ? '28px' : '36px', fontWeight: 900, color: '#244D3B', fontFamily: 'Inter, sans-serif' }}>
                {dp.price.toLocaleString('ar-DZ')} <span style={{ fontSize: isMobile ? '14px' : '18px', fontWeight: 600 }}>دج</span>
              </span>
              {dp.originalPrice && dp.originalPrice > dp.price && (
                <>
                  <span style={{ fontSize: isMobile ? '16px' : '22px', color: sub, textDecoration: 'line-through', fontFamily: 'Inter, sans-serif' }}>
                    {dp.originalPrice.toLocaleString('ar-DZ')}
                  </span>
                  {discountPct && (
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#DC2626', background: 'rgba(220,38,38,0.1)', padding: '3px 8px', borderRadius: '6px', fontFamily: 'Inter, sans-serif' }}>
                      -{discountPct}%
                    </span>
                  )}
                </>
              )}
            </div>

            <div style={{ height: '1px', background: border }} />

            {(isAr ? dbProduct?.desc_ar : dbProduct?.desc_fr) && (
              <div style={{ fontSize:'14px', color:sub, lineHeight:1.75, fontFamily:font }}>
                {isAr ? dbProduct!.desc_ar : dbProduct!.desc_fr}
              </div>
            )}

            <div>
              <p style={{ fontSize: '13px', fontWeight: 700, color: sub, marginBottom: '12px' }}>
                {isAr ? `اللون: ${dp.colors[selectedColor] ?? '—'}` : `Couleur: ${dp.colors[selectedColor] ?? '—'}`}
              </p>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {dp.colors.map((color, i) => {
                  const soldOut = isColorSoldOut(i);
                  return (
                    <button key={i}
                      onClick={() => { if (!soldOut) setSelectedColor(i); }}
                      title={soldOut ? (isAr ? 'نفد من المخزون' : 'Épuisé') : color}
                      style={{
                        width:'38px', height:'38px', borderRadius:'50%', background:color,
                        border: selectedColor === i ? '3px solid #AF8E4A' : `3px solid ${border}`,
                        cursor: soldOut ? 'not-allowed' : 'pointer', transition:'all 0.18s',
                        opacity: soldOut ? 0.38 : 1,
                        position:'relative' as const,
                        boxShadow: selectedColor === i ? `0 0 0 3px ${isDark ? '#111' : '#fff'}, 0 0 0 5px #AF8E4A` : 'none',
                      }}>
                      {soldOut && (
                        <div style={{ position:'absolute', inset:0, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.45)', color:'#fff', fontSize:14, fontWeight:700, lineHeight:1 }}>✕</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <p style={{ fontSize: '13px', fontWeight: 700, color: sub }}>
                  {isAr ? `المقاس: ${selectedSize}` : `Taille: ${selectedSize}`}
                </p>
                <button onClick={() => setSizeChartOpen(true)} style={{ fontSize: '12px', color: '#AF8E4A', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'rgba(175,142,74,.4)' }}>
                  {isAr ? 'جدول المقاسات ↗' : 'Guide des tailles ↗'}
                </button>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {SIZES.map(size => {
                  const qty = getStock(selectedColor, size);
                  const oos = dbProduct?.stock !== undefined && dbProduct?.stock !== null && qty === 0;
                  const low = !oos && dbProduct?.stock !== undefined && dbProduct?.stock !== null && qty > 0 && qty <= 3;
                  return (
                    <button key={size}
                      onClick={() => { if (!oos) setSelectedSize(size); }}
                      style={{
                        padding:'9px 18px', borderRadius:'10px',
                        border: selectedSize === size && !oos ? '2px solid #244D3B' : `2px solid ${border}`,
                        background: oos ? (isDark ? 'rgba(255,255,255,0.04)' : '#F3F4F6') : selectedSize === size ? '#244D3B' : surface,
                        color: oos ? sub : selectedSize === size ? '#fff' : text,
                        fontSize:'13px', fontWeight:700,
                        cursor: oos ? 'not-allowed' : 'pointer',
                        transition:'all 0.18s', fontFamily:'Inter, sans-serif',
                        opacity: oos ? 0.45 : 1,
                        textDecoration: oos ? 'line-through' : 'none',
                        position:'relative' as const,
                      }}>
                      {size}
                      {low && (
                        <span style={{
                          position:'absolute', top:-7, right:-7,
                          background:'#F59E0B', color:'#fff', borderRadius:'50%',
                          width:16, height:16, fontSize:9, fontWeight:900,
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontFamily:'Inter, sans-serif', lineHeight:1,
                        }}>{qty}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {dbProduct?.stock !== undefined && dbProduct?.stock !== null && (() => {
                if (selectedStockQty === 0) return (
                  <div style={{ marginTop:10, display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderRadius:10, background:'#FEF2F2', border:'1px solid #FECACA', color:'#DC2626', fontSize:13, fontWeight:700, fontFamily:isAr?'Cairo, sans-serif':'Inter, sans-serif' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    {isAr ? 'هذا المقاس نفد من المخزون' : 'Cette taille est épuisée'}
                  </div>
                );
                if (selectedStockQty <= 3 && selectedStockQty > 0) return (
                  <div style={{ marginTop:10, display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderRadius:10, background:'#FFFBEB', border:'1px solid #FDE68A', color:'#92400E', fontSize:13, fontWeight:700, fontFamily:isAr?'Cairo, sans-serif':'Inter, sans-serif' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2c0 2.5-2 5-3 5.5C9.5 6 8 4.5 8 3c-1 2.5-1 5 1 7.5C7.5 10 6 8.5 6 7c-1.5 2-2 4.5-.5 7C7 17.5 9.5 20 12 20s5-2.5 6.5-6c.5-1.5.5-3-.5-4.5C17 11 15.5 12.5 15 13c1-3 0-6-2-11z"/></svg>
                    {isAr ? `آخر ${selectedStockQty} قطع فقط!` : `Plus que ${selectedStockQty} en stock!`}
                  </div>
                );
                return null;
              })()}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: sub }}>{isAr ? 'الكمية' : 'Quantité'}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0', border: `2px solid ${border}`, borderRadius: '12px', overflow: 'hidden' }}>
                <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ width: '40px', height: '40px', border: 'none', background: surface, color: text, fontSize: '20px', cursor: 'pointer', fontWeight: 300 }}>−</button>
                <span style={{ width: '48px', textAlign: 'center', fontWeight: 700, fontSize: '16px', fontFamily: 'Inter, sans-serif', color: text }}>{qty}</span>
                <button onClick={() => setQty(q => q + 1)} style={{ width: '40px', height: '40px', border: 'none', background: surface, color: '#244D3B', fontSize: '20px', cursor: 'pointer', fontWeight: 700 }}>+</button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={handleOrder} disabled={isSelectedOOS} style={{
                width: '100%', height: '56px', borderRadius: '14px',
                background: isSelectedOOS
                  ? (isDark ? '#2a2a2a' : '#E5E7EB')
                  : 'linear-gradient(135deg, #244D3B 0%, #1D4939 100%)',
                color: isSelectedOOS ? sub : '#fff',
                border: 'none', cursor: isSelectedOOS ? 'not-allowed' : 'pointer',
                fontSize: '17px', fontWeight: 800, fontFamily: 'Cairo, sans-serif',
                boxShadow: isSelectedOOS ? 'none' : '0 8px 24px rgba(36,77,59,0.35)',
                transition: 'all 0.2s', letterSpacing: '0.5px',
              }}>
                <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:9 }}>
                  {isSelectedOOS ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                  )}
                  {isSelectedOOS ? (isAr ? 'نفد من المخزون' : 'Épuisé') : (isAr ? 'اطلبي الآن' : 'Commander maintenant')}
                </span>
              </button>
              <button onClick={handleAddToCart} disabled={isSelectedOOS} style={{
                width: '100%', height: '50px', borderRadius: '14px',
                background: added ? 'rgba(36,77,59,0.1)' : surface,
                color: added ? '#244D3B' : isSelectedOOS ? sub : text,
                border: `2px solid ${added ? '#244D3B' : border}`,
                cursor: isSelectedOOS ? 'not-allowed' : 'pointer',
                fontSize: '15px', fontWeight: 700,
                fontFamily: 'Cairo, sans-serif', transition: 'all 0.2s',
                opacity: isSelectedOOS ? 0.4 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
              }}>
                {added ? (
                  <>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    {isAr ? 'أضيفت للسلة' : 'Ajouté'}
                  </>
                ) : (
                  <>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
                    {isAr ? 'أضيفي للسلة' : 'Ajouter au panier'}
                  </>
                )}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[
                { d:'M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0', ar: 'توصيل لـ 69 ولاية', fr: 'Livraison 69 wilayas' },
                { d:'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z', ar: 'الدفع عند الاستلام', fr: 'Paiement à la livraison' },
                { d:'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z', ar: 'تأكيد هاتفي', fr: 'Confirmation par tél.' },
                { d:'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', ar: 'جودة مضمونة', fr: 'Qualité garantie' },
              ].map((b, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '10px', border: `1px solid ${border}`, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#AF8E4A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}>
                    <path d={b.d} />
                  </svg>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: sub }}>{isAr ? b.ar : b.fr}</span>
                </div>
              ))}
            </div>
            </>
            )}
          </div>
        </div>

        <div style={{ maxWidth: '1240px', margin: isMobile ? '40px auto 0' : '80px auto 0', padding: isMobile ? '0 12px' : '0 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '24px' : '48px' }}>
            <div className="reveal">
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: text, marginBottom: '16px' }}>
                {isAr ? 'وصف المنتج' : 'Description du produit'}
              </h2>
              <p style={{ fontSize: '15px', lineHeight: 1.8, color: sub }}>
                {isAr
                  ? `${dp.nameAr} — قطعة مختارة بعناية من مجموعة إحسان الحصرية. تتميز بجودة أقمشتها الفائقة وتصميمها الأنيق الذي يجمع بين الاحتشام والرقي. مثالية للمناسبات اليومية والخاصة على حد سواء.`
                  : `${dp.nameFr} — une pièce soigneusement sélectionnée de la collection exclusive Ihsen. Elle se distingue par la qualité supérieure de ses tissus et son design élégant qui allie modestie et raffinement.`
                }
              </p>
              <ul style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px', listStyle: 'none', padding: 0 }}>
                {[
                  isAr ? '✦ قماش عالي الجودة' : '✦ Tissu haute qualité',
                  isAr ? '✦ خياطة محكمة ودقيقة' : '✦ Couture soignée et précise',
                  isAr ? '✦ ألوان ثابتة لا تبهت' : '✦ Couleurs stables et durables',
                  isAr ? '✦ مريحة للارتداء اليومي' : '✦ Confortable au quotidien',
                ].map((item, i) => (
                  <li key={i} style={{ fontSize: '14px', color: sub, fontWeight: 500 }}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="reveal">
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: text, marginBottom: '16px' }}>
                {isAr ? 'معلومات الطلب' : 'Informations de commande'}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { label: isAr ? 'طريقة الدفع' : 'Paiement', value: isAr ? 'الدفع عند الاستلام (COD)' : 'Paiement à la livraison (COD)' },
                  { label: isAr ? 'التوصيل' : 'Livraison', value: isAr ? '3-7 أيام عمل' : '3-7 jours ouvrables' },
                  { label: isAr ? 'التأكيد' : 'Confirmation', value: isAr ? 'اتصال هاتفي قبل الشحن' : 'Appel téléphonique avant envoi' },
                  { label: isAr ? 'الإرجاع' : 'Retour', value: isAr ? '7 أيام من الاستلام' : '7 jours après réception' },
                ].map((row, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: `1px solid ${border}` }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: sub }}>{row.label}</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: text }}>{row.value}</span>
                  </div>
                ))}
              </div>

              <button onClick={handleOrder} style={{
                marginTop: '24px', width: '100%', height: '52px', borderRadius: '14px',
                background: 'linear-gradient(135deg, #AF8E4A 0%, #DAC08B 100%)',
                color: '#fff', border: 'none', cursor: 'pointer',
                fontSize: '16px', fontWeight: 800, fontFamily: 'Cairo, sans-serif',
                boxShadow: '0 8px 24px rgba(175,142,74,0.35)',
              }}>
                <span style={{ display:'inline-flex', alignItems:'center', gap:7 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1" ry="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>
                  {isAr ? 'تعبئة نموذج الطلب' : 'Remplir le formulaire'}
                </span>
              </button>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: '1240px', margin: isMobile ? '40px auto 0' : '80px auto 0', padding: isMobile ? '0 12px 48px' : '0 20px 80px' }}>
          <h2 className="reveal" style={{ fontSize: isMobile ? '20px' : '26px', fontWeight: 900, color: text, marginBottom: isMobile ? '20px' : '32px' }}>
            {isAr ? 'منتجات مشابهة' : 'Produits similaires'}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: isMobile ? '12px' : '20px' }}>
            {otherRelated.map((p, i) => (
              <a key={p.id} href={`/products/${p.id}`} className="reveal" style={{
                display: 'block', textDecoration: 'none', borderRadius: '20px', overflow: 'hidden',
                border: `1px solid ${border}`, background: surface,
                transition: 'transform 0.25s, box-shadow 0.25s',
                transitionDelay: `${i * 0.06}s`,
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-6px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 20px 48px rgba(0,0,0,0.12)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
              >
                <div style={{
                  height: isMobile ? '120px' : '180px', background: `linear-gradient(135deg, ${p.colors[0] ?? '#244D3B'} 0%, ${p.colors[1] ?? '#AF8E4A'}66 100%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? '36px' : '56px',
                }}>
                  {(p as Record<string, unknown>).emoji as string ?? '🛍️'}
                </div>
                <div style={{ padding: isMobile ? '10px' : '14px' }}>
                  <p style={{ fontSize: isMobile ? '11px' : '13px', fontWeight: 700, color: text, marginBottom: '4px', lineHeight: 1.3 }}>
                    {isAr ? p.nameAr : p.nameFr}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: isMobile ? '13px' : '16px', fontWeight: 800, color: '#244D3B', fontFamily: 'Inter, sans-serif' }}>
                      {p.price.toLocaleString('ar-DZ')} دج
                    </span>
                    {p.badge && (
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', background: p.badge === 'new' ? '#244D3B' : p.badge === 'hot' ? '#AF8E4A' : '#DC2626', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
                        {p.badge.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* ── FOOTER ───────────────────────────────────────────── */}
        <footer style={{ borderTop: `1px solid ${border}`, padding: isMobile ? '24px 12px' : '32px 20px', textAlign: 'center', background: isDark ? '#0A0A0A' : '#F4F1EC' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '12px' }}>
            <Image src={isDark ? '/logos/icon-gold.svg' : '/logos/icon-green.svg'} alt="إحسان" width={28} height={31} />
            <span style={{ fontSize: '20px', fontWeight: 900, color: isDark ? '#AF8E4A' : '#244D3B' }}>إحسان</span>
          </div>
          <p style={{ fontSize: '13px', color: sub, marginBottom: '20px' }}>
            {isAr ? '© 2024 إحسان — أزياء نسائية محتشمة راقية' : '© 2024 Ihsen — Mode féminine modeste et élégante'}
          </p>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'center' }}>
            {social.instagram && (
              <a href={social.instagram} target="_blank" rel="noopener noreferrer" style={{ color: isDark ? '#AF8E4A' : '#244D3B', opacity: 0.5, transition: 'all 0.3s', display:'flex' }} onMouseEnter={e=>{e.currentTarget.style.opacity='1'; e.currentTarget.style.color='#E1306C';}} onMouseLeave={e=>{e.currentTarget.style.opacity='0.5'; e.currentTarget.style.color=isDark ? '#AF8E4A' : '#244D3B';}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              </a>
            )}
            {social.facebook && (
              <a href={social.facebook} target="_blank" rel="noopener noreferrer" style={{ color: isDark ? '#AF8E4A' : '#244D3B', opacity: 0.5, transition: 'all 0.3s', display:'flex' }} onMouseEnter={e=>{e.currentTarget.style.opacity='1'; e.currentTarget.style.color='#1877F2';}} onMouseLeave={e=>{e.currentTarget.style.opacity='0.5'; e.currentTarget.style.color=isDark ? '#AF8E4A' : '#244D3B';}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
              </a>
            )}
            {social.tiktok && (
              <a href={social.tiktok} target="_blank" rel="noopener noreferrer" style={{ color: isDark ? '#AF8E4A' : '#244D3B', opacity: 0.5, transition: 'all 0.3s', display:'flex' }} onMouseEnter={e=>{e.currentTarget.style.opacity='1'; e.currentTarget.style.color=isDark ? '#ffffff' : '#000000';}} onMouseLeave={e=>{e.currentTarget.style.opacity='0.5'; e.currentTarget.style.color=isDark ? '#AF8E4A' : '#244D3B';}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"></path></svg>
              </a>
            )}
            {social.whatsapp && (
              <a href={social.whatsapp} target="_blank" rel="noopener noreferrer" style={{ color: isDark ? '#AF8E4A' : '#244D3B', opacity: 0.5, transition: 'all 0.3s', display:'flex' }} onMouseEnter={e=>{e.currentTarget.style.opacity='1'; e.currentTarget.style.color='#25D366';}} onMouseLeave={e=>{e.currentTarget.style.opacity='0.5'; e.currentTarget.style.color=isDark ? '#AF8E4A' : '#244D3B';}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              </a>
            )}
            {social.telegram && (
              <a href={social.telegram} target="_blank" rel="noopener noreferrer" style={{ color: isDark ? '#AF8E4A' : '#244D3B', opacity: 0.5, transition: 'all 0.3s', display:'flex' }} onMouseEnter={e=>{e.currentTarget.style.opacity='1'; e.currentTarget.style.color='#24A1DE';}} onMouseLeave={e=>{e.currentTarget.style.opacity='0.5'; e.currentTarget.style.color=isDark ? '#AF8E4A' : '#244D3B';}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon><line x1="22" y1="2" x2="11" y2="13"></line></svg>
              </a>
            )}
          </div>
        </footer>
      </main>
    </>
  );
}
