import BuildingIllustration from '@/components/layout/BuildingIllustration'
import { formatArea, formatNumber } from '@/lib/format'
import type { ReportData } from '@/types'
import { Badge, DataTable, Lead, StatCard, SubTitle } from './ReportParts'

/** 3장: 증축 계획안 — 매스, 층별 면적표, 용도 제안, 공사 방식 */
export default function Ch03Plan({ data }: { data: ReportData }) {
  const after = data.analysis.expansion.after
  const b = data.building

  return (
    <div>
      <Lead>
        기존 건물 외곽(footprint)을 그대로 두고 위로 올리는 수직증축안입니다. 증축층 바닥면적은 기존 기준층과 같다고
        가정했습니다.
      </Lead>

      <div className="mt-6 grid grid-cols-[1fr_1.4fr] gap-5">
        <div className="rounded-card bg-mist px-6 pb-4 pt-6">
          <BuildingIllustration floors={b.floorsAbove} addFloors={after.addFloors} showAddition className="h-56 w-full" />
          <p className="mt-2 text-center text-xs text-ink-faint">회색 기존 {b.floorsAbove}층 · 파랑 증축 {after.addFloors}층</p>
        </div>
        <div className="grid grid-cols-2 content-start gap-3">
          <StatCard label="증축 층수" value={`+${after.addFloors}층`} caption={`${b.floorsAbove}층 → ${after.newTotalFloors}층`} />
          <StatCard label="증축 연면적" value={`+${formatNumber(after.addFloorAreaM2, 0)}㎡`} caption={formatArea(after.addFloorAreaM2)} />
          <StatCard label="증축 후 높이" value={`${after.newHeightM}m`} caption={`현재 ${b.heightM}m`} />
          <StatCard label="증축 후 용적률" value={`${formatNumber(after.newFarPercent, 1)}%`} caption={`상한 ${formatNumber(after.farLimitPercent, 0)}%`} />
        </div>
      </div>

      <SubTitle>층별 면적표</SubTitle>
      <DataTable
        head={['층', '바닥면적', '구분', '용도']}
        numeric={[1]}
        rows={data.plan.floors.map((f) => [
          `${f.floor}층`,
          `${formatNumber(f.areaM2, 1)}㎡`,
          f.isAdded ? <Badge key="a" tone="accent">증축</Badge> : <Badge key="e">기존</Badge>,
          f.use,
        ])}
      />

      <SubTitle>증축층 용도 제안</SubTitle>
      <p className="text-sm leading-relaxed text-ink">{data.plan.useProposal}</p>

      <SubTitle>공사 방식</SubTitle>
      <p className="text-sm leading-relaxed text-ink">{data.plan.constructionMethod}</p>
    </div>
  )
}
