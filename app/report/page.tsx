import { redirect } from 'next/navigation'
import ReportView from './ReportView'
import SampleReportView from './SampleReportView'

/** ③ 보고서
 *  /report?sample=S1          → 샘플 보고서 (가상 건물, 전체 장)
 *  /report?pnu=필지번호&b=건물id → 실제 주소 보고서 (계산 엔진 연결 전: 표지·1장) */
export default async function ReportRoute({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { pnu, b, sample } = await searchParams
  if (typeof sample === 'string' && sample !== '') return <SampleReportView sampleId={sample} />
  if (typeof pnu !== 'string' || pnu === '') redirect('/')

  return <ReportView pnu={pnu} buildingId={typeof b === 'string' ? b : null} />
}
