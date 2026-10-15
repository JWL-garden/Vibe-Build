'use client'

import { useEffect, useState } from 'react'
import BuildingIllustration from '@/components/layout/BuildingIllustration'
import ReportGeneratingOverlay from '@/components/layout/ReportGeneratingOverlay'
import MassView from '@/components/three/MassView'
import MotionIntro, { MOTION_COUNT_MS, type MotionGroup } from '@/components/layout/MotionIntro'
import Step1Target from '@/components/steps/Step1Target'
import type { InfoRow } from '@/lib/report/buildingRows'
import type { Expandability } from '@/types'

interface Props {
  /** 제목 위 작은 글씨 (예: '샘플 분석 · 가상 건물 S1'). 없으면 표시 안 함 */
  eyebrow?: string
  /** 건축물 정보 왼쪽에 놓는 첫 화면 모션의 구역별 숫자 (증축분·재건축분, runAll 결과). 없으면 건축물 정보만 전체 폭으로 */
  motionGroups?: MotionGroup[]
  title: string
  subtitle: string
  /** 제목 아래 안내 문구 (샘플 표기 등, 없으면 null) */
  notice: React.ReactNode | null
  /** 한 필지에 건물이 여러 동일 때 동 선택 버튼 (없으면 null) */
  buildingSelector: React.ReactNode | null
  infoRows: InfoRow[]
  infoCaption: string
  floorsAbove: number
  /** 증축 층수 (모르면 null → 그림에 '?') */
  addFloors: number | null
  /** 증축 후 패널 설명 (예: '증축 계획안 · +4층') */
  afterCaption: string
  /** 3D 매스 모델(GLB)에서 찾을 필지 PNU — 없으면(샘플 등) 일러스트 */
  massPnu?: string | null
  /** false면 GLB 대신 일러스트 */
  massUseModel?: boolean
  /** 재건축 시나리오: 계산 엔진의 신축 지상 층수 (0 = 신축 불가). 재건축이 아니면 생략 */
  massRebuildFloors?: number | null
  /** 증축 연면적에 포함된 측면 보강부 면적 (㎡, 계산 엔진). 0이면 3D에서 숨김, 생략하면 모델 그대로 */
  massSideAreaM2?: number
  expandability: Expandability
  reportHref: string
  /** 3D 위쪽에 놓는 첫 단계 — 건축 시나리오 선택. 없으면 표시 안 함 */
  scenarioStep?: { title: string; caption: string; content: React.ReactNode }
  /** 3D 섹션 제목 (예: '증축 기본 계획안' / '재건축 기본 계획안'). 생략하면 '3D 매스' */
  planTitle?: string
  /** 증축 / 재건축 — 3D 전·후 패널 이름에 쓴다 (생략하면 증축) */
  workName?: '증축' | '재건축'
  /** 3D 아래쪽 상세 분석 단계 (건축개요, 수익성 분석). 없으면 표시 안 함 */
  steps?: { title: string; caption: string; content: React.ReactNode }[]
}

/** ② 분석 화면 공통 틀: 건축물 정보 + 3D 증축 전/후 자리 + 증축 가능 판정 + 보고서 이동 + 상세 분석 단계
 * TODO [4-3]: 일조권·용적률·수익성 단계 추가 */
export default function AnalysisLayout(p: Props) {
  // 첫 화면 숫자 모션이 끊기지 않도록, 3D 모델(무거움)은 모션이 끝난 뒤 불러온다
  const hasMotion = !!p.motionGroups
  const [show3d, setShow3d] = useState(!hasMotion)
  // view 버튼: 누를 때마다 +1 → 해당 3D 뷰 카메라를 처음 화면으로 되돌린다
  const [resetBefore, setResetBefore] = useState(0)
  const [resetAfter, setResetAfter] = useState(0)
  useEffect(() => {
    if (!hasMotion) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const t = setTimeout(() => setShow3d(true), reduce ? 0 : MOTION_COUNT_MS + 500)
    return () => clearTimeout(t)
  }, [hasMotion])

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header>
        {p.eyebrow && <p className="text-sm font-medium text-ink-soft">{p.eyebrow}</p>}
        <h1 className="mt-2 font-serif text-3xl font-bold leading-snug text-ink sm:text-4xl">{p.title}</h1>
        <p className="mt-2 text-ink-soft">{p.subtitle}</p>
      </header>

      {p.notice && <div className="mt-5">{p.notice}</div>}
      {p.buildingSelector && <div className="mt-6">{p.buildingSelector}</div>}

      <section className="mt-10">
        <SectionTitle title="건축물 정보" caption={p.infoCaption} />
        {p.motionGroups ? (
          <div className="grid gap-5 md:grid-cols-2">
            <MotionIntro groups={p.motionGroups} />
            <Step1Target items={p.infoRows} compact />
          </div>
        ) : (
          <Step1Target items={p.infoRows} />
        )}
      </section>

      {p.scenarioStep && (
        <section className="mt-14">
          <SectionTitle title={p.scenarioStep.title} caption={p.scenarioStep.caption} />
          {p.scenarioStep.content}
        </section>
      )}

      <section className="mt-14">
        <SectionTitle
          title={p.planTitle ?? '3D 매스'}
          caption={p.massPnu && p.massUseModel !== false ? '드래그 = 회전  ·  휠 = 확대' : '모델이 없으면 일러스트로 표시'}
        />
        <div className="grid gap-5 md:grid-cols-2">
          <ViewPanel label={`${p.workName ?? '증축'} 전`} description="현재 건물" onReset={p.massPnu ? () => setResetBefore((n) => n + 1) : undefined}>
            {p.massPnu && !show3d ? (
              <div className="h-56 w-full" />
            ) : p.massPnu ? (
              <MassView fill resetKey={resetBefore} pnu={p.massPnu} mode="before" floorsAbove={p.floorsAbove} addFloors={p.addFloors} rebuildFloors={p.massRebuildFloors ?? null} sideAreaM2={p.massSideAreaM2} useModel={p.massUseModel} />
            ) : (
              <BuildingIllustration floors={p.floorsAbove} className="h-56 w-full" />
            )}
          </ViewPanel>
          <ViewPanel label={`${p.workName ?? '증축'} 후`} description={p.afterCaption} accent onReset={p.massPnu ? () => setResetAfter((n) => n + 1) : undefined}>
            {p.massPnu && !show3d ? (
              <div className="h-56 w-full" />
            ) : p.massPnu ? (
              <MassView fill resetKey={resetAfter} pnu={p.massPnu} mode="after" floorsAbove={p.floorsAbove} addFloors={p.addFloors} rebuildFloors={p.massRebuildFloors ?? null} sideAreaM2={p.massSideAreaM2} useModel={p.massUseModel} />
            ) : (
              <BuildingIllustration floors={p.floorsAbove} addFloors={p.addFloors} showAddition className="h-56 w-full" />
            )}
          </ViewPanel>
        </div>
      </section>

      {p.steps?.map((step) => (
        <section key={step.title} className="mt-14">
          <SectionTitle title={step.title} caption={step.caption} />
          {step.content}
        </section>
      ))}

      <ReportCta expandability={p.expandability} reportHref={p.reportHref} />
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

/** 3D 매스 패널 (GLB 모델 또는 일러스트) */
function ViewPanel({
  label,
  description,
  accent = false,
  onReset,
  children,
}: {
  label: string
  description: string
  accent?: boolean
  /** 있으면 라벨 옆에 작은 view 버튼을 둔다 (3D 카메라 초기화) */
  onReset?: () => void
  children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-card border border-line">
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${accent ? 'bg-accent' : 'bg-existing'}`} />
          <span className="font-medium text-ink">{label}</span>
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              title="처음 3D 화면으로 되돌리기"
              className="rounded-full border border-line px-2 py-0.5 text-[11px] leading-none text-ink-soft transition hover:border-ink/30 hover:text-ink"
            >
              view
            </button>
          )}
        </div>
        <span className="text-right text-sm text-ink-faint">{description}</span>
      </div>
      <div className="flex aspect-[4/3] flex-col items-stretch justify-end bg-mist px-[11px] pb-0 pt-[11px]">
        {children}
      </div>
    </div>
  )
}

const BADGE: Record<Expandability['status'], { text: string; className: string }> = {
  pending: { text: '판정 대기', className: 'bg-mist text-ink-soft' },
  possible: { text: '증축 가능', className: 'bg-mist text-deep' },
  conditional: { text: '조건부 가능', className: 'bg-mist text-deep' },
  check: { text: '확인 필요', className: 'bg-mist text-ink' },
  impossible: { text: '증축 불가', className: 'bg-mist text-ink-faint' },
}

/** 증축 가능 판정 + 보고서 이동 버튼. 증축 불가로 판정되면 버튼을 잠근다 */
function ReportCta({ expandability, reportHref }: { expandability: Expandability; reportHref: string }) {
  const badge = BADGE[expandability.status]
  const canReport = expandability.status !== 'impossible'
  // 보고서 버튼을 누르면 분석 화면 위에 "보고서 생성 중" 팝업을 띄우고, 끝나면 보고서로 이동한다
  const [generating, setGenerating] = useState(false)

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
        <button
          type="button"
          onClick={() => setGenerating(true)}
          disabled={generating}
          className="shrink-0 rounded-full bg-action px-6 py-3 text-center font-medium text-paper transition hover:bg-action-hover disabled:cursor-wait"
        >
          보고서 보기 →
        </button>
      ) : (
        <span className="shrink-0 cursor-not-allowed rounded-full bg-line px-6 py-3 text-center font-medium text-ink-faint">
          보고서 출력 불가
        </span>
      )}
      {generating && <ReportGeneratingOverlay href={reportHref} />}
    </section>
  )
}
