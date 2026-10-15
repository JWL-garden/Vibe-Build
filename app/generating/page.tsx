import { Suspense } from 'react'
import GeneratingView from './GeneratingView'

/** 분석 화면 → 보고서 사이 중간 페이지. /generating?next=/report?pnu=… */
export default function GeneratingRoute() {
  return (
    <Suspense fallback={null}>
      <GeneratingView />
    </Suspense>
  )
}
