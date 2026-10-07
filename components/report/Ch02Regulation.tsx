import { LIMIT_LABEL } from '@/lib/calc'
import { formatNumber } from '@/lib/format'
import type { ReportData, ScenarioId } from '@/types'
import { Badge, DataTable, Lead, SubTitle } from './ReportParts'
import SunlightSection from './SunlightSection'

const ORDER: ScenarioId[] = ['BASE', 'A', 'B', 'C', 'ALL']

/** 2장: 법규 검토 — 현행 vs 완화, 제한요인, 정북 단면, 추가 확인 항목 */
export default function Ch02Regulation({ data }: { data: ReportData }) {
  const { expansionByScenario, expansion, scenarioId } = data.analysis
  const scenarioName = (id: ScenarioId) => data.appendix.scenarios.find((s) => s.id === id)?.name ?? id
  const before = expansion.before
  const after = expansion.after

  return (
    <div>
      <Lead>
        정북방향 일조 사선(건축법 시행령 제86조)과 용적률 상한을 함께 검토했습니다. A·B·C·ALL은 프로젝트에서 가정한
        완화안이며 현행법이 아닙니다.
      </Lead>

      <SubTitle>법규 시나리오별 증축 가능 규모</SubTitle>
      <DataTable
        head={['시나리오', '용적률 상한', '일조 허용높이', '용적률 기준', '일조 기준', '증축', '제한요인']}
        numeric={[1, 2, 3, 4, 5]}
        highlightRow={ORDER.indexOf(scenarioId)}
        rows={ORDER.map((id) => {
          const e = expansionByScenario[id]
          return [
            <span key="n">
              {id} {scenarioName(id)}
            </span>,
            `${formatNumber(e.farLimitPercent, 0)}%`,
            e.allowedHeightM === null ? '미적용' : `${e.allowedHeightM}m`,
            `${e.floorsByFar}층`,
            e.floorsBySun === null ? '—' : `${e.floorsBySun}층`,
            `+${e.addFloors}층`,
            <Badge key="b" tone={e.limitingFactor === 'sunlight' ? 'accent' : 'neutral'}>
              {LIMIT_LABEL[e.limitingFactor]}
            </Badge>,
          ]
        })}
      />
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        현행 법규에서는 <b className="text-ink">{LIMIT_LABEL[before.limitingFactor]}</b> 때문에 +{before.addFloors}층에
        그칩니다. 일조 완화(A)나 용적률 상향(B) 하나만으로는 다른 조건에 막히고, 둘을 함께 적용한{' '}
        {scenarioName(scenarioId)}에서 +{after.addFloors}층까지 가능합니다.
      </p>

      <SubTitle>정북방향 단면 (현행 vs 완화)</SubTitle>
      <SunlightSection
        setbackM={data.building.northSetbackM}
        heightM={data.building.heightM}
        newHeightM={after.newHeightM}
        envelopes={[
          { label: '현행', rule: before.rules.sunlight, allowedHeightM: before.allowedHeightM, accent: false },
          { label: '완화', rule: after.rules.sunlight, allowedHeightM: after.allowedHeightM, accent: true },
        ]}
      />

      <SubTitle>계산 근거 ({scenarioName(scenarioId)})</SubTitle>
      <ul className="list-disc space-y-1 pl-5 text-sm text-ink-soft">
        {after.reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>

      <SubTitle>추가 확인 항목</SubTitle>
      <ul className="space-y-1.5 text-sm text-ink">
        {data.checkItems.map((c) => (
          <li key={c} className="flex gap-2">
            <span className="text-accent">□</span>
            {c}
          </li>
        ))}
      </ul>
    </div>
  )
}
