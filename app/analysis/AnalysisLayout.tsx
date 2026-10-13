import Link from 'next/link'
import BuildingIllustration from '@/components/layout/BuildingIllustration'
import MassView from '@/components/three/MassView'
import Step1Target from '@/components/steps/Step1Target'
import type { InfoRow } from '@/lib/report/buildingRows'
import type { Expandability } from '@/types'

interface Props {
  /** 제목 위 작은 글씨 (예: '대상 건축물 분석') */
  eyebrow: string
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
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header>
        <p className="text-sm font-medium text-accent">{p.eyebrow}</p>
        <h1 className="mt-2 font-serif text-3xl font-bold leading-snug text-ink sm:text-4xl">{p.title}</h1>
        <p className="mt-2 text-ink-soft">{p.subtitle}</p>
      </header>

      {p.notice && <div className="mt-5">{p.notice}</div>}
      {p.buildingSelector && <div className="mt-6">{p.buildingSelector}</div>}

      <section className="mt-10">
        <SectionTitle title="건축물 정보" caption={p.infoCaption} />
        <Step1Target items={p.infoRows} />
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
          <ViewPanel label={`${p.workName ?? '증축'} 전`} description="현재 건물">
            {p.massPnu ? (
              <MassView pnu={p.massPnu} mode="before" floorsAbove={p.floorsAbove} addFloors={p.addFloors} rebuildFloors={p.massRebuildFloors ?? null} sideAreaM2={p.massSideAreaM2} useModel={p.massUseModel} />
            ) : (
              <BuildingIllustration floors={p.floorsAbove} className="h-56 w-full" />
            )}
          </ViewPanel>
          <ViewPanel label={`${p.workName ?? '증축'} 후`} description={p.afterCaption} accent>
            {p.massPnu ? (
              <MassView pnu={p.massPnu} mode="after" floorsAbove={p.floorsAbove} addFloors={p.addFloors} rebuildFloors={p.massRebuildFloors ?? null} sideAreaM2={p.massSideAreaM2} useModel={p.massUseModel} />
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
  children,
}: {
  label: string
  description: string
  accent?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-card border border-line">
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${accent ? 'bg-accent' : 'bg-existing'}`} />
          <span className="font-medium text-ink">{label}</span>
        </div>
        <span className="text-right text-sm text-ink-faint">{description}</span>
      </div>
      <div className="flex aspect-[4/3] flex-col items-center justify-end bg-mist px-8 pb-6">
        {children}
      </div>
    </div>
  )
}

const BADGE: Record<Expandability['status'], { text: string; className: string }> = {
  pending: { text: '판정 대기', className: 'bg-mist text-ink-soft' },
  possible: { text: '증축 가능', className: 'bg-accent-soft text-accent' },
  conditional: { text: '조건부 가능', className: 'bg-accent-soft text-accent' },
  check: { text: '확인 필요', className: 'bg-mist text-ink' },
  impossible: { text: '증축 불가', className: 'bg-mist text-ink-faint' },
}

/** 증축 가능 판정 + 보고서 이동 버튼. 증축 불가로 판정되면 버튼을 잠근다 */
function ReportCta({ expandability, reportHref }: { expandability: Expandability; reportHref: string }) {
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
          href={reportHref}
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
