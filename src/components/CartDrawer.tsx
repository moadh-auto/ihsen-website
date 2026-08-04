'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart, type CartItem } from '@/context/CartContext';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

export default function CartDrawer() {
  const router = useRouter();
  const { items, isOpen, closeCart, removeItem, updateItem, clearCart, subtotal, itemCount } = useCart();

  const [lang,  setLang]  = useState('ar');
  const [theme, setTheme] = useState('light');
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    const html = document.documentElement;
    setLang(html.getAttribute('data-lang') ?? 'ar');
    setTheme(html.getAttribute('data-theme') ?? 'light');
    // Observe theme/lang changes
    const obs = new MutationObserver(() => {
      setLang(html.getAttribute('data-lang') ?? 'ar');
      setTheme(html.getAttribute('data-theme') ?? 'light');
    });
    obs.observe(html, { attributes: true });
    return () => obs.disconnect();
  }, []);

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const isAr  = lang === 'ar';
  const isDark = theme === 'dark';

  const C = {
    bg:     isDark ? '#0a1810' : '#F9F6F1',
    panel:  isDark ? '#0f2419' : '#FFFFFF',
    border: isDark ? '#244D3B' : '#E8DFD2',
    text:   isDark ? '#F0EBE3' : '#1a1a1a',
    muted:  isDark ? '#7A9C8A' : '#6B7280',
    green:  '#244D3B',
    gold:   '#AF8E4A',
    red:    '#EF4444',
    input:  isDark ? '#1D4939' : '#F5F0EA',
  };
  const font = isAr ? 'Cairo, sans-serif' : 'Inter, sans-serif';

  const goToOrder = () => {
    closeCart();
    router.push('/order?from=cart');
  };

  return (
    <>
      <style>{`
        @keyframes ihsen-drawer-in  { from { transform: translateX(100%) } to { transform: translateX(0) } }
        @keyframes ihsen-drawer-out { from { transform: translateX(0) }    to { transform: translateX(100%) } }
        @keyframes ihsen-fade-in    { from { opacity:0 } to { opacity:1 } }
      `}</style>

      {/* Backdrop — starts below navbar */}
      {isOpen && (
        <div
          onClick={closeCart}
          style={{
            position: 'fixed', top: 68, left: 0, right: 0, bottom: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)',
            animation: 'ihsen-fade-in .25s ease forwards',
          }}
        />
      )}

      {/* Drawer panel — slides in/out, starts below navbar (~68px) */}
      <div style={{
        position: 'fixed', top: 68, right: 0, bottom: 0, zIndex: 1001,
        width: 'min(420px, 100vw)',
        background: C.panel,
        boxShadow: '-8px 0 40px rgba(0,0,0,0.18)',
        display: 'flex', flexDirection: 'column',
        borderRadius: '16px 0 0 0',
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.35s cubic-bezier(0.32,0.72,0,1)',
        direction: isAr ? 'rtl' : 'ltr',
        fontFamily: font,
      }}>

        {/* ── Header ── */}
        <div style={{
          padding: '18px 20px', borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: C.panel, flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text, display: 'flex', alignItems: 'center', gap: 7 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#244D3B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
              {isAr ? 'سلة التسوق' : 'Mon panier'}
            </div>
            {itemCount > 0 && (
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                {itemCount} {isAr ? 'منتج' : 'produit(s)'}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {items.length > 0 && (
              <button
                onClick={() => { if (confirm(isAr ? 'تفريغ السلة؟' : 'Vider le panier?')) clearCart(); }}
                style={{ fontSize: 11, color: C.red, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontFamily: font }}
              >
                {isAr ? 'تفريغ' : 'Vider'}
              </button>
            )}
            <button
              onClick={closeCart}
              style={{ width: 32, height: 32, borderRadius: '50%', background: `${C.border}60`, border: 'none', cursor: 'pointer', color: C.muted, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >×</button>
          </div>
        </div>

        {/* ── Items list ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {items.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, color: C.muted, textAlign: 'center', padding: '40px 20px' }}>
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#AF8E4A" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>
                {isAr ? 'السلة فارغة' : 'Panier vide'}
              </div>
              <div style={{ fontSize: 13 }}>
                {isAr ? 'أضيفي منتجاتك المفضلة وارجعي للتأكيد' : 'Ajoutez vos produits préférés'}
              </div>
              <button
                onClick={closeCart}
                style={{ background: C.green, color: '#fff', border: 'none', borderRadius: 100, padding: '10px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: font, marginTop: 8 }}
              >
                {isAr ? 'تصفحي المنتجات' : 'Explorer les produits'}
              </button>
            </div>
          ) : (
            items.map(item => (
              <CartItemCard
                key={item.cartId}
                item={item}
                isAr={isAr}
                isDark={isDark}
                C={C}
                font={font}
                isEditing={editId === item.cartId}
                onToggleEdit={() => setEditId(editId === item.cartId ? null : item.cartId)}
                onUpdate={(updates) => updateItem(item.cartId, updates)}
                onRemove={() => removeItem(item.cartId)}
              />
            ))
          )}
        </div>

        {/* ── Footer ── */}
        {items.length > 0 && (
          <div style={{
            padding: '16px 20px', borderTop: `1px solid ${C.border}`,
            background: C.panel, flexShrink: 0,
          }}>
            {/* Subtotal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: C.muted }}>{isAr ? 'إجمالي المنتجات' : 'Sous-total'}</span>
              <span style={{ fontSize: 18, fontWeight: 900, color: C.green, fontFamily: 'Inter' }}>
                {subtotal.toLocaleString()} <span style={{ fontSize: 12 }}>{isAr ? 'دج' : 'DA'}</span>
              </span>
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 14 }}>
              {isAr ? '+ رسوم التوصيل تُحسب عند الطلب' : '+ Livraison calculée à la commande'}
            </div>

            {/* CTA */}
            <button
              onClick={goToOrder}
              style={{
                width: '100%', height: 52, borderRadius: 14,
                background: 'linear-gradient(135deg, #244D3B, #1D4939)',
                color: '#fff', border: 'none', cursor: 'pointer',
                fontSize: 15, fontWeight: 800, fontFamily: font,
                boxShadow: '0 6px 20px rgba(36,77,59,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              🚀 {isAr ? `تأكيد الطلب (${itemCount} منتج)` : `Commander (${itemCount} article${itemCount > 1 ? 's' : ''})`}
            </button>

            <button
              onClick={closeCart}
              style={{ width: '100%', marginTop: 8, height: 40, borderRadius: 12, background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, cursor: 'pointer', fontSize: 13, fontFamily: font }}
            >
              {isAr ? 'متابعة التسوق' : 'Continuer mes achats'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ── CartItemCard ───────────────────────────────────────────────────────────
function CartItemCard({
  item, isAr, isDark, C, font, isEditing, onToggleEdit, onUpdate, onRemove,
}: {
  item: CartItem;
  isAr: boolean;
  isDark: boolean;
  C: Record<string, string>;
  font: string;
  isEditing: boolean;
  onToggleEdit: () => void;
  onUpdate: (u: Partial<Pick<CartItem, 'qty' | 'colorIndex' | 'color' | 'size'>>) => void;
  onRemove: () => void;
}) {
  return (
    <div style={{
      background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
      border: `1px solid ${isEditing ? C.gold + '60' : C.border}`,
      borderRadius: 14, overflow: 'hidden',
      transition: 'border-color .2s',
    }}>
      {/* Main row */}
      <div style={{ display: 'flex', gap: 12, padding: '12px 14px', alignItems: 'flex-start' }}>
        {/* Image / emoji */}
        <div style={{
          width: 64, height: 64, borderRadius: 10, overflow: 'hidden', flexShrink: 0,
          background: item.image ? '#f0f4f1' : `${item.color}33`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
        }}>
          {item.image
            ? <img src={item.image} alt={item.nameAr} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : item.emoji
          }
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4, lineHeight: 1.3 }}>
            {isAr ? item.nameAr : item.nameFr}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: item.color, border: `2px solid ${C.border}`, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: C.muted, fontFamily: 'Inter' }}>{item.size}</span>
            <span style={{ fontSize: 11, color: C.muted }}>×</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.text, fontFamily: 'Inter' }}>{item.qty}</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 900, color: C.green, fontFamily: 'Inter', marginTop: 6 }}>
            {(item.price * item.qty).toLocaleString()} {isAr ? 'دج' : 'DA'}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
          <button
            onClick={onToggleEdit}
            title={isAr ? 'تعديل' : 'Modifier'}
            style={{
              width: 28, height: 28, borderRadius: 8,
              background: isEditing ? `${C.gold}25` : `${C.border}40`,
              border: `1px solid ${isEditing ? C.gold : C.border}`,
              color: isEditing ? C.gold : C.muted,
              cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >✎</button>
          <button
            onClick={onRemove}
            title={isAr ? 'حذف' : 'Supprimer'}
            style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)',
              color: C.red, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >✕</button>
        </div>
      </div>

      {/* Edit panel */}
      {isEditing && (
        <div style={{ padding: '12px 14px', borderTop: `1px solid ${C.border}`, background: isDark ? 'rgba(175,142,74,.05)' : 'rgba(175,142,74,.04)', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Qty */}
          <div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, fontWeight: 700 }}>{isAr ? 'الكمية' : 'Quantité'}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, border: `1.5px solid ${C.border}`, borderRadius: 10, overflow: 'hidden', width: 'fit-content' }}>
              <button
                onClick={() => { if (item.qty > 1) onUpdate({ qty: item.qty - 1 }); else onRemove(); }}
                style={{ width: 36, height: 36, border: 'none', background: 'transparent', color: C.text, fontSize: 18, cursor: 'pointer', fontWeight: 300 }}
              >−</button>
              <span style={{ minWidth: 36, textAlign: 'center', fontWeight: 800, fontSize: 14, fontFamily: 'Inter', color: C.text }}>{item.qty}</span>
              <button
                onClick={() => onUpdate({ qty: item.qty + 1 })}
                style={{ width: 36, height: 36, border: 'none', background: 'transparent', color: C.green, fontSize: 18, cursor: 'pointer', fontWeight: 700 }}
              >+</button>
            </div>
          </div>

          {/* Size */}
          <div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, fontWeight: 700 }}>{isAr ? 'المقاس' : 'Taille'}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {SIZES.map(s => (
                <button key={s} onClick={() => onUpdate({ size: s })} style={{
                  padding: '5px 12px', borderRadius: 8,
                  background: item.size === s ? C.green : 'transparent',
                  color: item.size === s ? '#fff' : C.text,
                  border: `1.5px solid ${item.size === s ? C.green : C.border}`,
                  fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter',
                  transition: 'all .15s',
                }}>{s}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
