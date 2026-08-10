'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { DEMO_ORDERS } from '@/lib/demo-orders';
import { FEATURED_PRODUCTS } from '@/lib/constants';
import { Order, OrderStatus, supabase } from '@/lib/supabase';
import WilayaOrdersMap from './WilayaOrdersMap';

const STATUS_META: Record<OrderStatus, { ar: string; fr: string; color: string; bg: string; icon: string }> = {
  pending:        { ar:'في الانتظار',   fr:'En attente',     color:'#6B7280', bg:'#6B728015', icon:'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  reviewing:      { ar:'قيد المراجعة', fr:'En révision',     color:'#F59E0B', bg:'#F59E0B15', icon:'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
  confirmed:      { ar:'مؤكد',          fr:'Confirmé',        color:'#10B981', bg:'#10B98115', icon:'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  modified:       { ar:'معدّل',         fr:'Modifié',         color:'#8B5CF6', bg:'#8B5CF615', icon:'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
  shipped:        { ar:'تم الشحن',      fr:'Expédié',         color:'#3B82F6', bg:'#3B82F615', icon:'M17 8l4 4m0 0l-4 4m4-4H3' },
  attempt_failed: { ar:'محاولة فاشلة', fr:'Tentative échouée',color:'#EF4444', bg:'#EF444415', icon:'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
  delivered:      { ar:'تم التسليم',   fr:'Livré',           color:'#059669', bg:'#05966915', icon:'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  returned:       { ar:'مُرجع',         fr:'Retourné',        color:'#DC2626', bg:'#DC262615', icon:'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
  cancelled:      { ar:'ملغى',          fr:'Annulé',          color:'#991B1B', bg:'#991B1B15', icon:'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636' },
};

const NAV_ITEMS = [
  { id:'dashboard', ar:'الرئيسية',     fr:'Accueil',      href:'/admin/dashboard',
    iconPath:'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id:'orders',    ar:'الطلبات',      fr:'Commandes',    href:'/admin/orders',
    iconPath:'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { id:'products',  ar:'المنتجات',     fr:'Produits',     href:'/admin/products',
    iconPath:'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { id:'delivery',  ar:'التوصيل',      fr:'Livraison',    href:'/admin/delivery',
    iconPath:'M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0' },
  { id:'promos',    ar:'أكواد الخصم', fr:'Promotions',   href:'/admin/promos',
    iconPath:'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z' },
  { id:'messages',  ar:'الرسائل',      fr:'Messages',     href:'/admin/messages',
    iconPath:'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { id:'settings',  ar:'الإعدادات',   fr:'Paramètres',   href:'/admin/settings',
    iconPath:'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z' },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [orders,    setOrders]   = useState<Order[]>(DEMO_ORDERS);
  const [loading,   setLoading]  = useState(true);
  const [windowW,   setW]        = useState(1200);
  const [mounted,   setMounted]  = useState(false);
  const [adminLang, setAdminLang] = useState<'ar'|'fr'>('ar');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!sessionStorage.getItem('ihsen_admin')) { router.replace('/admin'); return; }
      setAdminLang((localStorage.getItem('ihsen_admin_lang') as 'ar'|'fr') ?? 'ar');
      const upd = () => setW(window.innerWidth);
      upd();
      window.addEventListener('resize', upd);
      setTimeout(() => setMounted(true), 60);

      // Load real orders from Supabase (fallback to demo if table not ready)
      supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (!error && data && data.length > 0) setOrders(data as Order[]);
          setLoading(false);
        });

      return () => window.removeEventListener('resize', upd);
    }
  }, [router]);

  const isMobile  = windowW < 768;
  const isDesktop = windowW >= 1024;

  const C = {
    bg:      '#EEF5F1',   // light bg
    sidebar: '#1a3d2e',   // dark green sidebar
    card:    '#FFFFFF',   // white cards
    card2:   '#F3FAF6',   // off-white
    border:  '#D5E8DC',   // light border
    border2: '#B2CEBE',   // medium border
    text:    '#172B1E',   // dark text
    muted:   '#4E6D5C',   // muted green text
    sub:     '#84A695',   // sub text
    green:   '#244D3B',
    greenL:  '#2d5f49',
    gold:    '#AF8E4A',
    goldL:   '#c4a35a',
  };
  const isAdminAr = adminLang === 'ar';
  const font = isAdminAr ? 'Cairo, sans-serif' : 'Inter, sans-serif';
  const dir  = isAdminAr ? 'rtl' : 'ltr';

  // KPIs
  const totalRevenue   = orders.filter(o => o.status === 'delivered').reduce((s,o) => s + o.total, 0);
  const pendingCount   = orders.filter(o => o.status === 'pending' || o.status === 'reviewing').length;
  const deliveredCount = orders.filter(o => o.status === 'delivered').length;
  const shippedCount   = orders.filter(o => o.status === 'shipped').length;
  const returnRate     = orders.length ? Math.round((orders.filter(o=>o.status==='returned'||o.status==='cancelled').length / orders.length)*100) : 0;

  // Orders by wilaya
  const byWilaya = orders.reduce<Record<string,number>>((acc,o) => {
    acc[o.wilaya] = (acc[o.wilaya] ?? 0) + 1; return acc;
  }, {});
  const topWilayas = Object.entries(byWilaya).sort((a,b)=>b[1]-a[1]).slice(0,5);

  // Orders by status
  const byStatus = orders.reduce<Record<string,number>>((acc,o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1; return acc;
  }, {});

  // Recent orders
  const recent = [...orders].sort((a,b)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime()).slice(0,5);

  return (
    <div style={{ padding: isMobile?'16px':'24px 28px' }}>

          {/* KPI Cards */}
          <div style={{ display:'grid', gridTemplateColumns: isMobile?'1fr 1fr':'repeat(4,1fr)', gap: isMobile?12:16, marginBottom:24 }}>
            {loading ? (
              Array.from({length:4}).map((_,i) => (
                <div key={i} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding: isMobile?'16px':'20px 22px', borderTop:`3px solid ${C.border}`, boxShadow:'0 2px 12px rgba(36,77,59,.07)' }}>
                  <div className="ihsen-skel" style={{ height:11, width:'60%', marginBottom:16 }} />
                  <div className="ihsen-skel" style={{ height:32, width:'50%', marginBottom:10 }} />
                  <div className="ihsen-skel" style={{ height:10, width:'40%' }} />
                </div>
              ))
            ) : (
              [
                { label: isAdminAr?'إجمالي الإيرادات':'Revenus totaux',   value:totalRevenue.toLocaleString(), unit:'دج', color:'#AF8E4A', sub: isAdminAr?`${deliveredCount} طلب مُسلَّم`:`${deliveredCount} livrées` },
                { label: isAdminAr?'طلبات معلقة':'Commandes en attente', value:String(pendingCount),          unit:'',   color:'#F59E0B', sub: isAdminAr?'تحتاج مراجعة':'À traiter' },
                { label: isAdminAr?'قيد التوصيل':'En livraison',          value:String(shippedCount),          unit:'',   color:'#3B82F6', sub: isAdminAr?'في الطريق':'En route' },
                { label: isAdminAr?'معدل الإرجاع':'Taux de retour',       value:String(returnRate),            unit:'%',  color:'#EF4444', sub: isAdminAr?'مرجوع + ملغى':'Retournées + annulées' },
              ].map((k,i) => (
                <div key={i} className="ihsen-card-enter" style={{
                  background:C.card, border:`1px solid ${C.border}`, borderRadius:16,
                  padding: isMobile?'16px':'20px 22px',
                  borderTop:`3px solid ${k.color}`,
                  boxShadow:'0 2px 12px rgba(36,77,59,.07)',
                  animationDelay: mounted ? `${i * 70}ms` : '999s',
                }}>
                  <div style={{ fontSize:11, fontWeight:600, color:C.muted, marginBottom:12, letterSpacing:.3 }}>{k.label}</div>
                  <div style={{ display:'flex', alignItems:'baseline', gap:5, marginBottom:5 }}>
                    <span className="ihsen-kpi-val" style={{ fontSize: isMobile?26:32, fontWeight:900, color:C.text, fontFamily:'Inter, sans-serif', lineHeight:1, animationDelay: mounted ? `${i * 70 + 120}ms` : '999s' }}>{k.value}</span>
                    {k.unit && <span style={{ fontSize:14, color:k.color, fontFamily:'Inter, sans-serif', fontWeight:700 }}>{k.unit}</span>}
                  </div>
                  <div style={{ fontSize:11, color:C.sub }}>{k.sub}</div>
                </div>
              ))
            )}
          </div>

          <div style={{ display:'grid', gridTemplateColumns: isDesktop?'1fr 1fr':'1fr', gap: isMobile?16:20, marginBottom:24 }}>

            {/* Orders by status */}
            <div className="ihsen-card-enter" style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:isMobile?'16px':'20px', boxShadow:'0 2px 12px rgba(36,77,59,.07)', animationDelay: mounted ? '300ms' : '999s' }}>
              <div style={{ fontSize:14, fontWeight:800, color:C.text, marginBottom:16, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:3, height:14, background:C.gold, borderRadius:2, flexShrink:0 }} />
                  {isAdminAr ? 'الطلبات حسب الحالة' : 'Commandes par statut'}
                </div>
                {!loading && <span style={{ fontSize:11, color:C.muted, fontWeight:400 }}>{orders.length} {isAdminAr ? 'طلب' : 'commandes'}</span>}
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {loading ? (
                  Array.from({length:5}).map((_,i) => (
                    <div key={i}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                        <div className="ihsen-skel" style={{ height:11, width:'40%' }} />
                        <div className="ihsen-skel" style={{ height:11, width:'20%' }} />
                      </div>
                      <div className="ihsen-skel" style={{ height:6, width:'100%', borderRadius:3 }} />
                    </div>
                  ))
                ) : (
                  Object.entries(byStatus).sort((a,b)=>b[1]-a[1]).map(([status, count]) => {
                    const meta = STATUS_META[status as OrderStatus];
                    const pct  = Math.round((count / orders.length) * 100);
                    return (
                      <div key={status}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4, fontSize:12 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <div style={{ width:8, height:8, borderRadius:2, background:meta.color, flexShrink:0 }} />
                            <span style={{ color:C.text }}>{isAdminAr ? meta.ar : meta.fr}</span>
                          </div>
                          <span style={{ color:C.muted, fontFamily:'Inter' }}>{count} ({pct}%)</span>
                        </div>
                        <div style={{ height:6, background:C.border, borderRadius:3, overflow:'hidden' }}>
                          <div className="ihsen-bar" style={{ height:'100%', width: mounted ? `${pct}%` : '0%', background:meta.color, borderRadius:3 }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Top wilayas — choropleth map */}
            <div className="ihsen-card-enter" style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:isMobile?'16px':'20px', boxShadow:'0 2px 12px rgba(36,77,59,.07)', animationDelay: mounted ? '370ms' : '999s' }}>
              <div style={{ fontSize:14, fontWeight:800, color:C.text, marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:3, height:14, background:C.greenL, borderRadius:2, flexShrink:0 }} />
                {isAdminAr ? 'إحصائيات الولايات' : 'Statistiques par wilaya'}
              </div>
              {loading ? (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  <div className="ihsen-skel" style={{ height:220, width:'100%', borderRadius:10 }} />
                  {Array.from({length:3}).map((_,i) => (
                    <div key={i} style={{ display:'flex', gap:8, alignItems:'center' }}>
                      <div className="ihsen-skel" style={{ width:20, height:20, borderRadius:'50%', flexShrink:0 }} />
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                          <div className="ihsen-skel" style={{ height:10, width:'45%' }} />
                          <div className="ihsen-skel" style={{ height:10, width:'20%' }} />
                        </div>
                        <div className="ihsen-skel" style={{ height:4, width:'100%', borderRadius:2 }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <WilayaOrdersMap
                  orders={orders}
                  font={font}
                  isMobile={isMobile}
                  isAdminAr={isAdminAr}
                  colors={{ card:C.card, border:C.border, text:C.text, muted:C.muted, green:C.green, gold:C.gold, sub:C.sub }}
                />
              )}
            </div>
          </div>

          {/* Recent orders */}
          <div className="ihsen-card-enter" style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:isMobile?'16px':'20px', boxShadow:'0 2px 12px rgba(36,77,59,.07)', animationDelay: mounted ? '440ms' : '999s' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div style={{ fontSize:14, fontWeight:800, color:C.text, display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:3, height:14, background:C.gold, borderRadius:2, flexShrink:0 }} />
                {isAdminAr ? 'آخر الطلبات' : 'Dernières commandes'}
              </div>
              <button onClick={() => router.push('/admin/orders')} style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:8, padding:'5px 12px', cursor:'pointer', color:C.gold, fontSize:12, fontFamily:font }}>
                {isAdminAr ? 'عرض الكل' : 'Voir tout'}
              </button>
            </div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead>
                  <tr style={{ borderBottom:`1px solid ${C.border}` }}>
                    {(isAdminAr
                      ? ['رقم الطلب','الزبونة','المنتج','الولاية','الإجمالي','الحالة','التاريخ']
                      : ['N° Commande','Cliente','Produit','Wilaya','Total','Statut','Date']
                    ).map(h => (
                      <th key={h} style={{ padding:'8px 10px', textAlign: isAdminAr?'right':'left', color:C.muted, fontWeight:600, whiteSpace:'nowrap', fontSize:11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({length:5}).map((_,i) => (
                      <tr key={i} style={{ borderBottom:`1px solid ${C.border}20` }}>
                        {[80,100,120,70,80,70,70].map((w,j) => (
                          <td key={j} style={{ padding:'12px 10px' }}>
                            <div className="ihsen-skel" style={{ height:11, width:w }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    recent.map(o => {
                      const meta = STATUS_META[o.status];
                      return (
                        <tr key={o.id} onClick={() => router.push(`/admin/orders?id=${o.id}`)} className="ihsen-row-hover" style={{ borderBottom:`1px solid ${C.border}20`, cursor:'pointer' }}>
                          <td style={{ padding:'10px 10px', color:C.gold, fontFamily:'Inter', fontWeight:700, whiteSpace:'nowrap' }}>{o.order_num}</td>
                          <td style={{ padding:'10px 10px', color:C.text, whiteSpace:'nowrap' }}>{o.customer_name}</td>
                          <td style={{ padding:'10px 10px', color:C.muted, whiteSpace:'nowrap' }}>{o.product_name.split('—')[0].trim()}</td>
                          <td style={{ padding:'10px 10px', color:C.muted, whiteSpace:'nowrap' }}>{o.wilaya}</td>
                          <td style={{ padding:'10px 10px', color:'#10B981', fontFamily:'Inter', fontWeight:700, whiteSpace:'nowrap' }}>{o.total.toLocaleString()} {isAdminAr?'دج':'DA'}</td>
                          <td style={{ padding:'10px 10px' }}>
                            <span style={{ background:meta.bg, color:meta.color, borderRadius:100, padding:'3px 10px', fontSize:11, fontWeight:700, whiteSpace:'nowrap' }}>
                              {isAdminAr ? meta.ar : meta.fr}
                            </span>
                          </td>
                          <td style={{ padding:'10px 10px', color:C.muted, whiteSpace:'nowrap', fontFamily:'Inter', fontSize:11 }}>
                            {new Date(o.created_at).toLocaleDateString(isAdminAr?'ar-DZ':'fr-DZ')}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Products quick view */}
          <div className="ihsen-card-enter" style={{ marginTop:20, background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:isMobile?'16px':'20px', boxShadow:'0 2px 12px rgba(36,77,59,.07)', animationDelay: mounted ? '510ms' : '999s' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div style={{ fontSize:14, fontWeight:800, color:C.text, display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:3, height:14, background:C.gold, borderRadius:2, flexShrink:0 }} />
                {isAdminAr ? 'المنتجات' : 'Produits'}
              </div>
              <button onClick={() => router.push('/admin/products')} style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:8, padding:'5px 12px', cursor:'pointer', color:C.gold, fontSize:12, fontFamily:font }}>{isAdminAr ? 'إدارة' : 'Gérer'}</button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:`repeat(${isMobile?2:4},1fr)`, gap:10 }}>
              {FEATURED_PRODUCTS.map(p => (
                <div key={p.id} style={{ background:C.card2, border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 12px', display:'flex', gap:8, alignItems:'center' }}>
                  <span style={{ fontSize:20 }}>{(p as Record<string,unknown>).emoji as string ?? '🛍️'}</span>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:C.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.nameAr.split('—')[0].trim()}</div>
                    <div style={{ fontSize:10, color:C.gold, fontFamily:'Inter' }}>{p.price.toLocaleString()} {isAdminAr ? 'دج' : 'DA'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
    </div>
  );
}
