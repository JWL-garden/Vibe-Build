'use client'

// 기준 엑셀 필지 보고서 — 목차(1쪽) + 표지·요약(2쪽) + 1~10장 + 부록 1·2
// A4 인쇄가 깔끔하게 나오도록 장마다 내용을 블록 단위로 측정해 쪽에 나눠 담는다 (lib/report/paginate.ts).
//  - 쪽은 A4(297mm) 높이로 고정, 블록·표 행은 쪽 경계에서 잘리지 않고 표는 쪽마다 머리글을 다시 단다
//  - 장 컴포넌트는 SiteReport만 읽고 계산하지 않는다 (여기서는 각 장 컴포넌트가 만든 블록을 쪽에 배치만 한다)

import {
  Children,
  Fragment,
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import { packUnits, type PackUnit } from '@/lib/report/paginate'
import type { SiteReport } from '@/types'
import Ch00Summary from '../Ch00Summary'
import { DataTable, SubTitle, type DataTableProps } from '../ReportParts'
import ReportPage from '../ReportPage'
import SiteAppendix from './SiteAppendix'
import SiteCh01Status from './SiteCh01Status'
import SiteCh02Regulation from './SiteCh02Regulation'
import SiteCh03Plan from './SiteCh03Plan'
import SiteCh04Cost from './SiteCh04Cost'
import SiteCh05Return from './SiteCh05Return'
import SiteCh06Scenario from './SiteCh06Scenario'
import SiteCh07Risk from './SiteCh07Risk'
import SiteCh08Schedule from './SiteCh08Schedule'
import SiteCh09Partners from './SiteCh09Partners'
import SiteCh10NextStep from './SiteCh10NextStep'
import SiteToc, { type TocEntry } from './SiteToc'
import SiteVerification from './SiteVerification'

/* ───────────── 장 정의 ───────────── */

interface ChapterDef {
  no: string
  title: string
  note: string
  root: ReactNode
}

function chapterDefs(report: SiteReport): ChapterDef[] {
  const rebuild = report.analysis.scenarioId === 'REBUILD'
  return [
    { no: '1장', title: '대상 건축물 현황', note: '건축물대장 요약·층별 용도·호별 면적·토지가액', root: SiteCh01Status({ report }) },
    { no: '2장', title: '법규 검토', note: '현행법규와 완화 기준 비교, 주차·주택 층수·용적률 검토', root: SiteCh02Regulation({ report }) },
    {
      no: '3장',
      title: rebuild ? '재건축 계획안' : '증축 계획안',
      note: rebuild ? '재건축 규모·세대·3D 매스, 산정 근거' : '증축 규모·세대·3D 매스, 대안 검토',
      root: SiteCh03Plan({ report }),
    },
    { no: '4장', title: '사업비 추정', note: '항목별 사업비, 자기자본·대출 구성, 공사비 근거', root: SiteCh04Cost({ report }) },
    { no: '5장', title: '수익 분석', note: '임대수익·ROI·회수기간, 보수·기준·낙관, 자산가치', root: SiteCh05Return({ report }) },
    { no: '6장', title: '시나리오·민감도', note: '보수·기준·낙관 비교, 토네이도 차트, 20년 현금흐름·NPV·IRR', root: SiteCh06Scenario({ report }) },
    { no: '7장', title: '리스크와 대응', note: '구조안전·금리·임차인·가정 의존도 리스크와 대응 방안', root: SiteCh07Risk({ report }) },
    { no: '8장', title: '추진 절차·일정', note: '층별·면적별 공사 기간, 단계별 기간·결정 시점·비용 지출 시점', root: SiteCh08Schedule({ report }) },
    { no: '9장', title: '전문가 협업 구성', note: '설계·구조·시공·감정평가·금융 역할과 투입 시점', root: SiteCh09Partners({ report }) },
    { no: '10장', title: '다음 단계 제안', note: '상담 → 정밀 타당성 검토 → 설계 계약, 지금 결정할 한 가지', root: SiteCh10NextStep({ report }) },
    { no: '부록 1', title: '근거·가정·데이터 출처', note: '적용 법규·가정값 표, 계산식, 출처, 면책', root: SiteAppendix({ report }) },
    { no: '부록 2', title: '데이터 검증', note: '기준 엑셀 대조, 수정할 데이터 목록', root: SiteVerification({ report }) },
  ]
}

/* ───────────── 블록(atom) 추출 ───────────── */

interface Atom {
  key: string
  kind: 'title' | 'table' | 'block'
  node: ReactNode
  /** 앞 블록과의 간격 (px) — 래퍼 margin-top 으로 적용 */
  gap: number
}

/** 간격만 주는 래퍼(div) — 펼쳐서 안쪽 요소를 각각 블록으로 본다 */
const PLAIN_TOKEN = /^(break-inside-avoid|mt-\d+|space-y-\d+)$/

/** tailwind 1단위 = 0.25rem = 4px */
const px = (tw: number) => tw * 4

function collect(node: ReactNode, out: Atom[], path: string, gapFirst = 0, gapRest = 0): void {
  Children.toArray(node).forEach((child, i) => {
    const gap = i === 0 ? gapFirst : gapRest
    const key = `${path}.${i}`
    if (isValidElement(child)) {
      const el = child as ReactElement<{ className?: string; children?: ReactNode }>
      if (el.type === Fragment) {
        collect(el.props.children, out, key, gap, gapRest)
        return
      }
      if (el.type === 'div') {
        const tokens = (el.props.className ?? '').split(/\s+/).filter(Boolean)
        if (tokens.every((t) => PLAIN_TOKEN.test(t))) {
          const mt = tokens.map((t) => /^mt-(\d+)$/.exec(t)).find(Boolean)
          const sy = tokens.map((t) => /^space-y-(\d+)$/.exec(t)).find(Boolean)
          collect(el.props.children, out, key, gap + (mt ? px(Number(mt[1])) : 0), sy ? px(Number(sy[1])) : 0)
          return
        }
      }
      if (el.type === SubTitle) {
        out.push({ key, kind: 'title', node: child, gap })
        return
      }
      if (el.type === DataTable) {
        out.push({ key, kind: 'table', node: child, gap })
        return
      }
    }
    out.push({ key, kind: 'block', node: child, gap })
  })
}

/* ───────────── 단위(unit) = 쪽 사이에서 함께 움직이는 덩어리 ───────────── */

interface Unit {
  /** 제목 블록 (표 또는 다음 블록과 함께 움직임) */
  lead: Atom | null
  /** 본문 블록 */
  body: Atom | null
  isTable: boolean
}

function toUnits(atoms: Atom[]): Unit[] {
  const units: Unit[] = []
  for (let i = 0; i < atoms.length; i++) {
    const a = atoms[i]
    if (a.kind === 'title') {
      const next = atoms[i + 1]
      if (next && next.kind !== 'title') {
        units.push({ lead: a, body: next, isTable: next.kind === 'table' })
        i++
      } else {
        units.push({ lead: null, body: a, isTable: false })
      }
    } else {
      units.push({ lead: null, body: a, isTable: a.kind === 'table' })
    }
  }
  return units
}

/* ───────────── 쪽 배치 결과 ───────────── */

interface MeasuredUnit extends PackUnit {
  unit: Unit
}

interface PageSpec {
  chapter: number
  /** 같은 장의 몇 번째 쪽 */
  part: number
  parts: number
  nodes: ReactNode[]
}

interface Layout {
  pages: PageSpec[]
  /** 장별 시작 쪽 번호 (표지가 2쪽, 1장은 3쪽부터) */
  startPage: number[]
  overflow: boolean
}

const FIRST_CHAPTER_PAGE = 3

/** 한 쪽에 들어가는 본문 높이에서 빼는 여유 (px) — 글꼴 렌더링 차이 대비 */
const SAFETY_PX = 16

function wrap(node: ReactNode, gap: number, key: string) {
  return (
    <div key={key} className="flow-root" style={{ marginTop: gap }}>
      {node}
    </div>
  )
}

function tableChunk(atom: Atom, rows: [number, number]): ReactNode {
  const el = atom.node as ReactElement<DataTableProps>
  const hl = el.props.highlightRow
  return cloneElement(el, {
    rows: el.props.rows.slice(rows[0], rows[1]),
    highlightRow: hl !== undefined && hl >= rows[0] && hl < rows[1] ? hl - rows[0] : undefined,
  })
}

/* ───────────── 본체 ───────────── */

export default function SiteReportPages({ report, staticLayout = false }: { report: SiteReport; staticLayout?: boolean }) {
  const { meta, summary } = report
  const [layout, setLayout] = useState<Layout | null>(null)
  const [prevReport, setPrevReport] = useState(report)
  if (prevReport !== report) {
    setPrevReport(report)
    setLayout(null)
  }
  const measureRef = useRef<HTMLDivElement>(null)

  const chapters = chapterDefs(report)
  const chapterUnits = chapters.map((c, ci) => {
    const atoms: Atom[] = []
    collect(c.root, atoms, `c${ci}`)
    return toUnits(atoms)
  })

  // 1단계: 숨긴 영역에 모든 블록을 그려 높이를 잰다 (글꼴이 준비된 뒤)
  useEffect(() => {
    if (layout || staticLayout) return
    let cancelled = false
    const run = () => {
      const root = measureRef.current
      if (cancelled || !root) return
      const capEl = root.querySelector<HTMLElement>('[data-capacity]')
      const holder = capEl?.parentElement
      const padTop = holder ? parseFloat(getComputedStyle(holder).paddingTop) || 0 : 0
      const capacity = (holder?.clientHeight ?? 700) - padTop - SAFETY_PX
      const pages: PageSpec[] = []
      const startPage: number[] = []
      let overflow = false
      chapterUnits.forEach((units, ci) => {
        startPage.push(FIRST_CHAPTER_PAGE + pages.length)
        const measured: MeasuredUnit[] = units.map((unit, ui) => {
          const body = root.querySelector<HTMLElement>(`[data-atom="c${ci}-u${ui}-b"]`)
          const lead = root.querySelector<HTMLElement>(`[data-atom="c${ci}-u${ui}-l"]`)
          const leadH = lead ? lead.offsetHeight + (unit.lead?.gap ?? 0) : 0
          const bodyGap = unit.body?.gap ?? 0
          if (unit.isTable && body) {
            const table = body.querySelector('table')
            const rowEls = [...body.querySelectorAll<HTMLElement>('tbody tr')]
            const rowHeights = rowEls.map((r) => r.getBoundingClientRect().height)
            const tableH = table ? table.getBoundingClientRect().height : body.offsetHeight
            const headHeight = Math.max(0, tableH - rowHeights.reduce((s, h) => s + h, 0))
            return { unit, height: 0, table: { leadHeight: leadH + bodyGap, headHeight, rowHeights } }
          }
          return { unit, height: leadH + bodyGap + (body ? body.offsetHeight : 0) }
        })
        const packed = packUnits(measured, capacity)
        overflow ||= packed.overflow
        packed.pages.forEach((items, pi) => {
          const nodes: ReactNode[] = items.map((item, k) => {
            const m = measured[item.unit]
            const u = m.unit
            const key = `c${ci}-p${pi}-${k}`
            if (m.table && item.rows) {
              return (
                <Fragment key={key}>
                  {item.first && u.lead && wrap(u.lead.node, u.lead.gap, `${key}-l`)}
                  {wrap(tableChunk(u.body!, item.rows), item.first ? (u.body?.gap ?? 0) : 0, `${key}-t`)}
                </Fragment>
              )
            }
            return (
              <Fragment key={key}>
                {u.lead && wrap(u.lead.node, u.lead.gap, `${key}-l`)}
                {u.body && wrap(u.body.node, u.body.gap, `${key}-b`)}
              </Fragment>
            )
          })
          pages.push({ chapter: ci, part: pi + 1, parts: packed.pages.length, nodes })
        })
      })
      setLayout({ pages, startPage, overflow })
    }
    const fonts = (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts
    const go = () => requestAnimationFrame(run)
    if (fonts?.ready) void fonts.ready.then(go)
    else go()
    return () => {
      cancelled = true
    }
    // chapterUnits 는 report 로 만들어지므로 report·layout 이 바뀔 때만 다시 잰다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report, layout, staticLayout])

  const pageProps = { address: meta.address, sourceLabel: meta.sourceLabel }

  // 정적 HTML(검토본) — 브라우저에서 높이를 잴 수 없으므로 쪽 나눔 없이 장마다 한 장(높이 자동)으로 그린다
  if (staticLayout) {
    const toc: TocEntry[] = [
      { no: '표지', title: '표지·한 장 요약', note: '핵심 숫자·결론·3D 전후', page: 2 },
      ...chapters.map((c, i) => ({ no: c.no, title: c.title, note: c.note, page: FIRST_CHAPTER_PAGE + i })),
    ]
    return (
      <>
        <ReportPage {...pageProps} chapter={{ no: '목차', title: '목차' }} page={1}>
          <SiteToc entries={toc} />
        </ReportPage>
        <ReportPage {...pageProps} chapter={null} page={2}>
          <Ch00Summary
            title={meta.title}
            address={meta.address}
            createdAt={meta.createdAt}
            author="(주)바이브빌드 건축사사무소"
            scenarioName={meta.scenarioLabel}
            floorsAbove={summary.floorsAbove}
            addFloors={summary.addFloors}
            kpis={summary.kpis}
            conclusion={summary.conclusion}
            nextStep={null}
            massPnu={report.analysis.pnu}
            massSideAreaM2={report.plan.plan?.sideGfaM2 ?? 0}
            massRebuildFloors={
              report.analysis.scenarioId === 'REBUILD'
                ? report.analysis.rebuild.verdict === 'impossible'
                  ? 0
                  : report.analysis.rebuild.totalFloors
                : null
            }
          />
        </ReportPage>
        {chapters.map((c, i) => (
          <ReportPage key={c.no} {...pageProps} chapter={{ no: c.no, title: c.title }} page={FIRST_CHAPTER_PAGE + i}>
            {c.root}
          </ReportPage>
        ))}
      </>
    )
  }

  if (!layout) {
    return (
      <>
        <p className="mx-auto w-full max-w-[210mm] rounded-card border border-line bg-paper px-5 py-4 text-sm text-ink-soft print:hidden">
          보고서 쪽 구성 중…
        </p>
        {/* 높이를 재기 위한 숨긴 영역: 본문 폭(178mm)과 쪽 틀을 그대로 쓴다 */}
        <div
          ref={measureRef}
          aria-hidden
          style={{ position: 'absolute', left: '-10000px', top: 0, visibility: 'hidden', pointerEvents: 'none', width: '210mm' }}
        >
          <ReportPage {...pageProps} chapter={{ no: '1장', title: '측정' }} page={1} fixedHeight>
            <div data-capacity />
          </ReportPage>
          <div style={{ width: '178mm' }}>
            {chapterUnits.map((units, ci) =>
              units.map((u, ui) => (
                <div key={`${ci}-${ui}`}>
                  {u.lead && (
                    <div data-atom={`c${ci}-u${ui}-l`} className="flow-root" style={{ marginTop: u.lead.gap }}>
                      {u.lead.node}
                    </div>
                  )}
                  {u.body && (
                    <div data-atom={`c${ci}-u${ui}-b`} className="flow-root" style={{ marginTop: u.body.gap }}>
                      {u.body.node}
                    </div>
                  )}
                </div>
              )),
            )}
          </div>
        </div>
      </>
    )
  }

  const tocEntries: TocEntry[] = [
    { no: '표지', title: '표지·한 장 요약', note: '핵심 숫자·결론·3D 전후', page: 2 },
    ...chapters.map((c, i) => ({ no: c.no, title: c.title, note: c.note, page: layout.startPage[i] })),
  ]

  return (
    <>
      <ReportPage {...pageProps} chapter={{ no: '목차', title: '목차' }} page={1} fixedHeight>
        <SiteToc entries={tocEntries} />
      </ReportPage>

      <ReportPage {...pageProps} chapter={null} page={2} fixedHeight>
        <Ch00Summary
          title={meta.title}
          address={meta.address}
          createdAt={meta.createdAt}
          author="(주)바이브빌드 건축사사무소"
          scenarioName={meta.scenarioLabel}
          floorsAbove={summary.floorsAbove}
          addFloors={summary.addFloors}
          kpis={summary.kpis}
          conclusion={summary.conclusion}
          nextStep={null}
          massPnu={report.analysis.pnu}
          massSideAreaM2={report.plan.plan?.sideGfaM2 ?? 0}
          massRebuildFloors={
            report.analysis.scenarioId === 'REBUILD'
              ? report.analysis.rebuild.verdict === 'impossible'
                ? 0
                : report.analysis.rebuild.totalFloors
              : null
          }
        />
      </ReportPage>

      {layout.pages.map((pg, i) => (
        <ReportPage
          key={`${pg.chapter}-${pg.part}`}
          {...pageProps}
          chapter={{ no: chapters[pg.chapter].no, title: chapters[pg.chapter].title }}
          continued={pg.part > 1}
          page={FIRST_CHAPTER_PAGE + i}
          fixedHeight
        >
          {pg.nodes}
        </ReportPage>
      ))}
    </>
  )
}
