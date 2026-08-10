'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { FEATURED_PRODUCTS, validatePromo, calcDiscount, type PromoCode } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { getCommunesByWilaya, WILAYAS_2026, WILAYA_FR, COMMUNE_FR } from '@/lib/communes';
import { useCart } from '@/context/CartContext';
import { sanitizeName, sanitizePhone, sanitizeText } from '@/lib/sanitize';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

const DEFAULT_DELIVERY_PRICES = { home: 600, office: 400 };

interface WilayaPrice { home: number; office: number; }
interface DeliveryCompany {
  id: string; name: string; phone: string;
  active: boolean; isDefault: boolean;
  prices: Record<string, WilayaPrice>;
}

function OrderContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const productId  = Number(searchParams.get('product') ?? 1);
  const paramColor = Number(searchParams.get('color')   ?? 0);
  const paramSize  = searchParams.get('size')            ?? 'M';
  const paramQty   = Number(searchParams.get('qty')     ?? 1);
  const fromCart   = searchParams.get('from') === 'cart';

  const product = FEATURED_PRODUCTS.find(p => p.id === productId) ?? FEATURED_PRODUCTS[0];

  // Close cart drawer when landing on order page
  const { closeCart, isOpen: cartOpen, items: cartItems, clearCart, subtotal: cartSubtotal } = useCart();
  useEffect(() => { if (cartOpen) closeCart(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [lang,  setLang]  = useState<'ar'|'fr'>('ar');
  const [theme, setTheme] = useState<'light'|'dark'>('light');
  const [submitted, setSubmitted] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [orderNum,  setOrderNum]  = useState('');
  const [windowWidth, setWindowWidth] = useState(1200);

  // form fields
  const [name,         setName]        = useState('');
  const [phone,        setPhone]       = useState('');
  const [wilaya,       setWilaya]      = useState('');
  const [commune,      setCommune]     = useState('');
  const [address,      setAddress]     = useState('');
  const [deliveryType, setDeliveryType] = useState<'home'|'office'>('home');
  const [size,         setSize]        = useState(paramSize);
  const [qty,          setQty]         = useState(paramQty);
  const [color,        setColor]       = useState(paramColor);
  const [notes,        setNotes]       = useState('');
  const [agree,        setAgree]       = useState(false);
  const [errors,       setErrors]      = useState<Record<string,string>>({});
  const [copied,       setCopied]      = useState(false);

  // Delivery companies
  const [deliveryCompanies, setDeliveryCompanies] = useState<DeliveryCompany[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');

  // Promo code
  const [promoInput,   setPromoInput]  = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCode|null>(null);
  const [promoError,   setPromoError]  = useState('');
  const [promoSuccess, setPromoSuccess] = useState('');

  const communes = getCommunesByWilaya(wilaya);
  useEffect(() => { setCommune(''); }, [wilaya]);

  useEffect(() => {
    const html = document.documentElement;
    setLang((html.getAttribute('data-lang') as 'ar'|'fr') ?? 'ar');
    setTheme((html.getAttribute('data-theme') as 'light'|'dark') ?? 'light');

    const update = () => setWindowWidth(window.innerWidth);
    update();
    window.addEventListener('resize', update);

    // Load delivery companies
    (async () => {
      try {
        const { data } = await supabase
          .from('site_settings').select('value').eq('key','delivery_companies').maybeSingle();
        if (data) {
          const all: DeliveryCompany[] = JSON.parse((data as {value:string}).value);
          const active = all.filter(c => c.active);
          setDeliveryCompanies(active);
          // Auto-select default or first
          const def = active.find(c => c.isDefault) ?? active[0];
          if (def) setSelectedCompanyId(def.id);
        }
      } catch { /* use fallback prices */ }
    })();

    // Auto-apply promo from URL (?promo=CODE) — silent, no error shown
    const urlPromo = searchParams.get('promo');
    if (urlPromo) {
      const code = urlPromo.trim().toUpperCase();
      setPromoInput(code);
      (async () => {
        try {
          const { data } = await supabase
            .from('promo_codes').select('*').eq('code', code).eq('active', true).single();
          if (data) {
            const r = data as Record<string, unknown>;
            const initialSubtotal = (FEATURED_PRODUCTS.find(p => p.id === productId) ?? FEATURED_PRODUCTS[0]).price * paramQty;
            if (initialSubtotal >= ((r.min_order as number) ?? 0)) {
              const promo: PromoCode = { code: r.code as string, type: r.type as PromoCode['type'], value: r.value as number, minOrder: (r.min_order as number) ?? 0, maxUses: (r.max_uses as number) ?? 0, active: true, descAr: (r.desc_ar as string) ?? '', descFr: (r.desc_fr as string) ?? '' };
              setAppliedPromo(promo);
              setPromoSuccess('✓');
            }
          } else {
            // fallback to local constants
            const found = validatePromo(code, (FEATURED_PRODUCTS.find(p => p.id === productId) ?? FEATURED_PRODUCTS[0]).price * paramQty);
            if (found) { setAppliedPromo(found); setPromoSuccess('✓'); }
          }
        } catch {
          const found = validatePromo(code, (FEATURED_PRODUCTS.find(p => p.id === productId) ?? FEATURED_PRODUCTS[0]).price * paramQty);
          if (found) { setAppliedPromo(found); setPromoSuccess('✓'); }
        }
      })();
    }

    return () => window.removeEventListener('resize', update);
  }, []);

  const isAr      = lang === 'ar';
  const isDark    = theme === 'dark';
  const isMobile  = windowWidth < 640;
  const isTablet  = windowWidth >= 640 && windowWidth < 1024;
  const isDesktop = windowWidth >= 1024;

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

  // ── Colors ──────────────────────────────────────────────────────────────
  const C = {
    bg:     isDark ? '#0a1a0f' : '#F9F6F1',
    card:   isDark ? '#0f2419' : '#FFFFFF',
    border: isDark ? '#244D3B' : '#E5DDD0',
    text:   isDark ? '#F0EBE3' : '#1a1a1a',
    muted:  isDark ? '#8BA89A' : '#6B6B6B',
    green:  '#244D3B',
    gold:   '#AF8E4A',
    red:    '#DC2626',
    input:  isDark ? '#1D4939' : '#F5F0EA',
  };

  const selectedCompany = deliveryCompanies.find(c => c.id === selectedCompanyId) ?? null;
  const wilayaDeliveryPrices: WilayaPrice = (selectedCompany && wilaya && selectedCompany.prices[wilaya])
    ? selectedCompany.prices[wilaya]
    : (selectedCompany && wilaya
        ? (Object.values(selectedCompany.prices)[0] ?? DEFAULT_DELIVERY_PRICES)
        : DEFAULT_DELIVERY_PRICES);
  const deliveryPrice = wilayaDeliveryPrices[deliveryType];
  const subtotal      = fromCart ? cartSubtotal : (product.price * qty);
  const discount      = appliedPromo ? calcDiscount(appliedPromo, subtotal, deliveryPrice) : 0;
  const effectiveDelivery = (appliedPromo?.type === 'shipping') ? 0 : deliveryPrice;
  const total         = subtotal - (appliedPromo?.type !== 'shipping' ? discount : 0) + effectiveDelivery;
  const font          = isAr ? 'Cairo, sans-serif' : 'Inter, sans-serif';

  const applyPromo = async (codeOverride?: string) => {
    const code = (codeOverride ?? promoInput).trim().toUpperCase();
    setPromoError('');
    setPromoSuccess('');
    if (!code) {
      setPromoError(isAr ? 'أدخلي الكود أولاً' : 'Entrez le code');
      return;
    }
    // Try Supabase first, fallback to local constants
    let found: PromoCode | null = null;
    try {
      const { data } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', code)
        .eq('active', true)
        .single();
      if (data) {
        const row = data as Record<string, unknown>;
        const minOrder = (row.min_order as number) ?? 0;
        if (subtotal >= minOrder) {
          found = {
            code:     row.code as string,
            type:     row.type as PromoCode['type'],
            value:    row.value as number,
            minOrder: minOrder,
            maxUses:  (row.max_uses as number) ?? 0,
            active:   true,
            descAr:   (row.desc_ar as string) ?? '',
            descFr:   (row.desc_fr as string) ?? '',
          };
        }
      }
    } catch {
      // fallback to local
      found = validatePromo(code, subtotal);
    }
    if (!found) {
      setAppliedPromo(null);
      setPromoError(isAr ? 'الكود غير صحيح أو منتهي الصلاحية' : 'Code invalide ou expiré');
      return;
    }
    setAppliedPromo(found);
    setPromoSuccess(isAr ? found.descAr : found.descFr);
  };

  const removePromo = () => {
    setAppliedPromo(null);
    setPromoInput('');
    setPromoError('');
    setPromoSuccess('');
  };

  // ── Validation ───────────────────────────────────────────────────────────
  const validate = () => {
    const e: Record<string,string> = {};
    if (!name.trim())  e.name    = isAr ? 'الاسم مطلوب'                    : 'Nom requis';
    if (!phone.trim()) e.phone   = isAr ? 'رقم الهاتف مطلوب'               : 'Téléphone requis';
    else if (!/^(05|06|07)\d{8}$/.test(phone.replace(/\s/g,'')))
                       e.phone   = isAr ? 'رقم غير صحيح (05/06/07XXXXXXXX)' : 'Numéro invalide';
    if (!wilaya)       e.wilaya  = isAr ? 'اختاري الولاية'                  : 'Choisissez la wilaya';
    if (!commune)      e.commune = isAr ? 'اختاري البلدية'                  : 'Choisissez la commune';
    if (!address.trim())e.address= isAr ? 'العنوان مطلوب'                   : 'Adresse requise';
    if (!agree)        e.agree   = isAr ? 'يجب الموافقة على الشروط'         : 'Acceptez les conditions';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);

    const num = 'IH-' + Date.now().toString().slice(-6);

    try {
      // Build items payload for cart orders
      const cartPayload = fromCart
        ? cartItems.map(i => ({
            productId: i.productId,
            name: i.nameAr,
            emoji: i.emoji,
            size: i.size,
            color: i.color,
            qty: i.qty,
            price: i.price,
          }))
        : null;

      // ── Sanitize all user-supplied strings before writing to DB ─────────────
      const safeCustomerName = sanitizeName(name, 100);
      const safePhone        = sanitizePhone(phone, 20);
      const safeWilaya       = sanitizeText(wilaya, 60);
      const safeCommune      = sanitizeText(commune, 80);
      const safeAddress      = sanitizeText(address, 200);
      const notesObj = {
        text: notes.trim() ? sanitizeText(notes, 500) : null,
        company: selectedCompany && deliveryCompanies.length > 1 ? selectedCompany.name : null,
        items: fromCart ? cartItems.map(i => ({ name: i.nameAr, emoji: i.emoji, size: i.size, qty: i.qty, price: i.price })) : null
      };
      const safeNotes = JSON.stringify(notesObj);

      const { error } = await supabase.from('orders').insert({
        order_num:     num,
        status:        'pending',
        customer_name: safeCustomerName,
        phone:         safePhone,
        wilaya:        safeWilaya,
        commune:       safeCommune,
        address:       safeAddress,
        delivery_type: deliveryType,
        // Single-product fields (0/'-' when from cart to satisfy NOT NULL)
        product_id:    fromCart ? 0 : product.id,
        product_name:  fromCart ? cartItems.map(i => i.nameAr).join('، ') : product.nameAr,
        product_emoji: fromCart ? '🛍️' : (product as unknown as {emoji?: string}).emoji ?? '🛍️',
        color_index:   fromCart ? 0 : color,
        size:          fromCart ? '-' : size,
        qty:           fromCart ? cartItems.reduce((s, i) => s + i.qty, 0) : qty,
        subtotal,
        delivery_price: deliveryPrice,
        discount,
        promo_code:    appliedPromo?.code ?? null,
        total,
        notes:         safeNotes,
      });
      if (error) {
        console.error('Supabase insert error:', error.message);
        alert(isAr ? 'حدث خطأ أثناء حفظ الطلب. يرجى المحاولة مرة أخرى.' : 'Erreur lors de l\'enregistrement. Veuillez réessayer.');
        setLoading(false);
        return;
      }

      // Increment used_count for the promo code
      if (appliedPromo?.code) {
        const { data: pData } = await supabase.from('promo_codes').select('id, used_count').eq('code', appliedPromo.code).single();
        if (pData) {
          await supabase.from('promo_codes').update({ used_count: (pData.used_count || 0) + 1 }).eq('id', pData.id);
        }
      }
    } catch (e) {
      // Supabase not yet set up — continue anyway in demo mode
      console.warn('Order saved in demo mode only:', e);
    }

    setOrderNum(num);
    setSubmitted(true);
    setLoading(false);
    if (fromCart) clearCart(); // تفريغ السلة بعد تأكيد الطلب
  };

  // ── Shared styles ────────────────────────────────────────────────────────
  const inputSt = (field: string): React.CSSProperties => ({
    width: '100%', padding: isMobile ? '12px 14px' : '11px 14px',
    borderRadius: 10, border: `1.5px solid ${errors[field] ? C.red : C.border}`,
    background: C.input, color: C.text,
    fontSize: isMobile ? 15 : 14, fontFamily: font,
    outline: 'none', direction: isAr ? 'rtl' : 'ltr',
    boxSizing: 'border-box' as const, transition: 'border-color .2s',
    WebkitAppearance: 'none' as const,
  });

  const labelSt: React.CSSProperties = {
    display: 'block', marginBottom: 6,
    fontSize: isMobile ? 11 : 12, fontWeight: 700,
    color: C.muted, fontFamily: font,
    textTransform: 'uppercase' as const, letterSpacing: '.5px',
  };

  const errSt: React.CSSProperties = {
    color: C.red, fontSize: 11, marginTop: 4, fontFamily: font,
  };

  const sectionTitle = (iconPath: string, ar: string, fr: string) => (
    <h2 style={{
      fontSize: 13, fontWeight: 700, color: C.green,
      marginBottom: 16, paddingBottom: 10, borderBottom: `1px solid ${C.border}`,
      display: 'flex', gap: 7, alignItems: 'center', fontFamily: font,
    }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={iconPath}/></svg>
      {isAr ? ar : fr}
    </h2>
  );

  // ── Success screen ───────────────────────────────────────────────────────
  const copyOrderNum = () => {
    navigator.clipboard.writeText(orderNum);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (submitted) {
    return (
      <div style={{ minHeight:'100vh', background:C.bg, fontFamily:font, direction:isAr?'rtl':'ltr' }}>

        {/* Nav */}
        <nav style={{ background:isDark?'rgba(10,26,15,.96)':'rgba(249,246,241,.96)', backdropFilter:'blur(14px)', borderBottom:`1px solid ${C.border}`, padding:isMobile?'10px 14px':'12px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <button onClick={() => router.push('/')} style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:8, padding:isMobile?'6px 10px':'6px 14px', cursor:'pointer', color:C.text, fontSize:13, fontFamily:font }}>
            {isAr ? '→ الرئيسية' : '← Accueil'}
          </button>
          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
            <Image src={isDark ? '/logos/icon-gold.svg' : '/logos/icon-green.svg'} alt="إحسان" width={isMobile?22:26} height={isMobile?22:26} />
            <span style={{ fontWeight:800, fontSize:15, color:isDark ? C.gold : C.green }}>إحسان</span>
          </div>
          <div style={{ width: isMobile?70:90 }} />
        </nav>

        <div style={{ maxWidth: isDesktop ? 880 : 620, margin:'0 auto', padding: isMobile?'22px 14px':'36px 20px' }}>

          {/* Hero */}
          <div style={{ textAlign:'center', marginBottom: isMobile?20:28 }}>
            <div style={{
              width:isMobile?68:84, height:isMobile?68:84, borderRadius:'50%',
              background:`linear-gradient(135deg, ${C.green}, #1D4939)`,
              display:'flex', alignItems:'center', justifyContent:'center',
              margin:'0 auto 14px',
              boxShadow:`0 8px 32px rgba(36,77,59,.35)`,
            }}>
              <svg width={isMobile?34:44} height={isMobile?34:44} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
            </div>
            <h1 style={{ fontSize:isMobile?21:28, fontWeight:800, color:C.text, marginBottom:7, fontFamily:font }}>
              {isAr ? 'تم تأكيد طلبك!' : 'Commande confirmée !'}
            </h1>
            <p style={{ fontSize:isMobile?12:14, color:C.muted, fontFamily:font }}>
              {isAr
                ? `سنتصل بكِ على ${phone} خلال 24 ساعة لتأكيد التفاصيل`
                : `Nous vous appellerons au ${phone} sous 24h`}
            </p>
          </div>

          {/* Order number banner */}
          <div style={{
            background:C.card, border:`2px solid ${C.gold}`,
            borderRadius:16, padding:isMobile?'16px 18px':'18px 28px',
            marginBottom:isMobile?14:20, textAlign:'center',
          }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:1.5, marginBottom:8, fontFamily:font }}>
              {isAr ? 'رقم طلبك' : 'Votre n° de commande'}
            </div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, marginBottom:10 }}>
              <span style={{ fontSize:isMobile?24:30, fontWeight:900, color:C.gold, fontFamily:'Inter, monospace', letterSpacing:3 }}>
                {orderNum}
              </span>
              <button onClick={copyOrderNum} style={{
                background: copied ? '#10B981' : C.input,
                border:`1px solid ${copied ? '#10B981' : C.border}`,
                borderRadius:8, padding:'7px 12px', cursor:'pointer',
                fontSize:11, fontWeight:700, color:copied?'#fff':C.text,
                fontFamily:font, transition:'all .25s', display:'flex', alignItems:'center', gap:5,
              }}>
                {copied
                  ? <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg> {isAr?'تم النسخ':'Copié !'}</>
                  : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> {isAr?'نسخ':'Copier'}</>
                }
              </button>
            </div>
            <p style={{ fontSize:11, color:C.muted, fontFamily:font, margin:0 }}>
              <span style={{ display:'inline-flex', alignItems:'center', gap:5 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                {isAr ? 'احتفظي بهذا الرقم — ستحتاجينه لتتبع طلبك' : 'Conservez ce numéro pour suivre votre colis'}
              </span>
            </p>
          </div>

          {/* Cards grid */}
          <div style={{ display:'grid', gridTemplateColumns:isDesktop?'1fr 1fr':'1fr', gap:isMobile?12:16, marginBottom:isMobile?14:20 }}>

            {/* Product card */}
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:isMobile?15:20 }}>
              <h3 style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:.5, marginBottom:14, fontFamily:font }}>
                <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
                  {fromCart
                    ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
                    : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                  }
                  {isAr?(fromCart?'سلة الطلب':'تفاصيل المنتج'):(fromCart?'Panier':'Produit commandé')}
                </span>
              </h3>
              {fromCart ? (
                /* Cart items in review */
                <div style={{ marginBottom:14, display:'flex', flexDirection:'column', gap:8 }}>
                  {cartItems.map(item => (
                    <div key={item.cartId} style={{ display:'flex', gap:10, alignItems:'center' }}>
                      <div style={{ width:36, height:36, borderRadius:8, flexShrink:0, overflow:'hidden', background:`linear-gradient(135deg, ${item.color}, ${C.green})`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        {item.image
                          ? <img src={item.image} alt={item.nameAr} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                          : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
                        }
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:C.text, fontFamily:font }}>{isAr?item.nameAr:item.nameFr}</div>
                        <div style={{ fontSize:10, color:C.muted, fontFamily:font }}>{item.size} · ×{item.qty}</div>
                      </div>
                      <div style={{ fontSize:12, fontWeight:700, color:C.gold, fontFamily:'Inter', whiteSpace:'nowrap' }}>
                        {(item.price*item.qty).toLocaleString()} {isAr?'دج':'DA'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:14 }}>
                  <div style={{ width:54, height:54, borderRadius:12, flexShrink:0, background:`linear-gradient(135deg, ${product.colors[color]??C.green}, ${C.green})`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
                  </div>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:3, fontFamily:font }}>{isAr?product.nameAr:product.nameFr}</div>
                    <div style={{ fontSize:12, color:C.muted, fontFamily:font }}>
                      {isAr?'الحجم:':'T:'} <strong style={{color:C.text}}>{size}</strong>
                      {' · '}{isAr?'الكمية:':'Q:'} <strong style={{color:C.text}}>{qty}</strong>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:4 }}>
                      <div style={{ width:13, height:13, borderRadius:'50%', background:product.colors[color]??C.green, border:`1px solid ${C.border}` }} />
                      <span style={{ fontSize:10, color:C.muted, fontFamily:font }}>{isAr?'اللون المختار':'Couleur choisie'}</span>
                    </div>
                  </div>
                </div>
              )}
              <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:12 }}>
                {[
                  { l:isAr?'سعر المنتج':'Sous-total', v:`${subtotal.toLocaleString()} ${isAr?'دج':'DA'}`, vc:undefined as string|undefined },
                  { l:isAr?(deliveryType==='home'?'توصيل للمنزل':'مكتب الشركة'):(deliveryType==='home'?'Livraison':'Bureau'),
                    v: effectiveDelivery===0 ? (isAr?'مجاني':'Gratuit') : `${effectiveDelivery} ${isAr?'دج':'DA'}`,
                    vc: effectiveDelivery===0 ? '#10B981' : undefined },
                ].map((r,i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', marginBottom:6, fontSize:12, color:C.muted, fontFamily:font }}>
                    <span>{r.l}</span><span style={{ color:r.vc }}>{r.v}</span>
                  </div>
                ))}
                {appliedPromo && discount > 0 && (
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6, fontSize:12, fontFamily:font, color:'#10B981', fontWeight:700 }}>
                    <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"/></svg>
                    {isAr?appliedPromo.descAr:appliedPromo.descFr}
                  </span>
                    <span>- {discount.toLocaleString()} {isAr?'دج':'DA'}</span>
                  </div>
                )}
                <div style={{ display:'flex', justifyContent:'space-between', paddingTop:8, borderTop:`1px solid ${C.border}` }}>
                  <span style={{ fontSize:14, fontWeight:700, color:C.text, fontFamily:font }}>{isAr?'المجموع':'Total'}</span>
                  <div style={{ textAlign: isAr?'left':'right' }}>
                    {appliedPromo && <div style={{ fontSize:10, color:C.muted, textDecoration:'line-through', fontFamily:'Inter' }}>{(subtotal+deliveryPrice).toLocaleString()}</div>}
                    <span style={{ fontSize:17, fontWeight:800, color:C.gold, fontFamily:font }}>{total.toLocaleString()} {isAr?'دج':'DA'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery card */}
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:isMobile?15:20 }}>
              <h3 style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:.5, marginBottom:14, fontFamily:font }}>
                <span style={{ display:'inline-flex', alignItems:'center', gap:5 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2-1 2 1 2-1 2 1 2-1 2 1V6m2 10V5a1 1 0 011-1h2a1 1 0 011 1v1m-4 14l4-1 4 1V9"/></svg>
                  {isAr?'معلومات التوصيل':'Livraison'}
                </span>
              </h3>
              {[
                { l:isAr?'الولاية':'Wilaya',     v:wilaya },
                { l:isAr?'البلدية':'Commune',    v:commune },
                { l:isAr?'العنوان':'Adresse',    v:address },
                { l:isAr?'نوع التوصيل':'Mode',  v:isAr?(deliveryType==='home'?'توصيل للمنزل':'مكتب الشركة'):(deliveryType==='home'?'À domicile':'Bureau') },
              ].map((r,i) => (
                <div key={i} style={{ marginBottom: i<3?10:0 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:.5, marginBottom:2, fontFamily:font }}>{r.l}</div>
                  <div style={{ fontSize:13, color:C.text, fontFamily:font, wordBreak:'break-word' }}>{r.v||'—'}</div>
                  {i < 3 && <div style={{ height:1, background:C.border, marginTop:8 }} />}
                </div>
              ))}
            </div>

            {/* COD card */}
            <div style={{ background:isDark?'#0a2a15':'#F0FFF4', border:`1px solid #10B98140`, borderRadius:16, padding:isMobile?15:20 }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom:8 }}><path d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
              <h3 style={{ fontSize:15, fontWeight:800, color:'#10B981', marginBottom:6, fontFamily:font }}>
                {isAr?'الدفع عند الاستلام':'Paiement à la livraison'}
              </h3>
              <p style={{ fontSize:12, color:C.muted, marginBottom:14, fontFamily:font }}>
                {isAr?'لا تدفعي أي مبلغ مسبقاً — الدفع فقط عند استلام طلبك':'Ne payez rien à l\'avance — payez uniquement à la réception'}
              </p>
              <div style={{ background:isDark?'#1D4939':'#fff', border:`1px solid #10B98130`, borderRadius:12, padding:'12px', textAlign:'center' }}>
                <div style={{ fontSize:11, color:C.muted, marginBottom:4, fontFamily:font }}>{isAr?'المبلغ المستحق عند الاستلام':'Montant à payer'}</div>
                <div style={{ fontSize:isMobile?22:26, fontWeight:900, color:C.gold, fontFamily:'Inter, monospace' }}>{total.toLocaleString()} {isAr?'دج':'DA'}</div>
              </div>
            </div>

            {/* Next steps card */}
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:isMobile?15:20 }}>
              <h3 style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:.5, marginBottom:14, fontFamily:font }}>
                <span style={{ display:'inline-flex', alignItems:'center', gap:5 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                  {isAr?'الخطوات التالية':'Prochaines étapes'}
                </span>
              </h3>
              {[
                { ar:'انتظري مكالمة التأكيد على رقم هاتفكِ', fr:'Attendez notre appel de confirmation' },
                { ar:'بعد التأكيد سيتم شحن طلبكِ خلال 24-48 ساعة', fr:'Après confirmation, envoi sous 24-48h' },
                { ar:'استقبلي الطرد وادفعي المبلغ عند الاستلام', fr:'Recevez le colis et payez à la livraison' },
              ].map((s,i) => (
                <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start', marginBottom:i<2?12:0 }}>
                  <div style={{ width:24, height:24, borderRadius:'50%', flexShrink:0, background:`linear-gradient(135deg, ${C.green}, #1D4939)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#fff', fontFamily:'Inter' }}>{i+1}</div>
                  <span style={{ fontSize:12, color:C.muted, fontFamily:font, lineHeight:1.55, paddingTop:3 }}>{isAr?s.ar:s.fr}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA buttons */}
          <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'1fr 1fr', gap:10 }}>
            <button onClick={() => router.push(`/track?num=${orderNum}`)} style={{
              background:`linear-gradient(135deg, ${C.green}, #1D4939)`, color:'#fff',
              border:'none', borderRadius:12, padding:'14px',
              fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:font,
              boxShadow:`0 4px 16px rgba(36,77,59,.35)`,
            }}>
              <span style={{ display:'inline-flex', alignItems:'center', gap:7 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                {isAr?'تتبع طلبي':'Suivre ma commande'}
              </span>
            </button>
            <button onClick={() => router.push('/')} style={{
              background:'transparent', color:C.text,
              border:`1.5px solid ${C.border}`, borderRadius:12, padding:'14px',
              fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:font,
            }}>
              {isAr?'← العودة للرئيسية':"← Retour à l'accueil"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Compact order strip (mobile/tablet top summary) ──────────────────────
  const totalCartQty = cartItems.reduce((s, i) => s + i.qty, 0);

  const OrderStrip = () => (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 14, padding: '12px 16px', marginBottom: 16,
    }}>
      {fromCart ? (
        /* ── Cart strip: show all items ── */
        <div>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: cartItems.length > 0 ? 10 : 0 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 9, flexShrink: 0,
              background: `linear-gradient(135deg, ${C.green}, #1D4939)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: font }}>
                {isAr ? `سلتك (${totalCartQty} قطعة)` : `Panier (${totalCartQty} article${totalCartQty > 1 ? 's' : ''})`}
              </div>
              <div style={{ fontSize: 11, color: C.muted, fontFamily: font }}>
                {isAr ? 'التوصيل:' : 'Livr:'} <strong style={{ color: C.text }}>{deliveryPrice} {isAr ? 'دج' : 'DA'}</strong>
              </div>
            </div>
            <div style={{ textAlign: isAr ? 'left' : 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 10, color: C.muted, fontFamily: font }}>{isAr ? 'المجموع' : 'Total'}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.gold, fontFamily: font }}>
                {total.toLocaleString()} <span style={{ fontSize: 10 }}>{isAr ? 'دج' : 'DA'}</span>
              </div>
            </div>
          </div>
          {/* Item pills */}
          {cartItems.map(item => (
            <div key={item.cartId} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 0', borderTop: `1px solid ${C.border}`,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                background: `linear-gradient(135deg, ${item.color}, ${C.green})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
              }}>
              {item.image
                ? <img src={item.image} alt={item.nameAr} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
              }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.text, fontFamily: font,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {isAr ? item.nameAr : item.nameFr}
                </div>
                <div style={{ fontSize: 10, color: C.muted, fontFamily: font }}>
                  {item.size} · ×{item.qty}
                </div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, fontFamily: 'Inter', whiteSpace: 'nowrap' }}>
                {(item.price * item.qty).toLocaleString()} {isAr ? 'دج' : 'DA'}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ── Single product strip ── */
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 10, flexShrink: 0,
            background: `linear-gradient(135deg, ${product.colors[color] ?? C.green}, ${C.green})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 2, fontFamily: font,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {isAr ? product.nameAr : product.nameFr}
            </div>
            <div style={{ fontSize: 11, color: C.muted, fontFamily: font }}>
              {isAr?'الحجم:':'T:'} <strong style={{color:C.text}}>{size}</strong>
              {' · '}
              {isAr?'الكمية:':'Q:'} <strong style={{color:C.text}}>{qty}</strong>
              {' · '}
              {isAr?'التوصيل:':'Livr:'} <strong style={{color:C.text}}>{deliveryPrice} {isAr?'دج':'DA'}</strong>
            </div>
          </div>
          <div style={{ textAlign: isAr ? 'left' : 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 11, color: C.muted, fontFamily: font }}>{isAr?'المجموع':'Total'}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.gold, fontFamily: font }}>
              {total.toLocaleString()} <span style={{fontSize:11}}>{isAr?'دج':'DA'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ── Full sidebar ─────────────────────────────────────────────────────────
  const Sidebar = () => (
    <div style={{ position: isDesktop ? 'sticky' : 'static', top: 76 }}>

      {/* Product / Cart summary */}
      <div style={{ background: C.card, borderRadius: 18, border: `1px solid ${C.border}`, padding: 20, marginBottom: 14 }}>
        <h3 style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 14,
          textTransform: 'uppercase', letterSpacing: 1, fontFamily: font }}>
          {fromCart
            ? <span style={{ display:'inline-flex', alignItems:'center', gap:5 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
                {isAr ? 'سلة الطلب' : 'Votre panier'}
              </span>
            : (isAr ? 'ملخص الطلب' : 'Récapitulatif')
          }
        </h3>

        {fromCart ? (
          /* ── Cart items in sidebar ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {cartItems.map(item => (
              <div key={item.cartId} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 9, flexShrink: 0, overflow: 'hidden',
                  background: `linear-gradient(135deg, ${item.color}, ${C.green})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                {item.image
                  ? <img src={item.image} alt={item.nameAr} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  : <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
                }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.text, fontFamily: font,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {isAr ? item.nameAr : item.nameFr}
                  </div>
                  <div style={{ fontSize: 10, color: C.muted, fontFamily: font }}>
                    {item.size} · ×{item.qty}
                  </div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, fontFamily: 'Inter', whiteSpace: 'nowrap' }}>
                  {(item.price * item.qty).toLocaleString()} {isAr ? 'دج' : 'DA'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ── Single product ── */
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: 10, flexShrink: 0,
              background: `linear-gradient(135deg, ${product.colors[color] ?? C.green}, ${C.green})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4, fontFamily: font }}>
                {isAr ? product.nameAr : product.nameFr}
              </div>
              <div style={{ fontSize: 12, color: C.muted, fontFamily: font }}>
                {isAr?'الحجم:':'Taille:'} <strong style={{color:C.text}}>{size}</strong>
                {' · '}
                {isAr?'الكمية:':'Qté:'} <strong style={{color:C.text}}>{qty}</strong>
              </div>
            </div>
          </div>
        )}

        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
          {/* Rows */}
          {[
            { ar:'سعر المنتج', fr:'Sous-total', val:`${subtotal.toLocaleString()} ${isAr?'دج':'DA'}` },
            { ar: deliveryType==='home' ? 'توصيل للمنزل' : 'مكتب الشركة',
              fr: deliveryType==='home' ? 'Livraison domicile' : 'Bureau de livraison',
              val: effectiveDelivery === 0
                ? (isAr ? 'مجاني' : 'Gratuit')
                : `${effectiveDelivery} ${isAr?'دج':'DA'}`,
              valueColor: effectiveDelivery === 0 ? '#10B981' : undefined },
          ].map((row, i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', marginBottom:8, fontSize:13, color:C.muted, fontFamily:font }}>
              <span>{isAr?row.ar:row.fr}</span>
              <span style={{ color: row.valueColor }}>{row.val}</span>
            </div>
          ))}

          {/* Discount row */}
          {appliedPromo && discount > 0 && (
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8, fontSize:13, fontFamily:font, color:'#10B981', fontWeight:700 }}>
              <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"/></svg>
                {isAr ? appliedPromo.descAr : appliedPromo.descFr}
              </span>
              <span>- {discount.toLocaleString()} {isAr?'دج':'DA'}</span>
            </div>
          )}

          <div style={{ display:'flex', justifyContent:'space-between', paddingTop:10, borderTop:`1px solid ${C.border}`, fontSize:18, fontWeight:800 }}>
            <span style={{ color:C.text, fontFamily:font }}>{isAr?'المجموع':'Total'}</span>
            <div style={{ textAlign: isAr?'left':'right' }}>
              {appliedPromo && <div style={{ fontSize:12, color:C.muted, textDecoration:'line-through', fontFamily:'Inter' }}>{(subtotal+deliveryPrice).toLocaleString()} {isAr?'دج':'DA'}</div>}
              <span style={{ color:C.gold, fontFamily:'Inter' }}>{total.toLocaleString()} {isAr?'دج':'DA'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Promo code field ─────────────────────────────────────────────── */}
      <div style={{ background:C.card, border:`1px solid ${appliedPromo ? '#10B98140' : C.border}`, borderRadius:14, padding:'14px 16px', marginBottom:12 }}>
        <div style={{ fontSize:12, fontWeight:700, color:C.muted, marginBottom:10, fontFamily:font, display:'flex', alignItems:'center', gap:6 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"/></svg>
          {isAr ? 'كود الخصم' : 'Code promo'}
        </div>

        {appliedPromo ? (
          /* Applied state */
          <div style={{ background:'#10B98112', border:'1px solid #10B98140', borderRadius:10, padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontSize:13, fontWeight:800, color:'#10B981', fontFamily:'Inter, monospace', letterSpacing:1 }}>{appliedPromo.code}</div>
              <div style={{ fontSize:11, color:C.muted, fontFamily:font, marginTop:2 }}>{isAr ? appliedPromo.descAr : appliedPromo.descFr}</div>
            </div>
            <button onClick={removePromo} style={{ background:'none', border:'none', cursor:'pointer', color:C.muted, fontSize:18, lineHeight:1 }}>×</button>
          </div>
        ) : (
          /* Input state */
          <div>
            <div style={{ display:'flex', gap:8 }}>
              <input
                value={promoInput}
                onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoError(''); }}
                onKeyDown={e => e.key === 'Enter' && applyPromo()}
                placeholder={isAr ? 'أدخلي الكود...' : 'Entrez le code...'}
                style={{
                  flex:1, padding:'9px 12px', borderRadius:10, fontFamily:'Inter, monospace',
                  border:`1.5px solid ${promoError ? '#DC2626' : C.border}`,
                  background:C.input, color:C.text, fontSize:13, outline:'none',
                  letterSpacing:1, textTransform:'uppercase',
                }}
              />
              <button onClick={() => applyPromo()} style={{
                background:`linear-gradient(135deg, ${C.green}, #1D4939)`,
                color:'#fff', border:'none', borderRadius:10,
                padding:'9px 14px', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:font,
                whiteSpace:'nowrap',
              }}>
                {isAr ? 'تطبيق' : 'Appliquer'}
              </button>
            </div>
            {promoError && <div style={{ fontSize:11, color:'#DC2626', marginTop:5, fontFamily:font }}>{promoError}</div>}
          </div>
        )}
      </div>

      {/* COD */}
      <div style={{ background:isDark?'#1D4939':'#F0FFF4', border:`1px solid #10B98130`, borderRadius:14, padding:'14px 18px', marginBottom:12 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom:4 }}><path d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
        <div style={{ fontSize:14, fontWeight:700, color:'#10B981', marginBottom:3, fontFamily:font }}>
          {isAr ? 'الدفع عند الاستلام' : 'Paiement à la livraison'}
        </div>
        <div style={{ fontSize:12, color:C.muted, fontFamily:font }}>
          {isAr ? 'لا حاجة لبطاقة بنكية — ادفعي عند استلام طلبك' : 'Payez en espèces à la réception'}
        </div>
      </div>

      {/* Trust */}
      {[
        { d:'M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2-1 2 1 2-1 2 1 2-1 2 1V6m2 10V5a1 1 0 011-1h2a1 1 0 011 1v1m-4 14l4-1 4 1V9', ar:'توصيل لـ 69 ولاية', fr:'Livraison 69 wilayas' },
        { d:'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z', ar:'تأكيد هاتفي قبل الإرسال', fr:'Confirmation avant envoi' },
        { d:'M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6', ar:'إرجاع مجاني خلال 7 أيام', fr:'Retour gratuit sous 7 jours' },
      ].map((b, i) => (
        <div key={i} style={{ display:'flex', gap:10, alignItems:'center', padding:'9px 0',
          borderBottom: i < 2 ? `1px solid ${C.border}` : 'none' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}><path d={b.d}/></svg>
          <span style={{ fontSize:12, color:C.muted, fontFamily:font }}>{isAr?b.ar:b.fr}</span>
        </div>
      ))}
    </div>
  );

  // ── Inline trust badges (below submit, mobile only) ──────────────────────
  const InlineTrust = () => (
    <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      {[
        { d:'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z', ar:'الدفع عند الاستلام', fr:'Paiement à la livraison', sub: { ar:'بدون بطاقة بنكية', fr:'Sans carte bancaire' } },
        { d:'M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2-1 2 1 2-1 2 1 2-1 2 1V6m2 10V5a1 1 0 011-1h2a1 1 0 011 1v1m-4 14l4-1 4 1V9', ar:'توصيل لـ 69 ولاية', fr:'Livraison nationale', sub: { ar:'جميع أنحاء الجزائر', fr:'Partout en Algérie' } },
        { d:'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z', ar:'تأكيد هاتفي', fr:'Confirmation téléphonique', sub: { ar:'قبل إرسال الطلب', fr:"Avant l'envoi" } },
        { d:'M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6', ar:'إرجاع مجاني', fr:'Retour gratuit', sub: { ar:'خلال 7 أيام', fr:'Sous 7 jours' } },
      ].map((b, i) => (
        <div key={i} style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
          padding: '12px 10px', textAlign: 'center',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom:4 }}><path d={(b as {d:string}).d}/></svg>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.text, fontFamily: font, marginBottom: 2 }}>
            {isAr ? b.ar : b.fr}
          </div>
          <div style={{ fontSize: 10, color: C.muted, fontFamily: font }}>
            {isAr ? b.sub.ar : b.sub.fr}
          </div>
        </div>
      ))}
    </div>
  );

  // ── Main render ──────────────────────────────────────────────────────────
  const formPad = isMobile ? 16 : 24;

  return (
    <div style={{ minHeight:'100vh', background:C.bg, fontFamily:font, direction:isAr?'rtl':'ltr', overflowX:'hidden' }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* ── Nav ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: isDark ? 'rgba(10,26,15,.96)' : 'rgba(249,246,241,.96)',
        backdropFilter: 'blur(14px)', borderBottom: `1px solid ${C.border}`,
        padding: isMobile ? '10px 14px' : '11px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button onClick={() => router.back()} style={{
          background: 'none', border: `1px solid ${C.border}`, borderRadius: 8,
          padding: isMobile ? '6px 10px' : '6px 14px',
          cursor: 'pointer', color: C.text, fontSize: isMobile ? 12 : 13, fontFamily: font,
        }}>
          {isAr ? '→ رجوع' : '← Retour'}
        </button>

        <div style={{ display:'flex', alignItems:'center', gap: 7 }}>
          <Image src={isDark ? '/logos/icon-gold.svg' : '/logos/icon-green.svg'} alt="إحسان" width={isMobile?22:26} height={isMobile?22:26} />
          {!isMobile && <span style={{ fontWeight:800, fontSize:15, color:isDark ? C.gold : C.green }}>إحسان</span>}
        </div>

        <div style={{ display:'flex', gap: 6 }}>
          <button onClick={toggleTheme} style={{
            background:'none', border:`1px solid ${C.border}`, borderRadius:8,
            padding:'5px 8px', cursor:'pointer', fontSize:14,
          }}>
            {isDark
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
            }
          </button>
          <button onClick={toggleLang} style={{
            background:'none', border:`1px solid ${C.border}`, borderRadius:8,
            padding:'5px 9px', cursor:'pointer', color:C.gold, fontWeight:700, fontSize:11, fontFamily:font,
          }}>{isAr?'FR':'AR'}</button>
        </div>
      </nav>

      {/* ── Page wrapper ── */}
      <div style={{ maxWidth: isDesktop ? 980 : 680, margin: '0 auto', padding: isMobile ? '16px 12px' : '28px 20px' }}>

        {/* Title */}
        <div data-reveal style={{ marginBottom: isMobile ? 16 : 24, textAlign: 'center' }}>
          <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: C.text, marginBottom: 5, fontFamily: font }}>
            <span style={{ display:'inline-flex', alignItems:'center', gap:8 }}>
              <svg width={isMobile ? 20 : 24} height={isMobile ? 20 : 24} viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
              {isAr ? 'إتمام الطلب' : 'Finaliser la commande'}
            </span>
          </h1>
          <p style={{ color: C.muted, fontSize: isMobile ? 12 : 13, fontFamily: font }}>
            {isAr ? 'أكملي بياناتك وسنتصل بكِ قريباً' : 'Remplissez vos informations et nous vous rappellerons'}
          </p>
        </div>

        {/* Mobile/Tablet: compact strip */}
        {!isDesktop && <OrderStrip />}

        {/* Grid layout */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isDesktop ? '1fr 340px' : '1fr',
          gap: isDesktop ? 22 : 16,
          alignItems: 'start',
        }}>

          {/* ══ FORM ══ */}
          <form data-reveal data-reveal-dir="left" onSubmit={handleSubmit} style={{
            background: C.card, borderRadius: isMobile ? 14 : 18,
            border: `1px solid ${C.border}`, padding: formPad,
          }}>

            {/* ─ معلومات الزبونة ─ */}
            {sectionTitle('M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', 'معلومات الزبونة', 'Informations client')}

            {/* Name + Phone row on tablet+ */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: 12, marginBottom: 14,
            }}>
              <div>
                <label style={labelSt}>{isAr ? 'الاسم الكامل *' : 'Nom complet *'}</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder={isAr ? 'مثال: فاطمة بن علي' : 'Ex: Fatima Benali'}
                  style={inputSt('name')} />
                {errors.name && <p style={errSt}>{errors.name}</p>}
              </div>
              <div>
                <label style={labelSt}>{isAr ? 'رقم الهاتف *' : 'Téléphone *'}</label>
                <input type="tel" inputMode="numeric" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="05 XX XX XX XX"
                  style={{ ...inputSt('phone'), direction: 'ltr', textAlign: isAr ? 'right' : 'left' }} />
                {errors.phone && <p style={errSt}>{errors.phone}</p>}
              </div>
            </div>

            {/* Wilaya + Commune */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: 12, marginBottom: 14,
            }}>
              <div>
                <label style={labelSt}>{isAr ? 'الولاية *' : 'Wilaya *'}</label>
                <select value={wilaya} onChange={e => setWilaya(e.target.value)} style={inputSt('wilaya')}>
                  <option value="">{isAr ? '— اختاري —' : '— Choisir —'}</option>
                  {WILAYAS_2026.map((w, i) => (
                    <option key={w} value={w}>{String(i + 1).padStart(2, '0')} - {isAr ? w : (WILAYA_FR[w] ?? w)}</option>
                  ))}
                </select>
                {errors.wilaya && <p style={errSt}>{errors.wilaya}</p>}
              </div>
              <div>
                <label style={labelSt}>{isAr ? 'البلدية *' : 'Commune *'}</label>
                <select value={commune} onChange={e => setCommune(e.target.value)}
                  disabled={!wilaya}
                  style={{ ...inputSt('commune'), opacity: wilaya ? 1 : 0.55, cursor: wilaya ? 'pointer' : 'not-allowed' }}>
                  <option value="">
                    {!wilaya
                      ? (isAr ? '— اختاري الولاية أولاً —' : '— Choisir wilaya d\'abord —')
                      : (isAr ? '— اختاري البلدية —' : '— Choisir —')}
                  </option>
                  {communes.map(c => <option key={c} value={c}>{isAr ? c : (COMMUNE_FR[c] ?? c)}</option>)}
                </select>
                {errors.commune && <p style={errSt}>{errors.commune}</p>}
              </div>
            </div>

            {/* Address */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelSt}>{isAr ? 'العنوان التفصيلي *' : 'Adresse détaillée *'}</label>
              <textarea value={address} onChange={e => setAddress(e.target.value)}
                rows={isMobile ? 3 : 2}
                placeholder={isAr ? 'الحي، الشارع، رقم المنزل...' : 'Quartier, rue, numéro...'}
                style={{ ...inputSt('address'), resize: 'vertical', minHeight: 64 }} />
              {errors.address && <p style={errSt}>{errors.address}</p>}
            </div>

            {/* ─ طريقة التوصيل ─ */}
            {sectionTitle('M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2-1 2 1 2-1 2 1 2-1 2 1V6m2 10V5a1 1 0 011-1h2a1 1 0 011 1v1m-4 14l4-1 4 1V9', 'طريقة التوصيل', 'Mode de livraison')}

            {/* ── Company selector (only if >1 active company) ── */}
            {deliveryCompanies.length > 1 && (
              <div style={{ marginBottom: 16 }}>
                <label style={labelSt}>{isAr ? 'شركة التوصيل' : 'Société de livraison'}</label>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {deliveryCompanies.map(co => {
                    const sel = selectedCompanyId === co.id;
                    const coPrice = (wilaya && co.prices[wilaya]) ? co.prices[wilaya] : (Object.values(co.prices)[0] ?? DEFAULT_DELIVERY_PRICES);
                    return (
                      <button key={co.id} type="button" onClick={() => setSelectedCompanyId(co.id)} style={{
                        display:'flex', alignItems:'center', gap:12,
                        padding:'12px 16px', borderRadius:12, cursor:'pointer', textAlign:'right',
                        border:`2px solid ${sel ? C.gold : C.border}`,
                        background: sel ? (isDark ? '#1D3D2A' : '#FFFBF0') : (isDark ? C.input : '#FAFAFA'),
                        transition:'all .2s',
                      }}>
                        <div style={{
                          width:36, height:36, borderRadius:10, flexShrink:0,
                          background: sel ? `${C.gold}22` : `${C.green}12`,
                          display:'flex', alignItems:'center', justifyContent:'center',
                        }}>
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={sel ? C.gold : C.muted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"/>
                          </svg>
                        </div>
                        <div style={{ flex:1, textAlign: isAr ? 'right' : 'left' }}>
                          <div style={{ fontSize:13, fontWeight:700, color: sel ? C.gold : C.text, fontFamily:font }}>{co.name}</div>
                          {co.phone && <div style={{ fontSize:10, color:C.muted, fontFamily:'Inter', marginTop:2, direction:'ltr', textAlign: isAr ? 'right' : 'left' }}>{co.phone}</div>}
                        </div>
                        <div style={{ textAlign: isAr ? 'left' : 'right', flexShrink:0 }}>
                          <div style={{ fontSize:11, fontWeight:800, color: sel ? C.gold : C.muted, fontFamily:'Inter' }}>
                            {coPrice.home} {isAr?'دج':'DA'}
                          </div>
                          <div style={{ fontSize:9, color:C.muted, fontFamily:font }}>{isAr?'منزل':'dom.'}</div>
                        </div>
                        {sel && (
                          <div style={{ flexShrink:0, width:18, height:18, borderRadius:'50%', background:C.gold, display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              {([
                { key:'home',   d:'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10', ar:'توصيل للمنزل', fr:'À domicile'   },
                { key:'office', d:'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0H5m-2 0H1M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', ar:'مكتب الشركة', fr:'Bureau de livraison' },
              ] as const).map(opt => {
                const active = deliveryType === opt.key;
                const price = wilayaDeliveryPrices[opt.key];
                return (
                  <button key={opt.key} type="button" onClick={() => setDeliveryType(opt.key)} style={{
                    padding: isMobile ? '12px 8px' : '14px 12px',
                    borderRadius: 12, cursor: 'pointer', textAlign: 'center',
                    border: `2px solid ${active ? C.gold : C.border}`,
                    background: active ? (isDark ? '#1D3D2A' : '#FFFBF0') : 'transparent',
                    transition: 'all .2s',
                  }}>
                    <div style={{ marginBottom: 5, display:'flex', justifyContent:'center' }}>
                      <svg width={isMobile?22:26} height={isMobile?22:26} viewBox="0 0 24 24" fill="none" stroke={active ? C.gold : C.muted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={(opt as {d:string}).d}/></svg>
                    </div>
                    <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 700, color: active ? C.gold : C.text, fontFamily: font, marginBottom: 3 }}>
                      {isAr ? opt.ar : opt.fr}
                    </div>
                    <div style={{ fontSize: isMobile ? 14 : 15, fontWeight: 800, color: active ? C.gold : C.muted, fontFamily: font }}>
                      {price} <span style={{ fontSize: 11 }}>{isAr?'دج':'DA'}</span>
                    </div>
                    {wilaya && selectedCompany && (
                      <div style={{ fontSize: 10, color: active ? C.gold : C.muted, marginTop: 3, fontFamily: font, opacity:.8 }}>
                        {wilaya}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* ─ تفاصيل المنتج / السلة ─ */}
            {fromCart
              ? sectionTitle('M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z', 'منتجات سلتك', 'Votre panier')
              : sectionTitle('M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0', 'تفاصيل المنتج', 'Détails produit')
            }

            {fromCart ? (
              /* ── عرض كل منتجات السلة ── */
              <div style={{ marginBottom: 14 }}>
                {cartItems.length === 0 ? (
                  <div style={{ textAlign: 'center', color: C.muted, padding: '20px 0', fontFamily: font, fontSize: 13 }}>
                    {isAr ? 'السلة فارغة' : 'Panier vide'}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {cartItems.map(item => (
                      <div key={item.cartId} style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        background: C.card, border: `1px solid ${C.border}`,
                        borderRadius: 12, padding: '10px 14px',
                      }}>
                        {/* Emoji / color swatch */}
                        <div style={{
                          width: 46, height: 46, borderRadius: 10, flexShrink: 0,
                          background: `linear-gradient(135deg, ${item.color}, ${C.green})`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 22,
                        }}>
                          {item.emoji}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: font, marginBottom: 2 }}>
                            {isAr ? item.nameAr : item.nameFr}
                          </div>
                          <div style={{ fontSize: 11, color: C.muted, fontFamily: font }}>
                            {isAr ? 'الحجم:' : 'T:'} <strong style={{ color: C.text }}>{item.size}</strong>
                            {' · '}{isAr ? 'الكمية:' : 'Q:'} <strong style={{ color: C.text }}>{item.qty}</strong>
                          </div>
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: C.gold, fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>
                          {(item.price * item.qty).toLocaleString()} {isAr ? 'دج' : 'DA'}
                        </div>
                      </div>
                    ))}
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 14px', borderTop: `1px solid ${C.border}`,
                    }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.muted, fontFamily: font }}>
                        {isAr ? `المجموع (${cartItems.reduce((s,i)=>s+i.qty,0)} قطعة)` : `Sous-total (${cartItems.reduce((s,i)=>s+i.qty,0)} articles)`}
                      </span>
                      <span style={{ fontSize: 16, fontWeight: 800, color: C.gold, fontFamily: 'Inter, sans-serif' }}>
                        {subtotal.toLocaleString()} {isAr ? 'دج' : 'DA'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* ── منتج واحد: اللون / الحجم / الكمية ── */
              <>
                {/* Color */}
                <div style={{ marginBottom: 14 }}>
                  <label style={labelSt}>{isAr ? 'اللون' : 'Couleur'}</label>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {product.colors.map((c, i) => (
                      <button key={i} type="button" onClick={() => setColor(i)} style={{
                        width: isMobile ? 38 : 34, height: isMobile ? 38 : 34,
                        borderRadius: '50%', background: c,
                        border: `3px solid ${i === color ? C.gold : 'transparent'}`,
                        outline: i === color ? `2px solid ${C.gold}` : 'none',
                        outlineOffset: 2, cursor: 'pointer', transition: 'all .2s',
                      }} />
                    ))}
                  </div>
                </div>

                {/* Size */}
                <div style={{ marginBottom: 14 }}>
                  <label style={labelSt}>{isAr ? 'الحجم' : 'Taille'}</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {SIZES.map(s => (
                      <button key={s} type="button" onClick={() => setSize(s)} style={{
                        padding: isMobile ? '9px 14px' : '7px 13px',
                        borderRadius: 8, border: `1.5px solid ${s === size ? C.green : C.border}`,
                        background: s === size ? C.green : 'transparent',
                        color: s === size ? '#fff' : C.text,
                        fontSize: isMobile ? 13 : 12, fontWeight: 600, cursor: 'pointer',
                        transition: 'all .2s', fontFamily: font, minWidth: 44,
                      }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quantity */}
                <div style={{ marginBottom: 14 }}>
                  <label style={labelSt}>{isAr ? 'الكمية' : 'Quantité'}</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} style={{
                      width: isMobile ? 42 : 36, height: isMobile ? 42 : 36,
                      borderRadius: 10, border: `1.5px solid ${C.border}`,
                      background: 'transparent', color: C.text,
                      fontSize: 18, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>−</button>
                    <span style={{ fontSize: 18, fontWeight: 700, color: C.text, minWidth: 28, textAlign: 'center', fontFamily: font }}>{qty}</span>
                    <button type="button" onClick={() => setQty(qty + 1)} style={{
                      width: isMobile ? 42 : 36, height: isMobile ? 42 : 36,
                      borderRadius: 10, border: `1.5px solid ${C.border}`,
                      background: 'transparent', color: C.text,
                      fontSize: 18, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>+</button>
                  </div>
                </div>
              </>
            )}

            {/* Notes */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelSt}>{isAr ? 'ملاحظات (اختياري)' : 'Notes (optionnel)'}</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                placeholder={isAr ? 'أي طلب خاص...' : 'Demande spéciale...'}
                style={{ ...inputSt(''), resize: 'vertical' }} />
            </div>

            {/* Agree */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} style={{
                  width: isMobile ? 18 : 17, height: isMobile ? 18 : 17,
                  accentColor: C.green, marginTop: 2, flexShrink: 0,
                }} />
                <span style={{ fontSize: isMobile ? 13 : 12, color: C.muted, fontFamily: font, lineHeight: 1.5 }}>
                  {isAr
                    ? 'أوافق على سياسة الاسترجاع والشروط العامة للبيع'
                    : "J'accepte la politique de retour et les CGV"}
                </span>
              </label>
              {errors.agree && <p style={errSt}>{errors.agree}</p>}
            </div>

            {/* ── Promo code (mobile — shown inline in form) ── */}
            {isMobile && (
              <div style={{ background:C.card, border:`1px solid ${appliedPromo?'#10B98140':C.border}`, borderRadius:12, padding:'14px 14px 12px', marginBottom:14 }}>
                <div style={{ fontSize:12, fontWeight:700, color:C.muted, marginBottom:8, fontFamily:font, display:'flex', alignItems:'center', gap:5 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"/></svg>
                  {isAr ? 'كود الخصم' : 'Code promo'}
                </div>
                {appliedPromo ? (
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'#10B98112', border:'1px solid #10B98130', borderRadius:8, padding:'8px 12px' }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:800, color:'#10B981', fontFamily:'Inter, monospace', letterSpacing:1 }}>{appliedPromo.code}</div>
                      <div style={{ fontSize:10, color:C.muted, fontFamily:font }}>{isAr?appliedPromo.descAr:appliedPromo.descFr}</div>
                    </div>
                    <button onClick={removePromo} style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:C.muted }}>×</button>
                  </div>
                ) : (
                  <div>
                    <div style={{ display:'flex', gap:8 }}>
                      <input value={promoInput} onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoError(''); }}
                        onKeyDown={e => e.key==='Enter' && applyPromo()}
                        placeholder={isAr?'أدخلي الكود...':'Code promo...'}
                        style={{ flex:1, padding:'8px 12px', borderRadius:8, border:`1.5px solid ${promoError?'#DC2626':C.border}`, background:C.input, color:C.text, fontSize:13, outline:'none', fontFamily:'Inter, monospace', textTransform:'uppercase', letterSpacing:1 }}
                      />
                      <button onClick={() => applyPromo()} style={{ background:`linear-gradient(135deg, ${C.green}, #1D4939)`, color:'#fff', border:'none', borderRadius:8, padding:'8px 14px', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:font }}>
                        {isAr?'تطبيق':'OK'}
                      </button>
                    </div>
                    {promoError && <div style={{ fontSize:11, color:'#DC2626', marginTop:4, fontFamily:font }}>{promoError}</div>}
                  </div>
                )}
              </div>
            )}

            {/* Mobile price recap before submit */}
            {isMobile && (
              <div style={{
                background: isDark ? '#1D4939' : '#F0F9F4',
                border: `1px solid ${C.border}`, borderRadius: 12,
                padding: '12px 16px', marginBottom: 14,
              }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize: 13, color: C.muted, fontFamily: font }}>
                    {isAr ? 'المجموع الكلي' : 'Total à payer'}
                  </span>
                  <div style={{ textAlign: isAr?'left':'right' }}>
                    {appliedPromo && <div style={{ fontSize:10, color:C.muted, textDecoration:'line-through', fontFamily:'Inter' }}>{(subtotal+deliveryPrice).toLocaleString()} {isAr?'دج':'DA'}</div>}
                    <span style={{ fontSize: 20, fontWeight: 800, color: C.gold, fontFamily: 'Inter' }}>
                      {total.toLocaleString()} {isAr?'دج':'DA'}
                    </span>
                  </div>
                </div>
                {appliedPromo && (
                  <div style={{ marginTop:6, fontSize:11, color:'#10B981', fontWeight:700, fontFamily:font }}>
                    <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"/></svg>
                      {isAr?appliedPromo.descAr:appliedPromo.descFr} (- {discount.toLocaleString()} {isAr?'دج':'DA'})
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: isMobile ? '16px' : '15px',
              borderRadius: 12, border: 'none',
              background: loading ? C.muted : `linear-gradient(135deg, ${C.green}, #1D4939)`,
              color: '#fff', fontSize: isMobile ? 15 : 16, fontWeight: 800,
              cursor: loading ? 'wait' : 'pointer', fontFamily: font,
              transition: 'all .3s',
              boxShadow: loading ? 'none' : `0 4px 20px rgba(36,77,59,.4)`,
              letterSpacing: '.3px',
            }}>
              <span style={{ display:'inline-flex', alignItems:'center', gap:8 }}>
                {loading
                  ? <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation:'spin 1s linear infinite' }}><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>{isAr ? 'جارٍ التأكيد...' : 'Confirmation...'}</>
                  : isMobile
                    ? <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>{isAr ? 'تأكيد الطلب' : 'Confirmer la commande'}</>
                    : <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>{isAr ? 'تأكيد الطلب — الدفع عند الاستلام' : 'Confirmer — Paiement à la livraison'}</>
                }
              </span>
            </button>

            {/* Mobile trust grid */}
            {isMobile && <InlineTrust />}
          </form>

          {/* ══ SIDEBAR (tablet + desktop) ══ */}
          {!isMobile && <div data-reveal data-reveal-dir="right" data-reveal-delay="80"><Sidebar /></div>}
        </div>
      </div>
    </div>
  );
}

export default function OrderPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#F9F6F1' }} />}>
      <OrderContent />
    </Suspense>
  );
}

