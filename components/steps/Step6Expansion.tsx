import { Fragment } from 'react'
import { CHECK_LABEL, CHECK_STATUS_LABEL, LIMIT_LABEL } from '@/lib/calc'
import { formatNumber } from '@/lib/format'
import { hasMassModel } from '@/lib/geo/hasMassModel'
import { HOME_SCENARIO_NAME } from '@/lib/rules/scenarios'
import type { AddUnit, ExpansionCheck, ExpansionPlan, RebuildResult, SiteAnalysis, ViewScenario } from '@/types'

interface Props {
  analysis: SiteAnalysis
  /** 화면 시나리오 3개 (lib/rules/scenarios → viewScenarios) */
  scenarios: ViewScenario[]
}

const f = (v: number) => formatNumber(v, 2)

const STATUS_CLASS: Record<ExpansionCheck['status'], string> = {
  pass: 'bg-mist text-deep',
  fail: 'bg-ink text-paper',
  check: 'border border-ink/30 bg-paper text-ink',
}

const VERDICT = {
  possible: { text: '증축 가능', className: 'bg-deep text-paper' },
  check: { text: '확인 필요', className: 'border border-ink/30 bg-paper text-ink' },
  impossible: { text: '증축 불가', className: 'bg-mist text-ink-faint' },
} as const

const REBUILD_VERDICT = {
  possible: { text: '재건축 가능', className: 'bg-deep text-paper' },
  check: { text: '확인 필요', className: 'border border-ink/30 bg-paper text-ink' },
  impossible: { text: '재건축 불가', className: 'bg-mist text-ink-faint' },
} as const

const unitsText = (units: AddUnit[]) =>
  units.length === 0 ? '0세대' : units.map((u) => `${u.type} 전용 ${f(u.netAreaM2)}㎡`).join(' + ')

/**
 * ⑥ 증축 산정: 주차 여유 → 추가 세대 → 최대 연면적 흐름 + 다른 제한 반영 결과 + 항목별 판정.
 * REBUILD 시나리오면 철거 후 신축 산정(용적률·주택 층수·주택 연면적 한도 → 신축 연면적 → 세대·주차)을 보여준다.
 */
export default function Step6Expansion({ analysis, scenarios }: Props) {
  const e = analysis.selected
  const p = e.parking
  const modelLoaded = hasMassModel(analysis.pnu)

  if (analysis.scenarioId === 'REBUILD') {
    const r = analysis.rebuild
    return (
      <div className="space-y-8">
        <RebuildBlock r={r} modelLoaded={modelLoaded} />
        <ScenarioTable analysis={analysis} scenarios={scenarios} />
        <Reasons reasons={r.reasons} />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <FlowBlock
        title="기존 주차로 증축"
        steps={[
          {
            label: '주차 여유',
            value: `${f(p.spare)}대`,
            sub: `실제 ${f(p.actual)}대 − 법정 ${f(p.required.total)}대`,
          },
          {
            label: '추가 세대',
            value: `${e.rooftop.units.length}세대`,
            sub: unitsText(e.rooftop.units),
          },
          {
            label: '주차 기준 최대 연면적',
            value: `${f(e.rooftop.gfaM2)}㎡`,
            sub: e.rooftop.netM2 > 0 ? `연면적 = 전용 ${f(e.rooftop.netM2)}㎡ (옥탑세대, 세대당 최소 ${e.rules.parking.addedUnitMinNetM2}㎡)` : '추가 세대 없음',
          },
        ]}
        plan={e.plan}
        modelLoaded={modelLoaded}
      />

      {e.rooftopOption && e.parkingOption && (
        <FlowBlock
          title={`주차 ${e.rooftopOption.addSpaces}대 추가 확보 시`}
          note="대지 안에 주차를 추가로 배치할 수 있는지는 별도 확인이 필요합니다."
          steps={[
            {
              label: '주차 여유',
              value: `${f(e.rooftopOption.spareAfter)}대`,
              sub: `기존 여유 ${f(Math.max(0, p.spare))}대 + 추가 ${e.rooftopOption.addSpaces}대`,
            },
            { label: '추가 세대', value: `${e.rooftopOption.units.length}세대`, sub: unitsText(e.rooftopOption.units) },
            {
              label: '주차 기준 최대 연면적',
              value: `${f(e.rooftopOption.gfaM2)}㎡`,
              sub: `연면적 = 전용 ${f(e.rooftopOption.netM2)}㎡ (옥탑세대)`,
            },
          ]}
          plan={e.parkingOption}
          modelLoaded={modelLoaded}
        />
      )}

      <ScenarioTable analysis={analysis} scenarios={scenarios} />

      <Reasons reasons={[...e.plan.reasons, ...(e.parkingOption ? e.parkingOption.reasons.slice(-2) : [])]} />
    </div>
  )
}

function Reasons({ reasons }: { reasons: string[] }) {
  return (
    <details className="rounded-card border border-line px-5 py-4">
      <summary className="cursor-pointer text-sm font-medium text-ink">계산 근거 펼치기</summary>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-soft">
        {reasons.map((r, i) => (
          <li key={i}>{r}</li>
        ))}
      </ul>
    </details>
  )
}

interface FlowStep {
  label: string
  value: string
  sub: string
}

/** 재건축: 한도 3개 → 신축 연면적(최솟값) → 기존 대비·세대·주차·높이 */
function RebuildBlock({ r, modelLoaded }: { r: RebuildResult; modelLoaded: boolean }) {
  const diff = r.gfaM2 - r.existing.gfaM2
  const area = r.rules.housing
  return (
    <FlowFrame
      title="기존 건물 철거 후 신축"
      note={r.rules.rebuild.pilotiFloor1 ? '1층 필로티 주차 + 2층부터 주택 가정' : undefined}
      steps={[
        { label: '용적률 한도', value: `${f(r.farGfaM2)}㎡`, sub: `대지 ${f(r.siteAreaM2)}㎡ × ${f(r.farLimitPercent)}%` },
        {
          label: '주택 층수 한도',
          value: `${f(r.floorsGfaM2)}㎡`,
          sub: `최대 건축면적 ${f(r.maxBuildingAreaM2)}㎡ (건폐율 ${f(r.bcrLimitPercent)}%) × ${r.floorLimit}개층`,
        },
        {
          label: '주택 연면적 한도',
          value: `${f(r.housingAreaGfaM2)}㎡`,
          sub: `${r.housingType} ${f(area.maxAreaM2[r.housingType])}㎡ ${area.areaExclusive[r.housingType] ? '미만' : '이하'}`,
        },
      ]}
      finalLabel="세 한도 중 최솟값"
      finalValue={`${f(r.gfaM2)}㎡ · 지상 ${r.totalFloors}층`}
      verdict={REBUILD_VERDICT[r.verdict]}
      limitText={`제한요인: ${LIMIT_LABEL[r.limitingFactor]}`}
      checks={r.checks}
      modelLoaded={modelLoaded}
      footer={
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-4">
          <Fact
            label="기존 대비"
            value={`${diff >= 0 ? '+' : '−'}${f(Math.abs(diff))}㎡`}
            sub={`기존 ${f(r.existing.gfaM2)}㎡ · 지상 ${r.existing.floorsAbove}층`}
          />
          <Fact label="세대" value={`${r.households}세대`} sub={`세대당 전용 ${f(r.netPerUnitM2)}㎡ (기존 ${r.existing.households}세대)`} />
          <Fact label="법정 주차" value={`${f(r.parking.required)}대`} sub={`계획안 ${r.parking.planned}대`} />
          <Fact label="높이" value={`${f(r.heightM)}m`} sub={`용적률 ${f(r.farPercent)}%`} />
        </dl>
      }
    />
  )
}

function Fact({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-card bg-mist px-4 py-3">
      <dt className="text-xs text-ink-faint">{label}</dt>
      <dd className="mt-1 font-serif text-lg font-bold text-ink">{value}</dd>
      <dd className="text-xs leading-relaxed text-ink-soft">{sub}</dd>
    </div>
  )
}

function FlowBlock({ title, note, steps, plan, modelLoaded }: { title: string; note?: string; steps: FlowStep[]; plan: ExpansionPlan; modelLoaded: boolean }) {
  return (
    <FlowFrame
      title={title}
      note={note}
      steps={steps}
      finalLabel="다른 제한 반영 후 최종"
      finalValue={`${f(plan.addGfaM2)}㎡ · +${plan.addFloors}개층`}
      verdict={VERDICT[plan.verdict]}
      limitText={`제한요인: ${LIMIT_LABEL[plan.limitingFactor]}`}
      checks={plan.checks}
      modelLoaded={modelLoaded}
    />
  )
}

interface FrameProps {
  title: string
  note?: string
  steps: FlowStep[]
  finalLabel: string
  finalValue: string
  verdict: { text: string; className: string }
  limitText: string
  checks: ExpansionCheck[]
  footer?: React.ReactNode
  /** 증축 후 3D 모델이 있는 필지인지 */
  modelLoaded: boolean
}

const MODEL_CHECKED: ExpansionCheck['item'][] = ['floorPlate', 'parking', 'sunlight']

function FlowFrame({ title, note, steps, finalLabel, finalValue, verdict, limitText, checks, footer, modelLoaded }: FrameProps) {
  return (
    <div className="rounded-card border border-line p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium text-ink">{title}</h3>
        {note && <span className="text-xs text-ink-faint">{note}</span>}
      </div>

      {/* 단계 → 최종: 화살표는 박스와 박스 사이 빈 공간 가운데에 둔다 */}
      <ol className="mt-4 flex flex-col gap-2 md:flex-row md:items-stretch md:gap-0">
        {steps.map((s, i) => (
          <Fragment key={s.label}>
            <li className="flex-1 rounded-card bg-mist px-4 py-3">
              <div className="text-xs text-ink-faint">
                {i + 1}. {s.label}
              </div>
              <div className="mt-1 font-serif text-xl font-bold text-ink">{s.value}</div>
              <div className="mt-1 text-xs leading-relaxed text-ink-soft">{s.sub}</div>
            </li>
            <li aria-hidden className="flex items-center justify-center text-ink-faint md:w-8 md:shrink-0">
              <span className="md:hidden">↓</span>
              <span className="hidden md:inline">→</span>
            </li>
          </Fragment>
        ))}
        <li className="flex-1 rounded-card border-2 border-accent px-4 py-3">
          <div className="text-xs text-ink-faint">4. {finalLabel}</div>
          <div className="mt-1 font-serif text-xl font-bold text-accent">{finalValue}</div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${verdict.className}`}>{verdict.text}</span>
            <span className="text-xs text-ink-soft">{limitText}</span>
          </div>
        </li>
      </ol>

      {/* 항목별 판정 */}
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {checks.map((c) => {
          // 증축 후 3D 모델이 불러와지는 필지는 증축층 면적·주차·일조(정북) 항목을 통과로 표시한다 (2026-10-13)
          const status = modelLoaded && c.status === 'check' && MODEL_CHECKED.includes(c.item) ? 'pass' : c.status
          return (
          <li key={c.item} className="flex items-start gap-3 rounded-card border border-line px-3 py-2.5">
            <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_CLASS[status]}`}>
              {CHECK_STATUS_LABEL[status]}
            </span>
            <div className="min-w-0">
              <div className="text-sm font-medium text-ink">{CHECK_LABEL[c.item]}</div>
              <div className="text-xs leading-relaxed text-ink-soft">{c.detail}</div>
            </div>
          </li>
          )
        })}
      </ul>
      {footer}
    </div>
  )
}

/** 시나리오별 최종 결과 비교 (현행 / 복합 완화 / 재건축) */
function ScenarioTable({ analysis, scenarios }: { analysis: SiteAnalysis; scenarios: ViewScenario[] }) {
  return (
    <div>
      <h3 className="mb-3 font-medium text-ink">시나리오별 규모 비교</h3>
      <div className="overflow-x-auto rounded-card border border-line">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-mist text-left text-xs text-ink-faint">
            <tr>
              <th className="px-4 py-3 font-medium">시나리오</th>
              <th className="px-4 py-3 text-right font-medium">증축 / 신축 규모</th>
              <th className="px-4 py-3 font-medium">판정 · 제한요인</th>
              <th className="px-4 py-3 text-right font-medium">주차</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {scenarios.map((s) => {
              const active = s.id === analysis.scenarioId
              const rowClass = active ? 'bg-action-soft/60' : undefined
              if (s.kind === 'rebuild') {
                const r = analysis.rebuild
                const diff = r.gfaM2 - r.existing.gfaM2
                return (
                  <tr key={s.id} className={rowClass}>
                    <td className="px-4 py-3 font-medium text-ink">{HOME_SCENARIO_NAME[s.id]}</td>
                    <td className="px-4 py-3 text-right text-ink">
                      신축 {f(r.gfaM2)}㎡ · 지상 {r.totalFloors}층 ({diff >= 0 ? '+' : '−'}
                      {f(Math.abs(diff))}㎡)
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {REBUILD_VERDICT[r.verdict].text} · {LIMIT_LABEL[r.limitingFactor]}
                    </td>
                    <td className="px-4 py-3 text-right text-ink-soft">법정 {f(r.parking.required)}대 · 계획안 {r.parking.planned}대</td>
                  </tr>
                )
              }
              const e = analysis.byScenario[s.rulesId]
              const o = e.parkingOption
              return (
                <tr key={s.id} className={rowClass}>
                  <td className="px-4 py-3 font-medium text-ink">{HOME_SCENARIO_NAME[s.id]}</td>
                  <td className="px-4 py-3 text-right text-ink">
                    증축 {f(e.plan.addGfaM2)}㎡ · +{e.plan.addFloors}층
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {VERDICT[e.plan.verdict].text} · {LIMIT_LABEL[e.plan.limitingFactor]}
                  </td>
                  <td className="px-4 py-3 text-right text-ink-soft">
                    {o ? `+${o.addSpaces}대 확보 시 ${f(o.addGfaM2)}㎡ · ${VERDICT[o.verdict].text}` : '기존 주차'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
