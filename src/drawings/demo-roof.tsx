export function DemoRoofDrawing() {
  return (
    <div className="drawing-scroll" role="img" aria-label="DEMO nyeregtető rajz, 12 méteres ereszéllel">
      <svg className="demo-roof-svg" viewBox="0 0 640 340" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <defs><linearGradient id="roof-fill" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="var(--brand)" stopOpacity=".85" /><stop offset="1" stopColor="#8f3d0a" stopOpacity=".8" /></linearGradient></defs>
        <path d="M95 245 320 78l225 167" fill="none" stroke="var(--foreground)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
        <path d="M135 230 320 95l185 135v46H135Z" fill="url(#roof-fill)" fillOpacity=".18" stroke="var(--brand)" strokeWidth="3" />
        <path d="M320 95v181M135 276h370" fill="none" stroke="var(--foreground)" strokeDasharray="8 8" strokeOpacity=".55" strokeWidth="2" />
        <path d="M135 304h370M135 294v20M505 294v20" fill="none" stroke="var(--foreground)" strokeWidth="2" />
        <text x="320" y="330" fill="var(--foreground)" fontSize="18" textAnchor="middle">DEMO · ereszél: 12,0 m</text>
        <text x="332" y="116" fill="var(--foreground)" fontSize="16">gerinc</text>
        <text x="152" y="268" fill="var(--foreground)" fontSize="16">eresz</text>
      </svg>
    </div>
  );
}
