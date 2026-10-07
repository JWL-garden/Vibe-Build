import { ASSUMPTION_LABELS, SOURCE_LABELS, formatAssumption } from '@/lib/report/assumptionLabels'
import { describeOverrides } from '@/lib/report/describeOverrides'
import type { FinanceAssumptions, ReportData } from '@/types'
import { Badge, DataTable, SubTitle } from './ReportParts'

/** 부록: 법규·완화 가정, 비용·시세 가정값, 계산식, 출처, 면책 */
export default function Appendix({ data }: { data: ReportData }) {
  const assumptions = data.analysis.finance.after.assumptions
  const keys = Object.keys(ASSUMPTION_LABELS) as (keyof FinanceAssumptions)[]
  const base = data.analysis.expansion.before.rules

  return (
    <div>
      <SubTitle>적용 법규와 완화 가정</SubTitle>
      <p className="mb-3 text-sm text-ink-soft">
        현행 기준: 정북 일조 높이 {base.sunlight.lowHeightM}m 이하 {base.sunlight.lowSetbackM}m 이격, 초과 부분 높이의{' '}
        {base.sunlight.ratio} 이상 이격 · 증축 층고 {base.floorHeightM}m
      </p>
      <DataTable
        head={['시나리오', '변경 내용', '근거', '구분']}
        rows={data.appendix.scenarios.map((s) => [
          `${s.id} ${s.name}`,
          describeOverrides(s.overrides),
          <span key="r" className="text-xs text-ink-soft">{s.rationale}</span>,
          s.isAssumption ? <Badge key="b" tone="accent">프로젝트 가정</Badge> : <Badge key="b">현행</Badge>,
        ])}
      />

      <SubTitle>비용·시세 가정값 (예시 가정값)</SubTitle>
      <div className="grid grid-cols-2 gap-x-6">
        {[keys.slice(0, Math.ceil(keys.length / 2)), keys.slice(Math.ceil(keys.length / 2))].map((col, i) => (
          <DataTable
            key={i}
            head={['항목', '값', '출처']}
            numeric={[1]}
            rows={col.map((k) => [
              ASSUMPTION_LABELS[k].label,
              formatAssumption(k, assumptions[k]),
              <span key="s" className="whitespace-nowrap text-xs text-ink-faint">{SOURCE_LABELS[data.appendix.assumptionSources[k] ?? 'default']}</span>,
            ])}
          />
        ))}
      </div>

      <SubTitle>계산식 요약</SubTitle>
      <ul className="list-disc space-y-1 pl-5 text-sm text-ink-soft">
        {data.appendix.formulas.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>

      <SubTitle>데이터 출처</SubTitle>
      <ul className="list-disc space-y-1 pl-5 text-sm text-ink-soft">
        {data.appendix.dataSources.map((d) => (
          <li key={d}>{d}</li>
        ))}
      </ul>

      <p className="mt-8 rounded-card border border-line bg-mist px-5 py-4 text-sm leading-relaxed text-ink">
        {data.appendix.disclaimer}
      </p>
    </div>
  )
}
