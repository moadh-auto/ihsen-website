'use client';
import { useState } from 'react';

/* ─── Zones de livraison ─── */
export const ZONE_META = {
  north:  { ar: 'الشمال',  fr: 'Nord',    home: 500, office: 350, color: '#244D3B', bg: '#E8F0EB', badge: '⬤' },
  center: { ar: 'الوسط',   fr: 'Centre',  home: 650, office: 450, color: '#AF8E4A', bg: '#F5EEDD', badge: '⬤' },
  south:  { ar: 'الجنوب',  fr: 'Sud',     home: 800, office: 600, color: '#C67C48', bg: '#F8EDE4', badge: '⬤' },
} as const;
export type Zone = keyof typeof ZONE_META;

/* ─── Wilaya → Zone + position SVG (viewBox 500×550) ─── */
//  [name_ar, svgX, svgY, zone]
export const WILAYAS_SVG: [string, number, number, Zone][] = [
  ['أدرار',                  213, 280, 'south'],
  ['الشلف',                  241,  28, 'north'],
  ['الأغواط',                279, 100, 'center'],
  ['أم البواقي',             380,  37, 'north'],
  ['باتنة',                  357,  46, 'center'],
  ['بجاية',                  327,  10, 'north'],
  ['بسكرة',                  347,  67, 'center'],
  ['بشار',                   206, 166, 'center'],
  ['البليدة',                277,  19, 'north'],
  ['البويرة',                303,  22, 'north'],
  ['تمنراست',                342, 435, 'south'],
  ['تبسة',                   405,  51, 'center'],
  ['تلمسان',                 177,  66, 'north'],
  ['تيارت',                  241,  52, 'center'],
  ['تيزي وزو',               307,  11, 'north'],
  ['الجزائر',                282,  11, 'north'],
  ['الجلفة',                 287,  73, 'center'],
  ['جيجل',                   348,   8, 'north'],
  ['سطيف',                   339,  27, 'north'],
  ['سعيدة',                  211,  68, 'center'],
  ['سكيكدة',                 375,   7, 'north'],
  ['سيدي بلعباس',            223,  57, 'north'],
  ['عنابة',                  396,   6, 'north'],
  ['قالمة',                  388,  19, 'north'],
  ['قسنطينة',                368,  22, 'north'],
  ['المدية',                 279,  25, 'north'],
  ['مستغانم',                213,  35, 'north'],
  ['المسيلة',                318,  42, 'center'],
  ['معسكر',                  211,  51, 'north'],
  ['ورقلة',                  337, 156, 'center'],
  ['وهران',                  194,  42, 'north'],
  ['البيض',                  231, 103, 'center'],
  ['إليزي',                  455, 313, 'south'],
  ['برج بوعريريج',           323,  31, 'north'],
  ['بومرداس',                293,  11, 'north'],
  ['الطارف',                 411,  10, 'north'],
  ['تندوف',                   17, 289, 'south'],
  ['تيسمسيلت',               254,  37, 'north'],
  ['الوادي',                 374, 112, 'center'],
  ['خنشلة',                  381,  56, 'center'],
  ['سوق أهراس',              401,  24, 'north'],
  ['تيبازة',                 271,  15, 'north'],
  ['ميلة',                   360,  19, 'north'],
  ['عين الدفلة',             259,  25, 'north'],
  ['النعامة',                216, 114, 'center'],
  ['عين تيموشنت',            182,  55, 'north'],
  ['غرداية',                 298, 138, 'south'],
  ['غليزان',                 221,  44, 'north'],
  ['تيميمون',                214, 239, 'south'],
  ['برج باجي مختار',         231, 479, 'south'],
  ['أولاد جلال',             338,  80, 'center'],
  ['بني عباس',               157, 211, 'south'],
  ['عين صالح',               271, 300, 'south'],
  ['عين قزام',               277, 522, 'south'],
  ['تقرت',                   351, 121, 'center'],
  ['جانت',                   455, 379, 'south'],
  ['المغير',                 354,  95, 'center'],
  ['المنيعة',                279, 210, 'south'],
  ['أفلو',                   260,  91, 'center'],
  ['بريكة',                  335,  62, 'center'],
  ['القنطرة',                340,  64, 'center'],
  ['بئر العاتر',             400,  71, 'center'],
  ['العريشة',                175,  76, 'north'],
  ['قصر الشلالة',            260,  57, 'center'],
  ['عين وسارة',              291,  70, 'center'],
  ['مسعد',                   309, 100, 'center'],
  ['قصر البخاري',            289,  37, 'north'],
  ['بوسعادة',                311,  56, 'center'],
  ['الأبيض سيدي الشيخ',     221, 127, 'center'],
];

/* lookup: wilaya name → zone */
export function getWilayaZone(name: string): Zone {
  return WILAYAS_SVG.find(w => w[0] === name)?.[3] ?? 'north';
}

/* Algeria simplified outline */
const ALGERIA_PATH =
  'M420,0 L417,60 L417,150 L435,201 L439,245 L451,305 L475,366 L499,418 ' +
  'L440,460 L360,530 L291,546 L176,546 L120,480 L50,400 L0,300 L0,287 ' +
  'L30,260 L60,220 L120,180 L150,130 L160,61 L167,57 L186,50 L194,42 ' +
  'L210,34 L241,14 L262,14 L282,10 L293,10 L333,5 L348,7 L375,6 L396,5 ' +
  'L411,9 L420,0 Z';

interface Props {
  value: string;
  onChange: (w: string) => void;
  isAr: boolean;
  dark?: boolean;
  error?: string;
}

export default function WilayaMap({ value, onChange, isAr, dark, error }: Props) {
  const [hovered, setHovered]     = useState<string | null>(null);
  const [activeZone, setActiveZone] = useState<Zone | null>(null);
  const font = 'Cairo, sans-serif';

  /* theme */
  const bg     = dark ? '#121c17' : '#F4F6F4';
  const card   = dark ? '#1a2620' : '#ffffff';
  const border = dark ? '#2a3d30' : '#dde8e2';
  const text   = dark ? '#f0f0f0' : '#1a1a1a';
  const muted  = dark ? '#8aab98' : '#6b7280';

  const selectedZone = value ? getWilayaZone(value) : null;
  const z            = selectedZone ? ZONE_META[selectedZone] : null;

  const chipsFiltered = activeZone
    ? WILAYAS_SVG.filter(w => w[3] === activeZone)
    : WILAYAS_SVG;

  return (
    <div style={{ fontFamily: font, direction: 'rtl' }}>

      {/* ── Zone tabs ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, direction: 'rtl' }}>
        {(Object.entries(ZONE_META) as [Zone, typeof ZONE_META.north][]).map(([key, zm]) => {
          const active = activeZone === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveZone(prev => prev === key ? null : key)}
              style={{
                flex: 1, padding: '7px 4px', borderRadius: 10,
                background: active ? zm.color : zm.bg,
                color: active ? '#fff' : zm.color,
                border: `1.5px solid ${active ? zm.color : 'transparent'}`,
                cursor: 'pointer', fontSize: 12, fontWeight: 700,
                fontFamily: font, transition: 'all 0.2s',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
              }}
            >
              <span>{isAr ? zm.ar : zm.fr}</span>
              <span style={{ fontSize: 10, fontWeight: 400, fontFamily: 'Inter, sans-serif' }}>
                {isAr
                  ? `${zm.home} / ${zm.office} دج`
                  : `${zm.home} / ${zm.office} DA`}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── SVG Map ── */}
      <div style={{
        position: 'relative', borderRadius: 14, overflow: 'hidden',
        border: `1.5px solid ${error ? '#EF4444' : border}`,
        background: dark ? '#0e1a13' : '#eef4f0',
        marginBottom: 10, userSelect: 'none',
      }}>
        <svg viewBox="0 0 500 550" style={{ width: '100%', height: 'auto', display: 'block' }}>
          {/* Sea background */}
          <rect width="500" height="550" fill={dark ? '#0a1510' : '#dbeaf2'} />

          {/* Algeria country fill */}
          <path
            d={ALGERIA_PATH}
            fill={dark ? '#162010' : '#c8ddc8'}
            stroke={dark ? '#2d5038' : '#244D3B'}
            strokeWidth={2}
            strokeLinejoin="round"
          />

          {/* Zone fills (faint overlay when a zone is active) */}
          {(Object.keys(ZONE_META) as Zone[]).map(zone => {
            const points = WILAYAS_SVG.filter(w => w[3] === zone);
            const zm = ZONE_META[zone];
            const dimmed = activeZone && activeZone !== zone;
            return points.map(([name, x, y]) => {
              const isSelected = value === name;
              const isHov = hovered === name;
              const r = isSelected ? 9 : isHov ? 7.5 : 5;
              const opacity = dimmed ? 0.2 : 1;
              return (
                <g key={name} style={{ cursor: 'pointer' }}>
                  {/* Touch hit area */}
                  <circle
                    cx={x} cy={y} r={18}
                    fill="transparent"
                    onClick={() => onChange(isSelected ? '' : name)}
                    onMouseEnter={() => setHovered(name)}
                    onMouseLeave={() => setHovered(null)}
                  />
                  {/* Glow for selected */}
                  {isSelected && (
                    <circle cx={x} cy={y} r={14}
                      fill={zm.color}
                      opacity={0.25}
                      style={{ pointerEvents: 'none' }}
                    />
                  )}
                  {/* Dot */}
                  <circle
                    cx={x} cy={y} r={r}
                    fill={isSelected ? zm.color : isHov ? zm.color : zm.color}
                    opacity={opacity * (isSelected ? 1 : isHov ? 0.9 : 0.65)}
                    stroke={isSelected ? '#fff' : 'none'}
                    strokeWidth={isSelected ? 2 : 0}
                    style={{ pointerEvents: 'none', transition: 'r 0.15s, opacity 0.15s' }}
                  />
                  {/* Name label on hover/select */}
                  {(isSelected || (isHov && !value)) && (
                    <>
                      {/* Label background */}
                      <rect
                        x={x - 36} y={y - 24}
                        width={72} height={14}
                        rx={4} ry={4}
                        fill={dark ? '#1a2620' : '#fff'}
                        opacity={0.88}
                        style={{ pointerEvents: 'none' }}
                      />
                      <text
                        x={x} y={y - 13}
                        textAnchor="middle"
                        fontSize="9"
                        fontFamily="Cairo, sans-serif"
                        fontWeight="700"
                        fill={zm.color}
                        style={{ pointerEvents: 'none' }}
                      >
                        {name}
                      </text>
                    </>
                  )}
                </g>
              );
            });
          })}

          {/* Compass rose (decorative) */}
          <text x="14" y="18" fontSize="8" fill={dark ? '#4a7a5a' : '#8baa94'}
            fontFamily="sans-serif" style={{ pointerEvents: 'none' }}>N↑</text>
        </svg>
      </div>

      {/* ── Selected badge ── */}
      {value && z && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: z.bg, border: `1.5px solid ${z.color}`,
          borderRadius: 10, padding: '9px 13px', marginBottom: 10,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: z.color, fontFamily: font }}>
              ✓ {value}
            </span>
            <span style={{ fontSize: 11, color: z.color, opacity: 0.8, fontFamily: font }}>
              {isAr
                ? `${ZONE_META[selectedZone!].ar} · منزل ${ZONE_META[selectedZone!].home} دج · مكتب ${ZONE_META[selectedZone!].office} دج`
                : `${ZONE_META[selectedZone!].fr} · Domicile ${ZONE_META[selectedZone!].home} DA · Bureau ${ZONE_META[selectedZone!].office} DA`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onChange('')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: z.color, fontSize: 20, lineHeight: 1, padding: '0 4px',
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <p style={{ fontSize: 12, color: '#EF4444', margin: '0 0 8px', fontFamily: font }}>
          {error}
        </p>
      )}

      {/* ── Chips (mobile-friendly list) ── */}
      <div style={{
        maxHeight: 180, overflowY: 'auto',
        display: 'flex', flexWrap: 'wrap', gap: 6,
        padding: '2px 0 4px',
        direction: 'rtl',
      }}>
        {chipsFiltered.map(([name, , , zone]) => {
          const zm = ZONE_META[zone];
          const isSelected = value === name;
          const dimmed = activeZone && activeZone !== zone;
          return (
            <button
              key={name}
              type="button"
              onClick={() => onChange(isSelected ? '' : name)}
              style={{
                padding: '4px 10px', borderRadius: 20,
                background: isSelected ? zm.color : zm.bg,
                color: isSelected ? '#fff' : zm.color,
                border: `1px solid ${isSelected ? zm.color : 'transparent'}`,
                cursor: 'pointer', fontSize: 11, fontWeight: isSelected ? 700 : 600,
                fontFamily: font, transition: 'all 0.15s',
                whiteSpace: 'nowrap',
                opacity: dimmed ? 0.35 : 1,
              }}
            >
              {name}
            </button>
          );
        })}
      </div>

      {/* ── Zone legend ── */}
      <div style={{
        display: 'flex', gap: 12, marginTop: 10,
        padding: '8px 12px', borderRadius: 8,
        background: dark ? '#1a2620' : '#f8faf9',
        border: `1px solid ${border}`,
        direction: 'rtl',
      }}>
        {(Object.entries(ZONE_META) as [Zone, typeof ZONE_META.north][]).map(([, zm]) => (
          <div key={zm.ar} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              background: zm.color, flexShrink: 0,
            }} />
            <span style={{ fontSize: 11, color: muted, fontFamily: font }}>
              {isAr ? zm.ar : zm.fr}
            </span>
          </div>
        ))}
        <span style={{ fontSize: 10, color: muted, fontFamily: font, marginRight: 'auto' }}>
          {isAr ? '(منزل / مكتب) دج' : 'DA (domicile / bureau)'}
        </span>
      </div>
    </div>
  );
}
