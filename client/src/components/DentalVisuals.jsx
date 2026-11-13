import React, { useId } from 'react'

const uidOf = (id) => id.replace(/[^a-zA-Z0-9]/g, '')

/* Small tooth mark used in glass chips */
export function ToothMini({ className = '' }) {
  const u = uidOf(useId())
  const id = (n) => `${u}-${n}`
  return (
    <svg className={className} viewBox="0 0 120 140" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id={id('b')} cx="38%" cy="28%" r="80%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#eaf3ff" />
          <stop offset="100%" stopColor="#a9c7f2" />
        </radialGradient>
      </defs>
      <path
        d="M 60 18 C 51 18 45 21 41 27 C 33 21 23 24 18 34 C 12 46 15 58 20 70 C 25 82 29 95 32 110 C 35 122 42 124 45 112 C 48 101 48 92 60 92 C 72 92 72 101 75 112 C 78 124 85 122 88 110 C 91 95 95 82 100 70 C 105 58 108 46 102 34 C 97 24 87 21 79 27 C 75 21 69 18 60 18 Z"
        fill={`url(#${id('b')})`}
        stroke="rgba(255,255,255,0.8)"
        strokeWidth="1.2"
      />
      <ellipse cx="44" cy="44" rx="10" ry="15" fill="#fff" opacity="0.8" transform="rotate(-18 44 44)" />
    </svg>
  )
}

/* ------------------------------------------------------------------
   Isometric clinic illustration
------------------------------------------------------------------- */
export function IsoClinic({ className = '' }) {
  const u = uidOf(useId())
  const id = (n) => `${u}-${n}`
  return (
    <svg className={className} viewBox="0 0 380 300" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={id('ground')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#dbe9ff" />
          <stop offset="100%" stopColor="#b8d1f6" />
        </linearGradient>
        <linearGradient id={id('roof')} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#d3e5ff" />
        </linearGradient>
        <linearGradient id={id('wallL')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4d8cf6" />
          <stop offset="100%" stopColor="#1f55b8" />
        </linearGradient>
        <linearGradient id={id('wallR')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7fb0ff" />
          <stop offset="100%" stopColor="#3a72d6" />
        </linearGradient>
        <linearGradient id={id('glass')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d6f8ff" />
          <stop offset="100%" stopColor="#71d6ff" />
        </linearGradient>
        <linearGradient id={id('tooth')} x1="0" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#cfe6ff" />
        </linearGradient>
        <radialGradient id={id('halo')} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#4fd3ff" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#4fd3ff" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="190" cy="262" rx="128" ry="26" fill="#2b4c7e" opacity="0.14" />

      {/* ground platform */}
      <path d="M 44 232 L 190 168 L 336 232 L 190 296 Z" fill={`url(#${id('ground')})`} />
      <path d="M 44 232 L 190 296 L 190 306 L 44 242 Z" fill="#a9c4ec" opacity="0.55" />
      <path d="M 336 232 L 190 296 L 190 306 L 336 242 Z" fill="#93b2df" opacity="0.55" />
      <path d="M 44 232 L 190 168 L 336 232" stroke="#ffffff" strokeWidth="1.4" opacity="0.7" />

      {/* main building */}
      <path d="M 100 120 L 190 164 L 190 234 L 100 190 Z" fill={`url(#${id('wallL')})`} />
      <path d="M 190 164 L 280 120 L 280 190 L 190 234 Z" fill={`url(#${id('wallR')})`} />
      <path d="M 190 76 L 280 120 L 190 164 L 100 120 Z" fill={`url(#${id('roof')})`} />

      {/* upper tier */}
      <path d="M 145 82 L 190 102 L 190 126 L 145 106 Z" fill={`url(#${id('wallL')})`} opacity="0.92" />
      <path d="M 190 102 L 235 82 L 235 106 L 190 126 Z" fill={`url(#${id('wallR')})`} opacity="0.92" />
      <path d="M 190 62 L 235 82 L 190 102 L 145 82 Z" fill={`url(#${id('roof')})`} />

      {/* windows left */}
      <path d="M 116 152 L 144 165 L 144 184 L 116 171 Z" fill={`url(#${id('glass')})`} opacity="0.95" />
      <path d="M 154 170 L 182 183 L 182 202 L 154 189 Z" fill={`url(#${id('glass')})`} opacity="0.8" />
      <path d="M 116 152 L 144 165 M 130 158 L 130 177" stroke="#ffffff" strokeWidth="1" opacity="0.5" />

      {/* windows right */}
      <path d="M 198 183 L 226 170 L 226 189 L 198 202 Z" fill={`url(#${id('glass')})`} opacity="0.95" />
      <path d="M 236 165 L 264 152 L 264 171 L 236 184 Z" fill={`url(#${id('glass')})`} opacity="0.8" />

      {/* door */}
      <path d="M 200 212 L 224 201 L 224 226 L 200 237 Z" fill="#0b2a5c" opacity="0.9" />
      <path d="M 202 214 L 222 205 L 222 224 L 202 233 Z" fill={`url(#${id('glass')})`} opacity="0.55" />

      {/* steps */}
      <path d="M 176 242 L 214 226 L 232 234 L 194 250 Z" fill="#cfe0f8" />
      <path d="M 176 248 L 214 232 L 232 240 L 194 256 Z" fill="#b7cfee" />

      {/* sign glow + tooth */}
      <ellipse cx="190" cy="34" rx="52" ry="42" fill={`url(#${id('halo')})`} />
      <circle cx="190" cy="34" r="27" fill="rgba(255,255,255,0.55)" stroke="rgba(255,255,255,0.9)" strokeWidth="1.4" />
      <path
        d="M 190 18 C 185 18 182 20 180 23 C 175 20 169 21 166 27 C 162 34 165 41 168 47 C 171 54 173 61 175 68 C 177 74 181 75 183 68 C 185 62 185 57 190 57 C 195 57 195 62 197 68 C 199 75 203 74 205 68 C 207 61 209 54 212 47 C 215 41 218 34 214 27 C 211 21 205 20 200 23 C 198 20 195 18 190 18 Z"
        fill={`url(#${id('tooth')})`}
        stroke="rgba(255,255,255,0.95)"
        strokeWidth="1"
      />

      {/* trees */}
      <g>
        <path d="M 76 224 l0 -14" stroke="#7c9cc9" strokeWidth="2" strokeLinecap="round" />
        <circle cx="76" cy="204" r="11" fill="#9fc3f0" opacity="0.85" />
        <circle cx="72" cy="201" r="6" fill="#c3dcfb" opacity="0.9" />
        <path d="M 306 220 l0 -13" stroke="#7c9cc9" strokeWidth="2" strokeLinecap="round" />
        <circle cx="306" cy="201" r="9" fill="#9fc3f0" opacity="0.85" />
        <circle cx="303" cy="198" r="5" fill="#c3dcfb" opacity="0.9" />
      </g>

      {/* floating accents */}
      <circle cx="332" cy="96" r="4" fill="#7fdcff" opacity="0.9" />
      <circle cx="58" cy="120" r="3" fill="#8fb8ff" opacity="0.8" />
      <path d="M 322 150 l2 5.6 5.6 2 -5.6 2 -2 5.6 -2 -5.6 -5.6 -2 5.6 -2 z" fill="#9fe8ff" opacity="0.8" />
    </svg>
  )
}

/* ------------------------------------------------------------------
   Activity ring — status-aware ticks
------------------------------------------------------------------- */
export function ActivityRing({ total, confirmed, awaiting, proposed, label = 'appointments' }) {
  const u = uidOf(useId())
  const gid = `${u}-ring`
  const size = 200
  const c = 100
  const r = 76
  const stroke = 15
  const circ = 2 * Math.PI * r
  const ratio = total ? Math.max(0.05, confirmed / total) : 0
  const dash = circ
  const off = circ * (1 - ratio)

  return (
    <div className="ring-widget">
      <svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0857e6" />
            <stop offset="60%" stopColor="#1d8bff" />
            <stop offset="100%" stopColor="#00d4ff" />
          </linearGradient>
        </defs>
        <circle className="ring-track" cx={c} cy={c} r={r} strokeWidth={stroke} />
        <circle
          className="ring-progress"
          cx={c}
          cy={c}
          r={r}
          stroke={`url(#${gid})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={dash}
          strokeDashoffset={off}
          transform={`rotate(-90 ${c} ${c})`}
          style={{ '--dash': dash, '--off': off }}
        />
        </svg>
      <div className="ring-center">
        <strong>{total}</strong>
        <span>{label}</span>
        <small>{confirmed} settled</small>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------
   Rhythm — miniature smooth area chart
------------------------------------------------------------------- */
export function WeeklyRhythm({ counts, days }) {
  const u = uidOf(useId())
  const gid = `${u}-line`
  const aid = `${u}-area`
  const W = 340
  const H = 150
  const padX = 14
  const top = 20
  const base = H - 18
  const max = Math.max(1, ...days.map((d) => counts[d] || 0))
  const pts = days.map((d, i) => ({
    x: padX + (i * (W - padX * 2)) / Math.max(1, days.length - 1),
    y: base - ((counts[d] || 0) / max) * (base - top),
    v: counts[d] || 0,
    d,
  }))
  const line = pts.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`
    const prev = pts[i - 1]
    const cx = (prev.x + p.x) / 2
    return `${acc} C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`
  }, '')
  const area = `${line} L ${pts[pts.length - 1].x} ${base} L ${pts[0].x} ${base} Z`
  const peak = pts.reduce((a, b) => (b.v > a.v ? b : a), pts[0])

  return (
    <>
      <div className="rhythm-chart">
        <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0857e6" />
              <stop offset="55%" stopColor="#1d8bff" />
              <stop offset="100%" stopColor="#00d4ff" />
            </linearGradient>
            <linearGradient id={aid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2f8bff" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#2f8bff" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.55, 0.85].map((p) => (
            <line key={p} x1={padX} x2={W - padX} y1={top + (base - top) * p} y2={top + (base - top) * p} stroke="var(--line)" strokeWidth="1" strokeDasharray="3 6" />
          ))}
          <path className="rhythm-area" d={area} fill={`url(#${aid})`} />
          <path className="rhythm-line" d={line} stroke={`url(#${gid})`} strokeWidth="3" strokeLinecap="round" fill="none" />
          {pts.map((p, i) => (
            <circle
              key={p.d}
              className="rhythm-dot"
              cx={p.x}
              cy={p.y}
              r={i === pts.indexOf(peak) && p.v > 0 ? 4.6 : 3.4}
              fill="var(--surface-input, #fff)"
              stroke="#2f8bff"
              strokeWidth="2"
              style={{ animationDelay: `${0.5 + i * 0.08}s` }}
            />
          ))}
          {peak.v > 0 && (
            <g className="rhythm-peak" transform={`translate(${peak.x - 15} ${Math.max(2, peak.y - 30)})`}>
              <rect width="30" height="19" rx="9.5" fill="#0857e6" />
              <text x="15" y="13" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700">{peak.v}</text>
            </g>
          )}
        </svg>
      </div>
      <div className="rhythm-days">
        {days.map((d) => <span key={d}>{d.slice(0, 3)}</span>)}
      </div>
    </>
  )
}

/* ------------------------------------------------------------------
   Clinic pulse waveform
------------------------------------------------------------------- */
export function PulseWave() {
  const u = uidOf(useId())
  const gid = `${u}-wave`
  const d = 'M 0 54 H 24 L 32 54 L 40 26 L 48 74 L 57 46 L 64 54 H 96 L 104 54 L 112 34 L 120 66 L 129 48 L 136 54 H 170 L 178 54 L 186 24 L 194 70 L 203 44 L 210 54 H 246 L 254 54 L 262 36 L 270 62 L 279 48 L 286 54 H 340'
  return (
    <svg viewBox="0 0 340 90" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#00a9db" stopOpacity="0.1" />
          <stop offset="45%" stopColor="#1d8bff" />
          <stop offset="100%" stopColor="#00e5ff" />
        </linearGradient>
      </defs>
      <path d={d} stroke={`url(#${gid})`} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="wave-main" />
      <path d={d} stroke={`url(#${gid})`} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" opacity="0.22" className="wave-glow" />
    </svg>
  )
}
