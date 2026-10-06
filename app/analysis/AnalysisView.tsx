'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import BuildingIllustration from '@/components/layout/BuildingIllustration'
import Step1Target from '@/components/steps/Step1Target'
import { useAnalysisStore } from '@/store/analysisStore'
import type { Expandability } from '@/types'

/** ② 분석: 건축물 정보 + 3D 증축 전/후 자리 + 보고서 이동
 * TODO [4-3]: 아래쪽에 일조권·용적률·완화·수익성 단계 추가 */
export default function AnalysisView({ pnu }: { pnu: string }) {
  const { buildings, selectedBuildingId, expandability, status, loadSite, selectBuilding } = useAnalysisStore()

  useEffect(() => {
    loadSite(pnu)
  }, [pnu, loadSite])

  const building = buildings.find((b) => b.id === selectedBuildingId) ?? buildings[0]

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {(status === 'idle' || status === 'loading') && <p className="text-ink-soft">불러오는 중…</p>}

      {status === 'notFound' && (
        <div className="rounded-card border border-line bg-mist p-6">
          <p className="text-ink">해당 필지의 건축물대장 정보를 찾을 수 없습니다.</p>
          <Link href="/#search" className="mt-3 inline-block text-sm font-medium text-accent hover:underline">
            다른 주소 검색하기 →
          </Link>
        </div>
      )}

      {status === 'ready' && building && (
        <>
          <header>
            <p className="text-sm font-medium text-accent">대상 건축물 분석</p>
            <h1 className="mt-2 font-serif text-3xl font-bold leading-snug text-ink sm:text-4xl">{building.address}</h1>
            <p className="mt-2 text-ink-soft">
              {building.roadAddress ?? '도로명 주소 없음'}
              {building.buildingName && ` · ${building.buildingName}`}
            </p>
          </header>

          {buildings.length > 1 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {buildings.map((b, i) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => selectBuilding(b.id)}
                  className={`rounded-full border px-4 py-1.5 text-sm transition ${
                    b.id === building.id
                      ? 'border-ink bg-ink text-paper'
                      : 'border-line bg-paper text-ink-soft hover:border-ink/30'
                  }`}
                >
                  {b.dongName ?? b.buildingName ?? `건물 ${i + 1}`}
                </button>
              ))}
            </div>
          )}

          <section className="mt-10">
            <SectionTitle title="건축물 정보" caption="건축물대장 표제부" />
            <Step1Target building={building} />
          </section>

          <section className="mt-14">
            <SectionTitle title="3D 매스" caption="Day 5 구현 예정" />
            <div className="grid gap-5 md:grid-cols-2">
              <ViewPanel label="증축 전" description="현재 건물">
                <BuildingIllustration floors={building.floorsAbove} className="h-56 w-full" />
              </ViewPanel>
              <ViewPanel label="증축 후" description="법규 완화 적용 시 증축안" accent>
                <BuildingIllustration floors={building.floorsAbove} showAddition className="h-56 w-full" />
              </ViewPanel>
            </div>
          </section>

          {expandability && <ReportCta pnu={pnu} buildingId={building.id} expandability={expandability} />}
        </>
      )}
    </main>
  )
}

function SectionTitle({ title, caption }: { title: string; caption: string }) {
  return (
    <div className="mb-5 flex items-end justify-between border-b border-line pb-3">
      <h2 className="font-serif text-2xl font-bold text-ink">{title}</h2>
      <span className="text-sm text-ink-faint">{caption}</span>
    </div>
  )
}

/** 3D 뷰가 들어갈 자리 (지금은 일러스트) */
function ViewPanel({
  label,
  description,
  accent = false,
  children,
}: {
  label: string
  description: string
  accent?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-card border border-line">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${accent ? 'bg-accent' : 'bg-existing'}`} />
          <span className="font-medium text-ink">{label}</span>
        </div>
        <span className="text-sm text-ink-faint">{description}</span>
      </div>
      <div className="flex aspect-[4/3] flex-col items-center justify-end bg-mist px-8 pb-6">
        {children}
        <p className="mt-3 text-xs text-ink-faint">3D 뷰는 추후 추가됩니다</p>
      </div>
    </div>
  )
}

const BADGE: Record<Expandability['status'], { text: string; className: string }> = {
  pending: { text: '판정 대기', className: 'bg-mist text-ink-soft' },
  possible: { text: '증축 가능', className: 'bg-accent-soft text-accent' },
  impossible: { text: '증축 불가', className: 'bg-mist text-ink-faint' },
}

/** 증축 가능 판정 + 보고서 이동 버튼. 증축 불가로 판정되면 버튼을 잠근다 */
function ReportCta({ pnu, buildingId, expandability }: { pnu: string; buildingId: string; expandability: Expandability }) {
  const badge = BADGE[expandability.status]
  const canReport = expandability.status !== 'impossible'

  return (
    <section className="mt-14 flex flex-col gap-5 rounded-card border border-line p-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-3">
          <span className="font-serif text-xl font-bold text-ink">증축 가능 여부</span>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${badge.className}`}>{badge.text}</span>
        </div>
        <p className="mt-2 text-sm text-ink-soft">{expandability.reason}</p>
      </div>
      {canReport ? (
        <Link
          href={`/report?pnu=${pnu}&b=${buildingId}`}
          className="shrink-0 rounded-full bg-ink px-6 py-3 text-center font-medium text-paper transition hover:bg-ink/80"
        >
          보고서 보기 →
        </Link>
      ) : (
        <span className="shrink-0 cursor-not-allowed rounded-full bg-line px-6 py-3 text-center font-medium text-ink-faint">
          보고서 출력 불가
        </span>
      )}
    </section>
  )
}
