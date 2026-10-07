import { CHECK_LABEL, CHECK_STATUS_LABEL, LIMIT_LABEL } from '@/lib/calc'
import { formatNumber } from '@/lib/format'
import type { AddUnit, ExpansionCheck, ExpansionPlan, Scenario, SiteAnalysis } from '@/types'

interface Props {
  analysis: SiteAnalysis
  /** 시나리오 이름 (lib/rules/scenarios) */
  scenarios: Scenario[]
}

const f = (v: number) => formatNumber(v, 2)

const STATUS_CLASS: Record<ExpansionCheck['status'], string> = {
  pass: 'bg-accent-soft text-accent',
  fail: 'bg-ink text-paper',
  check: 'border border-ink/30 bg-paper text-ink',
}

const VERDICT = {
  possible: { text: '증축 가능', className: 'bg-accent text-paper' },
  check: { text: '확인 필요', className: 'border border-ink/30 bg-paper text-ink' },
  impossible: { text: '증축 불가', className: 'bg-mist text-ink-faint' },
} as const

const unitsText = (units: AddUnit[]) =>
  units.length === 0 ? '0세대' : units.map((u) => `${u.type} 전용 ${f(u.netAreaM2)}㎡`).join(' + ')

/** ⑥ 증축 산정: 주차 여유 → 추가 세대 → 최대 연면적 흐름 + 다른 제한 반영 결과 + 항목별 판정 */
export default function Step6Expansion({ analysis, scenarios }: Props) {
  const e = analysis.selected
  const p = e.parking
  const name = (id: string) => scenarios.find((s) => s.id === id)?.name ?? id

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
            value: `${p.plan.units.length}세대`,
            sub: unitsText(p.plan.units),
          },
          {
            label: '주차 기준 최대 연면적',
            value: `${f(p.plan.gfaM2)}㎡`,
            sub: p.plan.netM2 > 0 ? `전용 ${f(p.plan.netM2)}㎡ ÷ 전용률 ${formatNumber(e.netRatio, 4)}` : '추가 세대 없음',
          },
        ]}
        plan={e.plan}
      />

      {p.option && e.parkingOption && (
        <FlowBlock
          title={`주차 ${p.option.addSpaces}대 추가 확보 시`}
          note="대지 안에 주차를 추가로 배치할 수 있는지는 별도 확인이 필요합니다."
          steps={[
            {
              label: '주차 여유',
              value: `${f(p.option.spareAfter)}대`,
              sub: `기존 여유 ${f(Math.max(0, p.spare))}대 + 추가 ${p.option.addSpaces}대`,
            },
            { label: '추가 세대', value: `${p.option.units.length}세대`, sub: unitsText(p.option.units) },
            {
              label: '주차 기준 최대 연면적',
              value: `${f(p.option.gfaM2)}㎡`,
              sub: `전용 ${f(p.option.netM2)}㎡ ÷ 전용률 ${formatNumber(e.netRatio, 4)}`,
            },
          ]}
          plan={e.parkingOption}
        />
      )}

      <ScenarioTable analysis={analysis} name={name} />

      <details className="rounded-card border border-line px-5 py-4">
        <summary className="cursor-pointer text-sm font-medium text-ink">계산 근거 펼치기</summary>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-soft">
          {[...e.plan.reasons, ...(e.parkingOption ? e.parkingOption.reasons.slice(-2) : [])].map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </details>
    </div>
  )
}

interface FlowStep {
  label: string
  value: string
  sub: string
}

function FlowBlock({ title, note, steps, plan }: { title: string; note?: string; steps: FlowStep[]; plan: ExpansionPlan }) {
  const verdict = VERDICT[plan.verdict]
  return (
    <div className="rounded-card border border-line p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium text-ink">{title}</h3>
        {note && <span className="text-xs text-ink-faint">{note}</span>}
      </div>

      {/* 주차 여유 → 추가 세대 → 최대 연면적 → 최종 */}
      <ol className="mt-4 grid gap-3 md:grid-cols-4">
        {steps.map((s, i) => (
          <li key={s.label} className="relative rounded-card bg-mist px-4 py-3">
            <div className="text-xs text-ink-faint">
              {i + 1}. {s.label}
            </div>
            <div className="mt-1 font-serif text-xl font-bold text-ink">{s.value}</div>
            <div className="mt-1 text-xs leading-relaxed text-ink-soft">{s.sub}</div>
            <span className="absolute -right-2.5 top-1/2 hidden -translate-y-1/2 text-ink-faint md:block">→</span>
          </li>
        ))}
        <li className="rounded-card border-2 border-accent px-4 py-3">
          <div className="text-xs text-ink-faint">4. 다른 제한 반영 후 최종</div>
          <div className="mt-1 font-serif text-xl font-bold text-accent">
            {f(plan.addGfaM2)}㎡ · +{plan.addFloors}개층
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${verdict.className}`}>{verdict.text}</span>
            <span className="text-xs text-ink-soft">제한요인: {LIMIT_LABEL[plan.limitingFactor]}</span>
          </div>
        </li>
      </ol>

      {/* 항목별 판정 */}
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {plan.checks.map((c) => (
          <li key={c.item} className="flex items-start gap-3 rounded-card border border-line px-3 py-2.5">
            <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_CLASS[c.status]}`}>
              {CHECK_STATUS_LABEL[c.status]}
            </span>
            <div className="min-w-0">
              <div className="text-sm font-medium text-ink">{CHECK_LABEL[c.item]}</div>
              <div className="text-xs leading-relaxed text-ink-soft">{c.detail}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** 시나리오별 최종 결과 비교 (완화 전/후) */
function ScenarioTable({ analysis, name }: { analysis: SiteAnalysis; name: (id: string) => string }) {
  return (
    <div>
      <h3 className="mb-3 font-medium text-ink">시나리오별 증축 규모 비교</h3>
      <div className="overflow-x-auto rounded-card border border-line">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-mist text-left text-xs text-ink-faint">
            <tr>
              <th className="px-4 py-3 font-medium">시나리오</th>
              <th className="px-4 py-3 text-right font-medium">기존 주차 증축</th>
              <th className="px-4 py-3 font-medium">판정 · 제한요인</th>
              <th className="px-4 py-3 text-right font-medium">주차 추가 확보 시</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {Object.values(analysis.byScenario).map((e) => {
              const active = e.scenarioId === analysis.scenarioId
              const o = e.parkingOption
              return (
                <tr key={e.scenarioId} className={active ? 'bg-accent-soft/40' : undefined}>
                  <td className="px-4 py-3 font-medium text-ink">
                    {e.scenarioId} {name(e.scenarioId)}
                  </td>
                  <td className="px-4 py-3 text-right text-ink">
                    {f(e.plan.addGfaM2)}㎡ · +{e.plan.addFloors}층
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {VERDICT[e.plan.verdict].text} · {LIMIT_LABEL[e.plan.limitingFactor]}
                  </td>
                  <td className="px-4 py-3 text-right text-ink-soft">
                    {o ? `+${o.addSpaces}대 → ${f(o.addGfaM2)}㎡ · ${VERDICT[o.verdict].text}` : '—'}
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
