import type { SiteReport } from '@/types'
import { Lead, SubTitle } from '../ReportParts'

/** 10장: 다음 단계 제안 — SiteReport만 읽는다 */
export default function SiteCh10NextStep({ report }: { report: SiteReport }) {
  const n = report.nextStep
  return (
    <div>
      <Lead>본 보고서는 개략 검토입니다. 아래 순서로 숫자를 실제 값으로 바꿔 가며 사업 여부를 결정하시길 권합니다.</Lead>

      <ol className="mt-8 grid grid-cols-3 gap-4">
        {n.steps.map((s) => (
          <li key={s.step} className="rounded-card border border-line p-5 break-inside-avoid">
            <span className="font-serif text-3xl font-bold text-accent">{s.step}</span>
            <h3 className="mt-2 font-serif text-lg font-bold text-ink">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.description}</p>
          </li>
        ))}
      </ol>

      {n.checklist.length > 0 && (
        <div className="break-inside-avoid">
          <SubTitle>정밀 검토 전에 확인할 항목</SubTitle>
          <ul className="space-y-2 text-sm leading-relaxed text-ink">
            {n.checklist.map((c) => (
              <li key={c} className="rounded-card border border-line px-4 py-3">
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-10 rounded-card bg-ink px-6 py-6 text-paper break-inside-avoid">
        <p className="text-sm text-paper/70">지금 결정할 한 가지</p>
        <p className="mt-2 font-serif text-xl font-bold leading-snug">{n.decisionNow}</p>
      </div>
    </div>
  )
}
