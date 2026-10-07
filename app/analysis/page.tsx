import { redirect } from 'next/navigation'
import AnalysisView from './AnalysisView'
import SampleAnalysisView from './SampleAnalysisView'

/** ② 분석
 *  /analysis?sample=S1     → 샘플 분석 (가상 건물)
 *  /analysis?pnu=필지번호   → 실제 주소 분석 (영등포구 건축물대장) */
export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { pnu, sample } = await searchParams
  if (typeof sample === 'string' && sample !== '') return <SampleAnalysisView sampleId={sample} />
  if (typeof pnu !== 'string' || pnu === '') redirect('/')

  return <AnalysisView pnu={pnu} />
}
