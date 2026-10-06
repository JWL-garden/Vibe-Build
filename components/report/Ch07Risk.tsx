import type { ReportData, Risk } from '@/types'
import { Badge, Lead } from './ReportParts'

const TONE: Record<Risk['level'], 'danger' | 'accent' | 'neutral'> = { 높음: 'danger', 중간: 'accent', 낮음: 'neutral' }

/** 7장: 리스크와 대응 */
export default function Ch07Risk({ data }: { data: ReportData }) {
  return (
    <div>
      <Lead>사업 결정 전에 확인해야 할 위험 요인과 대응 방안입니다. 수치가 좋아 보여도 아래 항목이 해결되어야 실행할 수 있습니다.</Lead>

      <div className="mt-8 space-y-4">
        {data.risks.map((r) => (
          <div key={r.title} className="rounded-card border border-line p-5 break-inside-avoid">
            <div className="flex items-center gap-3">
              <h3 className="font-serif text-lg font-bold text-ink">{r.title}</h3>
              <Badge tone={TONE[r.level]}>위험도 {r.level}</Badge>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink">{r.description}</p>
            <p className="mt-3 border-t border-line pt-3 text-sm leading-relaxed text-ink-soft">
              <b className="text-ink">대응</b> · {r.mitigation}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
