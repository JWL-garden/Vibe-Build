import { formatNumber } from '@/lib/format'
import { relaxationRows } from '@/lib/report/buildSiteReport'
import { HOME_SCENARIO_NAME } from '@/lib/rules/scenarios'
import type { HousingType, Rules, SiteAnalysis, SiteExpansionResult, ViewScenario, ViewScenarioId } from '@/types'

interface Props {
  analysis: SiteAnalysis
  /** 용도지역 (예: 제2종일반주거지역) */
  zone: string
  /** 화면 시나리오 3개 (lib/rules/scenarios → viewScenarios) */
  scenarios: ViewScenario[]
  onSelect: (id: ViewScenarioId) => void
}

const VERDICT = {
  possible: { text: '증축 가능', className: 'bg-mist text-deep' },
  check: { text: '확인 필요', className: 'bg-mist text-ink' },
  impossible: { text: '증축 불가', className: 'bg-mist text-ink-faint' },
} as const

const REBUILD_VERDICT = {
  possible: { text: '재건축 가능', className: 'bg-mist text-deep' },
  check: { text: '확인 필요', className: 'bg-mist text-ink' },
  impossible: { text: '재건축 불가', className: 'bg-mist text-ink-faint' },
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

/** 건축 시나리오 선택: 시나리오 카드 3개(현행법규·증축 계획안·재건축 계획안) + 시나리오 비교표 */
export default function Step5Relaxation({ analysis, zone, scenarios, onSelect }: Props) {
  const { byScenario, scenarioId } = analysis
  const base = ruleValues(byScenario.BASE)
  const rows = relaxationRows(analysis, zone)

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-3">
        {scenarios.map((s) => {
          const e = byScenario[s.rulesId]
          const v = ruleValues(e)
          const active = s.id === scenarioId
          const rebuild = s.kind === 'rebuild'
          const verdict = rebuild ? REBUILD_VERDICT[analysis.rebuild.verdict] : VERDICT[e.plan.verdict]
          const option = !rebuild && e.parkingOption?.verdict === 'possible' ? e.parkingOption : null
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s.id)}
              aria-pressed={active}
              data-scenario={s.id}
              className={`flex flex-col rounded-card border p-4 text-left transition ${
                active ? 'border-action bg-action-soft/60 ring-1 ring-action' : 'border-line bg-paper hover:border-ink/30'
              }`}
            >
              <div className="font-serif text-lg font-bold text-ink">{HOME_SCENARIO_NAME[s.id]}</div>
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

              {/* 판정 마크는 카드 맨 아래 같은 행에 맞춘다 (현행법규 카드는 판정을 표시하지 않음) */}
              <div className="mt-auto pt-3">
                {option && <p className="mb-2 text-[11px] text-ink-soft">주차 +{option.addSpaces}대 확보 시 증축 가능</p>}
                {s.id !== 'BASE' && (
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${verdict.className}`}>{verdict.text}</span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      <h3 className="mb-3 mt-8 font-medium text-ink">시나리오 비교</h3>
      <div className="overflow-x-auto rounded-card border border-line">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-mist text-left text-xs text-ink-faint">
            <tr>
              <th className="px-4 py-3 font-medium">항목</th>
              <th className="px-4 py-3 font-medium">현행</th>
              <th className="px-4 py-3 font-medium">완화</th>
              <th className="px-4 py-3 font-medium">선택한 시나리오 ({HOME_SCENARIO_NAME[scenarioId]})</th>
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
                <td className="px-4 py-3 font-medium text-ink">{r.relaxed}</td>
                <td className={`px-4 py-3 font-medium ${r.changed ? 'text-deep' : 'text-ink'}`}>{r.selected}</td>
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
      <dd className={changed ? 'font-medium text-deep' : 'text-ink-soft'}>{value}</dd>
    </div>
  )
}
