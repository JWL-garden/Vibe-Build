import { redirect } from 'next/navigation'
import AnalysisView from './AnalysisView'

/** 분석 페이지: /analysis?pnu=필지번호 */
export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { pnu } = await searchParams
  if (typeof pnu !== 'string' || pnu === '') redirect('/')

  return <AnalysisView pnu={pnu} />
}
