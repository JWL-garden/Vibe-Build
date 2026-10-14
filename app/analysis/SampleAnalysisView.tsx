'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { judgeFromExpansion } from '@/lib/calc'
import { rowsFromSample } from '@/lib/report/buildingRows'
import { getSampleReport } from '@/lib/services/dataService'
import type { ReportData } from '@/types'
import AnalysisLayout from './AnalysisLayout'

/** 샘플 분석 화면 (증축 가능하다고 가정한 가상 건물) */
export default function SampleAnalysisView({ sampleId }: { sampleId: string }) {
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
          <p className="text-ink">샘플 &lsquo;{sampleId}&rsquo;를 찾을 수 없습니다.</p>
          <Link href="/" className="mt-3 inline-block text-sm font-medium text-deep hover:underline">
            메인으로 →
          </Link>
        </div>
      </main>
    )
  }

  const b = data.building
  const after = data.analysis.expansion.after

  return (
    <AnalysisLayout
      eyebrow={`샘플 분석 · 가상 건물 ${sampleId}`}
      title={b.address.roadAddress ?? b.address.jibunAddress}
      subtitle={`${b.buildingName ?? ''} · ${b.zone}`}
      notice={
        <p className="rounded-card border border-line bg-mist px-5 py-3 text-sm text-ink-soft">
          증축이 가능하다고 가정한 <b className="text-ink">가상 건물의 샘플</b>입니다. 주소·건축주·시세·비용은 모두
          예시값이며, 법규 완화 시나리오는 프로젝트 가정입니다.
        </p>
      }
      buildingSelector={null}
      infoRows={rowsFromSample(data)}
      infoCaption="샘플 데이터"
      floorsAbove={b.floorsAbove}
      addFloors={after.addFloors}
      afterCaption={`${data.meta.scenarioName} · +${after.addFloors}층`}
      expandability={judgeFromExpansion(after, data.meta.scenarioName)}
      reportHref={`/report?sample=${sampleId}`}
    />
  )
}
