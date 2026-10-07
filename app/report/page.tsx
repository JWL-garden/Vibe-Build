import { redirect } from 'next/navigation'
import type { ScenarioId } from '@/types'
import ReportView from './ReportView'
import SampleReportView from './SampleReportView'

/** ③ 보고서
 *  /report?sample=S1          → 샘플 보고서 (가상 건물, 전체 장)
 *  /report?pnu=필지번호&b=건물id&s=시나리오 → 실제 주소 보고서 (기준 엑셀 필지: 표지·1~3장, 그 외: 표지·1장) */
const SCENARIO_IDS: ScenarioId[] = ['BASE', 'A', 'B', 'C', 'ALL']

export default async function ReportRoute({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { pnu, b, s, sample } = await searchParams
  if (typeof sample === 'string' && sample !== '') return <SampleReportView sampleId={sample} />
  if (typeof pnu !== 'string' || pnu === '') redirect('/')

  return (
    <ReportView
      pnu={pnu}
      buildingId={typeof b === 'string' ? b : null}
      scenario={typeof s === 'string' && SCENARIO_IDS.includes(s as ScenarioId) ? (s as ScenarioId) : null}
    />
  )
}
