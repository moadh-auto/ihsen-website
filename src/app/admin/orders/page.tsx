'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { DEMO_ORDERS } from '@/lib/demo-orders';
import { Order, OrderStatus, supabase } from '@/lib/supabase';

// SVG paths (Heroicons outline)
const STATUS_ICON: Record<OrderStatus, string> = {
  pending:        'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  reviewing:      'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  confirmed:      'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  modified:       'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  shipped:        'M17 8l4 4m0 0l-4 4m4-4H3',
  attempt_failed: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  delivered:      'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  returned:       'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  cancelled:      'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636',
};
const STATUS_META: Record<OrderStatus, { ar: string; fr: string; color: string; bg: string }> = {
  pending:        { ar:'في الانتظار',   fr:'En attente',        color:'#6B7280', bg:'#6B728018' },
  reviewing:      { ar:'مراجعة',        fr:'En révision',       color:'#F59E0B', bg:'#F59E0B18' },
  confirmed:      { ar:'مؤكد',          fr:'Confirmé',          color:'#10B981', bg:'#10B98118' },
  modified:       { ar:'معدّل',         fr:'Modifié',           color:'#8B5CF6', bg:'#8B5CF618' },
  shipped:        { ar:'تم الشحن',      fr:'Expédié',           color:'#3B82F6', bg:'#3B82F618' },
  attempt_failed: { ar:'محاولة فاشلة', fr:'Tentative échouée', color:'#EF4444', bg:'#EF444418' },
  delivered:      { ar:'تم التسليم',   fr:'Livré',             color:'#059669', bg:'#05966918' },
  returned:       { ar:'مُرجع',         fr:'Retourné',          color:'#DC2626', bg:'#DC262618' },
  cancelled:      { ar:'ملغى',          fr:'Annulé',            color:'#991B1B', bg:'#991B1B18' },
};

const STATUS_FLOW: OrderStatus[] = ['pending','reviewing','confirmed','modified','shipped','attempt_failed','delivered','returned','cancelled'];

interface ParsedNotes {
  text?: string | null;
  company?: string | null;
  items?: { name: string; emoji: string; size: string; qty: number; price: number; }[] | null;
}
const parseNotes = (notes: string | null): ParsedNotes | null => {
  if (!notes) return null;
  if (notes.startsWith('{')) {
    try {
      return JSON.parse(notes);
    } catch {
      return { text: notes };
    }
  }
  return { text: notes };
};

function OrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [orders,    setOrders]   = useState<Order[]>(DEMO_ORDERS);
  const [selected,  setSelected] = useState<Order|null>(null);
  const [search,    setSearch]   = useState('');
  const [mounted,   setMounted]  = useState(false);
  const [loading,   setLoading]  = useState(true);
  const [statusF,   setStatusF]  = useState<OrderStatus|'all'>('all');
  const [windowW,   setW]        = useState(1200);
  const [updating,  setUpdating] = useState(false);
  const [toast,     setToast]    = useState('');
  const [notifOpen, setNotif]    = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [statsOpen,  setStatsOpen]  = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [dateFrom,   setDateFrom]   = useState('');
  const [dateTo,     setDateTo]     = useState('');
  const [exporting,  setExporting]  = useState(false);
  const [adminLang,  setAdminLang]  = useState<'ar'|'fr'>('ar');

  useEffect(() => {
    if (!sessionStorage.getItem('ihsen_admin')) { router.replace('/admin'); return; }
    setAdminLang((localStorage.getItem('ihsen_admin_lang') as 'ar'|'fr') ?? 'ar');
    const upd = () => setW(window.innerWidth);
    upd();
    window.addEventListener('resize', upd);
    setTimeout(() => setMounted(true), 60);
    const id = searchParams.get('id');
    if (id) setSelected(DEMO_ORDERS.find(o=>o.id===id) ?? null);

    // Load real orders from Supabase
    loadOrders();

    // Real-time updates via Supabase channel
    const channel = supabase
      .channel('orders-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadOrders())
      .subscribe();

    return () => {
      window.removeEventListener('resize', upd);
      supabase.removeChannel(channel);
    };
  }, [router, searchParams]);

  const isMobile  = windowW < 768;
  const isDesktop = windowW >= 1024;
  const isAdminAr = adminLang === 'ar';
  const font = isAdminAr ? 'Cairo, sans-serif' : 'Inter, sans-serif';
  const dir  = isAdminAr ? 'rtl' : 'ltr';
  const C = {
    bg:'#EEF5F1', sidebar:'#1a3d2e', card:'#FFFFFF', card2:'#F3FAF6',
    border:'#D5E8DC', border2:'#B2CEBE', text:'#172B1E', muted:'#4E6D5C', sub:'#84A695',
    green:'#244D3B', greenL:'#2d5f49', gold:'#AF8E4A', goldL:'#c4a35a',
  };

  const filtered = orders.filter(o => {
    if (statusF !== 'all' && o.status !== statusF) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return o.order_num.toLowerCase().includes(q)
      || o.customer_name.includes(q)
      || o.phone.includes(q)
      || o.wilaya.includes(q);
  });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data && data.length > 0) {
      setOrders(data as Order[]);
    }
    setLoading(false);
  };

  // ── Stock deduction / restoration on status change ──────────────────────
  const adjustStock = async (order: Order, deduct: boolean) => {
    // Fetch current product stock
    const { data: prod } = await supabase
      .from('products')
      .select('id, colors, stock')
      .eq('id', order.product_id)
      .single();
    if (!prod) return;

    const colorHex = (prod.colors as string[])?.[order.color_index];
    if (!colorHex) return;

    const stockKey = `${colorHex}:${order.size}`;
    const currentStock = (prod.stock as Record<string, number>) ?? {};
    const currentQty = currentStock[stockKey] ?? 0;

    const newQty = deduct
      ? Math.max(0, currentQty - order.qty)
      : currentQty + order.qty;

    const newStock = { ...currentStock, [stockKey]: newQty };

    await supabase
      .from('products')
      .update({ stock: newStock })
      .eq('id', prod.id);
  };

  const updateStatus = async (orderId: string, newStatus: OrderStatus) => {
    setUpdating(true);
    const order = orders.find(o => o.id === orderId);
    if (!order) { setUpdating(false); return; }

    const wasDeducted = order.stock_deducted ?? false;
    const orderUpdates: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    // ── Stock logic ────────────────────────────────────────────────────────
    // shipped → deduct stock (if not already deducted)
    if (newStatus === 'shipped' && !wasDeducted) {
      await adjustStock(order, true);
      orderUpdates.stock_deducted = true;
    }
    // returned / cancelled → restore stock (only if was deducted)
    if ((newStatus === 'returned' || newStatus === 'cancelled') && wasDeducted) {
      await adjustStock(order, false);
      orderUpdates.stock_deducted = false;
    }

    try {
      await supabase
        .from('orders')
        .update(orderUpdates)
        .eq('id', orderId);
    } catch (e) {
      console.warn('Supabase update failed:', e);
    }

    const newDeducted = orderUpdates.stock_deducted !== undefined
      ? (orderUpdates.stock_deducted as boolean)
      : wasDeducted;

    setOrders(prev => prev.map(o =>
      o.id === orderId
        ? { ...o, status: newStatus, stock_deducted: newDeducted, updated_at: new Date().toISOString() }
        : o
    ));
    setSelected(prev => prev?.id === orderId
      ? { ...prev, status: newStatus, stock_deducted: newDeducted }
      : prev
    );
    setUpdating(false);

    // Toast with stock info
    let toastMsg = `${isAdminAr ? 'تم تحديث الحالة إلى:' : 'Statut mis à jour :'} ${isAdminAr ? STATUS_META[newStatus].ar : STATUS_META[newStatus].fr}`;
    if (newStatus === 'shipped' && !wasDeducted) toastMsg += isAdminAr ? ' — تم حجز المخزون' : ' — Stock réservé';
    if ((newStatus === 'returned' || newStatus === 'cancelled') && wasDeducted) toastMsg += isAdminAr ? ' — تم استرجاع المخزون' : ' — Stock restauré';
    showToast(toastMsg);
  };

  // ── Export Excel (Professional) ─────────────────────────────────────────
  const exportExcel = async () => {
    setExporting(true);
    try {
      const xlsx = await import('xlsx-js-style');

      // ── Filter rows ──────────────────────────────────────────────────────
      const from = dateFrom ? new Date(dateFrom) : null;
      const to   = dateTo   ? new Date(dateTo + 'T23:59:59') : null;
      const rows = orders.filter(o => {
        const d = new Date(o.created_at);
        if (from && d < from) return false;
        if (to   && d > to)   return false;
        return true;
      });

      const wb = xlsx.utils.book_new();

      // ── Helpers ──────────────────────────────────────────────────────────
      const setCell = (ws: ReturnType<typeof xlsx.utils.aoa_to_sheet>, r: number, c: number, v: unknown, s?: Record<string, unknown>) => {
        const ref = xlsx.utils.encode_cell({ r, c });
        if (!ws[ref]) ws[ref] = { v, t: typeof v === 'number' ? 'n' : 's' };
        else (ws[ref] as Record<string, unknown>).v = v;
        if (s) (ws[ref] as Record<string, unknown>).s = s;
      };

      const HDR_BG  = '244D3B';  // إحسان green
      const GOLD    = 'AF8E4A';
      const ROW_ALT = 'F3FAF6';  // light green tint
      const BORDER_C= 'C5DDD1';

      const border = (color = BORDER_C) => ({
        top:    { style: 'thin', color: { rgb: color } },
        bottom: { style: 'thin', color: { rgb: color } },
        left:   { style: 'thin', color: { rgb: color } },
        right:  { style: 'thin', color: { rgb: color } },
      });

      const hdrStyle = (extra: Record<string, unknown> = {}) => ({
        font:      { bold: true, color: { rgb: 'FFFFFF' }, sz: 11, name: 'Arial' },
        fill:      { patternType: 'solid', fgColor: { rgb: HDR_BG } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true, readingOrder: 2 },
        border:    border('1D3D2A'),
        ...extra,
      });

      const cellStyle = (bg: string, align = 'right', bold = false) => ({
        font:      { sz: 10, name: 'Arial', bold, color: { rgb: '172B1E' } },
        fill:      { patternType: 'solid', fgColor: { rgb: bg } },
        alignment: { horizontal: align, vertical: 'center', readingOrder: 2 },
        border:    border(),
      });

      const numStyle = (bg: string, bold = false) => ({
        ...cellStyle(bg, 'center', bold),
        numFmt: '#,##0',
      });

      // Status background colours (light pastels)
      const STATUS_BG: Record<string, string> = {
        pending:        'F3F4F6',
        reviewing:      'FEF3C7',
        confirmed:      'D1FAE5',
        modified:       'EDE9FE',
        shipped:        'DBEAFE',
        attempt_failed: 'FEE2E2',
        delivered:      'D1FAE5',
        returned:       'FEE2E2',
        cancelled:      'FECACA',
      };

      // ════════════════════════════════════════════════════════════════════
      // SHEET 1 — ملخص التقرير
      // ════════════════════════════════════════════════════════════════════
      const summaryData: unknown[][] = Array.from({ length: 30 }, () => Array(6).fill(''));
      const ws1 = xlsx.utils.aoa_to_sheet(summaryData);
      ws1['!views'] = [{ rightToLeft: true }];

      // Title block (merge A1:F2)
      setCell(ws1, 0, 0, 'إحسان — تقرير الطلبات', {
        font:      { bold: true, sz: 18, color: { rgb: 'FFFFFF' }, name: 'Arial' },
        fill:      { patternType: 'solid', fgColor: { rgb: HDR_BG } },
        alignment: { horizontal: 'center', vertical: 'center', readingOrder: 2 },
      });
      ws1['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 1, c: 5 } },  // title
        { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } },  // subtitle
        { s: { r: 4, c: 0 }, e: { r: 4, c: 5 } },  // section header "KPIs"
        { s: { r: 10, c: 0 }, e: { r: 10, c: 5 } }, // section header "status"
        { s: { r: 17, c: 0 }, e: { r: 17, c: 5 } }, // section header "wilayas"
      ];

      // Subtitle row
      const exportDate = new Date().toLocaleDateString('ar-DZ', { year: 'numeric', month: 'long', day: 'numeric' });
      const rangeLabel = (from || to)
        ? `الفترة: ${from ? from.toLocaleDateString('ar-DZ') : '…'} — ${to ? to.toLocaleDateString('ar-DZ') : '…'}`
        : 'جميع الطلبات';
      setCell(ws1, 2, 0, `تاريخ التصدير: ${exportDate}   |   ${rangeLabel}`, {
        font:      { sz: 10, color: { rgb: '4E6D5C' }, italic: true, name: 'Arial' },
        fill:      { patternType: 'solid', fgColor: { rgb: 'EEF5F1' } },
        alignment: { horizontal: 'center', vertical: 'center', readingOrder: 2 },
      });

      // KPI section header
      setCell(ws1, 4, 0, '● إحصائيات عامة', {
        font:      { bold: true, sz: 12, color: { rgb: 'FFFFFF' }, name: 'Arial' },
        fill:      { patternType: 'solid', fgColor: { rgb: GOLD } },
        alignment: { horizontal: 'right', vertical: 'center', readingOrder: 2 },
      });

      const totalRev  = rows.filter(o => !['cancelled','returned'].includes(o.status)).reduce((s,o) => s + o.total, 0);
      const delivered = rows.filter(o => o.status === 'delivered').length;
      const kpis = [
        { label: 'إجمالي الطلبات',   value: rows.length,           unit: 'طلب' },
        { label: 'الإيرادات الكلية', value: totalRev,               unit: 'دج', isNum: true },
        { label: 'مُسلَّم بنجاح',    value: delivered,             unit: 'طلب' },
        { label: 'متوسط قيمة الطلب', value: rows.length ? Math.round(totalRev / rows.length) : 0, unit: 'دج', isNum: true },
      ];
      kpis.forEach((k, i) => {
        const col = i * 1; // each KPI spans 1 col for label + 1 for value — we'll lay them in pairs
        const labelSty = { font: { sz: 10, color: { rgb: '4E6D5C' }, name: 'Arial' }, fill: { patternType: 'solid', fgColor: { rgb: 'EEF5F1' } }, alignment: { horizontal: 'right', vertical: 'center', readingOrder: 2 }, border: border() };
        const valSty   = { font: { bold: true, sz: 13, color: { rgb: HDR_BG }, name: 'Arial' }, fill: { patternType: 'solid', fgColor: { rgb: 'FFFFFF' } }, alignment: { horizontal: 'center', vertical: 'center', readingOrder: 2 }, border: border(), numFmt: k.isNum ? '#,##0' : undefined };
        const unitSty  = { font: { sz: 9, color: { rgb: '84A695' }, name: 'Arial' }, fill: { patternType: 'solid', fgColor: { rgb: 'FFFFFF' } }, alignment: { horizontal: 'right', vertical: 'center', readingOrder: 2 }, border: border() };
        // layout: two rows per KPI pair, 3 cols each (label | value | unit)
        const r = 5 + Math.floor(i / 2) * 2;
        const c = (i % 2) * 3;
        setCell(ws1, r,   c,     k.label,   labelSty);
        setCell(ws1, r+1, c,     k.value,   valSty);
        setCell(ws1, r+1, c + 1, k.unit,    unitSty);
      });

      // Status breakdown section
      setCell(ws1, 10, 0, '● توزيع الطلبات حسب الحالة', {
        font:      { bold: true, sz: 12, color: { rgb: 'FFFFFF' }, name: 'Arial' },
        fill:      { patternType: 'solid', fgColor: { rgb: HDR_BG } },
        alignment: { horizontal: 'right', vertical: 'center', readingOrder: 2 },
      });
      ['الحالة', 'العدد', 'النسبة'].forEach((h, ci) => {
        setCell(ws1, 11, ci, h, hdrStyle());
      });
      const statusBreakdown = STATUS_FLOW.map(s => ({
        status: s, ar: STATUS_META[s].ar, count: rows.filter(o => o.status === s).length,
      })).filter(x => x.count > 0);
      statusBreakdown.forEach((x, ri) => {
        const bg = ri % 2 === 0 ? 'FFFFFF' : ROW_ALT;
        const pct = rows.length ? `${Math.round(x.count / rows.length * 100)}%` : '0%';
        setCell(ws1, 12 + ri, 0, x.ar,   cellStyle(bg));
        setCell(ws1, 12 + ri, 1, x.count, numStyle(bg));
        setCell(ws1, 12 + ri, 2, pct,     cellStyle(bg, 'center'));
      });

      // Top wilayas section
      const wilayaMap: Record<string, number> = {};
      rows.forEach(o => { wilayaMap[o.wilaya] = (wilayaMap[o.wilaya] ?? 0) + 1; });
      const topWilayas = Object.entries(wilayaMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
      setCell(ws1, 17, 0, '● أعلى الولايات طلبًا', {
        font:      { bold: true, sz: 12, color: { rgb: 'FFFFFF' }, name: 'Arial' },
        fill:      { patternType: 'solid', fgColor: { rgb: GOLD } },
        alignment: { horizontal: 'right', vertical: 'center', readingOrder: 2 },
      });
      ['الولاية', 'عدد الطلبات'].forEach((h, ci) => {
        setCell(ws1, 18, ci, h, hdrStyle());
      });
      topWilayas.forEach(([w, cnt], ri) => {
        const bg = ri % 2 === 0 ? 'FFFFFF' : ROW_ALT;
        setCell(ws1, 19 + ri, 0, w,   cellStyle(bg));
        setCell(ws1, 19 + ri, 1, cnt, numStyle(bg));
      });

      // Column widths for summary sheet
      ws1['!cols'] = [{ wch: 22 }, { wch: 14 }, { wch: 10 }, { wch: 22 }, { wch: 14 }, { wch: 10 }];
      ws1['!rows'] = [{ hpx: 36 }, { hpx: 36 }, { hpx: 22 }, null, { hpx: 24 }];

      xlsx.utils.book_append_sheet(wb, ws1, 'ملخص');

      // ════════════════════════════════════════════════════════════════════
      // SHEET 2 — الطلبات (data table)
      // ════════════════════════════════════════════════════════════════════
      const COLS = [
        { h: '#',              wch: 5  },
        { h: 'رقم الطلب',     wch: 14 },
        { h: 'التاريخ',       wch: 13 },
        { h: 'الوقت',         wch: 9  },
        { h: 'العميل',        wch: 22 },
        { h: 'الهاتف',        wch: 14 },
        { h: 'الولاية',       wch: 16 },
        { h: 'البلدية',       wch: 18 },
        { h: 'العنوان',       wch: 26 },
        { h: 'المنتج',        wch: 24 },
        { h: 'المقاس',        wch: 8  },
        { h: 'الكمية',        wch: 8  },
        { h: 'السعر (دج)',    wch: 13 },
        { h: 'التوصيل (دج)', wch: 13 },
        { h: 'الخصم (دج)',   wch: 11 },
        { h: 'الإجمالي (دج)',wch: 14 },
        { h: 'الحالة',        wch: 14 },
      ];

      // AOA: header row first
      const aoa: unknown[][] = [COLS.map(c => c.h)];
      rows.forEach((o, i) => {
        const d = new Date(o.created_at);
        aoa.push([
          i + 1,
          o.order_num,
          d.toLocaleDateString('ar-DZ'),
          d.toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
          o.customer_name,
          o.phone,
          o.wilaya,
          o.commune,
          o.address || '',
          o.product_name,
          o.size || '—',
          o.qty,
          o.subtotal,
          o.delivery_price,
          o.discount ?? 0,
          o.total,
          STATUS_META[o.status]?.ar ?? o.status,
        ]);
      });

      const ws2 = xlsx.utils.aoa_to_sheet(aoa);
      ws2['!views'] = [{ rightToLeft: true, state: 'frozen', ySplit: 1 }];
      ws2['!cols']  = COLS.map(c => ({ wch: c.wch }));
      ws2['!rows']  = [{ hpx: 28 }, ...rows.map(() => ({ hpx: 20 }))];

      // Header row styles
      COLS.forEach((_, ci) => {
        const ref = xlsx.utils.encode_cell({ r: 0, c: ci });
        (ws2[ref] as Record<string, unknown>).s = hdrStyle();
      });

      // Data row styles
      rows.forEach((o, ri) => {
        const bg  = ri % 2 === 0 ? 'FFFFFF' : ROW_ALT;
        const sBg = STATUS_BG[o.status] ?? bg;
        COLS.forEach((col, ci) => {
          const ref = xlsx.utils.encode_cell({ r: ri + 1, c: ci });
          if (!ws2[ref]) return;
          const isNumCol = ci >= 12 && ci <= 15;  // price columns
          const isStatus = ci === 16;
          const isBold   = ci === 15;  // total column bold
          const sty = isNumCol
            ? numStyle(bg, isBold)
            : isStatus
              ? { ...cellStyle(sBg, 'center'), font: { sz: 10, name: 'Arial', bold: true, color: { rgb: '172B1E' } } }
              : cellStyle(bg, ci === 1 ? 'center' : 'right');
          (ws2[ref] as Record<string, unknown>).s = sty;
          // serial number column
          if (ci === 0) (ws2[ref] as Record<string, unknown>).s = cellStyle(bg, 'center');
          // order_num column: monospace-ish
          if (ci === 1) (ws2[ref] as Record<string, unknown>).s = {
            ...cellStyle(bg, 'center'),
            font: { sz: 10, name: 'Courier New', bold: true, color: { rgb: HDR_BG } },
          };
        });
      });

      // Total row (last row, gold highlight)
      const totalRow = rows.length + 1;
      const totalRevAll = rows.reduce((s, o) => s + o.total, 0);
      const totalDel    = rows.reduce((s, o) => s + o.delivery_price, 0);
      const totalDis    = rows.reduce((s, o) => s + (o.discount ?? 0), 0);
      const totalSub    = rows.reduce((s, o) => s + o.subtotal, 0);

      const totals: (string | number)[] = ['', 'الإجمالي', '', '', '', '', '', '', '', '', '', rows.reduce((s,o)=>s+o.qty,0), totalSub, totalDel, totalDis, totalRevAll, ''];
      totals.forEach((v, ci) => {
        const ref = xlsx.utils.encode_cell({ r: totalRow, c: ci });
        ws2[ref] = {
          v,
          t: typeof v === 'number' ? 'n' : 's',
          s: {
            font:      { bold: true, sz: 11, color: { rgb: 'FFFFFF' }, name: 'Arial' },
            fill:      { patternType: 'solid', fgColor: { rgb: HDR_BG } },
            alignment: { horizontal: ci >= 11 && ci <= 15 ? 'center' : ci === 1 ? 'center' : 'right', vertical: 'center', readingOrder: 2 },
            border:    border('1D3D2A'),
            numFmt:    ci >= 11 && ci <= 15 ? '#,##0' : undefined,
          },
        };
      });
      // Extend !ref to include total row
      ws2['!ref'] = xlsx.utils.encode_range({ r: 0, c: 0 }, { r: totalRow, c: COLS.length - 1 });
      (ws2['!rows'] as Array<{ hpx: number }>).push({ hpx: 24 });

      xlsx.utils.book_append_sheet(wb, ws2, 'الطلبات');

      // ── Write ────────────────────────────────────────────────────────────
      const ts = dateFrom || dateTo ? `_${dateFrom||''}${dateTo?'_'+dateTo:''}` : '';
      xlsx.writeFile(wb, `تقرير_إحسان${ts}.xlsx`, { cellStyles: true, compression: true });
      showToast(isAdminAr ? `تم تصدير ${rows.length} طلب بنجاح ✓` : `${rows.length} commande(s) exportée(s) ✓`);
    } catch(e) {
      console.error(e);
      showToast(isAdminAr ? 'خطأ أثناء التصدير' : 'Erreur lors de l\'export');
    }
    setExporting(false);
    setExportOpen(false);
  };

  // ── Stats computation ────────────────────────────────────────────────────
  const statsOrders = orders.filter(o => !['cancelled','returned'].includes(o.status));
  const monthlyStats = (() => {
    const map: Record<string, { count: number; revenue: number }> = {};
    statsOrders.forEach(o => {
      const key = new Date(o.created_at).toLocaleDateString('ar-DZ', { year:'numeric', month:'short' });
      if (!map[key]) map[key] = { count: 0, revenue: 0 };
      map[key].count++;
      map[key].revenue += o.total;
    });
    return Object.entries(map)
      .sort((a,b) => {
        const da = new Date(statsOrders.find(o=>new Date(o.created_at).toLocaleDateString('ar-DZ',{year:'numeric',month:'short'})===a[0])?.created_at||'');
        const db = new Date(statsOrders.find(o=>new Date(o.created_at).toLocaleDateString('ar-DZ',{year:'numeric',month:'short'})===b[0])?.created_at||'');
        return db.getTime()-da.getTime();
      })
      .slice(0,12);
  })();
  const wilayaStats = (() => {
    const map: Record<string, { count: number; revenue: number }> = {};
    statsOrders.forEach(o => {
      if (!map[o.wilaya]) map[o.wilaya] = { count: 0, revenue: 0 };
      map[o.wilaya].count++;
      map[o.wilaya].revenue += o.total;
    });
    return Object.entries(map).sort((a,b) => b[1].count - a[1].count).slice(0,10);
  })();
  const totalRevenue = statsOrders.reduce((s,o) => s + o.total, 0);
  const deliveredCount = orders.filter(o=>o.status==='delivered').length;
  const pendingCount   = orders.filter(o=>o.status==='pending'||o.status==='reviewing').length;

  const OrderDetail = ({ o }: { o: Order }) => {
    const meta = STATUS_META[o.status];
    
    const pn = parseNotes(o.notes);
    const cartItems = pn?.items || [];
    const hasCart = cartItems.length > 0;
    const actualNote = pn?.text || null;
    const deliveryCompany = pn?.company || null;

    const SectionLabel = ({ icon, label }: { icon: string; label: string }) => (
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
        <div style={{ width:3, height:16, borderRadius:2, background:C.gold, flexShrink:0 }} />
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}>
          <path d={icon}/>
        </svg>
        <span style={{ fontSize:11, fontWeight:800, color:C.muted, textTransform:'uppercase' as const, letterSpacing:'0.06em' }}>{label}</span>
      </div>
    );

    return (
      <div style={{ display:'flex', flexDirection:'column', gap:0, borderRadius:18, overflow:'hidden', boxShadow:'0 4px 24px rgba(36,77,59,.12)', border:`1px solid ${C.border}` }}>

        {/* ── HERO HEADER ──────────────────────────────────────────────── */}
        <div style={{ background:`linear-gradient(135deg, ${C.green} 0%, #1D4939 100%)`, padding:'20px 22px', position:'relative', overflow:'hidden' }}>
          {/* decorative rings */}
          <div style={{ position:'absolute', top:-30, left:-30, width:120, height:120, borderRadius:'50%', border:'1px solid rgba(175,142,74,.15)', pointerEvents:'none' }} />
          <div style={{ position:'absolute', top:-10, left:-10, width:70, height:70, borderRadius:'50%', border:'1px solid rgba(175,142,74,.1)', pointerEvents:'none' }} />

          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', position:'relative' }}>
            <div>
              <div style={{ fontSize:9, fontWeight:700, color:'rgba(175,142,74,.7)', letterSpacing:'0.12em', textTransform:'uppercase' as const, fontFamily:'Inter', marginBottom:4 }}>{isAdminAr ? 'رقم الطلب' : 'N° commande'}</div>
              <div style={{ fontSize:22, fontWeight:900, color:C.gold, fontFamily:'Inter', letterSpacing:1.5, lineHeight:1 }}>{o.order_num}</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.45)', marginTop:6, fontFamily:'Inter' }}>
                {new Date(o.created_at).toLocaleDateString(isAdminAr ? 'ar-DZ' : 'fr-DZ', { year:'numeric', month:'long', day:'numeric' })}
                {' · '}
                {new Date(o.created_at).toLocaleTimeString(isAdminAr ? 'ar-DZ' : 'fr-DZ', { hour:'2-digit', minute:'2-digit' })}
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:8 }}>
              <button onClick={() => setSelected(null)}
                style={{ background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:8, width:32, height:32, cursor:'pointer', color:'rgba(255,255,255,.75)', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1, flexShrink:0, alignSelf: 'flex-end', marginBottom: 4 }}>×</button>
              <span style={{ background:'rgba(0,0,0,.25)', backdropFilter:'blur(8px)', color: meta.color, border:`1px solid ${meta.color}50`, borderRadius:100, padding:'6px 14px', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:6, whiteSpace:'nowrap' as const }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={STATUS_ICON[o.status]}/>
                </svg>
                {isAdminAr ? meta.ar : meta.fr}
              </span>
              {o.stock_deducted && (
                <span style={{ background:'rgba(59,130,246,.2)', color:'#93C5FD', border:'1px solid rgba(59,130,246,.3)', borderRadius:100, padding:'3px 10px', fontSize:10, fontWeight:700 }}>
                  {isAdminAr ? 'المخزون محجوز' : 'Stock réservé'}
                </span>
              )}
            </div>
          </div>

          {/* Total amount strip */}
          <div style={{ marginTop:16, paddingTop:14, borderTop:'1px solid rgba(255,255,255,.1)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontSize:11, color:'rgba(255,255,255,.5)' }}>{isAdminAr ? 'المجموع الكلي' : 'Total général'}</span>
            <span style={{ fontSize:20, fontWeight:900, color:'#fff', fontFamily:'Inter', letterSpacing:0.5 }}>
              {o.total.toLocaleString()} <span style={{ fontSize:12, color:C.gold }}>{isAdminAr ? 'دج' : 'DA'}</span>
            </span>
          </div>
        </div>

        {/* ── BODY ─────────────────────────────────────────────────────── */}
        <div style={{ background:C.card, padding:'20px 22px', display:'flex', flexDirection:'column', gap:22 }}>

          {/* ── STATUS CHANGE ── */}
          <div>
            <SectionLabel icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" label={isAdminAr ? "تغيير الحالة" : "Changer le statut"} />
            <div style={{ display:'flex', flexWrap:'wrap' as const, gap:6 }}>
              {STATUS_FLOW.map(s => {
                const m = STATUS_META[s];
                const mLabel = isAdminAr ? m.ar : m.fr;
                const isCurrent = o.status === s;
                const willDeduct  = s === 'shipped' && !(o.stock_deducted ?? false);
                const willRestore = (s === 'returned' || s === 'cancelled') && (o.stock_deducted ?? false);
                return (
                  <button key={s}
                    onClick={() => !isCurrent && updateStatus(o.id, s)}
                    disabled={updating || isCurrent}
                    title={willDeduct ? (isAdminAr ? 'سيتم حجز المخزون' : 'Stock sera réservé') : willRestore ? (isAdminAr ? 'سيتم استرجاع المخزون' : 'Stock sera restauré') : ''}
                    style={{
                      padding: isCurrent ? '6px 14px' : '5px 12px',
                      borderRadius:100,
                      cursor: isCurrent ? 'default' : 'pointer',
                      background: isCurrent ? m.color : `${m.color}15`,
                      color: isCurrent ? '#fff' : m.color,
                      border: isCurrent
                        ? `2px solid ${m.color}`
                        : willDeduct ? '1.5px solid #3B82F6' : willRestore ? '1.5px solid #DC2626' : `1px solid ${m.color}35`,
                      fontSize:11, fontWeight: isCurrent ? 800 : 600, fontFamily:font,
                      opacity: updating ? .5 : 1, transition:'all .15s',
                      boxShadow: isCurrent ? `0 2px 8px ${m.color}40` : 'none',
                    }}>
                    {mLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── CUSTOMER INFO ── */}
          <div>
            <SectionLabel icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" label={isAdminAr ? "معلومات الزبونة" : "Informations client"} />
            <div style={{ background:C.card2, borderRadius:12, overflow:'hidden', border:`1px solid ${C.border}` }}>
              {[
                { icon:'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', label:isAdminAr?'الاسم الكامل':'Nom complet', value:o.customer_name },
                { icon:'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z', label:isAdminAr?'رقم الهاتف':'Téléphone', value:o.phone },
                { icon:'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z', label:isAdminAr?'الولاية / البلدية':'Wilaya / Commune', value:`${o.wilaya} — ${o.commune}` },
                { icon:'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z', label:isAdminAr?'العنوان':'Adresse', value:o.address },
                ...(deliveryCompany ? [{ icon:'M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1h2m-6-11h8m-8 2h8m-8 2h8m2-6h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1', label:isAdminAr?'شركة التوصيل':'Société de livraison', value:deliveryCompany }] : []),
                { icon:'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4', label:isAdminAr?'طريقة التوصيل':'Mode de livraison', value:o.delivery_type==='home'?(isAdminAr?'توصيل للمنزل':'Livraison à domicile'):(isAdminAr?'استلام من المكتب':'Retrait en agence') },
              ].map((row, i, arr) => (
                <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'11px 14px', borderBottom: i < arr.length-1 ? `1px solid ${C.border}` : 'none' }}>
                  <div style={{ width:30, height:30, borderRadius:8, background:`${C.green}12`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d={row.icon}/>
                    </svg>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:10, color:C.muted, marginBottom:2 }}>{row.label}</div>
                    <div style={{ fontSize:13, fontWeight:700, color:C.text, wordBreak:'break-word' as const }}>{row.value}</div>
                  </div>
                </div>
              ))}
              {actualNote && (
                <div style={{ padding:'10px 14px', background:'#FEF9EC', borderTop:`1px solid #F59E0B30`, display:'flex', gap:10 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0, marginTop:2 }}>
                    <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <div>
                    <div style={{ fontSize:10, color:'#B45309', fontWeight:700, marginBottom:2 }}>{isAdminAr ? 'ملاحظة' : 'Note'}</div>
                    <div style={{ fontSize:12, color:'#92400E', whiteSpace:'pre-wrap' }}>{actualNote}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── PRODUCTS ── */}
          <div>
            <SectionLabel icon="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" label={isAdminAr ? "المنتجات" : "Produits"} />
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {hasCart
                ? cartItems.map((item, i) => (
                    <div key={i} style={{ background:C.card2, border:`1px solid ${C.border}`, borderRadius:12, padding:'12px 14px', display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ width:38, height:38, borderRadius:10, background:`${C.green}18`, border:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:18 }}>
                        {item.emoji || '🛍️'}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{item.name}</div>
                        <div style={{ display:'flex', gap:6, marginTop:4 }}>
                          <span style={{ fontSize:10, fontWeight:700, color:C.green, background:`${C.green}12`, padding:'2px 8px', borderRadius:100 }}>×{item.qty}</span>
                          {item.size && <span style={{ fontSize:10, color:C.muted, background:C.card2, border:`1px solid ${C.border}`, padding:'2px 8px', borderRadius:100 }}>{item.size}</span>}
                        </div>
                      </div>
                      <div style={{ fontSize:13, fontWeight:800, color:C.gold, fontFamily:'Inter', whiteSpace:'nowrap' as const }}>
                        {(item.price * item.qty).toLocaleString()} {isAdminAr ? 'دج' : 'DA'}
                      </div>
                    </div>
                  ))
                : (
                  <div style={{ background:C.card2, border:`1px solid ${C.border}`, borderRadius:12, padding:'14px', display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:42, height:42, borderRadius:12, background:`${C.green}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
                      </svg>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{o.product_name}</div>
                      <div style={{ display:'flex', gap:6, marginTop:5, flexWrap:'wrap' as const }}>
                        <span style={{ fontSize:10, fontWeight:700, color:C.green, background:`${C.green}12`, padding:'3px 9px', borderRadius:100 }}>{isAdminAr ? 'الكمية:' : 'Qté:'} {o.qty}</span>
                        {o.size && <span style={{ fontSize:10, color:C.muted, background:`${C.border}80`, padding:'3px 9px', borderRadius:100 }}>{isAdminAr ? 'مقاس' : 'Taille'} {o.size}</span>}
                      </div>
                    </div>
                    <div style={{ fontSize:13, fontWeight:800, color:C.gold, fontFamily:'Inter', whiteSpace:'nowrap' as const }}>
                      {o.subtotal.toLocaleString()} {isAdminAr ? 'دج' : 'DA'}
                    </div>
                  </div>
                )
              }
            </div>
          </div>

          {/* ── INVOICE ── */}
          <div>
            <SectionLabel icon="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" label={isAdminAr ? "الفاتورة" : "Facture"} />
            <div style={{ background:C.card2, border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden' }}>
              {[
                { label:isAdminAr?'سعر المنتجات':'Prix des produits', value:`${o.subtotal.toLocaleString()} ${isAdminAr?'دج':'DA'}`, color: C.text },
                { label:isAdminAr?'رسوم التوصيل':'Frais de livraison', value: o.delivery_price === 0 ? (isAdminAr?'مجاني':'Gratuit') : `${o.delivery_price.toLocaleString()} ${isAdminAr?'دج':'DA'}`, color: o.delivery_price===0?'#10B981':C.muted },
                ...(o.discount > 0 ? [{ label:`${isAdminAr?'خصم':'Remise'} — ${o.promo_code}`, value:`− ${o.discount.toLocaleString()} ${isAdminAr?'دج':'DA'}`, color:'#10B981' }] : []),
              ].map((row, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', borderBottom:`1px solid ${C.border}`, fontSize:13 }}>
                  <span style={{ color:C.muted }}>{row.label}</span>
                  <span style={{ fontWeight:600, color:row.color }}>{row.value}</span>
                </div>
              ))}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px', background:`${C.green}08` }}>
                <span style={{ fontSize:14, fontWeight:800, color:C.text }}>{isAdminAr ? 'المجموع' : 'Total'}</span>
                <span style={{ fontSize:18, fontWeight:900, color:C.gold, fontFamily:'Inter' }}>{o.total.toLocaleString()} {isAdminAr ? 'دج' : 'DA'}</span>
              </div>
            </div>
          </div>

          {/* ── ACTIONS ── */}
          <div style={{ display:'flex', gap:8 }}>
            <a href={`tel:${o.phone}`}
              style={{ flex:2, background:`linear-gradient(135deg, ${C.green}, #1D4939)`, borderRadius:12, padding:'12px', textAlign:'center', color:'#fff', textDecoration:'none', fontSize:13, fontWeight:800, fontFamily:font, display:'flex', alignItems:'center', justifyContent:'center', gap:7, boxShadow:`0 4px 12px ${C.green}40` }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
              </svg>
              {isAdminAr ? 'اتصال' : 'Appeler'}
            </a>
            <button
              onClick={() => { navigator.clipboard.writeText(o.order_num); showToast(isAdminAr ? 'تم نسخ رقم الطلب' : 'Numéro copié'); }}
              style={{ flex:1, background:C.card2, border:`1px solid ${C.border}`, borderRadius:12, padding:'12px', color:C.muted, cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:font, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
              </svg>
              {isAdminAr ? 'نسخ' : 'Copier'}
            </button>
            <button
              onClick={() => setSelected(null)}
              style={{ flex:1, background:C.card2, border:`1px solid ${C.border}`, borderRadius:12, padding:'12px', color:C.muted, cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:font, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              {isAdminAr ? 'إغلاق' : 'Fermer'}
            </button>
          </div>

        </div>
      </div>
    );
  };

  return (
    <div style={{ height:'100vh', overflow:'hidden', display:'flex', background:C.bg, fontFamily:font, direction:dir, color:C.text }}>
      <style>{`
        @keyframes ihsen-fadeInUp {
          from { opacity:0; transform:translateY(18px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes ihsen-slideR {
          from { opacity:0; transform:translateX(12px); }
          to   { opacity:1; transform:translateX(0); }
        }
        @keyframes ihsen-panel-slide {
          from { opacity:0; transform:translateX(-28px); }
          to   { opacity:1; transform:translateX(0); }
        }
        @keyframes ihsen-sheet-up {
          from { transform:translateY(100%); }
          to   { transform:translateY(0); }
        }
        @keyframes ihsen-backdrop-in {
          from { opacity:0; }
          to   { opacity:1; }
        }
        @keyframes ihsen-bellRing {
          0%,100% { transform:rotate(0deg); }
          20% { transform:rotate(-14deg); }
          40% { transform:rotate(11deg); }
          60% { transform:rotate(-7deg); }
          80% { transform:rotate(4deg); }
        }
        @keyframes ihsen-pulse-dot {
          0%,100% { box-shadow:0 0 0 0 rgba(16,185,129,0.5); }
          50%      { box-shadow:0 0 0 6px rgba(16,185,129,0); }
        }
        .ihsen-card-enter { animation: ihsen-fadeInUp 0.5s cubic-bezier(0.22,1,0.36,1) both; }
        .ihsen-row-enter  { animation: ihsen-slideR 0.38s cubic-bezier(0.22,1,0.36,1) both; }
        .ihsen-topbar     { animation: ihsen-fadeInUp 0.4s cubic-bezier(0.22,1,0.36,1) both; }
        .ihsen-bell-ring  { animation: ihsen-bellRing 1s ease 2s 1; display:flex; align-items:center; justify-content:center; }
        .ihsen-pulse-dot  { animation: ihsen-pulse-dot 2s ease-in-out infinite; }
        @keyframes ihsen-shimmer { from{background-position:200% 0} to{background-position:-200% 0} }
      `}</style>

      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {/* Topbar */}
        <div className="ihsen-topbar" style={{ background:'#ffffff', borderBottom:`1px solid ${C.border}`, padding:'10px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100, boxShadow:'0 1px 8px rgba(36,77,59,.05)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:`linear-gradient(135deg, ${C.green}, #1D4939)`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.85)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            </div>
            <div>
              <div style={{ fontSize:15, fontWeight:800, color:C.text, lineHeight:1.2 }}>{isAdminAr ? 'إدارة الطلبات' : 'Commandes'}</div>
              <div style={{ fontSize:10.5, color:C.sub, marginTop:1 }}>{filtered.length} {isAdminAr ? 'طلب' : 'commandes'}</div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <button onClick={loadOrders} style={{ width:34, height:34, borderRadius:8, border:`1px solid ${C.border}`, background:'transparent', cursor:'pointer', color:C.muted, display:'flex', alignItems:'center', justifyContent:'center', transition:'all .15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = C.card2; e.currentTarget.style.color = C.green; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.muted; }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
              </svg>
            </button>
            {/* Stats button */}
            <button onClick={() => setStatsOpen(v => !v)} title={isAdminAr ? 'إحصائيات' : 'Statistiques'} style={{ width:34, height:34, borderRadius:8, border:`1px solid ${statsOpen?C.gold:C.border}`, background:statsOpen?`${C.gold}14`:'transparent', cursor:'pointer', color:statsOpen?C.gold:C.muted, display:'flex', alignItems:'center', justifyContent:'center', transition:'all .15s' }}
              onMouseEnter={e => { if(!statsOpen){ e.currentTarget.style.background=C.card2; e.currentTarget.style.color=C.green; } }}
              onMouseLeave={e => { if(!statsOpen){ e.currentTarget.style.background='transparent'; e.currentTarget.style.color=C.muted; } }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
            </button>
            {/* Export button */}
            <div style={{ position:'relative' }}>
              <button onClick={() => setExportOpen(v => !v)} title={isAdminAr ? "تصدير Excel" : "Exporter Excel"} style={{ width:34, height:34, borderRadius:8, border:`1px solid ${exportOpen?C.green:C.border}`, background:exportOpen?`${C.green}14`:'transparent', cursor:'pointer', color:exportOpen?C.green:C.muted, display:'flex', alignItems:'center', justifyContent:'center', transition:'all .15s' }}
                onMouseEnter={e => { if(!exportOpen){ e.currentTarget.style.background=C.card2; e.currentTarget.style.color=C.green; } }}
                onMouseLeave={e => { if(!exportOpen){ e.currentTarget.style.background='transparent'; e.currentTarget.style.color=C.muted; } }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </button>
              {exportOpen && (
                <>
                  <div onClick={() => setExportOpen(false)} style={{ position:'fixed', inset:0, zIndex:190 }} />
                  <div style={{ position:'absolute', top:'calc(100% + 8px)', insetInlineEnd:0, width:280, background:C.card, border:`1px solid ${C.border}`, borderRadius:14, boxShadow:'0 12px 36px rgba(0,0,0,.13)', zIndex:200, overflow:'hidden', padding:'16px' }}>
                    <div style={{ fontSize:13, fontWeight:800, color:C.text, fontFamily:font, marginBottom:12 }}>{isAdminAr ? 'تصدير الطلبات إلى Excel' : 'Exporter les commandes Excel'}</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:12 }}>
                      <label style={{ fontSize:11, color:C.muted, fontFamily:font }}>{isAdminAr ? 'من تاريخ' : 'Du'}</label>
                      <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{ padding:'8px 10px', borderRadius:8, border:`1px solid ${C.border}`, background:C.card2, color:C.text, fontSize:12, outline:'none', fontFamily:'Inter', cursor:'pointer' }} />
                      <label style={{ fontSize:11, color:C.muted, fontFamily:font }}>{isAdminAr ? 'إلى تاريخ' : 'Au'}</label>
                      <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{ padding:'8px 10px', borderRadius:8, border:`1px solid ${C.border}`, background:C.card2, color:C.text, fontSize:12, outline:'none', fontFamily:'Inter', cursor:'pointer' }} />
                    </div>
                    <div style={{ fontSize:11, color:C.sub, fontFamily:font, marginBottom:12 }}>
                      {(() => {
                        const from = dateFrom ? new Date(dateFrom) : null;
                        const to   = dateTo   ? new Date(dateTo+'T23:59:59') : null;
                        const cnt  = orders.filter(o=>{ const d=new Date(o.created_at); if(from&&d<from)return false; if(to&&d>to)return false; return true; }).length;
                        return isAdminAr ? `سيتم تصدير ${cnt} طلب` : `${cnt} commande(s) à exporter`;
                      })()}
                    </div>
                    <button onClick={exportExcel} disabled={exporting} style={{ width:'100%', padding:'10px', borderRadius:10, background:C.green, color:'#fff', border:'none', cursor:exporting?'wait':'pointer', fontSize:13, fontWeight:700, fontFamily:font, opacity:exporting?.6:1, transition:'opacity .2s' }}>
                      {exporting ? (isAdminAr ? 'جاري التصدير...' : 'Export en cours...') : (isAdminAr ? '⬇ تصدير Excel' : '⬇ Exporter Excel')}
                    </button>
                  </div>
                </>
              )}
            </div>
            {/* Messages */}
            <button onClick={() => router.push('/admin/messages')} style={{ width:34, height:34, borderRadius:8, border:`1px solid ${C.border}`, background:'transparent', cursor:'pointer', color:C.muted, display:'flex', alignItems:'center', justifyContent:'center', transition:'all .15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = C.card2; e.currentTarget.style.color = C.green; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.muted; }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
              </svg>
            </button>
            <div style={{ position:'relative' }}>
              <button onClick={() => setNotif(v => !v)} style={{ width:34, height:34, borderRadius:8, border:`1px solid ${notifOpen ? C.gold : C.border}`, background: notifOpen ? `${C.gold}12` : 'transparent', cursor:'pointer', color: notifOpen ? C.gold : C.muted, display:'flex', alignItems:'center', justifyContent:'center', position:'relative', transition:'all .15s' }}
                onMouseEnter={e => { if(!notifOpen){ e.currentTarget.style.background = C.card2; e.currentTarget.style.color = C.green; } }}
                onMouseLeave={e => { if(!notifOpen){ e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.muted; } }}>
                <span className={!notifOpen ? 'ihsen-bell-ring' : ''} style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
                  </svg>
                </span>
                {orders.filter(o=>o.status==='pending'||o.status==='reviewing').length > 0 && (
                  <span style={{ position:'absolute', top:5, insetInlineStart:5, width:8, height:8, borderRadius:'50%', background:'#EF4444', border:'2px solid #fff' }} />
                )}
              </button>
              {notifOpen && (
                <>
                  <div onClick={() => setNotif(false)} style={{ position:'fixed', inset:0, zIndex:190 }} />
                  <div style={{ position:'absolute', top:'calc(100% + 8px)', insetInlineEnd:0, width:290, background:C.card, border:`1px solid ${C.border}`, borderRadius:14, boxShadow:'0 12px 36px rgba(0,0,0,.13)', zIndex:200, overflow:'hidden' }}>
                    <div style={{ padding:'12px 16px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div style={{ fontSize:13, fontWeight:800, color:C.text, fontFamily:font }}>{isAdminAr ? 'الطلبات المعلقة' : 'Commandes en attente'}</div>
                      <span style={{ fontSize:10, background:`${C.gold}20`, color:C.gold, borderRadius:100, padding:'2px 8px', fontFamily:'Inter', fontWeight:700 }}>
                        {orders.filter(o=>o.status==='pending'||o.status==='reviewing').length}
                      </span>
                    </div>
                    <div style={{ maxHeight:300, overflowY:'auto' }}>
                      {orders.filter(o=>o.status==='pending'||o.status==='reviewing').length === 0
                        ? <div style={{ padding:'24px', textAlign:'center', color:C.sub, fontFamily:font, fontSize:13 }}>{isAdminAr ? 'لا توجد طلبات معلقة' : 'Aucune commande en attente'}</div>
                        : orders.filter(o=>o.status==='pending'||o.status==='reviewing')
                            .sort((a,b)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime())
                            .slice(0,10).map(o => (
                              <div key={o.id}
                                onClick={() => { setSelected(o); setNotif(false); }}
                                style={{ padding:'10px 16px', borderBottom:`1px solid ${C.border}20`, cursor:'pointer', transition:'background .15s' }}
                                onMouseEnter={e => e.currentTarget.style.background = C.card2}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                                  <span style={{ fontFamily:'Inter', fontSize:12, fontWeight:700, color:C.gold }}>{o.order_num}</span>
                                  <span style={{ fontSize:10, background: o.status==='reviewing'?'#F59E0B20':'#6B728020', color: o.status==='reviewing'?'#F59E0B':'#6B7280', borderRadius:100, padding:'1px 7px', fontFamily:'Inter', fontWeight:700 }}>
                                    {o.status==='reviewing'?(isAdminAr?'مراجعة':'En révision'):(isAdminAr?'انتظار':'En attente')}
                                  </span>
                                </div>
                                <div style={{ fontSize:12, color:C.text, fontFamily:font, marginTop:2 }}>{o.customer_name} — {o.wilaya}</div>
                              </div>
                            ))
                      }
                    </div>
                  </div>
                </>
              )}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6, paddingInlineStart:4, borderInlineStart:`1px solid ${C.border}`, marginInlineStart:4 }}>
              <div className="ihsen-pulse-dot" style={{ width:7, height:7, borderRadius:'50%', background:'#10B981' }} />
              <span style={{ fontSize:11, color:C.sub }}>{isAdminAr ? 'متصل' : 'En ligne'}</span>
            </div>
          </div>
        </div>

        {/* ── Stats Panel ────────────────────────────────────────────────────── */}
        {statsOpen && (
          <div data-reveal style={{ background:C.card, borderBottom:`1px solid ${C.border}`, padding:'20px 24px', display:'flex', flexDirection:'column', gap:20 }}>

            {/* KPI row */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px,1fr))', gap:12 }}>
              {[
                { label: isAdminAr ? 'إجمالي الطلبات' : 'Total commandes',  value: orders.length, color: C.green, icon:'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
                { label: isAdminAr ? 'الإيرادات (دج)' : 'Revenus (DA)',  value: totalRevenue.toLocaleString(), color: C.gold,  icon:'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
                { label: isAdminAr ? 'مُسلَّم' : 'Livrés',          value: deliveredCount,  color:'#10B981', icon:'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
                { label: isAdminAr ? 'في الانتظار' : 'En attente',     value: pendingCount,    color:'#F59E0B', icon:'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
              ].map(kpi => (
                <div key={kpi.label} style={{ background:C.card2, border:`1px solid ${C.border}`, borderRadius:12, padding:'14px 16px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                    <div style={{ width:28, height:28, borderRadius:8, background:`${kpi.color}15`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={kpi.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={kpi.icon}/></svg>
                    </div>
                    <span style={{ fontSize:10, color:C.sub, fontFamily:font }}>{kpi.label}</span>
                  </div>
                  <div style={{ fontSize:20, fontWeight:900, color:kpi.color, fontFamily:'Inter', letterSpacing:0.3 }}>{kpi.value}</div>
                </div>
              ))}
            </div>

            <div style={{ display:'grid', gridTemplateColumns: isMobile?'1fr':'1fr 1fr', gap:16 }}>

              {/* Monthly breakdown */}
              <div style={{ background:C.card2, border:`1px solid ${C.border}`, borderRadius:12, padding:'16px' }}>
                <div style={{ fontSize:12, fontWeight:800, color:C.text, fontFamily:font, marginBottom:12 }}>{isAdminAr ? 'الطلبات الشهرية' : 'Commandes mensuelles'}</div>
                {monthlyStats.length === 0
                  ? <div style={{ fontSize:12, color:C.sub, fontFamily:font }}>{isAdminAr ? 'لا توجد بيانات' : 'Aucune donnée'}</div>
                  : (() => {
                      const maxCount = Math.max(...monthlyStats.map(([,v])=>v.count), 1);
                      return monthlyStats.map(([month, val]) => (
                        <div key={month} style={{ marginBottom:10 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                            <span style={{ fontSize:11, color:C.text, fontFamily:font }}>{month}</span>
                            <span style={{ fontSize:11, fontFamily:'Inter', color:C.muted }}>{val.count} {isAdminAr ? 'طلب' : 'cmd.'} · {val.revenue.toLocaleString()} {isAdminAr ? 'دج' : 'DA'}</span>
                          </div>
                          <div style={{ height:5, borderRadius:3, background:`${C.border}`, overflow:'hidden' }}>
                            <div style={{ height:'100%', width:`${(val.count/maxCount)*100}%`, background:`linear-gradient(90deg, ${C.green}, ${C.gold})`, borderRadius:3, transition:'width .5s' }} />
                          </div>
                        </div>
                      ));
                    })()
                }
              </div>

              {/* Top wilayas */}
              <div style={{ background:C.card2, border:`1px solid ${C.border}`, borderRadius:12, padding:'16px' }}>
                <div style={{ fontSize:12, fontWeight:800, color:C.text, fontFamily:font, marginBottom:12 }}>{isAdminAr ? 'أعلى الولايات طلبًا' : 'Wilayas en tête'}</div>
                {wilayaStats.length === 0
                  ? <div style={{ fontSize:12, color:C.sub, fontFamily:font }}>{isAdminAr ? 'لا توجد بيانات' : 'Aucune donnée'}</div>
                  : (() => {
                      const maxCount = Math.max(...wilayaStats.map(([,v])=>v.count), 1);
                      return wilayaStats.map(([wilaya, val], idx) => (
                        <div key={wilaya} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                          <span style={{ fontSize:10, fontWeight:800, color:C.gold, fontFamily:'Inter', width:16, textAlign:'center', flexShrink:0 }}>#{idx+1}</span>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                              <span style={{ fontSize:11, color:C.text, fontFamily:font, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{wilaya}</span>
                              <span style={{ fontSize:10, fontFamily:'Inter', color:C.muted, whiteSpace:'nowrap', marginInlineStart:6 }}>{val.count}</span>
                            </div>
                            <div style={{ height:4, borderRadius:2, background:C.border, overflow:'hidden' }}>
                              <div style={{ height:'100%', width:`${(val.count/maxCount)*100}%`, background:C.gold, borderRadius:2, transition:'width .5s' }} />
                            </div>
                          </div>
                        </div>
                      ));
                    })()
                }
              </div>
            </div>
          </div>
        )}

        <div style={{ flex:1, padding:isMobile?'16px':'20px 24px', display:'flex', gap:20, alignItems:'flex-start', overflowY:'auto' }}>
          {/* Left: list */}
          <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:14 }}>

            {/* Filters */}
            <div data-reveal style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <div style={{ position:'relative', flex:1, minWidth:160 }}>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder={isAdminAr ? 'ابحث: رقم طلب، اسم، هاتف...' : 'Rechercher...'} style={{ width:'100%', boxSizing:'border-box', padding:'9px 36px 9px 12px', borderRadius:10, border:`1px solid ${C.border}`, background:C.card, color:C.text, fontSize:12, outline:'none', fontFamily:font }} />
                <span style={{ position:'absolute', top:'50%', transform:'translateY(-50%)', right:11, fontSize:12, color:C.muted }}>⌕</span>
              </div>
              <select value={statusF} onChange={e => setStatusF(e.target.value as OrderStatus|'all')} style={{ padding:'9px 12px', paddingInlineEnd:28, borderRadius:10, border:`1px solid ${C.border}`, background:C.card, color:C.text, fontSize:12, fontFamily:font, outline:'none', cursor:'pointer' }}>
                <option value="all">{isAdminAr ? 'كل الحالات' : 'Tous les statuts'}</option>
                {STATUS_FLOW.map(s => <option key={s} value={s}>{isAdminAr ? STATUS_META[s].ar : STATUS_META[s].fr}</option>)}
              </select>
            </div>

            {/* Status quick filter chips */}
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {(['all', ...STATUS_FLOW] as const).map(s => {
                const count = s==='all' ? orders.length : orders.filter(o=>o.status===s).length;
                if (count === 0 && s !== 'all') return null;
                const meta = s !== 'all' ? STATUS_META[s] : null;
                const active = statusF === s;
                return (
                  <button key={s} onClick={() => setStatusF(s as OrderStatus|'all')} style={{ padding:'4px 12px', borderRadius:100, border:`1px solid ${active?(meta?.color??C.green):C.border}`, background:active?(meta?.bg??`${C.green}20`):'transparent', color:active?(meta?.color??C.gold):C.muted, fontSize:11, fontWeight:active?700:400, cursor:'pointer', fontFamily:font, transition:'all .15s' }}>
                    {meta ? (isAdminAr ? meta.ar : meta.fr) : (isAdminAr ? 'الكل' : 'Tout')} ({count})
                  </button>
                );
              })}
            </div>

            {/* Orders — grouped by status */}
            {loading ? (
              <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>
                {Array.from({length:8}).map((_,i) => (
                  <div key={i} style={{ padding:'13px 16px', borderBottom:`1px solid ${C.border}30`, display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:34, height:34, borderRadius:9, background:C.border, flexShrink:0 }} />
                    <div style={{ flex:1, display:'flex', flexDirection:'column', gap:7 }}>
                      <div style={{ display:'flex', gap:10 }}>
                        <div style={{ height:11, width:80, background:`linear-gradient(90deg,#e8f0eb 25%,#f3f8f5 50%,#e8f0eb 75%)`, backgroundSize:'200% 100%', animation:'ihsen-shimmer 1.4s ease-in-out infinite', borderRadius:4 }} />
                        <div style={{ height:11, width:120, background:`linear-gradient(90deg,#e8f0eb 25%,#f3f8f5 50%,#e8f0eb 75%)`, backgroundSize:'200% 100%', animation:`ihsen-shimmer 1.4s ease-in-out infinite ${i*80}ms`, borderRadius:4 }} />
                      </div>
                      <div style={{ height:10, width:'60%', background:`linear-gradient(90deg,#e8f0eb 25%,#f3f8f5 50%,#e8f0eb 75%)`, backgroundSize:'200% 100%', animation:`ihsen-shimmer 1.4s ease-in-out infinite ${i*60}ms`, borderRadius:4 }} />
                    </div>
                    <div style={{ height:22, width:70, background:`linear-gradient(90deg,#e8f0eb 25%,#f3f8f5 50%,#e8f0eb 75%)`, backgroundSize:'200% 100%', animation:'ihsen-shimmer 1.4s ease-in-out infinite', borderRadius:100 }} />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:'48px', textAlign:'center', color:C.muted }}>
                <div style={{ width:40, height:40, border:`1px solid ${C.border}`, borderRadius:10, margin:'0 auto 12px', opacity:.4 }} />
                <div style={{ fontSize:14, fontWeight:600, color:C.text }}>{isAdminAr ? 'لا توجد طلبات' : 'Aucune commande'}</div>
              </div>
            ) : statusF !== 'all' ? (
              /* ── Single status flat list ── */
              <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>
                {filtered.map((o, i) => {
                  const meta = STATUS_META[o.status];
                  const isSel = selected?.id === o.id;
                  return (
                    <div key={o.id} onClick={() => setSelected(isSel ? null : o)}
                      className="ihsen-row-enter"
                      style={{ padding:'13px 16px', borderBottom: i < filtered.length-1 ? `1px solid ${C.border}30` : 'none', cursor:'pointer', transition:'background .2s', background: isSel ? `${C.green}20` : 'transparent', borderInlineStart: isSel ? `3px solid ${C.gold}` : '3px solid transparent', animationDelay: mounted ? `${i * 45}ms` : '999s' }}
                      onMouseEnter={e => { if(!isSel) e.currentTarget.style.background = `${C.green}10`; }}
                      onMouseLeave={e => { if(!isSel) e.currentTarget.style.background = 'transparent'; }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                        <div style={{ display:'flex', gap:10, alignItems:'center', flex:1, minWidth:0 }}>
                          <div style={{ width:34, height:34, borderRadius:8, background:`${C.green}15`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                          </div>
                          <div style={{ minWidth:0 }}>
                            <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                              <span style={{ fontSize:13, fontWeight:800, color:C.gold, fontFamily:'Inter' }}>{o.order_num}</span>
                              <span style={{ background:meta.bg, color:meta.color, borderRadius:100, padding:'2px 8px', fontSize:10, fontWeight:700 }}>{isAdminAr ? meta.ar : meta.fr}</span>
                            </div>
                            <div style={{ fontSize:12, color:C.text, marginTop:2 }}>{o.customer_name} · {o.phone}</div>
                            <div style={{ fontSize:11, color:C.muted, marginTop:1 }}>{parseNotes(o.notes)?.items ? `منتجات متعددة (${parseNotes(o.notes)!.items!.length})` : o.product_name.split('—')[0].trim()} · {o.wilaya}</div>
                          </div>
                        </div>
                        <div style={{ textAlign:'left', flexShrink:0 }}>
                          <div style={{ fontSize:14, fontWeight:800, color:'#10B981', fontFamily:'Inter' }}>{o.total.toLocaleString()} {isAdminAr ? 'دج' : 'DA'}</div>
                          <div style={{ fontSize:10, color:C.muted, fontFamily:'Inter' }}>{new Date(o.created_at).toLocaleDateString(isAdminAr ? 'ar-DZ' : 'fr-DZ')}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ── Grouped by status ── */
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {STATUS_FLOW.map(status => {
                  const groupOrders = filtered.filter(o => o.status === status);
                  if (groupOrders.length === 0) return null;
                  const meta = STATUS_META[status];
                  const isCollapsed = collapsedGroups.has(status);
                  const toggleGroup = () => setCollapsedGroups(prev => {
                    const next = new Set(prev);
                    if (next.has(status)) next.delete(status); else next.add(status);
                    return next;
                  });
                  return (
                    <div key={status} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>
                      {/* Group header */}
                      <button onClick={toggleGroup}
                        style={{ width:'100%', padding:'11px 16px', display:'flex', alignItems:'center', gap:10, background:`${meta.color}10`, border:'none', borderBottom: isCollapsed ? 'none' : `1px solid ${C.border}30`, cursor:'pointer', transition:'background .15s', textAlign:'right' as const }}
                        onMouseEnter={e => e.currentTarget.style.background = `${meta.color}18`}
                        onMouseLeave={e => e.currentTarget.style.background = `${meta.color}10`}>
                        <div style={{ width:32, height:32, borderRadius:9, background:`${meta.color}20`, border:`1px solid ${meta.color}40`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={meta.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d={STATUS_ICON[status]}/>
                          </svg>
                        </div>
                        <span style={{ fontSize:13, fontWeight:800, color:meta.color, fontFamily:font }}>{isAdminAr ? meta.ar : meta.fr}</span>
                        <span style={{ fontSize:11, fontWeight:700, background:`${meta.color}22`, color:meta.color, borderRadius:100, padding:'2px 9px', fontFamily:'Inter', marginInlineStart:'auto' }}>{groupOrders.length}</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={meta.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition:'transform .2s', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', flexShrink:0 }}>
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </button>
                      {/* Group rows */}
                      {!isCollapsed && groupOrders.map((o, i) => {
                        const isSel = selected?.id === o.id;
                        return (
                          <div key={o.id} onClick={() => setSelected(isSel ? null : o)}
                            className="ihsen-row-enter"
                            style={{ padding:'13px 16px', borderBottom: i < groupOrders.length-1 ? `1px solid ${C.border}30` : 'none', cursor:'pointer', transition:'background .2s', background: isSel ? `${C.green}20` : 'transparent', borderInlineStart: isSel ? `3px solid ${C.gold}` : '3px solid transparent', animationDelay: mounted ? `${i * 35}ms` : '999s' }}
                            onMouseEnter={e => { if(!isSel) e.currentTarget.style.background = `${C.green}10`; }}
                            onMouseLeave={e => { if(!isSel) e.currentTarget.style.background = 'transparent'; }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                              <div style={{ display:'flex', gap:10, alignItems:'center', flex:1, minWidth:0 }}>
                                <div style={{ width:34, height:34, borderRadius:8, background:`${C.green}15`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                                </div>
                                <div style={{ minWidth:0 }}>
                                  <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                                    <span style={{ fontSize:13, fontWeight:800, color:C.gold, fontFamily:'Inter' }}>{o.order_num}</span>
                                  </div>
                                  <div style={{ fontSize:12, color:C.text, marginTop:2 }}>{o.customer_name} · {o.phone}</div>
                                  <div style={{ fontSize:11, color:C.muted, marginTop:1 }}>{parseNotes(o.notes)?.items ? `منتجات متعددة (${parseNotes(o.notes)!.items!.length})` : o.product_name.split('—')[0].trim()} · {o.wilaya}</div>
                                </div>
                              </div>
                              <div style={{ textAlign:'left', flexShrink:0 }}>
                                <div style={{ fontSize:14, fontWeight:800, color:'#10B981', fontFamily:'Inter' }}>{o.total.toLocaleString()} {isAdminAr ? 'دج' : 'DA'}</div>
                                <div style={{ fontSize:10, color:C.muted, fontFamily:'Inter' }}>{new Date(o.created_at).toLocaleDateString(isAdminAr ? 'ar-DZ' : 'fr-DZ')}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: detail panel (desktop) */}
          {isDesktop && (
            <div style={{ width:360, flexShrink:0, position:'sticky', top:0 }}>
              {selected
                ? <div key={selected.id} className={isAdminAr ? 'panel-anim-desktop-ar' : 'panel-anim-desktop-fr'}>
                    <OrderDetail o={selected} />
                  </div>
                : (
                  <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:'48px 24px', textAlign:'center', color:C.muted }}>
                    <div style={{ display:'flex', gap:4, justifyContent:'center', marginBottom:14 }}>
                      {[14,20,14].map((h,i) => (
                        <div key={i} style={{ width:3, height:h, borderRadius:2, background:C.border, opacity:.6 }} />
                      ))}
                    </div>
                    <div style={{ fontSize:14, fontWeight:600, color:C.text, marginBottom:6 }}>{isAdminAr ? 'اختاري طلباً' : 'Sélectionner une commande'}</div>
                    <div style={{ fontSize:12 }}>{isAdminAr ? 'انقري على أي طلب لعرض تفاصيله وتغيير حالته' : 'Cliquez sur une commande pour voir les détails'}</div>
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Mobile/Tablet detail sheet — slides up from bottom */}
        {!isDesktop && selected && (
          <>
            <div
              onClick={() => setSelected(null)}
              style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:300, animation:'ihsen-backdrop-in 0.22s ease both' }}
            />
            <div
              key={selected.id}
              style={{
                position:'fixed', bottom:0, left:0, right:0, zIndex:400,
                background:C.bg, borderRadius:'22px 22px 0 0',
                padding:'0 16px 40px', maxHeight:'90vh', overflowY:'auto',
                animation:'ihsen-sheet-up 0.38s cubic-bezier(0.32,0.72,0,1) both',
                boxShadow:'0 -8px 40px rgba(0,0,0,.18)',
              }}
            >
              {/* Drag handle */}
              <div style={{ display:'flex', justifyContent:'center', padding:'14px 0 8px' }}>
                <div style={{ width:44, height:4, borderRadius:3, background:C.border }} />
              </div>
              <OrderDetail o={selected} />
            </div>
          </>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', background:'#0f2419', border:'1px solid #244D3B', borderRadius:100, padding:'10px 24px', color:'#10B981', fontFamily:font, fontWeight:700, fontSize:13, zIndex:999, boxShadow:'0 8px 24px rgba(0,0,0,.4)', whiteSpace:'nowrap' }}>
          {toast}
        </div>
      )}
      
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div style={{ minHeight:'100vh', background:'#070c09', display:'flex', alignItems:'center', justifyContent:'center', color:'#AF8E4A', fontFamily:'Cairo, sans-serif' }}>جاري التحميل... | Chargement...</div>}>
      <OrdersContent />
    </Suspense>
  );
}
