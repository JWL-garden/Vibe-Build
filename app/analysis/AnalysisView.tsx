'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Step1Target from '@/components/steps/Step1Target'
import { useAnalysisStore } from '@/store/analysisStore'

/** 분석 화면 본문: 대상 건축물 정보 (+ 추후 3D 뷰)
 * TODO [4-3]: 9단계 스텝퍼 레이아웃으로 확장 */
export default function AnalysisView({ pnu }: { pnu: string }) {
  const { buildings, selectedBuildingId, status, loadSite, selectBuilding } = useAnalysisStore()

  useEffect(() => {
    loadSite(pnu)
  }, [pnu, loadSite])

  const building = buildings.find((b) => b.id === selectedBuildingId) ?? buildings[0]

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← 주소 다시 입력
        </Link>

        {(status === 'idle' || status === 'loading') && <p className="mt-8 text-slate-500">불러오는 중…</p>}

        {status === 'notFound' && (
          <p className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
            해당 필지의 건축물대장 정보를 찾을 수 없습니다.
          </p>
        )}

        {status === 'ready' && building && (
          <>
            <header className="mt-4">
              <h1 className="text-2xl font-bold text-slate-800">{building.address}</h1>
              <p className="mt-1 text-sm text-slate-500">
                {building.roadAddress ?? '도로명 주소 없음'}
                {building.buildingName && ` · ${building.buildingName}`}
              </p>
            </header>

            {buildings.length > 1 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {buildings.map((b, i) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => selectBuilding(b.id)}
                    className={`rounded-full border px-3 py-1 text-sm ${
                      b.id === building.id
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-300 bg-white text-slate-600 hover:border-blue-400'
                    }`}
                  >
                    {b.dongName ?? b.buildingName ?? `건물 ${i + 1}`}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-6 grid gap-6 lg:grid-cols-[3fr_2fr]">
              <section>
                <h2 className="mb-3 text-lg font-semibold text-slate-700">대상 건축물 정보</h2>
                <Step1Target building={building} />
              </section>

              <section>
                <h2 className="mb-3 text-lg font-semibold text-slate-700">3D 뷰</h2>
                <div className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white text-slate-400">
                  3D 뷰는 추후 추가 예정입니다
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
