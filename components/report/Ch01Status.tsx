import { formatArea, formatNumber, formatWon, textOrEmpty, withUnit } from '@/lib/format'
import type { ReportData } from '@/types'
import { DataTable, Lead, StatCard, SubTitle } from './ReportParts'

/** 1장: 대상 건축물 현황 — 건축물대장 요약, 현재 임대 수익, 미활용 용적률 */
export default function Ch01Status({ data }: { data: ReportData }) {
  const b = data.building
  const base = data.analysis.expansion.before

  const rows: [string, string][] = [
    ['대지위치', b.address.roadAddress ?? b.address.jibunAddress],
    ['용도지역', b.zone],
    ['대지면적', formatArea(b.siteAreaM2)],
    ['건축면적 / 건폐율', `${formatArea(b.buildingAreaM2)} / ${formatNumber(base.currentBcrPercent, 1)}%`],
    ['연면적', formatArea(b.totalFloorAreaM2)],
    ['용적률산정 연면적 / 용적률', `${formatArea(b.farFloorAreaM2)} / ${formatNumber(base.currentFarPercent, 1)}%`],
    ['규모', `지상 ${b.floorsAbove}층 · 지하 ${b.floorsBelow}층 · 높이 ${withUnit(b.heightM, 'm')}`],
    ['주용도 / 기타용도', `${b.mainUse} / ${textOrEmpty(b.etcUse)}`],
    ['구조', b.structure],
    ['사용승인일', b.approvalDate],
    ['정북 인접대지까지 이격', withUnit(b.northSetbackM, 'm')],
  ]

  return (
    <div>
      <Lead>
        건축물대장 표제부 기준 대상 건축물의 현황입니다. 이후 장의 법규 검토와 증축 산정은 이 값을 기준으로 합니다.
      </Lead>

      <SubTitle>건축물 개요</SubTitle>
      <DataTable head={['항목', '내용']} rows={rows} />

      <SubTitle>현재 수익과 미활용 용적률</SubTitle>
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="현재 월 임대료"
          value={data.owner ? formatWon(data.owner.monthlyRentWon) : '면담 후 입력'}
          caption={data.owner ? `보증금 ${formatWon(data.owner.depositWon)}` : null}
        />
        <StatCard
          label="현재 / 허용 용적률 (현행)"
          value={`${formatNumber(base.currentFarPercent, 1)}% / ${formatNumber(base.farLimitPercent, 0)}%`}
          caption={b.zone}
        />
        <StatCard
          label="남은 연면적 (현행)"
          value={formatArea(base.remainingFloorAreaM2)}
          caption="용적률상 더 지을 수 있는 면적"
        />
      </div>
    </div>
  )
}
