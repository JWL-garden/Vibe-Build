import { formatRate } from '@/lib/format'
import type { SensitivityItem } from '@/types'

/** 민감도 토네이도 차트: 가운데 선 = 기준 ROI, 왼쪽 = 불리할 때, 오른쪽 = 유리할 때 */
export default function TornadoChart({ items, baseRoiRate }: { items: SensitivityItem[]; baseRoiRate: number }) {
  // 막대 길이를 맞추기 위한 표시 범위 (기준 ROI에서 가장 멀리 벗어난 값)
  const span = Math.max(...items.flatMap((i) => [Math.abs(i.lowRoiRate - baseRoiRate), Math.abs(i.highRoiRate - baseRoiRate)]), 0.001)
  const pct = (d: number) => `${(Math.abs(d) / span) * 50}%`
  const grid = 'grid grid-cols-[8rem_3rem_1fr_3rem] items-center gap-2'

  return (
    <div className="break-inside-avoid">
      <div className={`${grid} mb-2 text-xs text-ink-faint`}>
        <span />
        <span />
        <div className="flex justify-between">
          <span>← ROI 하락</span>
          <span>기준 {formatRate(baseRoiRate)}</span>
          <span>ROI 상승 →</span>
        </div>
        <span />
      </div>
      <div className="space-y-2">
        {items.map((i) => (
          <div key={i.label} className={`${grid} text-sm`}>
            <span className="text-ink">
              {i.label} <span className="text-xs text-ink-faint">{i.rangeLabel}</span>
            </span>
            <span className="text-right text-xs tabular-nums text-ink-soft">{formatRate(i.lowRoiRate)}</span>
            <div className="relative h-6">
              <div className="absolute inset-y-0 left-1/2 w-px bg-ink/40" />
              <div className="absolute inset-y-1 rounded-l bg-existing/60" style={{ right: '50%', width: pct(i.lowRoiRate - baseRoiRate) }} />
              <div className="absolute inset-y-1 rounded-r bg-deep/80" style={{ left: '50%', width: pct(i.highRoiRate - baseRoiRate) }} />
            </div>
            <span className="text-xs tabular-nums text-ink-soft">{formatRate(i.highRoiRate)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
