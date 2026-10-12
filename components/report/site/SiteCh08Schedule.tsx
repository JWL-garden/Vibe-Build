import ScheduleChart from '@/components/charts/ScheduleChart'
import type { SiteReport } from '@/types'
import { DataTable, Lead, SubTitle } from '../ReportParts'

/** 8장: 추진 절차·일정 — SiteReport만 읽고 계산하지 않는다 */
export default function SiteCh08Schedule({ report }: { report: SiteReport }) {
  const s = report.schedule
  if (s.status !== 'ok') return <Lead>{s.statusText}</Lead>
  return (
    <div>
      <Lead>
        사전 검토부터 준공·임대까지 약 {s.totalMonths}개월이 예상됩니다. 각 단계에서 건축주가 결정해야 할 일과 비용이 나가는 시점을 함께 정리했습니다.
      </Lead>

      <SubTitle>단계별 일정</SubTitle>
      <ScheduleChart steps={s.steps} />

      <SubTitle>결정 시점과 비용 지출</SubTitle>
      <DataTable
        head={['단계', '기간', '건축주 결정', '비용 지출']}
        rows={s.steps.map((x) => [x.name, `${x.startMonth}~${x.startMonth + x.durationMonths}개월`, x.ownerDecision ?? '—', x.costNote ?? '—'])}
      />

      <ul className="mt-6 space-y-1 text-xs text-ink-faint">
        {s.notes.map((n) => (
          <li key={n}>· {n}</li>
        ))}
      </ul>
    </div>
  )
}
