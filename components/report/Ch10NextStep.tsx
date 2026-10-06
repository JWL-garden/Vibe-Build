import type { ReportData } from '@/types'
import { Lead } from './ReportParts'

/** 10장: 다음 단계 제안 */
export default function Ch10NextStep({ data }: { data: ReportData }) {
  return (
    <div>
      <Lead>본 보고서는 개략 검토입니다. 아래 순서로 숫자를 실제 값으로 바꿔 가며 사업 여부를 결정하시길 권합니다.</Lead>

      <ol className="mt-8 grid grid-cols-3 gap-4">
        {data.nextSteps.map((s) => (
          <li key={s.step} className="rounded-card border border-line p-5 break-inside-avoid">
            <span className="font-serif text-3xl font-bold text-accent">{s.step}</span>
            <h3 className="mt-2 font-serif text-lg font-bold text-ink">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.description}</p>
          </li>
        ))}
      </ol>

      <div className="mt-10 rounded-card bg-ink px-6 py-6 text-paper break-inside-avoid">
        <p className="text-sm text-paper/70">지금 결정할 한 가지</p>
        <p className="mt-2 font-serif text-xl font-bold leading-snug">{data.decisionNow}</p>
      </div>
    </div>
  )
}
