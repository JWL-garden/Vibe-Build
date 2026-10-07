import type { SiteReport } from '@/types'
import { DataTable, Lead, SubTitle } from '../ReportParts'

/** 2장: 법규 검토 — 현행→완화 3줄 표, 주차 산정표, 시나리오별 검토, 일조, 추가 확인 항목 */
export default function SiteCh02Regulation({ report }: { report: SiteReport }) {
  const r = report.regulation
  return (
    <div>
      <Lead>
        용적률 상한, 주택 층수·연면적 한도, 주차 기준, 정북 일조 사선을 함께 검토했습니다. A·B·C·ALL은 프로젝트에서
        가정한 완화안이며 현행법이 아닙니다.
      </Lead>

      <SubTitle>현행 → 완화</SubTitle>
      <DataTable head={['항목', '현행', '완화', '완화 시나리오']} rows={r.relaxRows} />

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

      <SubTitle>정북 일조</SubTitle>
      <ul className="list-disc space-y-1 pl-5 text-sm text-ink-soft">
        {r.sunlight.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>

      <SubTitle>추가 확인 항목</SubTitle>
      <ul className="space-y-1.5 text-sm text-ink">
        {r.checkItems.map((c) => (
          <li key={c} className="flex gap-2">
            <span className="text-accent">□</span>
            {c}
          </li>
        ))}
      </ul>
    </div>
  )
}
