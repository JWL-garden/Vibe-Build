// 호스팅 전 검토용 정적 페이지 (npm run export:review 로 HTML 생성)
// 실제 분석 화면·보고서 컴포넌트를 그대로 쓰고, 필지·시나리오별 결과를 미리 모두 그려 둔다.
// 숫자는 모두 runAll 결과(buildSiteReport)에서 오며 여기서 계산하지 않는다.

import BuildingIllustration from '@/components/layout/BuildingIllustration'
import SiteReportPages from '@/components/report/site/SiteReportPages'
import Step1Target from '@/components/steps/Step1Target'
import Step5Relaxation from '@/components/steps/Step5Relaxation'
import Step6Expansion from '@/components/steps/Step6Expansion'
import Step8Finance from '@/components/steps/Step8Finance'
import { rowsFromExcelSite } from '@/lib/report/buildSiteReport'
import type { Expandability, SiteData, SiteReport, ViewScenario as Scenario, ViewScenarioId as ScenarioId } from '@/types'

export interface ReviewBlock {
  scenarioId: ScenarioId
  report: SiteReport
  expandability: Expandability
}

export interface ReviewParcel {
  /** 화면 탭 id (t1, t2) — 링크 끝에 #t1 처럼 붙이면 그 필지가 열린다 */
  key: string
  /** 예: 'T1 당산동6가 104-10 (렉스빌)' */
  label: string
  data: SiteData
  blocks: ReviewBlock[]
}

interface Props {
  parcels: ReviewParcel[]
  scenarios: Scenario[]
  /** 처음 보여줄 시나리오 */
  defaultScenario: ScenarioId
  generatedAt: string
  sourceLabel: string
}

const BADGE: Record<Expandability['status'], { text: string; className: string }> = {
  pending: { text: '판정 대기', className: 'bg-mist text-ink-soft' },
  possible: { text: '증축 가능', className: 'bg-accent-soft text-accent' },
  conditional: { text: '조건부 가능', className: 'bg-accent-soft text-accent' },
  check: { text: '확인 필요', className: 'border border-ink/30 bg-paper text-ink' },
  impossible: { text: '증축 불가', className: 'bg-mist text-ink-faint' },
}

const TAB = 'rounded-full border px-4 py-2 text-sm transition border-line bg-paper text-ink-soft hover:border-ink/30 aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper'

export default function ReviewPage({ parcels, scenarios, defaultScenario, generatedAt, sourceLabel }: Props) {
  const first = parcels[0]
  return (
    <div className="min-h-full bg-paper text-ink">
      <header className="sticky top-[env(safe-area-inset-top,0px)] z-20 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="font-serif text-xl font-bold tracking-tight">Vibe Build</span>
            <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">호스팅 전 검토본</span>
          </div>
          <nav className="flex gap-4 text-sm text-ink-soft">
            <a href="#analysis" className="hover:text-ink">분석 화면</a>
            <a href="#report" className="hover:text-ink">건축주 보고서</a>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-6 pt-10 sm:px-6">
        <p className="text-sm font-medium text-accent">법규 완화 · 일조권 · 용적률 · 주차 · 증축 검토</p>
        <h1 className="mt-3 max-w-3xl text-balance font-serif text-3xl font-bold leading-snug sm:text-4xl">
          당산동6가 2필지 증축 검토
        </h1>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          웹서비스의 분석 화면과 건축주 보고서를 필지·법규 시나리오별로 미리 펼쳐 둔 검토용 페이지입니다. 필지와
          시나리오를 고르면 같은 숫자로 만든 분석 결과와 보고서가 함께 바뀝니다.
        </p>
        <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-1 text-sm">
          <div className="flex gap-2">
            <dt className="text-ink-faint">생성일</dt>
            <dd>{generatedAt}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-ink-faint">건축물 데이터</dt>
            <dd>{sourceLabel}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-ink-faint">완화 시나리오</dt>
            <dd>A·B·C·ALL은 프로젝트 가정 (현행법 아님)</dd>
          </div>
        </dl>
      </section>

      <section
        id="controls"
        className="sticky top-[calc(env(safe-area-inset-top,0px)+3.75rem)] z-10 border-y border-line bg-mist/95 backdrop-blur"
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-medium tracking-wide text-ink-faint">필지</span>
            {parcels.map((p) => (
              <button key={p.key} type="button" data-parcel-tab={p.key} aria-pressed={p.key === first.key} className={TAB}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-medium tracking-wide text-ink-faint">법규 시나리오</span>
            {scenarios.map((s) => (
              <button
                key={s.id}
                type="button"
                data-scenario-tab={s.id}
                aria-pressed={s.id === defaultScenario}
                title={s.name}
                className={TAB}
              >
                {s.id}
              </button>
            ))}
          </div>
        </div>
      </section>

      {parcels.flatMap((p) =>
        p.blocks.map((b) => (
          <ParcelBlock
            key={`${p.key}-${b.scenarioId}`}
            parcel={p}
            block={b}
            scenarios={scenarios}
            hidden={!(p.key === first.key && b.scenarioId === defaultScenario)}
          />
        )),
      )}

      <footer className="mx-auto max-w-6xl px-4 py-10 text-xs leading-relaxed text-ink-faint sm:px-6">
        본 페이지는 기준 엑셀 자료와 예시 가정값 기반의 개략 검토이며 투자 권유가 아닙니다. 법규 완화 시나리오는
        프로젝트에서 가정한 정책안이며, 실제 증축 가능성은 지구단위계획·높이제한·주차장 기준·구조안전 등에 따라
        달라집니다.
      </footer>
    </div>
  )
}

function ParcelBlock({
  parcel,
  block,
  scenarios,
  hidden,
}: {
  parcel: ReviewParcel
  block: ReviewBlock
  scenarios: Scenario[]
  hidden: boolean
}) {
  const { site } = parcel.data
  const { report, expandability } = block
  const analysis = report.analysis
  const badge = BADGE[expandability.status]
  const scenarioName = scenarios.find((s) => s.id === block.scenarioId)?.name ?? block.scenarioId

  return (
    <div data-block data-parcel={parcel.key} data-block-scenario={block.scenarioId} hidden={hidden}>
      <section data-anchor="analysis" className="mx-auto max-w-6xl scroll-mt-40 px-4 py-10 sm:px-6">
        <p className="text-sm font-medium text-accent">
          분석 화면 · {block.scenarioId} {scenarioName}
        </p>
        <h2 className="mt-2 text-balance font-serif text-3xl font-bold leading-snug">{site.address}</h2>
        <p className="mt-2 text-ink-soft">
          {site.roadAddress ?? '도로명 주소 없음'}
          {site.buildingName ? ` · ${site.buildingName}` : ''}
        </p>

        <div className="mt-6 flex flex-col gap-2 rounded-card border border-line p-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-serif text-lg font-bold">증축 가능 여부</span>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${badge.className}`}>{badge.text}</span>
          </div>
          <p className="text-sm leading-relaxed text-ink-soft">{expandability.reason}</p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0">
            <SectionTitle title="건축물 정보" caption={parcel.data.sourceLabel} />
            <Step1Target items={rowsFromExcelSite(site)} />
          </div>
          <div className="min-w-0">
            <SectionTitle title="증축 전 / 후" caption="3D 뷰 자리 (일러스트)" />
            <div className="grid grid-cols-2 gap-3">
              {[false, true].map((after) => (
                <div key={String(after)} className="rounded-card bg-mist px-4 pb-3 pt-4">
                  <BuildingIllustration
                    floors={site.floorsAbove}
                    addFloors={report.summary.addFloors}
                    showAddition={after}
                    className="h-40 w-full"
                  />
                  <p className="mt-2 text-center text-xs text-ink-faint">{after ? '증축 후' : '증축 전'}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-14">
          <SectionTitle title="⑤ 법규 완화" caption="카드를 누르면 시나리오가 바뀝니다" />
          <Step5Relaxation
            analysis={analysis}
            zone={site.zone ?? '용도지역 정보 없음'}
            scenarios={scenarios}
            onSelect={() => undefined}
          />
        </div>

        <div className="mt-14">
          <SectionTitle title="⑥ 증축 산정" caption={`${block.scenarioId} 시나리오 · 주차 기준 최대 연면적`} />
          <Step6Expansion analysis={analysis} scenarios={scenarios} />
        </div>

        <div className="mt-14">
          <SectionTitle
            title="⑧ 수익성"
            caption={`${block.scenarioId} 시나리오 · 토지가액(공시지가 기준) · 자산가치(예시 가정값)`}
          />
          <Step8Finance analysis={analysis} />
        </div>
      </section>

      <section data-anchor="report" className="scroll-mt-40 bg-mist pb-16 pt-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionTitle title="건축주 보고서" caption={`A4 · ${report.meta.scenarioLabel}`} />
        </div>
        <div className="overflow-x-auto px-4">
          <div className="flex flex-col gap-8">
            <SiteReportPages report={report} staticLayout />
          </div>
        </div>
      </section>
    </div>
  )
}

function SectionTitle({ title, caption }: { title: string; caption: string }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-2 border-b border-line pb-3">
      <h3 className="font-serif text-2xl font-bold text-ink">{title}</h3>
      <span className="text-sm text-ink-faint">{caption}</span>
    </div>
  )
}
