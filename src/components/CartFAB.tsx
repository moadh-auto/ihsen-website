'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useCart } from '@/context/CartContext';

export default function CartFAB() {
  const { itemCount, openCart, isOpen } = useCart();
  const [bounce, setBounce]   = useState(false);
  const [visible, setVisible] = useState(false); // delayed mount for smooth entrance
  const prevCount = useRef(itemCount);
  const pathname  = usePathname();

  // Bounce when item added
  useEffect(() => {
    if (itemCount > prevCount.current) {
      setBounce(true);
      setTimeout(() => setBounce(false), 650);
    }
    prevCount.current = itemCount;
  }, [itemCount]);

  // Entrance animation after mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 400);
    return () => clearTimeout(t);
  }, []);

  // Hide on order page, admin pages, and when drawer is open
  if (pathname === '/order' || pathname.startsWith('/admin') || isOpen) return null;

  const hasItems = itemCount > 0;

  return (
    <>
      <style>{`
        @keyframes ihsen-fab-in {
          from { opacity:0; transform:scale(0.5) translateY(20px) }
          to   { opacity:1; transform:scale(1) translateY(0) }
        }
        @keyframes ihsen-fab-bounce {
          0%,100% { transform:scale(1) }
          30%     { transform:scale(1.28) }
          60%     { transform:scale(0.88) }
          80%     { transform:scale(1.08) }
        }
        @keyframes ihsen-fab-glow {
          0%,100% { box-shadow: 0 6px 24px rgba(36,77,59,0.45) }
          50%     { box-shadow: 0 6px 32px rgba(36,77,59,0.7), 0 0 0 10px rgba(36,77,59,0.1) }
        }
      `}</style>

      <button
        onClick={openCart}
        aria-label="سلة التسوق"
        style={{
          position:   'fixed',
          bottom:     '24px',
          right:      '20px',
          width:      hasItems ? '60px' : '52px',
          height:     hasItems ? '60px' : '52px',
          borderRadius: '50%',
          background: hasItems
            ? 'linear-gradient(135deg, #244D3B 0%, #1A3D2E 100%)'
            : 'rgba(36,77,59,0.55)',
          backdropFilter: hasItems ? 'none' : 'blur(8px)',
          color:  '#fff',
          border: hasItems ? 'none' : '1.5px solid rgba(36,77,59,0.35)',
          cursor: 'pointer',
          zIndex: 999,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          boxShadow: hasItems
            ? '0 6px 24px rgba(36,77,59,0.45)'
            : '0 2px 12px rgba(0,0,0,0.15)',
          transition:  'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
          animation: !visible
            ? 'none'
            : bounce
              ? 'ihsen-fab-bounce 0.65s cubic-bezier(0.34,1.56,0.64,1)'
              : hasItems
                ? 'ihsen-fab-glow 2.8s ease infinite'
                : 'none',
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1)' : 'scale(0.5)',
        }}
      >
        {/* Shopping bag SVG */}
        <svg
          width={hasItems ? 26 : 22}
          height={hasItems ? 26 : 22}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ transition: 'all 0.3s' }}
        >
          <path
            d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"
            stroke="white" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
          />
          <line
            x1="3" y1="6" x2="21" y2="6"
            stroke="white" strokeWidth="2" strokeLinecap="round"
          />
          <path
            d="M16 10a4 4 0 01-8 0"
            stroke="white" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
          />
        </svg>

        {/* Item count badge */}
        {hasItems && (
          <div style={{
            position:   'absolute',
            top:        '-5px',
            right:      '-5px',
            minWidth:   '22px',
            height:     '22px',
            padding:    '0 5px',
            borderRadius: '11px',
            background: '#AF8E4A',
            color:      '#fff',
            fontSize:   '11px',
            fontWeight: 900,
            display:    'flex',
            alignItems:     'center',
            justifyContent: 'center',
            fontFamily: 'Inter, sans-serif',
            border:     '2.5px solid #fff',
            boxShadow:  '0 2px 8px rgba(175,142,74,0.5)',
            lineHeight: 1,
            transition: 'all 0.25s',
          }}>
            {itemCount > 9 ? '9+' : itemCount}
          </div>
        )}
      </button>
    </>
  );
}
