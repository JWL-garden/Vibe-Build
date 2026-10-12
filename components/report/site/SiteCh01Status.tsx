import { formatNumber } from '@/lib/format'
import type { SiteReport } from '@/types'
import { Badge, DataTable, Lead, StatCard, SubTitle } from '../ReportParts'

/** 1장: 대상 건축물 현황 — 건축물대장 값, 층별 용도·호별 면적, 추가확보 가능면적 */
export default function SiteCh01Status({ report }: { report: SiteReport }) {
  const { status } = report
  return (
    <div>
      <Lead>건축물대장 기준 대상 건축물의 규모와 층별용도입니다.</Lead>

      <div className="mt-6 grid grid-cols-4 gap-3">
        {status.stats.map((k) => (
          <StatCard key={k.label} label={k.label} value={k.value} caption={k.caption} />
        ))}
      </div>

      <SubTitle>건축물 정보</SubTitle>
      <dl className="grid grid-cols-2 gap-x-6 text-sm break-inside-avoid">
        {status.infoRows.map((r) => (
          <div key={r.label} className="flex gap-3 border-b border-line py-1.5">
            <dt className="w-28 shrink-0 text-ink-faint">{r.label}</dt>
            <dd className="text-ink">{r.value}</dd>
          </div>
        ))}
      </dl>

      <SubTitle>층별 용도·호별 면적</SubTitle>
      <DataTable
        head={['층', '용도', '호', '전용면적', '공용면적']}
        numeric={[3, 4]}
        rows={status.floorUses.map((r) => [
          r.floorLabel,
          r.uses,
          r.units,
          `${formatNumber(r.netM2)}㎡`,
          `${formatNumber(r.commonM2)}㎡`,
        ])}
      />
      {status.sharedCommonM2 > 0 && (
        <p className="mt-2 text-xs text-ink-faint">
          층이 정해지지 않은 공용면적(계단실·승강기홀 등, 각층) {formatNumber(status.sharedCommonM2)}㎡는 위 표에서
          제외했습니다.
        </p>
      )}

      <ul className="mt-6 space-y-1 text-xs text-ink-faint">
        {status.notes.map((n) => (
          <li key={n}>· {n}</li>
        ))}
      </ul>

      <LandValue land={status.land} />
    </div>
  )
}

/** 토지가액 — 공시지가 기준(시세 아님)·기준연월·공시일·산정 상태 배지를 항상 함께 표시 */
function LandValue({ land }: { land: SiteReport['status']['land'] }) {
  return (
    <div className="break-inside-avoid">
      <SubTitle>토지가액 (공시지가 기준)</SubTitle>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-serif text-xl font-bold text-ink">{land.valueText}</span>
        <span className="text-sm text-ink-soft">{land.exactText}</span>
        <Badge tone={land.tone}>{land.badge}</Badge>
      </div>
      <p className="mt-1 text-xs text-ink-faint">{land.basisNote}</p>
      {land.rows.length > 0 && (
        <div className="mt-3">
          <DataTable head={['필지', '면적', '개별공시지가', '금액']} numeric={[1, 2, 3]} rows={land.rows} />
        </div>
      )}
      <ul className="mt-2 space-y-1 text-xs text-ink-faint">
        {land.notes.map((n) => (
          <li key={n}>· {n}</li>
        ))}
      </ul>
    </div>
  )
}
