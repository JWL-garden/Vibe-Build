'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import FullReport from '@/components/report/FullReport'
import ReportToolbar from '@/components/report/ReportToolbar'
import { getSampleReport } from '@/lib/services/dataService'
import type { ReportData } from '@/types'

const SOURCE_LABEL = '샘플 데이터 · 예시 가정값 · 개략 검토 · 투자 권유 아님'

/** 샘플 보고서 (증축 가능하다고 가정한 가상 건물 S1) */
export default function SampleReportView({ sampleId }: { sampleId: string }) {
  const [data, setData] = useState<ReportData | null | undefined>(undefined)

  useEffect(() => {
    getSampleReport(sampleId).then(setData)
  }, [sampleId])

  if (data === undefined) {
    return <main className="mx-auto max-w-6xl px-4 py-10 text-ink-soft sm:px-6">불러오는 중…</main>
  }

  if (data === null) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="rounded-card border border-line bg-mist p-6">
          <p className="text-ink">샘플 보고서 &lsquo;{sampleId}&rsquo;를 찾을 수 없습니다.</p>
          <Link href="/" className="mt-3 inline-block text-sm font-medium text-deep hover:underline">
            메인으로 →
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="bg-mist pb-16 print:bg-paper print:pb-0">
      <ReportToolbar backHref={`/analysis?sample=${sampleId}`} backLabel="분석으로 돌아가기" info={`샘플 ${sampleId} · ${data.meta.scenarioName}`} />
      <p className="mx-auto mt-6 max-w-[210mm] rounded-card border border-line bg-paper px-5 py-3 text-sm text-ink-soft print:hidden">
        증축이 가능하다고 가정한 <b className="text-ink">가상 건물의 샘플 보고서</b>입니다. 주소·건축주·시세·비용은 모두
        예시값입니다.
      </p>
      <div className="mt-6 flex flex-col gap-8 px-4 print:mt-0 print:gap-0 print:px-0">
        <FullReport data={data} sourceLabel={SOURCE_LABEL} />
      </div>
    </main>
  )
}
