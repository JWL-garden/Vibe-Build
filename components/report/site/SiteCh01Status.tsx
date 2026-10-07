import { formatNumber } from '@/lib/format'
import type { SiteReport } from '@/types'
import { DataTable, Lead, StatCard, SubTitle } from '../ReportParts'

/** 1장: 대상 건축물 현황 — 기준 엑셀 대장 값, 층별 용도·호별 면적, 미활용 용적률 */
export default function SiteCh01Status({ report }: { report: SiteReport }) {
  const { status } = report
  return (
    <div>
      <Lead>기준 엑셀(건축물대장·전유공용면적)로 정리한 대상 건축물의 현재 규모와 층별 용도입니다.</Lead>

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
        head={['층', '용도', '호', '전유면적', '공용면적']}
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
    </div>
  )
}
