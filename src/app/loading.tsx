export default function GlobalLoading() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', backgroundColor: '#EEF5F1', color: '#1a3d2e', fontFamily: 'Cairo, sans-serif'
    }}>
      <div style={{ position: 'relative', width: 64, height: 64, marginBottom: 20 }}>
        <div style={{
          position: 'absolute', inset: 0, border: '4px solid rgba(175, 142, 74, 0.2)',
          borderRadius: '50%'
        }} />
        <div style={{
          position: 'absolute', inset: 0, border: '4px solid #AF8E4A',
          borderRadius: '50%', borderTopColor: 'transparent',
          animation: 'ihsen-spin 1s linear infinite'
        }} />
      </div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#244D3B' }}>جاري التحميل...</h2>
      <p style={{ fontSize: 13, color: '#6B8A76', marginTop: 4 }}>يرجى الانتظار قليلاً</p>
      <style>{`
        @keyframes ihsen-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
