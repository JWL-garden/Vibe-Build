import type { ScheduleStep } from '@/types'

/** 추진 일정 간트형 막대 (개월 단위) */
export default function ScheduleChart({ steps }: { steps: ScheduleStep[] }) {
  const totalMonths = Math.max(...steps.map((s) => s.startMonth + s.durationMonths), 1)
  const ticks = Array.from({ length: Math.floor(totalMonths / 2) + 1 }, (_, i) => i * 2)

  return (
    <div className="break-inside-avoid">
      <div className="grid grid-cols-[6.5rem_1fr] text-xs text-ink-faint">
        <span />
        <div className="relative h-5">
          {ticks.map((t) => (
            <span
              key={t}
              className={`absolute whitespace-nowrap ${t >= totalMonths ? '-translate-x-full' : t === 0 ? '' : '-translate-x-1/2'}`}
              style={{ left: `${(t / totalMonths) * 100}%` }}
            >
              {t}개월
            </span>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {steps.map((s) => (
          <div key={s.name} className="grid grid-cols-[6.5rem_1fr] items-center text-sm">
            <span className="text-ink">{s.name}</span>
            <div className="relative h-6 rounded bg-mist">
              <div
                className="absolute inset-y-1 rounded bg-deep/80"
                style={{
                  left: `${(s.startMonth / totalMonths) * 100}%`,
                  width: `${(s.durationMonths / totalMonths) * 100}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
