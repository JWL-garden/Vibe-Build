import { formatNumber } from '@/lib/format'
import { relaxationRows } from '@/lib/report/buildSiteReport'
import type { HousingType, Rules, Scenario, ScenarioId, SiteAnalysis, SiteExpansionResult } from '@/types'

interface Props {
  analysis: SiteAnalysis
  /** 용도지역 (예: 제2종일반주거지역) */
  zone: string
  /** 시나리오 이름·근거 (lib/rules/scenarios) */
  scenarios: Scenario[]
  onSelect: (id: ScenarioId) => void
}

const VERDICT = {
  possible: { text: '증축 가능', className: 'bg-accent-soft text-accent' },
  check: { text: '확인 필요', className: 'bg-mist text-ink' },
  impossible: { text: '증축 불가', className: 'bg-mist text-ink-faint' },
} as const

/** 이 건물에 해당하는 규칙값 (주택이 아니면 다세대 기준값을 보여준다) */
function ruleValues(e: SiteExpansionResult) {
  const type: HousingType = e.housing.housingType ?? '다세대'
  const r: Rules = e.rules
  return {
    far: e.far.farLimitPercent,
    floors: r.housing.maxFloors[type],
    area: r.housing.maxAreaM2[type],
    sunRatio: r.sunlight.ratio,
    sunLowHeight: e.sunlight.lowHeightM,
    areaWord: r.housing.areaExclusive[type] ? '미만' : '이하',
  }
}

/** ⑤ 법규 완화: 시나리오 카드 5개 + 현행→완화 비교표 */
export default function Step5Relaxation({ analysis, zone, scenarios, onSelect }: Props) {
  const { byScenario, scenarioId } = analysis
  const base = ruleValues(byScenario.BASE)
  const rows = relaxationRows(analysis, zone)

  return (
    <div>
      <p className="mb-5 rounded-card bg-mist px-5 py-4 text-sm leading-relaxed text-ink-soft">
        A·B·C·ALL은 이 프로젝트에서 가정한 <b className="text-ink">완화 정책안이며 현행법이 아닙니다.</b> 시나리오를
        누르면 아래 증축 산정 결과가 바뀝니다.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {scenarios.map((s) => {
          const e = byScenario[s.id]
          const v = ruleValues(e)
          const active = s.id === scenarioId
          const verdict = VERDICT[e.plan.verdict]
          const option = e.parkingOption?.verdict === 'possible' ? e.parkingOption : null
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s.id)}
              aria-pressed={active}
              data-scenario={s.id}
              className={`flex flex-col rounded-card border p-4 text-left transition ${
                active ? 'border-accent bg-accent-soft/40 ring-1 ring-accent' : 'border-line bg-paper hover:border-ink/30'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-serif text-lg font-bold text-ink">{s.id}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    s.isAssumption ? 'bg-accent-soft text-accent' : 'bg-mist text-ink-soft'
                  }`}
                >
                  {s.isAssumption ? '프로젝트 가정' : '현행'}
                </span>
              </div>
              <div className="mt-1 font-medium text-ink">{s.name}</div>
              <p className="mt-1 text-xs leading-relaxed text-ink-faint">{s.rationale}</p>

              <dl className="mt-3 space-y-1 border-t border-line pt-3 text-xs">
                <Value label="용적률" value={`${formatNumber(v.far, 0)}%`} changed={v.far !== base.far} />
                <Value label="주택 층수" value={`${v.floors}개층`} changed={v.floors !== base.floors} />
                <Value
                  label="주택 연면적"
                  value={`${formatNumber(v.area, 0)}㎡ ${v.areaWord}`}
                  changed={v.area !== base.area || v.areaWord !== base.areaWord}
                />
                <Value label="일조 사선" value={`높이의 ${v.sunRatio}배`} changed={v.sunRatio !== base.sunRatio} />
                <Value label="일조 수직" value={`${v.sunLowHeight}m`} changed={v.sunLowHeight !== base.sunLowHeight} />
              </dl>

              <div className="mt-auto pt-3">
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${verdict.className}`}>{verdict.text}</span>
                {option && (
                  <p className="mt-2 text-[11px] text-accent">주차 +{option.addSpaces}대 확보 시 증축 가능</p>
                )}
              </div>
            </button>
          )
        })}
      </div>

      <h3 className="mb-3 mt-8 font-medium text-ink">현행 → 완화 비교</h3>
      <div className="overflow-x-auto rounded-card border border-line">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-mist text-left text-xs text-ink-faint">
            <tr>
              <th className="px-4 py-3 font-medium">항목</th>
              <th className="px-4 py-3 font-medium">현행</th>
              <th className="px-4 py-3 font-medium">완화</th>
              <th className="px-4 py-3 font-medium">완화 시나리오</th>
              <th className="px-4 py-3 font-medium">선택한 {scenarioId}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.label}>
                <td className="px-4 py-3">
                  <div className="font-medium text-ink">{r.label}</div>
                  <div className="text-xs text-ink-faint">{r.note}</div>
                </td>
                <td className="px-4 py-3 text-ink-soft">{r.base}</td>
                <td className="px-4 py-3 font-medium text-accent">{r.relaxed}</td>
                <td className="px-4 py-3 text-ink-soft">{r.by}</td>
                <td className={`px-4 py-3 font-medium ${r.changed ? 'text-accent' : 'text-ink'}`}>{r.selected}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Value({ label, value, changed }: { label: string; value: string; changed: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-ink-faint">{label}</dt>
      <dd className={changed ? 'font-medium text-accent' : 'text-ink-soft'}>{value}</dd>
    </div>
  )
}
