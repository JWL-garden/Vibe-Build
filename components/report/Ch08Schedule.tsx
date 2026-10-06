import ScheduleChart from '@/components/charts/ScheduleChart'
import type { ReportData } from '@/types'
import { DataTable, Lead, SubTitle } from './ReportParts'

/** 8장: 추진 절차·일정 */
export default function Ch08Schedule({ data }: { data: ReportData }) {
  const last = data.schedule[data.schedule.length - 1]
  const totalMonths = last ? last.startMonth + last.durationMonths : 0

  return (
    <div>
      <Lead>
        사전 검토부터 준공·임대까지 약 {totalMonths}개월이 예상됩니다. 각 단계에서 건축주가 결정해야 할 일과 비용이
        나가는 시점을 함께 정리했습니다.
      </Lead>

      <SubTitle>단계별 일정</SubTitle>
      <ScheduleChart steps={data.schedule} />

      <SubTitle>결정 시점과 비용 지출</SubTitle>
      <DataTable
        head={['단계', '기간', '건축주 결정', '비용 지출']}
        rows={data.schedule.map((s) => [
          s.name,
          `${s.startMonth}~${s.startMonth + s.durationMonths}개월`,
          s.ownerDecision ?? '—',
          s.costNote ?? '—',
        ])}
      />
    </div>
  )
}
