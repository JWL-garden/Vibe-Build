import type { Risk, SiteReport } from '@/types'
import { Badge, Lead } from '../ReportParts'

const TONE: Record<Risk['level'], 'danger' | 'accent' | 'neutral'> = { 높음: 'danger', 중간: 'accent', 낮음: 'neutral' }

/** 7장: 리스크와 대응 — SiteReport만 읽고 계산하지 않는다 */
export default function SiteCh07Risk({ report }: { report: SiteReport }) {
  const { items, summary, rules } = report.risk
  return (
    <div>
      <Lead>
        사업 결정 전에 확인해야 할 위험 요인과 대응 방안입니다. 수치가 좋아 보여도 아래 항목이 해결되어야 실행할 수 있습니다. {summary}
      </Lead>

      <div className="mt-6 space-y-3">
        {items.map((r) => (
          <div key={r.title} className="rounded-card border border-line p-4 break-inside-avoid">
            <div className="flex items-center gap-3">
              <h3 className="font-serif text-base font-bold text-ink">{r.title}</h3>
              <Badge tone={TONE[r.level]}>위험도 {r.level}</Badge>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink">{r.description}</p>
            <p className="mt-2 border-t border-line pt-2 text-sm leading-relaxed text-ink-soft">
              <b className="text-ink">대응</b> · {r.mitigation}
            </p>
          </div>
        ))}
      </div>

      <ul className="mt-6 space-y-1 text-xs text-ink-faint">
        <li>· 위험도는 규칙 기반 자동 판정입니다 (프로젝트 가정): {rules.join(' / ')}</li>
        <li>· 법률·세무·구조 사항은 해당 전문가 확인이 필요합니다.</li>
      </ul>
    </div>
  )
}
