interface Props {
  /** 기존 층수 (그림에서는 최대 12층까지만 그림) */
  floors: number
  /** 증축으로 올릴 층수. 모르면 null → 점선 '?' 블록으로 표시 */
  addFloors?: number | null
  /** true면 증축층을 그린다 */
  showAddition?: boolean
  className?: string
}

const MAX_DRAWN = 12
const MIN_SLOTS = 8 // 낮은 건물도 너무 작게 보이지 않도록 최소 8층 높이 기준으로 그림
const UNKNOWN_SLOTS = 2 // 증축 층수를 모를 때 '?' 블록이 차지하는 높이(층)

/** 건물 매스를 층별 막대로 그린 단순 일러스트 (3D 뷰가 생기기 전 자리표시용, 계산 없음) */
export default function BuildingIllustration({ floors, addFloors = null, showAddition = false, className }: Props) {
  const existing = Math.max(1, Math.min(floors, MAX_DRAWN))
  const unknown = addFloors === null
  const added = showAddition ? (unknown ? UNKNOWN_SLOTS : Math.max(0, Math.min(addFloors, MAX_DRAWN - existing))) : 0

  const floorH = 10
  const gap = 2
  const step = floorH + gap
  const width = 64
  const slots = Math.max(MIN_SLOTS, existing + (showAddition ? Math.max(added, UNKNOWN_SLOTS) : UNKNOWN_SLOTS))
  const viewH = slots * step + 14
  const x = (160 - width) / 2
  const groundY = viewH - 6
  const floorY = (i: number) => groundY - (i + 1) * step

  return (
    <svg viewBox={`0 0 160 ${viewH}`} className={className} role="img" aria-label="건물 매스 일러스트">
      <line x1="16" x2="144" y1={groundY} y2={groundY} stroke="var(--color-line)" strokeWidth="2" />

      {Array.from({ length: existing }, (_, i) => (
        <rect key={i} x={x} y={floorY(i)} width={width} height={floorH} rx="2" fill="var(--color-existing)" fillOpacity="0.55" />
      ))}

      {showAddition &&
        !unknown &&
        Array.from({ length: added }, (_, i) => (
          <rect key={`a${i}`} x={x} y={floorY(existing + i)} width={width} height={floorH} rx="2" fill="var(--color-accent)" fillOpacity="0.85" />
        ))}

      {showAddition && unknown && (
        <g>
          <rect
            x={x}
            y={floorY(existing + UNKNOWN_SLOTS - 1)}
            width={width}
            height={UNKNOWN_SLOTS * step - gap}
            rx="2"
            fill="var(--color-accent-soft)"
            stroke="var(--color-accent)"
            strokeDasharray="4 3"
          />
          <text
            x="80"
            y={floorY(existing + UNKNOWN_SLOTS - 1) + (UNKNOWN_SLOTS * step - gap) / 2 + 4}
            textAnchor="middle"
            fontSize="12"
            fontWeight="700"
            fill="var(--color-accent)"
          >
            ?
          </text>
        </g>
      )}
    </svg>
  )
}
