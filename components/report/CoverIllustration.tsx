import type { CSSProperties } from 'react'
import { COVER_BUILDING, COVER_GROUND_Y, COVER_VIEW, coverArtOffsetY, coverBuilding, COVER_SKETCH_SCALE } from '@/lib/report/coverLayout'

/** 일러스트에 쓰는 색 — 값은 CSS 변수(globals.css 토큰). 컴포넌트에서 색을 직접 쓰지 않는다 */
export interface CoverColors {
  /** 주인공 건물·집 선 */
  ink: string
  /** 흐린 선 (지붕선 스케치·지면선·나무) */
  muted: string
  /** 연한 선 (스케치 바닥선) */
  line: string
  /** 증축분 포인트 */
  accent: string
  /** 증축분 채우기 */
  accentTint: string
}

export const COVER_COLORS: CoverColors = {
  ink: 'var(--color-ink)',
  muted: 'var(--color-ink-faint)',
  line: 'var(--color-line)',
  accent: 'var(--color-action)',
  accentTint: 'var(--color-action-tint)',
}

interface Props {
  /** 기존 층수 */
  floors: number
  /** 증축 층수. 0 = 증축 불가(파랑 숨김), null = 미산정(파랑 숨김) */
  addFloors: number | null
  /** 증축 불가일 때 건물 아래 문구 (없으면 표시 안 함) */
  noExpansionLabel?: string
  /** full = 지면선·집·나무·지붕선 스케치까지 전체(표지), building = 주인공 건물만(랜딩 등 작은 곳) */
  variant?: 'full' | 'building'
  /** 크기·위치는 부모가 정한다 (SVG는 viewBox 비율을 유지) */
  className?: string
  colors?: Partial<CoverColors>
}

const line = (stroke: string, width = 1): CSSProperties => ({
  fill: 'none',
  stroke,
  strokeWidth: width,
  strokeLinejoin: 'round',
  strokeLinecap: 'round',
})

/** 맞배지붕 집 — 지면선(gy) 위에 선다 */
function Gable({ x, gy, w, h, rh, c }: { x: number; gy: number; w: number; h: number; rh: number; c: string }) {
  return (
    <g>
      <path d={`M${x} ${gy}V${gy - h}L${x + w / 2} ${gy - h - rh}L${x + w} ${gy - h}V${gy}`} style={line(c)} />
      <rect x={x + w * 0.62} y={gy - h * 0.62} width={w * 0.18} height={h * 0.34} style={line(c, 0.8)} />
    </g>
  )
}

/** 한쪽경사 지붕 집 */
function Shed({ x, gy, w, h, rh, c }: { x: number; gy: number; w: number; h: number; rh: number; c: string }) {
  return (
    <g>
      <path d={`M${x} ${gy}V${gy - h}L${x + w} ${gy - h - rh}V${gy}`} style={line(c)} />
      <rect x={x + w * 0.2} y={gy - h * 0.7} width={w * 0.2} height={h * 0.4} style={line(c, 0.8)} />
    </g>
  )
}

function Tree({ x, gy, h, c }: { x: number; gy: number; h: number; c: string }) {
  const r = h * 0.3
  return (
    <g>
      <line x1={x} y1={gy} x2={x} y2={gy - h + r * 2} style={line(c)} />
      <ellipse cx={x} cy={gy - h + r} rx={r * 0.8} ry={r} style={line(c)} />
    </g>
  )
}

/**
 * 표지 하단 일러스트 (docs/reference/cover.html 의 SVG를 옮김).
 * 주인공 건물의 층수는 props로 받고, 층이 많으면 층 높이를 줄여 영역 안에 둔다 (lib/report/coverLayout.ts).
 */
export default function CoverIllustration({ floors, addFloors, noExpansionLabel, variant = 'full', className, colors }: Props) {
  const c = { ...COVER_COLORS, ...colors }
  const b = coverBuilding(floors, addFloors)
  const gy = COVER_GROUND_Y
  const { x: bx, w: bw } = COVER_BUILDING
  const fh = b.floorH
  const dx = bx + bw + 16

  // building: 주인공 건물과 치수선만 보이도록 viewBox 를 좁힌다
  const viewBox =
    variant === 'full' ? `0 0 ${COVER_VIEW.w} ${COVER_VIEW.h}` : `${bx - 24} ${b.topY - 24} ${bw + 120} ${gy - b.topY + 64}`

  const text: CSSProperties = { fontSize: 12, fontWeight: 600, fill: c.accent }

  return (
    <svg viewBox={viewBox} className={className} aria-hidden>
      {/* 표지(full)는 일러스트 전체를 상하 가운데로 내린다 */}
      <g transform={`translate(0 ${variant === 'full' ? coverArtOffsetY() : 0})`}>
      {variant === 'full' && (
        <>
          {/* 상단 좌측: 지붕선 스케치 (제목을 두 줄에 넣기 위해 왼쪽 아래 기준으로 줄임) */}
          <g transform={`translate(64 214) scale(${COVER_SKETCH_SCALE}) translate(-64 -214)`}>
            <path d="M64 214V152L112 112L160 152V214" style={line(c.muted)} />
            <path d="M168 214V132L214 112L214 214" style={line(c.muted)} />
            <path d="M222 214V170L246 150L270 170V214" style={line(c.muted)} />
            <path d="M280 214V164L322 134V214" style={line(c.muted)} />
            <line x1="64" y1="214" x2="330" y2="214" style={line(c.line)} />
          </g>

          {/* 흐르는 지면선 */}
          <path d="M64 258V690Q64 750 124 750H570Q660 750 660 670V560Q660 510 720 510H794" style={line(c.muted, 1.1)} />

          <Tree x={150} gy={gy} h={64} c={c.muted} />
          <Gable x={176} gy={gy} w={58} h={44} rh={26} c={c.ink} />
          <Tree x={262} gy={gy} h={52} c={c.muted} />
          <Shed x={286} gy={gy} w={56} h={56} rh={14} c={c.ink} />
          <Tree x={496} gy={gy} h={58} c={c.muted} />
          <Gable x={516} gy={gy} w={50} h={38} rh={22} c={c.ink} />

          {/* 우측 상단 구간 */}
          <Tree x={716} gy={510} h={56} c={c.muted} />
          <Gable x={738} gy={510} w={40} h={32} rh={18} c={c.ink} />
        </>
      )}

      {/* 주인공 건물: 기존(잉크 선) */}
      <rect x={bx} y={b.baseTopY} width={bw} height={fh * b.baseFloors} style={line(c.ink, 1.2)} />
      {Array.from({ length: b.baseFloors - 1 }, (_, i) => (
        <line key={i} x1={bx} y1={gy - fh * (i + 1)} x2={bx + bw} y2={gy - fh * (i + 1)} style={line(c.ink, 0.8)} />
      ))}
      {Array.from({ length: b.baseFloors }, (_, f) =>
        [0, 1, 2].map((k) => (
          <rect key={`${f}-${k}`} x={bx + 10 + k * 28} y={gy - fh * (f + 1) + b.winOffsetY} width={16} height={b.winSize} style={line(c.muted, 0.8)} />
        )),
      )}

      {/* 증축분: 파랑 점선 박스 + 치수선 (증축 층수 > 0 일 때만) */}
      {b.addFloors > 0 && (
        <>
          <rect
            x={bx}
            y={b.topY}
            width={bw}
            height={fh * b.addFloors}
            style={{ ...line(c.accent, 1.2), fill: c.accentTint, strokeDasharray: '5 4' }}
          />
          {Array.from({ length: b.addFloors - 1 }, (_, i) => (
            <line
              key={i}
              x1={bx}
              y1={b.baseTopY - fh * (i + 1)}
              x2={bx + bw}
              y2={b.baseTopY - fh * (i + 1)}
              style={{ ...line(c.accent, 0.8), strokeDasharray: '5 4' }}
            />
          ))}
          {Array.from({ length: b.addFloors }, (_, f) =>
            [0, 1, 2].map((k) => (
              <rect
                key={`a${f}-${k}`}
                x={bx + 10 + k * 28}
                y={b.baseTopY - fh * (f + 1) + b.winOffsetY}
                width={16}
                height={b.winSize}
                style={line(c.accent, 0.8)}
              />
            )),
          )}
          <g style={line(c.accent)}>
            <line x1={dx} y1={b.topY} x2={dx} y2={b.baseTopY} />
            <line x1={dx - 5} y1={b.topY} x2={dx + 5} y2={b.topY} />
            <line x1={dx - 5} y1={b.baseTopY} x2={dx + 5} y2={b.baseTopY} />
          </g>
          <text x={dx + 10} y={(b.topY + b.baseTopY) / 2 + 4} style={text}>
            +{b.addFloors}F
          </text>
        </>
      )}

      {/* 증축 불가: 파랑 부분 없이 문구만 */}
      {addFloors === 0 && noExpansionLabel && (
        <text x={bx + bw / 2} y={gy + 24} textAnchor="middle" style={{ fontSize: 12, fontWeight: 500, fill: c.muted }}>
          {noExpansionLabel}
        </text>
      )}
      </g>
    </svg>
  )
}
