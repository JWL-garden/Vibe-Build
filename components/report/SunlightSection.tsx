import type { SunlightRule } from '@/types'

interface Envelope {
  label: string
  rule: SunlightRule
  /** 이 규칙에서 건물 위치의 허용 높이 (m, 계산 결과) */
  allowedHeightM: number | null
  accent: boolean
}

interface Props {
  /** 건물 북측 외벽 ~ 정북 경계 거리 (m) */
  setbackM: number
  /** 현재 높이 (m) */
  heightM: number
  /** 증축 후 높이 (m) */
  newHeightM: number
  envelopes: Envelope[]
}

// 도면 축척: 1m = 6px, 정북 경계선이 왼쪽, 남쪽이 오른쪽
const S = 6
const X0 = 120 // 정북 경계선 위치 (왼쪽 여백은 허용 높이 글자 자리)
const GROUND = 272
const MAX_H = 42
const BUILDING_DEPTH_M = 12 // 도식용 건물 깊이 (실제 외곽선 없음)
const px = (m: number) => X0 + m * S
const py = (m: number) => GROUND - m * S

/** 규칙의 사선 외곽선: 1.5m 띄운 수직선 → 기준높이 → 높이 = 거리 ÷ 비율 (설계서 5-2 그림) */
function envelopePoints(rule: SunlightRule): string {
  const corner = rule.lowHeightM * rule.ratio // 사선이 기준높이와 만나는 거리
  const xEnd = MAX_H * rule.ratio
  return [
    [rule.lowSetbackM, 0],
    [rule.lowSetbackM, rule.lowHeightM],
    [Math.max(rule.lowSetbackM, corner), rule.lowHeightM],
    [xEnd, MAX_H],
  ]
    .map(([x, y]) => `${px(x)},${py(y)}`)
    .join(' ')
}

/** 정북방향 단면 다이어그램 (계산 결과 값만 그림) */
export default function SunlightSection({ setbackM, heightM, newHeightM, envelopes }: Props) {
  const bx = px(setbackM)
  const bw = BUILDING_DEPTH_M * S

  return (
    <svg viewBox="0 0 470 300" className="mx-auto w-full max-w-[560px] break-inside-avoid" role="img" aria-label="정북방향 일조 사선 단면도">
      <line x1="10" x2="460" y1={GROUND} y2={GROUND} stroke="var(--color-ink)" strokeWidth="1.2" />
      <line x1={X0} x2={X0} y1={GROUND} y2="14" stroke="var(--color-ink-faint)" strokeDasharray="4 3" />
      <text x={X0} y="10" textAnchor="middle" fontSize="9" fill="var(--color-ink-soft)">정북 경계</text>
      <text x={X0 - 6} y={GROUND + 14} textAnchor="end" fontSize="9" fill="var(--color-ink-faint)">북</text>
      <text x="458" y={GROUND + 14} textAnchor="end" fontSize="9" fill="var(--color-ink-faint)">남</text>

      {envelopes.map((e) => (
        <polyline
          key={e.label}
          points={envelopePoints(e.rule)}
          fill="none"
          stroke={e.accent ? 'var(--color-accent)' : 'var(--color-ink-faint)'}
          strokeWidth="1.5"
          strokeDasharray={e.accent ? undefined : '5 4'}
        />
      ))}

      {/* 기존 건물 + 증축층 */}
      <rect x={bx} y={py(heightM)} width={bw} height={heightM * S} fill="var(--color-existing)" fillOpacity="0.55" />
      {newHeightM > heightM && (
        <rect
          x={bx}
          y={py(newHeightM)}
          width={bw}
          height={(newHeightM - heightM) * S}
          fill="var(--color-accent)"
          fillOpacity="0.75"
        />
      )}
      <text x={bx + bw + 6} y={py(heightM) + 4} fontSize="9" fill="var(--color-ink-soft)">현재 {heightM}m</text>
      {newHeightM > heightM && (
        <text x={bx + bw + 6} y={py(newHeightM) + 4} fontSize="9" fill="var(--color-accent)" fontWeight="700">
          증축 후 {newHeightM}m
        </text>
      )}

      {/* 허용 높이 표시 */}
      {envelopes.map(
        (e) =>
          e.allowedHeightM !== null &&
          e.allowedHeightM <= MAX_H && (
            <g key={`h-${e.label}`}>
              <line
                x1={X0 - 6}
                x2={bx}
                y1={py(e.allowedHeightM)}
                y2={py(e.allowedHeightM)}
                stroke={e.accent ? 'var(--color-accent)' : 'var(--color-ink-faint)'}
                strokeWidth="0.7"
                strokeDasharray="2 2"
              />
              <circle cx={bx} cy={py(e.allowedHeightM)} r="2.5" fill={e.accent ? 'var(--color-accent)' : 'var(--color-ink-faint)'} />
              <text
                x={X0 - 10}
                y={py(e.allowedHeightM) + 3}
                textAnchor="end"
                fontSize="9"
                fill={e.accent ? 'var(--color-accent)' : 'var(--color-ink-soft)'}
              >
                {e.label} 허용 {e.allowedHeightM}m
              </text>
            </g>
          ),
      )}

      {/* 이격거리 치수 */}
      <line x1={X0} x2={bx} y1={GROUND + 22} y2={GROUND + 22} stroke="var(--color-ink-soft)" strokeWidth="0.8" />
      <text x={(X0 + bx) / 2} y={GROUND + 19} textAnchor="middle" fontSize="9" fill="var(--color-ink-soft)">
        이격 {setbackM}m
      </text>
    </svg>
  )
}
