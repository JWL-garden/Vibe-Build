import type { SiteReport } from '@/types'
import { DataTable, Lead, SubTitle } from '../ReportParts'

/** 2장: 법규 검토 — 현행→완화 표, 주차 산정표, 현행법규와 이 보고서 시나리오 비교 */
export default function SiteCh02Regulation({ report }: { report: SiteReport }) {
  const r = report.regulation
  return (
    <div>
      <Lead>용적률 상한, 주택 층수·연면적 한도, 주차 기준을 현행법규와 완화 기준으로 비교했습니다.</Lead>

      <SubTitle>현행 → 완화</SubTitle>
      <DataTable head={['항목', '현행', '완화']} rows={r.relaxRows} />

      <SubTitle>주차 산정</SubTitle>
      <DataTable
        head={['구분', '산정 기준', '대수']}
        numeric={[2]}
        rows={r.parkingRows}
        highlightRow={r.parkingRows.length - 1}
      />
      <p className="mt-2 text-xs text-ink-faint">{r.parkingNote}</p>

      <SubTitle>시나리오별 검토</SubTitle>
      <DataTable
        head={['시나리오', '용적률 상한/잔여', '주차 기준', '주택 연면적 잔여', '주택 층수', '증축 · 판정', '제한요인']}
        rows={r.scenarioRows}
        highlightRow={r.selectedRow}
      />
    </div>
  )
}
