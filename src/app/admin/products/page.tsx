'use client';
import { useEffect, useState, useRef, type CSSProperties } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { supabase, type Product } from '@/lib/supabase';

type ProductForm = Omit<Product, 'id' | 'created_at' | 'updated_at'>;

const EMPTY: ProductForm = {
  name_ar:'', name_fr:'', category:'فولار', price:0,
  original_price:null, badge:null, emoji:'🛍️',
  colors:[], images:[], thumbnail_index:0, color_images:{}, stock:{},
  desc_ar:null, desc_fr:null,
  in_stock:true, active:true, sort_order:0,
};

// ── Image resize to 800×800 JPEG (contain, white bg) ──────────────────────
function resizeImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const S = 800;
      const cv = document.createElement('canvas');
      cv.width = S; cv.height = S;
      const ctx = cv.getContext('2d')!;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, S, S);
      const scale = Math.min(S / img.naturalWidth, S / img.naturalHeight);
      const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
      ctx.drawImage(img, (S - w) / 2, (S - h) / 2, w, h);
      URL.revokeObjectURL(url);
      cv.toBlob(blob => {
        resolve(blob
          ? new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })
          : file);
      }, 'image/jpeg', 0.88);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

type BiCat = { ar: string; fr: string };
const DEFAULT_CLOTHING_CATS: BiCat[]  = [{ar:'فولار',fr:'Foulards'},{ar:'حجاب',fr:'Hijabs'},{ar:'عبايات',fr:'Abayas'},{ar:'هوديز',fr:'Hoodies'}];
const DEFAULT_SHOE_CATS: BiCat[]      = [{ar:'حذاء رياضي',fr:'Baskets'},{ar:'حذاء كلاسيك',fr:'Chaussures classiques'},{ar:'حذاء كاجوال',fr:'Chaussures casual'},{ar:'بوط',fr:'Bottes'}];
const DEFAULT_ACCESSORY_CATS: BiCat[] = [{ar:'حقيبة يد',fr:'Sac à main'},{ar:'قبعة',fr:'Casquette'},{ar:'إيشارب',fr:'Écharpe'},{ar:'نظارات',fr:'Lunettes'},{ar:'مجوهرات',fr:'Bijoux'},{ar:'حزام',fr:'Ceinture'}];

const CLOTHING_SIZES  = ['XS','S','M','L','XL','XXL'];
const SHOE_SIZES      = ['36','37','38','39','40','41','42','43','44','45','46'];
const ACCESSORY_SIZES = ['واحد','S','M','L','XL'];
const BADGES = [
  { val:null,   ar:'بدون',    color:'#6B8A76' },
  { val:'new',  ar:'جديد',    color:'#10B981' },
  { val:'hot',  ar:'رائج',    color:'#EF4444' },
  { val:'sale', ar:'تخفيض',   color:'#F59E0B' },
];

type ToastType = 'success' | 'error' | 'warning' | 'info';
interface ToastItem { id: number; msg: string; type: ToastType; }
const TOAST_STYLE: Record<ToastType, { bg: string; border: string; color: string; d: string }> = {
  success: { bg:'#F0FDF4', border:'#86EFAC', color:'#15803D', d:'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  error:   { bg:'#FEF2F2', border:'#FECACA', color:'#DC2626', d:'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' },
  warning: { bg:'#FFFBEB', border:'#FDE68A', color:'#D97706', d:'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
  info:    { bg:'#EFF6FF', border:'#BFDBFE', color:'#2563EB', d:'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
};

let _toastId = 0;

export default function AdminProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [products,   setProducts]   = useState<Product[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [form,       setForm]       = useState<ProductForm|null>(null);
  const [editId,     setEditId]     = useState<number|null>(null);
  const [colorPick,  setColorPick]  = useState('#244D3B');
  const [panelOpen,  setPanelOpen]  = useState(false);
  const [windowW,    setW]          = useState(1200);
  const [toasts,     setToasts]     = useState<ToastItem[]>([]);
  const [deleteConf, setDeleteConf] = useState<number|null>(null);
  const [saving,     setSaving]     = useState(false);
  const [uploadingImgs, setUploadingImgs] = useState(false);
  const [mounted,    setMounted]    = useState(false);
  const [emojiOpen,  setEmojiOpen]  = useState(false);
  const [emojiRect,  setEmojiRect]  = useState<DOMRect|null>(null);
  const emojiBtnRef = useRef<HTMLButtonElement>(null);
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());
  const [viewId,        setViewId]        = useState<number|null>(null);
  const [clothingCats,   setClothingCats]   = useState<BiCat[]>(DEFAULT_CLOTHING_CATS);
  const [shoeCats,       setShoeCats]       = useState<BiCat[]>(DEFAULT_SHOE_CATS);
  const [accessoryCats,  setAccessoryCats]  = useState<BiCat[]>(DEFAULT_ACCESSORY_CATS);
  const [featuredIds,    setFeaturedIds]    = useState<number[]>([]);
  // ── Crop modal ────────────────────────────────────────────────────────────
  const [cropFile,       setCropFile]       = useState<File|null>(null);
  const [cropSrc,        setCropSrc]        = useState('');
  const [cropOffset,     setCropOffset]     = useState({ x:0, y:0 });
  const [cropZoom,       setCropZoom]       = useState(1);
  const [cropMinZoom,    setCropMinZoom]    = useState(1);
  const [cropDragging,   setCropDragging]   = useState(false);
  const [cropDragStart,  setCropDragStart]  = useState({ mx:0, my:0, ox:0, oy:0 });
  const [pendingFiles,   setPendingFiles]   = useState<File[]>([]);
  const [cropReplaceIdx, setCropReplaceIdx] = useState<number|null>(null);
  const cropImgRef = useRef<HTMLImageElement>(null);
  const [adminLang,      setAdminLang]      = useState<'ar'|'fr'>('ar');
  const C = {
    bg:'#EEF5F1', sidebar:'#1a3d2e', card:'#FFFFFF', card2:'#F3FAF6',
    border:'#D5E8DC', border2:'#B2CEBE', text:'#172B1E', muted:'#4E6D5C', sub:'#84A695',
    green:'#244D3B', greenL:'#2d5f49', gold:'#AF8E4A', goldL:'#c4a35a',
  };

  // ── Load ──────────────────────────────────────────────────
  const load = async () => {
    setLoading(true);
    const [{ data, error }, ccRes, scRes, acRes, featRes] = await Promise.all([
      supabase.from('products').select('*').order('sort_order', { ascending:true }),
      supabase.from('site_settings').select('value').eq('key','clothing_categories').maybeSingle(),
      supabase.from('site_settings').select('value').eq('key','shoe_categories').maybeSingle(),
      supabase.from('site_settings').select('value').eq('key','accessory_categories').maybeSingle(),
      supabase.from('site_settings').select('value').eq('key','featured_product_ids').maybeSingle(),
    ]);
    if (!error && data) setProducts(data as Product[]);
    const parseBiCats = (raw: string | null, setter: (v: BiCat[]) => void) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
          setter(parsed.map((s: string) => ({ ar: s, fr: '' })));
        } else if (Array.isArray(parsed)) { setter(parsed); }
      } catch { /* keep default */ }
    };
    parseBiCats((ccRes.data as {value:string}|null)?.value ?? null, setClothingCats);
    parseBiCats((scRes.data as {value:string}|null)?.value ?? null, setShoeCats);
    parseBiCats((acRes.data as {value:string}|null)?.value ?? null, setAccessoryCats);
    try { if (featRes.data) setFeaturedIds(JSON.parse((featRes.data as {value:string}).value)); } catch { /* keep default */ }
    setLoading(false);
  };

  useEffect(() => {
    if (!sessionStorage.getItem('ihsen_admin')) { router.replace('/admin'); return; }
    setAdminLang((localStorage.getItem('ihsen_admin_lang') as 'ar'|'fr') ?? 'ar');
    const upd = () => setW(window.innerWidth);
    upd(); window.addEventListener('resize', upd);
    load();
    setTimeout(() => setMounted(true), 60);
    return () => window.removeEventListener('resize', upd);
  }, [router]);

  useEffect(() => {
    if (searchParams?.get('action') === 'add') {
      setForm({ ...EMPTY });
      setEditId(null);
      setPanelOpen(true);
      router.replace('/admin/products');
    }
  }, [searchParams, router]);

  const isMobile   = windowW < 640;
  const isDesktop  = windowW >= 1024;
  const isAdminAr  = adminLang === 'ar';
  const font       = isAdminAr ? 'Cairo, sans-serif' : 'Inter, sans-serif';
  const dir        = isAdminAr ? 'rtl' : 'ltr';
  const allCats    = [...clothingCats, ...shoeCats, ...accessoryCats];
  const allCatArs  = allCats.map(c => c.ar);

  const showToast = (msg: string, type: ToastType = 'info') => {
    const id = ++_toastId;
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  };

  // ── Open forms ────────────────────────────────────────────
  const openAdd = () => {
    setForm({ ...EMPTY, sort_order: products.length + 1 });
    setEditId(null); setColorPick('#244D3B'); setPanelOpen(true);
  };
  const openEdit = (p: Product) => {
    setForm({
      name_ar:p.name_ar, name_fr:p.name_fr, category:p.category,
      price:p.price, original_price:p.original_price,
      badge:p.badge, emoji:p.emoji, colors:[...p.colors],
      images:[...(p.images ?? [])], thumbnail_index:p.thumbnail_index ?? 0,
      color_images:{ ...(p.color_images ?? {}) },
      stock:{ ...(p.stock ?? {}) },
      desc_ar: p.desc_ar ?? null, desc_fr: p.desc_fr ?? null,
      in_stock:p.in_stock, active:p.active, sort_order:p.sort_order,
    });
    setEditId(p.id); setColorPick('#244D3B'); setPanelOpen(true); setViewId(null);
  };

  // ── Image upload ──────────────────────────────────────────
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadImages = async (files: FileList | File[]) => {
    if (!files.length) return;
    setUploadingImgs(true);
    setUploadError(null);
    const folder = editId ? String(editId) : `tmp-${Date.now()}`;
    const uploaded: string[] = [];
    for (const file of Array.from(files)) {
      // Resize to 800×800 before upload
      const resized = await resizeImage(file);
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
      const { error } = await supabase.storage
        .from('product-images').upload(path, resized, { upsert: false, contentType: 'image/jpeg' });
      if (error) {
        setUploadError(`${isAdminAr ? 'فشل الرفع' : 'Erreur upload'}: ${error.message}`);
        console.error('Storage upload error:', error);
      } else {
        const { data } = supabase.storage.from('product-images').getPublicUrl(path);
        uploaded.push(data.publicUrl);
      }
    }
    if (uploaded.length) {
      setForm(f => f ? { ...f, images: [...f.images, ...uploaded] } : f);
    }
    setUploadingImgs(false);
  };

  // ── Featured products ─────────────────────────────────────────────────────
  const toggleFeatured = async (id: number) => {
    const already = featuredIds.includes(id);
    if (!already && featuredIds.length >= 4) {
      showToast(isAdminAr ? 'يمكن تمييز 4 منتجات فقط في الصفحة الرئيسية' : 'Maximum 4 produits en vedette', 'warning'); return;
    }
    const next = already ? featuredIds.filter(x => x !== id) : [...featuredIds, id];
    setFeaturedIds(next);
    const { error } = await supabase.from('site_settings').upsert(
      { key:'featured_product_ids', value: JSON.stringify(next) }, { onConflict:'key' }
    );
    if (error) showToast(isAdminAr ? 'خطأ في الحفظ' : 'Erreur de sauvegarde', 'error');
    else showToast(already ? (isAdminAr ? 'تمت الإزالة من الصفحة الرئيسية' : 'Retiré de l\'accueil') : (isAdminAr ? `تم التثبيت في الصفحة الرئيسية (${next.length}/4)` : `Épinglé (${next.length}/4)`), 'success');
  };

  // ── Crop modal helpers ────────────────────────────────────────────────────
  const CROP_VP = 300; // viewport size in px

  const clampOffset = (ox: number, oy: number, zoom: number, natW: number, natH: number) => {
    const dispW = natW * zoom;
    const dispH = natH * zoom;
    return {
      x: Math.min(0, Math.max(CROP_VP - dispW, ox)),
      y: Math.min(0, Math.max(CROP_VP - dispH, oy)),
    };
  };

  const initCrop = (natW: number, natH: number) => {
    const z = Math.max(CROP_VP / natW, CROP_VP / natH);
    setCropMinZoom(z);
    setCropZoom(z);
    const ox = (CROP_VP - natW * z) / 2;
    const oy = (CROP_VP - natH * z) / 2;
    setCropOffset({ x: ox, y: oy });
  };

  const closeCropModal = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropFile(null); setCropSrc(''); setPendingFiles([]); setCropReplaceIdx(null);
  };

  const confirmCrop = () => {
    const img = cropImgRef.current;
    if (!img || !cropFile) return;
    const canvas = document.createElement('canvas');
    canvas.width = 800; canvas.height = 800;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, 800, 800);
    const srcX = Math.max(0, -cropOffset.x / cropZoom);
    const srcY = Math.max(0, -cropOffset.y / cropZoom);
    const srcW = Math.min(CROP_VP / cropZoom, img.naturalWidth  - srcX);
    const srcH = Math.min(CROP_VP / cropZoom, img.naturalHeight - srcY);
    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, 800, 800);
    const replaceIdx = cropReplaceIdx;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], cropFile.name.replace(/\.[^.]+$/, '.jpg'), { type:'image/jpeg' });
      const remaining = [...pendingFiles];
      closeCropModal();
      if (replaceIdx !== null) {
        // Re-crop existing image: upload then replace at same index
        setUploadingImgs(true);
        const folder = editId ? String(editId) : `tmp-${Date.now()}`;
        const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
        const { error } = await supabase.storage.from('product-images').upload(path, file, { upsert:false, contentType:'image/jpeg' });
        if (error) { showToast((isAdminAr ? 'فشل رفع الصورة: ' : 'Erreur upload: ') + error.message, 'error'); }
        else {
          const { data } = supabase.storage.from('product-images').getPublicUrl(path);
          setForm(f => {
            if (!f) return f;
            const imgs = [...f.images];
            imgs[replaceIdx] = data.publicUrl;
            return { ...f, images: imgs };
          });
          showToast(isAdminAr ? 'تم قص الصورة ورفعها' : 'Image recadrée et uploadée', 'success');
        }
        setUploadingImgs(false);
      } else {
        await uploadImages([file]);
        if (remaining.length > 0) await uploadImages(remaining);
      }
    }, 'image/jpeg', 0.88);
  };

  // Open crop for an existing image URL (re-crop)
  const openRecrop = async (imgUrl: string, index: number) => {
    try {
      const res = await fetch(imgUrl);
      const blob = await res.blob();
      const name = imgUrl.split('/').pop() ?? 'image.jpg';
      const file = new File([blob], name, { type: blob.type || 'image/jpeg' });
      const blobUrl = URL.createObjectURL(blob);
      setCropReplaceIdx(index);
      setCropFile(file); setCropSrc(blobUrl);
    } catch { showToast(isAdminAr ? 'تعذر تحميل الصورة للقص' : 'Impossible de charger l\'image', 'error'); }
  };

  const removeImage = (idx: number) => {
    setForm(f => {
      if (!f) return f;
      const imgs = f.images.filter((_, i) => i !== idx);
      // Update thumbnail index
      const thumb = f.thumbnail_index === idx ? 0
        : f.thumbnail_index > idx ? f.thumbnail_index - 1 : f.thumbnail_index;
      // Shift color_images indices
      const ci: Record<string, number> = {};
      for (const [color, imgIdx] of Object.entries(f.color_images ?? {})) {
        if (imgIdx === idx) continue;          // removed
        ci[color] = imgIdx > idx ? imgIdx - 1 : imgIdx; // shift down
      }
      return { ...f, images: imgs, thumbnail_index: Math.max(0, Math.min(thumb, imgs.length - 1)), color_images: ci };
    });
  };

  const toggleColorImage = (color: string, imgIdx: number) => {
    setForm(f => {
      if (!f) return f;
      const ci = { ...(f.color_images ?? {}) };
      if (ci[color] === imgIdx) delete ci[color]; // unassign
      else ci[color] = imgIdx;                    // assign
      return { ...f, color_images: ci };
    });
  };

  // ── Colors ────────────────────────────────────────────────
  const addColor = () => {
    if (!form || form.colors.includes(colorPick)) return;
    setForm(f => f ? { ...f, colors:[...f.colors, colorPick] } : f);
  };
  const removeColor = (c:string) =>
    setForm(f => f ? { ...f, colors:f.colors.filter(x => x!==c) } : f);

  // ── CRUD ──────────────────────────────────────────────────
  const save = async () => {
    if (!form) return;
    if (!form.name_ar.trim()) { showToast(isAdminAr ? 'أدخل الاسم بالعربية' : 'Entrez le nom en arabe', 'warning');   return; }
    if (!form.name_fr.trim()) { showToast('Entrez le nom en français', 'warning'); return; }
    if (form.price <= 0)       { showToast(isAdminAr ? 'السعر يجب أن يكون أكبر من 0' : 'Le prix doit être > 0', 'warning'); return; }
    setSaving(true);
    const row = {
      name_ar: form.name_ar.trim(), name_fr: form.name_fr.trim(),
      category: form.category, price: form.price,
      original_price: form.original_price || null,
      badge: form.badge || null, emoji: form.emoji || '🛍️',
      colors: form.colors, images: form.images,
      thumbnail_index: form.thumbnail_index,
      color_images: form.color_images ?? {},
      stock: form.stock ?? {},
      in_stock: form.in_stock, active: form.active, sort_order: form.sort_order,
    };
    if (editId !== null) {
      const { error } = await supabase.from('products').update(row).eq('id', editId);
      if (error) { console.error('Update error:', error); showToast(`${isAdminAr ? 'فشل التعديل' : 'Erreur modification'}: ${error.message}`, 'error'); setSaving(false); return; }
      showToast(isAdminAr ? 'تم حفظ التعديلات' : 'Modifications enregistrées', 'success');
    } else {
      const { error } = await supabase.from('products').insert(row);
      if (error) { console.error('Insert error:', error); showToast(`${isAdminAr ? 'فشل الإضافة' : 'Erreur ajout'}: ${error.message}`, 'error'); setSaving(false); return; }
      showToast(isAdminAr ? 'تم إضافة المنتج بنجاح' : 'Produit ajouté', 'success');
    }
    await load(); setSaving(false);
    setForm(null); setPanelOpen(false);
  };

  const toggleStock = async (id:number, cur:boolean) => {
    await supabase.from('products').update({ in_stock:!cur }).eq('id', id);
    setProducts(p => p.map(x => x.id===id ? { ...x, in_stock:!cur } : x));
  };

  const toggleActive = async (id:number, cur:boolean) => {
    await supabase.from('products').update({ active:!cur }).eq('id', id);
    setProducts(p => p.map(x => x.id===id ? { ...x, active:!cur } : x));
    showToast(!cur ? (isAdminAr ? 'تم إظهار المنتج' : 'Produit visible') : (isAdminAr ? 'تم إخفاء المنتج' : 'Produit masqué'), 'info');
  };

  const del = async (id:number) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) { showToast(`${isAdminAr ? 'فشل الحذف' : 'Erreur suppression'}: ${error.message}`, 'error'); return; }
    setProducts(p => p.filter(x => x.id!==id));
    setDeleteConf(null);
    if (editId===id) { setForm(null); setPanelOpen(false); }
    if (viewId===id) setViewId(null);
    showToast(isAdminAr ? 'تم حذف المنتج' : 'Produit supprimé', 'info');
  };

  // ── Form Panel helpers ────────────────────────────────────────────────────────
  const pSL = (iconPath: string, label: string) => (
    <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:12 }}>
      <div style={{ width:3, height:16, borderRadius:2, background:C.gold, flexShrink:0 }} />
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={iconPath}/></svg>
      <span style={{ fontSize:9, fontWeight:800, color:C.sub, textTransform:'uppercase' as const, letterSpacing:1.5, fontFamily:'Inter, sans-serif' }}>{label}</span>
    </div>
  );
  const pInp = (label: string, val: string|number, onChange: (v: string) => void, opts?: { type?: string; placeholder?: string; fam?: string }) => (
    <div>
      <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:5, fontFamily: opts?.fam ?? font }}>{label}</label>
      <input type={opts?.type ?? 'text'} value={val} placeholder={opts?.placeholder} onChange={e => onChange(e.target.value)}
        style={{ width:'100%', padding:'10px 13px', borderRadius:10, border:`1.5px solid ${C.border}`, background:'#FAFCFB', color:C.text, fontFamily: opts?.fam ?? font, fontSize:13, boxSizing:'border-box' as const, outline:'none' }} />
    </div>
  );
  const secCard: CSSProperties = { background:'#FAFCFB', border:`1px solid ${C.border}`, borderRadius:14, padding:'14px 13px', display:'flex', flexDirection:'column', gap:12 };

  // ── Form Panel JSX (inline — NOT a component to avoid focus loss) ──────────
  const formPanelJSX = form ? (
    <div className={isDesktop ? (isAdminAr ? 'panel-anim-desktop-ar' : 'panel-anim-desktop-fr') : ''} style={{ width:isDesktop?360:'100%', flexShrink:0, background:C.card, borderInlineStart:isDesktop?`1px solid ${C.border}`:'none', display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {/* ── Hero header ── */}
      <div style={{ background:`linear-gradient(135deg, ${C.green} 0%, #1D4939 100%)`, padding:'18px 18px 16px', flexShrink:0, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', insetInlineEnd:-20, top:-20, width:100, height:100, borderRadius:'50%', background:'rgba(175,142,74,0.12)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', insetInlineEnd:30, bottom:-30, width:70, height:70, borderRadius:'50%', background:'rgba(255,255,255,0.05)', pointerEvents:'none' }} />
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', position:'relative' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:46, height:46, borderRadius:13, background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>
              {form.emoji || '🛍️'}
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:800, color:'#fff', fontFamily:font, lineHeight:1.2 }}>
                {editId !== null ? (isAdminAr ? 'تعديل المنتج' : 'Modifier le produit') : (isAdminAr ? 'منتج جديد' : 'Nouveau produit')}
              </div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)', fontFamily:font, marginTop:3 }}>
                {editId !== null ? (form.name_ar || (isAdminAr ? 'بدون اسم' : 'Sans nom')) : (isAdminAr ? 'أدخل بيانات المنتج الجديد' : 'Renseignez le nouveau produit')}
              </div>
            </div>
          </div>
          <button onClick={() => { setForm(null); setPanelOpen(false); }}
            style={{ background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:8, width:32, height:32, cursor:'pointer', color:'rgba(255,255,255,.75)', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, lineHeight:1 }}>×</button>
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div style={{ flex:1, overflowY:'auto', padding:'14px', display:'flex', flexDirection:'column', gap:12 }}>

        {/* Identity */}
        <div style={secCard}>
          {pSL('M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', isAdminAr ? 'هوية المنتج' : 'Identité produit')}
          {pInp(isAdminAr ? 'الاسم بالعربية *' : 'Nom en arabe *', form.name_ar, v => setForm(f=>f?{...f,name_ar:v}:f))}
          {pInp('Nom en Français *', form.name_fr, v => setForm(f=>f?{...f,name_fr:v}:f), { fam:'Inter, sans-serif' })}
          <div>
            <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:5, fontFamily:font }}>{isAdminAr ? 'الوصف (عربي)' : 'Description (arabe)'}</label>
            <textarea value={form.desc_ar||''} onChange={e=>setForm(f=>f?{...f,desc_ar:e.target.value||null}:f)} rows={2}
              style={{ width:'100%', padding:'10px 13px', borderRadius:10, border:`1.5px solid ${C.border}`, background:'#FAFCFB', color:C.text, fontFamily:font, fontSize:13, boxSizing:'border-box' as const, outline:'none', resize:'none' as const }} />
          </div>
          <div>
            <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:5, fontFamily:'Inter, sans-serif' }}>Description (fr)</label>
            <textarea value={form.desc_fr||''} onChange={e=>setForm(f=>f?{...f,desc_fr:e.target.value||null}:f)} rows={2} dir="ltr"
              style={{ width:'100%', padding:'10px 13px', borderRadius:10, border:`1.5px solid ${C.border}`, background:'#FAFCFB', color:C.text, fontFamily:'Inter, sans-serif', fontSize:13, boxSizing:'border-box' as const, outline:'none', resize:'none' as const }} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 80px', gap:10 }}>
            <div>
              <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:5, fontFamily:font }}>{isAdminAr ? 'الفئة' : 'Catégorie'}</label>
              <select value={form.category} onChange={e=>setForm(f=>f?{...f,category:e.target.value,stock:{}}:f)}
                style={{ width:'100%', padding:'10px 13px', borderRadius:10, border:`1.5px solid ${C.border}`, background:'#FAFCFB', color:C.text, fontFamily:font, fontSize:13, outline:'none' }}>
                <optgroup label={isAdminAr ? "👗 ملابس" : "👗 Vêtements"}>
                  {clothingCats.map(c=><option key={c.ar} value={c.ar}>{isAdminAr ? c.ar : (c.fr || c.ar)}</option>)}
                </optgroup>
                <optgroup label={isAdminAr ? "👟 أحذية" : "👟 Chaussures"}>
                  {shoeCats.map(c=><option key={c.ar} value={c.ar}>{isAdminAr ? c.ar : (c.fr || c.ar)}</option>)}
                </optgroup>
                <optgroup label={isAdminAr ? "👜 اكسسوارات" : "👜 Accessoires"}>
                  {accessoryCats.map(c=><option key={c.ar} value={c.ar}>{isAdminAr ? c.ar : (c.fr || c.ar)}</option>)}
                </optgroup>
              </select>
            </div>
            <div>
              <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:5, fontFamily:'Inter, sans-serif' }}>Emoji</label>
              <button ref={emojiBtnRef} type="button"
                onClick={() => {
                  const rect = emojiBtnRef.current?.getBoundingClientRect() ?? null;
                  setEmojiRect(rect);
                  setEmojiOpen(v => !v);
                }}
                style={{ width:'100%', padding:'8px 4px', borderRadius:10, border:`1.5px solid ${emojiOpen?C.gold:C.border}`, background:'#FAFCFB', color:C.text, fontSize:22, textAlign:'center', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'border .15s', boxSizing:'border-box' as const }}>
                {form.emoji || '🛍️'}
              </button>
              {emojiOpen && emojiRect && (
                <>
                  <div onClick={()=>setEmojiOpen(false)} style={{ position:'fixed', inset:0, zIndex:1000 }} />
                  <div style={{
                    position: 'fixed',
                    top: emojiRect.bottom + 6,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 'min(320px, calc(100vw - 32px))',
                    background:'#fff',
                    border:`1px solid ${C.border}`,
                    borderRadius:14,
                    padding:10,
                    zIndex:1001,
                    boxShadow:'0 12px 32px rgba(0,0,0,.15)',
                    display:'grid',
                    gridTemplateColumns:'repeat(auto-fill, minmax(32px, 1fr))',
                    gap:3,
                  }}>
                    {['🧣','🧕','👗','👘','🛍️','🧥','👛','👜','👝','🎀','💍','💎','👒','🧵','✨','⭐','🌹','💐','🎁','🪡','🌺','🌸','🌿','🎗️','✂️','🪞','💫','🌙','🎽','👑','👟','👠','👡','👢','🥾','🥿','👞','🩴','🫧'].map(em=>(
                      <button key={em} type="button" onClick={()=>{setForm(f=>f?{...f,emoji:em}:f);setEmojiOpen(false);}}
                        style={{ fontSize:20, padding:5, borderRadius:8, border:`1.5px solid ${form.emoji===em?C.gold:'transparent'}`, background:form.emoji===em?`${C.gold}18`:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'border .1s, background .1s', lineHeight:1 }}>
                        {em}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div style={secCard}>
          {pSL('M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', isAdminAr ? 'التسعير' : 'Tarification')}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {pInp(isAdminAr ? 'السعر (دج) *' : 'Prix (DA) *', form.price||'', v=>setForm(f=>f?{...f,price:Number(v)}:f), { type:'number', fam:'Inter, sans-serif' })}
            {pInp(isAdminAr ? 'قبل التخفيض' : 'Prix barré', form.original_price||'', v=>setForm(f=>f?{...f,original_price:v?Number(v):null}:f), { type:'number', fam:'Inter, sans-serif', placeholder: isAdminAr ? 'اختياري' : 'Optionnel' })}
          </div>
          <div>
            <label style={{ fontSize:11, color:C.muted, display:'block', marginBottom:8, fontFamily:font }}>{isAdminAr ? 'الشارة' : 'Badge'}</label>
            <div style={{ display:'flex', gap:6 }}>
              {BADGES.map(b=>(
                <button key={String(b.val)} onClick={()=>setForm(f=>f?{...f,badge:b.val}:f)}
                  style={{ flex:1, padding:'8px 4px', borderRadius:9, border:`1.5px solid ${form.badge===b.val?b.color+'80':C.border}`, background:form.badge===b.val?`${b.color}20`:'transparent', color:form.badge===b.val?b.color:C.muted, fontFamily:font, fontSize:11, fontWeight:700, cursor:'pointer', transition:'all .15s' }}>
                  {b.ar}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Colors */}
        <div style={secCard}>
          {pSL('M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01', isAdminAr ? 'الألوان' : 'Couleurs')}
          {form.colors.length > 0 && (
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {form.colors.map(c=>(
                <div key={c} style={{ position:'relative' }}>
                  <div style={{ width:34, height:34, borderRadius:9, background:c, border:`2px solid ${C.border}`, boxShadow:'0 1px 4px rgba(0,0,0,.12)' }} />
                  <button onClick={()=>removeColor(c)} style={{ position:'absolute', top:-5, insetInlineEnd:-5, background:'#EF4444', color:'#fff', border:'none', borderRadius:'50%', width:16, height:16, fontSize:10, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 1px 3px rgba(0,0,0,.2)' }}>×</button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <input type="color" value={colorPick} onChange={e=>setColorPick(e.target.value)}
              style={{ width:44, height:40, borderRadius:10, border:`1.5px solid ${C.border}`, background:'none', cursor:'pointer', padding:2, flexShrink:0 }} />
            <button onClick={addColor}
              style={{ flex:1, padding:'9px 12px', borderRadius:10, border:`1.5px solid ${C.gold}60`, background:`${C.gold}10`, color:C.gold, fontFamily:font, fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              {isAdminAr ? 'إضافة لون' : 'Ajouter couleur'}
            </button>
          </div>
        </div>

        {/* Stock */}
        {form.colors.length > 0 && (
          <div style={secCard}>
            {pSL('M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', isAdminAr ? 'المخزون' : 'Stock')}
            {(() => {
              const isShoe      = shoeCats.some(c => c.ar === form.category);
              const isAccessory = accessoryCats.some(c => c.ar === form.category);
              const activeSizes = isShoe ? SHOE_SIZES : isAccessory ? ACCESSORY_SIZES : CLOTHING_SIZES;
              return (
            <>
            <div style={{ overflowX:'auto', borderRadius:10, border:`1px solid ${C.border}` }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                <thead>
                  <tr style={{ background:C.card2 }}>
                    <th style={{ padding:'7px 8px', fontFamily:font, color:C.muted, fontWeight:700, textAlign:'center', borderBottom:`1px solid ${C.border}`, minWidth:34 }}>—</th>
                    {activeSizes.map(s => (
                      <th key={s} style={{ padding:'7px 8px', fontFamily:'Inter', color:C.muted, fontWeight:700, textAlign:'center', borderBottom:`1px solid ${C.border}`, minWidth:isShoe?38:42 }}>{s}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {form.colors.map((color, ci) => (
                    <tr key={color} style={{ borderBottom: ci < form.colors.length-1 ? `1px solid ${C.border}` : 'none' }}>
                      <td style={{ padding:'5px 6px', textAlign:'center' }}>
                        <div style={{ width:22, height:22, borderRadius:6, background:color, border:`2px solid ${C.border}`, margin:'0 auto', boxShadow:'0 1px 3px rgba(0,0,0,.12)' }} />
                      </td>
                      {activeSizes.map(size => {
                        const key = `${color}:${size}`;
                        const q = (form.stock ?? {})[key] ?? 0;
                        const qBg     = q === 0 ? '#FEF2F2' : q <= 3 ? '#FFFBEB' : '#F0FDF4';
                        const qColor  = q === 0 ? '#DC2626' : q <= 3 ? '#D97706' : '#15803D';
                        const qBorder = q === 0 ? '#FECACA' : q <= 3 ? '#FDE68A' : '#86EFAC';
                        return (
                          <td key={size} style={{ padding:3 }}>
                            <input
                              type="number" min="0" max="999" value={q}
                              onChange={e => {
                                const val = Math.max(0, Math.min(999, parseInt(e.target.value) || 0));
                                setForm(f => f ? { ...f, stock:{ ...(f.stock ?? {}), [key]:val } } : f);
                              }}
                              style={{ width:'100%', padding:'5px 2px', textAlign:'center', borderRadius:6, border:`1.5px solid ${qBorder}`, background:qBg, color:qColor, fontWeight:700, fontSize:12, fontFamily:'Inter', outline:'none', boxSizing:'border-box' as const }}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display:'flex', gap:14, fontSize:10, color:C.sub, fontFamily:font, marginTop:6 }}>
              <span><span style={{ color:'#DC2626', fontWeight:800 }}>■</span> {isAdminAr ? 'نفد (0)' : 'Rupture (0)'}</span>
              <span><span style={{ color:'#D97706', fontWeight:800 }}>■</span> {isAdminAr ? 'قليل (≤3)' : 'Faible (≤3)'}</span>
              <span><span style={{ color:'#15803D', fontWeight:800 }}>■</span> {isAdminAr ? 'متوفر' : 'Disponible'}</span>
            </div>
            </>
              );
            })()}
          </div>
        )}

        {/* Images */}
        <div style={secCard}>
          {pSL('M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z', isAdminAr ? 'صور المنتج' : 'Photos')}
          {form.images.length > 0 && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6 }}>
              {form.images.map((url, i) => {
                const isThumb = i === form.thumbnail_index;
                const assignedColors = form.colors.filter(c => (form.color_images ?? {})[c] === i);
                return (
                  <div key={i} style={{ borderRadius:10, overflow:'hidden', border:`2px solid ${isThumb?C.gold:C.border}`, background:C.card2, transition:'border .15s' }}>
                    <div style={{ position:'relative', aspectRatio:'1/1', cursor:'pointer' }}
                      onClick={() => setForm(f => f ? { ...f, thumbnail_index:i } : f)}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                      {isThumb && (
                        <div style={{ position:'absolute', top:4, insetInlineStart:4, background:C.gold, borderRadius:4, padding:'1px 6px', fontSize:9, color:'#fff', fontWeight:700, display:'flex', alignItems:'center', gap:3 }}>
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="#fff" stroke="#fff" strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> {isAdminAr ? 'رئيسية' : 'Principale'}
                        </div>
                      )}
                      {/* ✂️ Re-crop button */}
                      <button onClick={e => { e.stopPropagation(); openRecrop(url, i); }}
                        title={isAdminAr ? "قص الصورة" : "Recadrer"}
                        style={{ position:'absolute', bottom:4, insetInlineStart:4, background:'rgba(36,77,59,0.88)', color:'#fff', border:'none', borderRadius:6, width:24, height:24, fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(4px)' }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>
                      </button>
                      <button onClick={e => { e.stopPropagation(); removeImage(i); }}
                        style={{ position:'absolute', top:4, insetInlineEnd:4, background:'rgba(239,68,68,0.88)', color:'#fff', border:'none', borderRadius:'50%', width:20, height:20, fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1 }}>×</button>
                      {assignedColors.length > 0 && (
                        <div style={{ position:'absolute', bottom:4, insetInlineEnd:4, display:'flex', gap:3, flexWrap:'wrap', justifyContent:'flex-end' }}>
                          {assignedColors.map(c => (
                            <div key={c} title={c} style={{ width:12, height:12, borderRadius:'50%', background:c, border:'2px solid #fff', boxShadow:'0 1px 3px rgba(0,0,0,.3)' }} />
                          ))}
                        </div>
                      )}
                    </div>
                    {form.colors.length > 0 && (
                      <div style={{ padding:'5px 6px', display:'flex', gap:4, flexWrap:'wrap', borderTop:`1px solid ${C.border}`, background:C.card }}>
                        <span style={{ fontSize:9, color:C.sub, alignSelf:'center', marginInlineEnd:2, whiteSpace:'nowrap' }}>{isAdminAr ? 'لون:' : 'Col.'}</span>
                        {form.colors.map(c => {
                          const active = (form.color_images ?? {})[c] === i;
                          return (
                            <button key={c} title={active ? (isAdminAr ? `إلغاء تعيين ${c}` : `Désassigner ${c}`) : (isAdminAr ? `تعيين ${c} لهذه الصورة` : `Assigner ${c}`)}
                              onClick={() => toggleColorImage(c, i)}
                              style={{ width:18, height:18, borderRadius:'50%', background:c, border:`2.5px solid ${active ? C.gold : 'transparent'}`, cursor:'pointer', outline: active ? `2px solid ${C.gold}50` : 'none', flexShrink:0, transition:'border .15s, outline .15s' }} />
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <label style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'11px', borderRadius:10, border:`1.5px dashed ${C.border2}`, background:'transparent', cursor:uploadingImgs?'not-allowed':'pointer', color:C.muted, fontFamily:font, fontSize:12, transition:'border .2s' }}>
            {uploadingImgs
              ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation:'spin 1s linear infinite' }}><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg> {isAdminAr ? 'جاري الرفع...' : 'Chargement...'}</>
              : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> {isAdminAr ? 'رفع صورة (مع قص)' : 'Ajouter une photo'}</>
            }
            <input type="file" multiple accept="image/*" style={{ display:'none' }}
              disabled={uploadingImgs}
              onChange={e => {
                const files = Array.from(e.target.files ?? []);
                e.target.value = '';
                if (!files.length) return;
                const [first, ...rest] = files;
                setPendingFiles(rest);
                const url = URL.createObjectURL(first);
                setCropFile(first); setCropSrc(url);
              }} />
          </label>
          {uploadError && (
            <div style={{ padding:'7px 10px', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8, fontSize:11, color:'#DC2626', fontFamily:font }}>
              ⚠ {uploadError}
            </div>
          )}
          {form.images.length > 0 && (
            <p style={{ fontSize:10, color:C.sub, fontFamily:font, textAlign:'center', display:'flex', alignItems:'center', justifyContent:'center', gap:4, margin:0 }}>
              {isAdminAr ? 'اضغط على صورة لتحديدها كرئيسية' : 'Cliquez sur une photo pour la définir en principale'}
              <svg width="10" height="10" viewBox="0 0 24 24" fill={C.gold} stroke={C.gold} strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </p>
          )}
        </div>

        {/* Settings */}
        <div style={secCard}>
          {pSL('M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', isAdminAr ? 'الإعدادات' : 'Paramètres')}
          {pInp(isAdminAr ? 'ترتيب العرض' : "Ordre d'affichage", form.sort_order, v=>setForm(f=>f?{...f,sort_order:Number(v)}:f), { type:'number', fam:'Inter, sans-serif' })}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {([['in_stock', isAdminAr ? 'متوفر في المخزون' : 'En stock'],['active', isAdminAr ? 'مرئي للعملاء' : 'Visible']] as ['in_stock'|'active', string][]).map(([key,label])=>(
              <button key={key} onClick={()=>setForm(f=>f?{...f,[key]:!f[key]}:f)}
                style={{ padding:'10px 12px', borderRadius:10, border:`1.5px solid ${(form as Record<string,unknown>)[key]?'#10B98160':C.border}`, background:(form as Record<string,unknown>)[key]?'#10B98112':'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between', transition:'all .2s' }}>
                <span style={{ fontFamily:font, fontSize:11, color:C.text, fontWeight:600 }}>{label}</span>
                <div style={{ width:36, height:20, borderRadius:10, background:(form as Record<string,unknown>)[key]?'#10B981':C.border, position:'relative', transition:'background .2s', flexShrink:0 }}>
                  <div style={{ position:'absolute', top:2, insetInlineStart:(form as Record<string,unknown>)[key]?18:2, width:16, height:16, borderRadius:'50%', background:'#fff', transition:'all .2s' }} />
                </div>
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* ── Sticky footer ── */}
      <div style={{ flexShrink:0, padding:'12px 14px', background:C.card, borderTop:`1px solid ${C.border}`, display:'flex', gap:8 }}>
        {editId !== null && (
          <button onClick={()=>setDeleteConf(editId)}
            style={{ padding:'11px 14px', borderRadius:10, border:`1.5px solid #EF444440`, background:'#EF44440D', color:'#EF4444', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          </button>
        )}
        <button onClick={save} disabled={saving}
          style={{ flex:1, padding:'12px', borderRadius:10, background:saving?C.muted:`linear-gradient(135deg, ${C.green} 0%, #1D4939 100%)`, border:'none', color:'#fff', fontFamily:font, fontSize:13, fontWeight:800, cursor:saving?'not-allowed':'pointer', boxShadow:saving?'none':`0 4px 16px rgba(36,77,59,.35)`, transition:'all .2s', display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
          {saving
            ? (isAdminAr ? 'جاري الحفظ...' : 'Enregistrement...')
            : editId !== null
              ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> {isAdminAr ? 'حفظ التعديلات' : 'Enregistrer'}</>
              : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> {isAdminAr ? 'إضافة المنتج' : 'Ajouter le produit'}</>
          }
        </button>
      </div>

    </div>
  ) : null;

  // ── View Panel JSX (read-only product detail) ─────────────
  const viewProduct = products.find(p => p.id === viewId) ?? null;
  const viewPanelJSX = viewProduct && !panelOpen ? (
    <div className={isDesktop ? (isAdminAr ? 'panel-anim-desktop-ar' : 'panel-anim-desktop-fr') : ''} style={{ width:isDesktop?360:'100%', flexShrink:0, background:C.card, borderInlineStart:isDesktop?`1px solid ${C.border}`:'none', display:'flex', flexDirection:'column', overflow:'hidden' }}>
      {/* Header */}
      <div style={{ background:`linear-gradient(135deg, ${C.green} 0%, #1D4939 100%)`, padding:'18px 18px 16px', flexShrink:0, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', insetInlineEnd:-20, top:-20, width:100, height:100, borderRadius:'50%', background:'rgba(175,142,74,0.12)', pointerEvents:'none' }} />
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', position:'relative' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:46, height:46, borderRadius:13, overflow:'hidden', border:'1px solid rgba(255,255,255,0.2)', flexShrink:0, background:'rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              {viewProduct.images?.length > 0
                ? <img src={viewProduct.images[viewProduct.thumbnail_index ?? 0] ?? viewProduct.images[0]} alt={viewProduct.name_ar} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                : <span style={{ fontSize:22 }}>{viewProduct.emoji || '🛍️'}</span>
              }
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:800, color:'#fff', fontFamily:font, lineHeight:1.2 }}>{viewProduct.name_ar}</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.6)', fontFamily:'Inter,sans-serif', marginTop:2 }}>{viewProduct.name_fr}</div>
            </div>
          </div>
          <button onClick={() => setViewId(null)} style={{ background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:8, width:30, height:30, color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        {/* Chips */}
        <div style={{ display:'flex', gap:6, marginTop:12, flexWrap:'wrap' }}>
          <span style={{ fontSize:10, padding:'3px 10px', borderRadius:20, background:'rgba(255,255,255,0.15)', color:'#fff', fontFamily:font, fontWeight:700 }}>{viewProduct.category}</span>
          {viewProduct.badge && <span style={{ fontSize:10, padding:'3px 10px', borderRadius:20, background:`${BADGES.find(b=>b.val===viewProduct.badge)?.color ?? C.gold}40`, color:`${BADGES.find(b=>b.val===viewProduct.badge)?.color ?? C.gold}`, fontFamily:'Inter', fontWeight:700, textTransform:'uppercase' }}>{viewProduct.badge}</span>}
          <span style={{ fontSize:10, padding:'3px 10px', borderRadius:20, background:viewProduct.in_stock?'rgba(16,185,129,0.25)':'rgba(239,68,68,0.25)', color:viewProduct.in_stock?'#10B981':'#EF4444', fontFamily:font, fontWeight:700 }}>{viewProduct.in_stock ? (isAdminAr ? 'متوفر' : 'En stock') : (isAdminAr ? 'نفد' : 'Épuisé')}</span>
          <span style={{ fontSize:10, padding:'3px 10px', borderRadius:20, background:viewProduct.active?'rgba(255,255,255,0.15)':'rgba(107,114,128,0.3)', color:viewProduct.active?'rgba(255,255,255,0.9)':'#9CA3AF', fontFamily:font, fontWeight:700 }}>{viewProduct.active ? (isAdminAr ? 'مرئي' : 'Visible') : (isAdminAr ? 'مخفي' : 'Masqué')}</span>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex:1, overflowY:'auto', padding:'18px' }}>

        {/* Price */}
        <div style={{ ...secCard, flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <div>
            <div style={{ fontSize:11, color:C.muted, fontFamily:font, marginBottom:2 }}>{isAdminAr ? 'السعر' : 'Prix'}</div>
            <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
              <span style={{ fontFamily:'Inter,sans-serif', fontSize:22, fontWeight:800, color:C.gold }}>{viewProduct.price.toLocaleString()}</span>
              <span style={{ fontFamily:font, fontSize:12, color:C.muted }}>{isAdminAr ? 'دج' : 'DA'}</span>
              {viewProduct.original_price && <span style={{ fontFamily:'Inter', fontSize:12, color:C.muted, textDecoration:'line-through' }}>{viewProduct.original_price.toLocaleString()}</span>}
            </div>
          </div>
          {viewProduct.original_price && viewProduct.original_price > viewProduct.price && (
            <div style={{ padding:'4px 10px', borderRadius:20, background:'#10B98120', color:'#10B981', fontFamily:'Inter', fontSize:11, fontWeight:700 }}>
              -{Math.round((1 - viewProduct.price/viewProduct.original_price)*100)}%
            </div>
          )}
        </div>

        {/* Images */}
        {viewProduct.images?.length > 0 && (
          <div style={{ ...secCard, marginBottom:12 }}>
            {pSL('M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z', isAdminAr ? 'الصور' : 'Photos')}
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {viewProduct.images.map((img, i) => (
                <div key={i} style={{ width:64, height:64, borderRadius:10, overflow:'hidden', border:`2px solid ${i === (viewProduct.thumbnail_index ?? 0) ? C.gold : C.border}`, position:'relative' }}>
                  <img src={img} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  {i === (viewProduct.thumbnail_index ?? 0) && (
                    <div style={{ position:'absolute', bottom:2, insetInlineStart:2, background:C.gold, borderRadius:3, padding:'1px 4px', fontSize:8, color:'#fff', fontFamily:'Inter', fontWeight:700 }}>✦</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Colors */}
        {viewProduct.colors?.length > 0 && (
          <div style={{ ...secCard, marginBottom:12 }}>
            {pSL('M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01', isAdminAr ? 'الألوان' : 'Couleurs')}
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {viewProduct.colors.map(c => (
                <div key={c} title={c} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                  <div style={{ width:32, height:32, borderRadius:8, background:c, border:`2px solid ${C.border}`, boxShadow:'0 2px 6px rgba(0,0,0,.12)' }} />
                  <span style={{ fontSize:9, color:C.muted, fontFamily:'Inter', letterSpacing:.5 }}>{c}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {(viewProduct.desc_ar || viewProduct.desc_fr) && (
          <div style={{ ...secCard, marginBottom:12 }}>
            {pSL('M4 6h16M4 12h16M4 18h7', isAdminAr ? 'الوصف' : 'Description')}
            {viewProduct.desc_ar && <p style={{ fontFamily:font, fontSize:12, color:C.text, lineHeight:1.6, margin:0 }}>{viewProduct.desc_ar}</p>}
            {viewProduct.desc_fr && <p style={{ fontFamily:'Inter,sans-serif', fontSize:11, color:C.muted, lineHeight:1.6, margin:0 }}>{viewProduct.desc_fr}</p>}
          </div>
        )}

        {/* Stock by size */}
        {viewProduct.stock && Object.keys(viewProduct.stock).length > 0 && (
          <div style={{ ...secCard, marginBottom:12 }}>
            {pSL('M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', isAdminAr ? 'المخزون' : 'Stock')}
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {Object.entries(viewProduct.stock).map(([sz, qty]) => (
                <div key={sz} style={{ padding:'5px 12px', borderRadius:8, background:qty>0?`${C.green}12`:'#EF444412', border:`1px solid ${qty>0?C.border:'#EF444430'}`, display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                  <span style={{ fontFamily:'Inter', fontSize:10, fontWeight:700, color:qty>0?C.green:'#EF4444' }}>{sz}</span>
                  <span style={{ fontFamily:'Inter', fontSize:12, fontWeight:800, color:C.text }}>{qty}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Actions */}
      <div style={{ padding:'14px 18px', borderTop:`1px solid ${C.border}`, display:'flex', gap:8, flexShrink:0 }}>
        <button onClick={() => openEdit(viewProduct)}
          style={{ flex:1, padding:'11px', borderRadius:10, background:`linear-gradient(135deg, ${C.green} 0%, #1D4939 100%)`, border:'none', color:'#fff', fontFamily:font, fontSize:13, fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          {isAdminAr ? 'تعديل' : 'Modifier'}
        </button>
        <button onClick={() => setDeleteConf(viewProduct.id)}
          style={{ width:44, height:44, borderRadius:10, border:'1px solid #EF444440', background:'#EF444410', color:'#EF4444', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>
      </div>
    </div>
  ) : null;

  // ── Render ────────────────────────────────────────────────
  return (
    <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
      
      {/* Header Actions */}
      <div style={{ padding:isMobile?'14px 12px':'18px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div>
          <h1 style={{ fontSize:isMobile?18:22, fontWeight:800, color:C.text, margin:0, fontFamily:font }}>{isAdminAr ? 'إدارة المنتجات' : 'Produits'}</h1>
          <p style={{ fontSize:12, color:C.sub, margin:0, fontFamily:font, marginTop:4 }}>{products.length} {isAdminAr ? 'منتج في الكتالوج' : 'produit(s)'}</p>
        </div>
        <button onClick={openAdd}
          style={{ background:`linear-gradient(135deg, ${C.gold}, #8B6D35)`, border:'none', borderRadius:10, padding:isMobile?'10px 14px':'12px 20px', color:'#fff', fontFamily:font, fontSize:isMobile?12:13, fontWeight:800, cursor:'pointer', whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:6 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          {!isMobile && (isAdminAr ? 'إضافة منتج' : 'Ajouter un produit')}
        </button>
      </div>

        {/* Body */}
        <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

          {/* Products grid */}
          <div style={{ flex:1, overflowY:'auto', padding:isMobile?'12px':'20px 24px' }}>
            {loading ? (
              <>
                <style>{`
                  @keyframes ihsen-shimmer{from{background-position:200% 0}to{background-position:-200% 0}}
                  .ihsen-skel{background:linear-gradient(90deg,#e8f0eb 25%,#f3f8f5 50%,#e8f0eb 75%);background-size:200% 100%;animation:ihsen-shimmer 1.4s ease-in-out infinite;border-radius:6px;}
                `}</style>
                <div style={{ display:'grid', gridTemplateColumns:isDesktop&&panelOpen?'repeat(auto-fill,minmax(240px,1fr))':isMobile?'1fr':'repeat(auto-fill,minmax(260px,1fr))', gap:12 }}>
                  {Array.from({length:6}).map((_,i) => (
                    <div key={i} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:16, display:'flex', flexDirection:'column', gap:10 }}>
                      <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                        <div className="ihsen-skel" style={{ width:52, height:52, borderRadius:10, flexShrink:0 }} />
                        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6 }}>
                          <div className="ihsen-skel" style={{ height:13, width:'70%' }} />
                          <div className="ihsen-skel" style={{ height:11, width:'50%' }} />
                          <div style={{ display:'flex', gap:5, marginTop:2 }}>
                            <div className="ihsen-skel" style={{ height:18, width:50, borderRadius:20 }} />
                          </div>
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:4 }}>
                        {[1,2,3].map(j=><div key={j} className="ihsen-skel" style={{ width:18, height:18, borderRadius:4 }} />)}
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'auto' }}>
                        <div className="ihsen-skel" style={{ height:16, width:70 }} />
                        <div style={{ display:'flex', gap:6 }}>
                          {[1,2,3].map(j=><div key={j} className="ihsen-skel" style={{ width:30, height:30, borderRadius:8 }} />)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : products.length === 0 ? (
              <div style={{ textAlign:'center', color:C.muted, padding:60 }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#AF8E4A" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom:12, opacity:0.45 }}><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
                <p style={{ fontFamily:font, fontSize:14 }}>{isAdminAr ? 'لا توجد منتجات — أضيفي أول منتج' : 'Aucun produit'}</p>
                <button onClick={openAdd} style={{ marginTop:12, padding:'10px 24px', borderRadius:10, background:`linear-gradient(135deg, ${C.green}, #1D4939)`, border:'none', color:'#fff', fontFamily:font, fontSize:13, fontWeight:700, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:7 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  {isAdminAr ? 'إضافة منتج' : 'Ajouter un produit'}
                </button>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
                {allCats.map(cat => {
                  const catProducts = products.filter(p => p.category === cat.ar);
                  if (catProducts.length === 0) return null;
                  const collapsed = collapsedCats.has(cat.ar);
                  const toggleCat = () => setCollapsedCats(prev => {
                    const next = new Set(prev);
                    if (next.has(cat.ar)) next.delete(cat.ar); else next.add(cat.ar);
                    return next;
                  });
                  return (
                    <div key={cat.ar} style={{ marginBottom:20 }}>
                      {/* Category header */}
                      <button onClick={toggleCat} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', borderRadius:12, background:`linear-gradient(90deg, ${C.green}18 0%, transparent 100%)`, border:`1px solid ${C.border}`, cursor:'pointer', marginBottom:collapsed?0:12, fontFamily:font, gap:10 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <div style={{ width:3, height:18, borderRadius:2, background:C.gold, flexShrink:0 }} />
                          <span style={{ fontSize:14, fontWeight:800, color:C.text, fontFamily:font }}>{isAdminAr ? cat.ar : (cat.fr || cat.ar)}</span>
                          <span style={{ fontSize:11, padding:'2px 9px', borderRadius:20, background:`${C.green}20`, color:C.green, fontFamily:'Inter,sans-serif', fontWeight:700 }}>{catProducts.length}</span>
                        </div>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition:'transform .2s', transform:collapsed?'rotate(-90deg)':'rotate(0deg)', flexShrink:0 }}>
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </button>

                      {/* Products grid */}
                      {!collapsed && (
                        <div style={{ display:'grid', gridTemplateColumns:(isDesktop&&(panelOpen||viewId!==null))?'repeat(auto-fill,minmax(180px,1fr))':isMobile?'repeat(2,1fr)':'repeat(auto-fill,minmax(200px,1fr))', gap:12 }}>
                          {catProducts.map(p => {
                            const badgeMeta = BADGES.find(b=>b.val===p.badge);
                            const isViewing = p.id === viewId;
                            const thumb = p.images?.length > 0 ? (p.images[p.thumbnail_index ?? 0] ?? p.images[0]) : null;
                            const stockEntries = Object.entries(p.stock ?? {});
                            const stockTotal = stockEntries.reduce((s,[,q])=>s+q,0);
                            return (
                              <div key={p.id} onClick={() => { setViewId(p.id); setForm(null); setPanelOpen(false); }}
                                style={{ background:C.card, border:`2px solid ${p.id===editId?C.gold:isViewing?C.green:C.border}`, borderRadius:14, overflow:'hidden', display:'flex', flexDirection:'column', opacity:p.active?1:0.6, transition:'border .2s, opacity .2s, box-shadow .2s', cursor:'pointer', boxShadow:isViewing?`0 0 0 3px ${C.green}25`:'0 1px 4px rgba(0,0,0,.06)' }}>

                                {/* Image area */}
                                <div style={{ height:150, position:'relative', background:thumb?'transparent':`linear-gradient(135deg, ${C.green}22, ${C.gold}18)`, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                  {thumb
                                    ? <img src={thumb} alt={p.name_ar} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                                    : <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                                        <span style={{ fontSize:36 }}>{p.emoji || '🛍️'}</span>
                                      </div>
                                  }
                                  {/* Out of stock overlay */}
                                  {!p.in_stock && (
                                    <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.45)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                                      <span style={{ background:'#EF4444', color:'#fff', fontSize:10, fontWeight:800, borderRadius:100, padding:'3px 12px', fontFamily:font }}>{isAdminAr ? 'نفد المخزون' : 'Épuisé'}</span>
                                    </div>
                                  )}
                                  {/* Badge top-right */}
                                  {badgeMeta?.val && (
                                    <div style={{ position:'absolute', top:8, insetInlineStart:8, background:badgeMeta.color, color:'#fff', fontSize:9, fontWeight:800, borderRadius:100, padding:'2px 8px', fontFamily:'Inter', textTransform:'uppercase' }}>{p.badge}</div>
                                  )}
                                  {/* Hidden badge */}
                                  {!p.active && (
                                    <div style={{ position:'absolute', top:8, insetInlineEnd:8, background:'rgba(0,0,0,.55)', color:'#fff', fontSize:9, fontWeight:700, borderRadius:100, padding:'2px 8px', fontFamily:font }}>{isAdminAr ? 'مخفي' : 'Masqué'}</div>
                                  )}
                                  {/* Featured indicator */}
                                  {featuredIds.includes(p.id) && (
                                    <div style={{ position:'absolute', top:8, insetInlineEnd:8, background:'rgba(175,142,74,0.92)', borderRadius:6, padding:'2px 6px', display:'flex', alignItems:'center', gap:3 }}>
                                      <svg width="9" height="9" viewBox="0 0 24 24" fill="#fff" stroke="#fff" strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                                      <span style={{ fontSize:8, color:'#fff', fontFamily:font, fontWeight:700 }}>{featuredIds.indexOf(p.id)+1}/4</span>
                                    </div>
                                  )}
                                  {/* Action buttons floating bottom */}
                                  <div style={{ position:'absolute', bottom:8, insetInlineEnd:8, display:'flex', gap:5 }} onClick={e=>e.stopPropagation()}>
                                    <button title={featuredIds.includes(p.id) ? (isAdminAr ? 'إزالة من الصفحة الرئيسية' : 'Retirer de l\'accueil') : (isAdminAr ? 'تثبيت في الصفحة الرئيسية (٤ فقط)' : 'Épingler en accueil (max 4)')}
                                      onClick={e=>{ e.stopPropagation(); toggleFeatured(p.id); }}
                                      style={{ width:26, height:26, borderRadius:7, border:'none', background:featuredIds.includes(p.id)?'rgba(175,142,74,0.92)':'rgba(0,0,0,0.45)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(4px)' }}>
                                      <svg width="11" height="11" viewBox="0 0 24 24" fill={featuredIds.includes(p.id)?'#fff':'none'} stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                                    </button>
                                    <button title={p.in_stock ? (isAdminAr ? 'متوفر' : 'En stock') : (isAdminAr ? 'نفد' : 'Épuisé')} onClick={e=>{ e.stopPropagation(); toggleStock(p.id, p.in_stock); }}
                                      style={{ width:26, height:26, borderRadius:7, border:'none', background:p.in_stock?'rgba(16,185,129,0.9)':'rgba(239,68,68,0.9)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', backdropFilter:'blur(4px)' }}>
                                      {p.in_stock
                                        ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                        : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                      }
                                    </button>
                                    <button title={p.active ? (isAdminAr ? 'مرئي' : 'Visible') : (isAdminAr ? 'مخفي' : 'Masqué')} onClick={e=>{ e.stopPropagation(); toggleActive(p.id, p.active); }}
                                      style={{ width:26, height:26, borderRadius:7, border:'none', background:'rgba(255,255,255,0.85)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:p.active?C.green:'#6B7280', backdropFilter:'blur(4px)' }}>
                                      {p.active
                                        ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                        : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                                      }
                                    </button>
                                  </div>
                                </div>

                                {/* Info area */}
                                <div style={{ padding:'10px 12px', display:'flex', flexDirection:'column', gap:6, flex:1 }}>
                                  <div style={{ fontFamily:font, fontSize:12, fontWeight:700, color:C.text, lineHeight:1.35, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' as const, overflow:'hidden' }}>{p.name_ar}</div>
                                  <div style={{ fontFamily:'Inter,sans-serif', fontSize:10, color:C.muted, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name_fr}</div>

                                  {/* Colors */}
                                  {p.colors.length > 0 && (
                                    <div style={{ display:'flex', gap:3, flexWrap:'wrap' }}>
                                      {p.colors.map(c=><div key={c} title={c} style={{ width:14, height:14, borderRadius:3, background:c, border:`1.5px solid ${C.border}` }} />)}
                                    </div>
                                  )}

                                  {/* Stock count */}
                                  {stockEntries.length > 0 && (
                                    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                                      <div style={{ width:6, height:6, borderRadius:'50%', background:stockTotal>0?'#10B981':'#EF4444', flexShrink:0 }} />
                                      <span style={{ fontSize:10, color:stockTotal>0?C.green:'#EF4444', fontFamily:font, fontWeight:600 }}>{isAdminAr ? `متبقى ${stockTotal} قطعة` : `${stockTotal} unité(s)`}</span>
                                    </div>
                                  )}

                                  {/* Price + edit */}
                                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'auto', paddingTop:4 }}>
                                    <div>
                                      <span style={{ fontFamily:'Inter', fontSize:14, fontWeight:800, color:C.gold }}>{p.price.toLocaleString()}</span>
                                      <span style={{ fontFamily:font, fontSize:10, color:C.muted }}> {isAdminAr ? 'دج' : 'DA'}</span>
                                      {p.original_price && <div style={{ fontFamily:'Inter', fontSize:10, color:C.muted, textDecoration:'line-through' }}>{p.original_price.toLocaleString()}</div>}
                                    </div>
                                    <button onClick={e=>{ e.stopPropagation(); openEdit(p); }}
                                      style={{ padding:'5px 10px', borderRadius:7, border:`1px solid ${C.border}`, background:`${C.green}20`, color:C.green, fontFamily:font, fontSize:10, fontWeight:700, cursor:'pointer' }}>
                                      {isAdminAr ? 'تعديل' : 'Modifier'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                {/* Products not in any known category */}
                {(() => {
                  const others = products.filter(p => !allCatArs.includes(p.category));
                  if (others.length === 0) return null;
                  const collapsed = collapsedCats.has('__other__');
                  return (
                    <div style={{ marginBottom:20 }}>
                      <button onClick={() => setCollapsedCats(prev => { const n=new Set(prev); if(n.has('__other__'))n.delete('__other__');else n.add('__other__'); return n; })} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', borderRadius:12, background:`linear-gradient(90deg, ${C.green}18 0%, transparent 100%)`, border:`1px solid ${C.border}`, cursor:'pointer', marginBottom:collapsed?0:12, fontFamily:font, gap:10 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <div style={{ width:3, height:18, borderRadius:2, background:C.gold, flexShrink:0 }} />
                          <span style={{ fontSize:14, fontWeight:800, color:C.text, fontFamily:font }}>{isAdminAr ? 'أخرى' : 'Autres'}</span>
                          <span style={{ fontSize:11, padding:'2px 9px', borderRadius:20, background:`${C.green}20`, color:C.green, fontFamily:'Inter,sans-serif', fontWeight:700 }}>{others.length}</span>
                        </div>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition:'transform .2s', transform:collapsed?'rotate(-90deg)':'rotate(0deg)' }}><polyline points="6 9 12 15 18 9"/></svg>
                      </button>
                      {!collapsed && (
                        <div style={{ display:'grid', gridTemplateColumns:(isDesktop&&(panelOpen||viewId!==null))?'repeat(auto-fill,minmax(180px,1fr))':isMobile?'repeat(2,1fr)':'repeat(auto-fill,minmax(200px,1fr))', gap:12 }}>
                          {others.map(p => {
                            const isViewing = p.id === viewId;
                            const thumb = p.images?.length > 0 ? (p.images[p.thumbnail_index??0]??p.images[0]) : null;
                            return (
                              <div key={p.id} onClick={() => { setViewId(p.id); setForm(null); setPanelOpen(false); }}
                                style={{ background:C.card, border:`2px solid ${p.id===editId?C.gold:isViewing?C.green:C.border}`, borderRadius:14, overflow:'hidden', display:'flex', flexDirection:'column', opacity:p.active?1:0.6, transition:'border .2s, opacity .2s', cursor:'pointer' }}>
                                <div style={{ height:150, position:'relative', background:thumb?'transparent':`linear-gradient(135deg, ${C.green}22, ${C.gold}18)`, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center' }}>
                                  {thumb ? <img src={thumb} alt={p.name_ar} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <span style={{ fontSize:36 }}>{p.emoji||'🛍️'}</span>}
                                  {!p.in_stock && <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.45)', display:'flex', alignItems:'center', justifyContent:'center' }}><span style={{ background:'#EF4444', color:'#fff', fontSize:10, fontWeight:800, borderRadius:100, padding:'3px 12px', fontFamily:font }}>{isAdminAr ? 'نفد المخزون' : 'Épuisé'}</span></div>}
                                  <span style={{ position:'absolute', top:8, insetInlineStart:8, fontSize:9, padding:'2px 8px', borderRadius:100, background:`${C.green}20`, color:C.green, fontFamily:font, fontWeight:700 }}>{p.category}</span>
                                </div>
                                <div style={{ padding:'10px 12px', display:'flex', flexDirection:'column', gap:5, flex:1 }}>
                                  <div style={{ fontFamily:font, fontSize:12, fontWeight:700, color:C.text, lineHeight:1.35 }}>{p.name_ar}</div>
                                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'auto' }}>
                                    <span style={{ fontFamily:'Inter', fontSize:14, fontWeight:800, color:C.gold }}>{p.price.toLocaleString()} <span style={{ fontFamily:font, fontSize:10, color:C.muted }}>{isAdminAr ? 'دج' : 'DA'}</span></span>
                                    <button onClick={e=>{ e.stopPropagation(); openEdit(p); }} style={{ padding:'4px 10px', borderRadius:7, border:`1px solid ${C.border}`, background:`${C.green}20`, color:C.green, fontFamily:font, fontSize:10, fontWeight:700, cursor:'pointer' }}>{isAdminAr ? 'تعديل' : 'Modifier'}</button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Right panel — desktop */}
          {isDesktop && (panelOpen ? formPanelJSX : viewPanelJSX)}
        </div>

      {/* Form panel — mobile / tablet bottom sheet */}
      {!isDesktop && panelOpen && form && (
        <div style={{ position:'fixed', inset:0, zIndex:400, display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
          <div onClick={()=>{ setForm(null); setPanelOpen(false); }} style={{ flex:1, background:'#00000070', animation: 'ihsenFadeIn 0.3s ease' }} />
          <div className="panel-anim-mobile" style={{ background:C.card, borderTop:`1px solid ${C.border}`, borderTopLeftRadius:24, borderTopRightRadius:24, maxHeight:'88vh', overflowY:'auto' }}>
            <div style={{ padding:'10px 0 0', display:'flex', justifyContent:'center' }}>
              <div style={{ width:36, height:4, borderRadius:2, background:C.border }} />
            </div>
            {formPanelJSX}
          </div>
        </div>
      )}

      {/* View panel — mobile / tablet bottom sheet */}
      {!isDesktop && viewId !== null && !panelOpen && viewPanelJSX && (
        <div style={{ position:'fixed', inset:0, zIndex:400, display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
          <div onClick={()=>setViewId(null)} style={{ flex:1, background:'#00000070', animation: 'ihsenFadeIn 0.3s ease' }} />
          <div className="panel-anim-mobile" style={{ background:C.card, borderTop:`1px solid ${C.border}`, borderTopLeftRadius:24, borderTopRightRadius:24, maxHeight:'88vh', overflowY:'auto' }}>
            <div style={{ padding:'10px 0 0', display:'flex', justifyContent:'center' }}>
              <div style={{ width:36, height:4, borderRadius:2, background:C.border }} />
            </div>
            {viewPanelJSX}
          </div>
        </div>
      )}

      {/* ── Crop Modal ──────────────────────────────────────────────────────── */}
      {cropSrc && (
        <div style={{ position:'fixed', inset:0, zIndex:700, background:'rgba(0,0,0,.82)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ background:C.card, borderRadius:20, padding:20, maxWidth:360, width:'100%', boxShadow:'0 16px 64px rgba(0,0,0,.32)', display:'flex', flexDirection:'column', gap:16 }}>
            {/* Title */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <h3 style={{ margin:0, fontFamily:font, fontSize:15, fontWeight:800, color:C.text }}>{isAdminAr ? (cropReplaceIdx !== null ? 'إعادة قص الصورة' : 'قص الصورة قبل الرفع') : (cropReplaceIdx !== null ? 'Recadrer' : 'Recadrer la photo')}</h3>
                <p style={{ margin:0, fontFamily:font, fontSize:11, color:C.muted }}>{isAdminAr ? 'سحب للتحريك · عجلة الماوس للتكبير' : 'Déplacer · molette pour zoomer'}</p>
              </div>
              <button onClick={closeCropModal} style={{ width:32, height:32, borderRadius:8, border:`1px solid ${C.border}`, background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:C.muted }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Viewport */}
            <div
              style={{ width:CROP_VP, height:CROP_VP, overflow:'hidden', borderRadius:12, background:'#111', border:`2px solid ${C.border}`, position:'relative', cursor:cropDragging?'grabbing':'grab', margin:'0 auto', userSelect:'none', touchAction:'none', flexShrink:0 }}
              onMouseDown={e => {
                e.preventDefault();
                setCropDragging(true);
                setCropDragStart({ mx:e.clientX, my:e.clientY, ox:cropOffset.x, oy:cropOffset.y });
              }}
              onMouseMove={e => {
                if (!cropDragging || !cropImgRef.current) return;
                const nx = cropDragStart.ox + (e.clientX - cropDragStart.mx);
                const ny = cropDragStart.oy + (e.clientY - cropDragStart.my);
                setCropOffset(clampOffset(nx, ny, cropZoom, cropImgRef.current.naturalWidth, cropImgRef.current.naturalHeight));
              }}
              onMouseUp={()=>setCropDragging(false)}
              onMouseLeave={()=>setCropDragging(false)}
              onTouchStart={e => {
                const t = e.touches[0];
                setCropDragging(true);
                setCropDragStart({ mx:t.clientX, my:t.clientY, ox:cropOffset.x, oy:cropOffset.y });
              }}
              onTouchMove={e => {
                if (!cropDragging || !cropImgRef.current) return;
                const t = e.touches[0];
                const nx = cropDragStart.ox + (t.clientX - cropDragStart.mx);
                const ny = cropDragStart.oy + (t.clientY - cropDragStart.my);
                setCropOffset(clampOffset(nx, ny, cropZoom, cropImgRef.current.naturalWidth, cropImgRef.current.naturalHeight));
              }}
              onTouchEnd={()=>setCropDragging(false)}
              onWheel={e => {
                e.preventDefault();
                if (!cropImgRef.current) return;
                const { naturalWidth:nw, naturalHeight:nh } = cropImgRef.current;
                const newZ = Math.max(cropMinZoom, Math.min(cropZoom * (e.deltaY < 0 ? 1.08 : 0.93), 5));
                // Keep center of viewport fixed when zooming
                const cx = CROP_VP / 2;
                const cy = CROP_VP / 2;
                const nx = cx - (cx - cropOffset.x) * (newZ / cropZoom);
                const ny = cy - (cy - cropOffset.y) * (newZ / cropZoom);
                setCropZoom(newZ);
                setCropOffset(clampOffset(nx, ny, newZ, nw, nh));
              }}
            >
              {/* Crosshair */}
              <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:2, border:`2px solid rgba(255,255,255,0.35)`, borderRadius:10 }} />
              <div style={{ position:'absolute', top:'50%', left:0, right:0, height:1, background:'rgba(255,255,255,0.2)', pointerEvents:'none', zIndex:2 }} />
              <div style={{ position:'absolute', left:'50%', top:0, bottom:0, width:1, background:'rgba(255,255,255,0.2)', pointerEvents:'none', zIndex:2 }} />
              <img
                ref={cropImgRef}
                src={cropSrc}
                alt="crop"
                draggable={false}
                onLoad={e => {
                  const img = e.currentTarget;
                  initCrop(img.naturalWidth, img.naturalHeight);
                }}
                style={{
                  position:'absolute',
                  left:cropOffset.x,
                  top:cropOffset.y,
                  width: cropImgRef.current ? cropImgRef.current.naturalWidth * cropZoom : 'auto',
                  height: cropImgRef.current ? cropImgRef.current.naturalHeight * cropZoom : 'auto',
                  pointerEvents:'none',
                  display:'block',
                  maxWidth:'none',
                }}
              />
            </div>

            {/* Zoom slider */}
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
              <input type="range" min={cropMinZoom} max={cropMinZoom * 4} step={0.01} value={cropZoom}
                onChange={e => {
                  if (!cropImgRef.current) return;
                  const newZ = Number(e.target.value);
                  const { naturalWidth:nw, naturalHeight:nh } = cropImgRef.current;
                  const cx = CROP_VP / 2; const cy = CROP_VP / 2;
                  const nx = cx - (cx - cropOffset.x) * (newZ / cropZoom);
                  const ny = cy - (cy - cropOffset.y) * (newZ / cropZoom);
                  setCropZoom(newZ);
                  setCropOffset(clampOffset(nx, ny, newZ, nw, nh));
                }}
                style={{ flex:1, accentColor:C.green, cursor:'pointer' }} />
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
              <span style={{ fontFamily:'Inter', fontSize:11, color:C.muted, minWidth:38, textAlign:'left' }}>{Math.round(cropZoom / cropMinZoom * 100)}%</span>
            </div>

            {/* Reset + confirm */}
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => { if(cropImgRef.current) initCrop(cropImgRef.current.naturalWidth, cropImgRef.current.naturalHeight); }}
                style={{ flex:1, padding:'10px', borderRadius:10, border:`1px solid ${C.border}`, background:'transparent', color:C.muted, fontFamily:font, fontSize:12, cursor:'pointer' }}>
                {isAdminAr ? 'إعادة ضبط' : 'Réinitialiser'}
              </button>
              <button onClick={confirmCrop}
                style={{ flex:2, padding:'10px', borderRadius:10, border:'none', background:`linear-gradient(135deg, ${C.green}, #1D4939)`, color:'#fff', fontFamily:font, fontSize:13, fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                {isAdminAr ? 'قص ورفع الصورة' : 'Recadrer et uploader'}
              </button>
            </div>

            {pendingFiles.length > 0 && (
              <p style={{ margin:0, fontFamily:font, fontSize:10, color:C.muted, textAlign:'center' }}>
                {isAdminAr ? `+ ${pendingFiles.length} صورة إضافية سترفع بعد القص` : `+ ${pendingFiles.length} photo(s) de plus`}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConf!==null && (
        <div style={{ position:'fixed', inset:0, zIndex:500, background:'#00000080', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:C.card, border:`1px solid #EF444440`, borderRadius:16, padding:28, maxWidth:320, width:'100%', textAlign:'center', boxShadow:'0 8px 32px rgba(0,0,0,.12)' }}>
            <div style={{ width:56, height:56, borderRadius:16, background:'#EF444415', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            </div>
            <h3 style={{ fontFamily:font, color:C.text, fontSize:15, fontWeight:800, marginBottom:8 }}>{isAdminAr ? 'حذف المنتج؟' : 'Supprimer le produit ?'}</h3>
            <p style={{ fontFamily:font, color:C.muted, fontSize:13, marginBottom:20 }}>{isAdminAr ? 'هذا الإجراء لا يمكن التراجع عنه' : 'Cette action est irréversible'}</p>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>setDeleteConf(null)} style={{ flex:1, padding:'10px', borderRadius:10, border:`1px solid ${C.border}`, background:'transparent', color:C.muted, fontFamily:font, fontSize:13, cursor:'pointer' }}>{isAdminAr ? 'إلغاء' : 'Annuler'}</button>
              <button onClick={()=>del(deleteConf)}  style={{ flex:1, padding:'10px', borderRadius:10, border:'none', background:'#EF4444', color:'#fff', fontFamily:font, fontSize:13, fontWeight:700, cursor:'pointer' }}>{isAdminAr ? 'تأكيد الحذف' : 'Supprimer'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', zIndex:600, display:'flex', flexDirection:'column', gap:8, alignItems:'center' }}>
        {toasts.map(t => {
          const s = TOAST_STYLE[t.type];
          return (
            <div key={t.id} style={{ background:s.bg, border:`1.5px solid ${s.border}`, borderRadius:12, padding:'10px 18px', boxShadow:'0 6px 24px rgba(0,0,0,.12)', fontFamily:font, fontSize:13, color:s.color, whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:8, direction:dir, animation:'fadeInUp .2s ease' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}><path d={s.d}/></svg>
              {t.msg}
            </div>
          );
        })}
      </div>
      <style>{`@keyframes fadeInUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
