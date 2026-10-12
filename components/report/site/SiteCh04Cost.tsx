import type { SiteReport } from '@/types'
import { DataTable, Lead, SubTitle } from '../ReportParts'

/** 4장: 사업비 추정 — 항목별 금액·산식·근거 등급, 자금 구성 (SiteReport만 읽고 계산하지 않음) */
export default function SiteCh04Cost({ report }: { report: SiteReport }) {
  const fin = report.finance
  if (fin.status !== 'ok') {
    return (
      <div>
        <Lead>{fin.statusText}</Lead>
      </div>
    )
  }
  const kind = report.analysis.finance.byScenario.BASE.project.kind
  return (
    <div>
      <Lead>
        {kind === 'rebuild'
          ? '기존 건물을 철거하고 신축하는 사업비입니다. 철거비는 신축 공사비에 포함했고, 이주·철거와 공사 기간 동안의 임대수입 중단은 공사 중 임대 손실로 반영했습니다. 신축 단가는 한국부동산원 건물신축단가표와 공사비 실적 중 높은 값을 씁니다.'
          : '증축 사업비입니다. 증축 공사는 상부 건식 조립식(목구조·각재 형식)으로 보고 평당 단가와 세대당 제반비용을 적용했습니다.'}{' '}
        금액은 {fin.scenarioLabel} 기준이며, 근거 등급 C는 프로젝트 가정입니다.
      </Lead>

      <SubTitle>항목별 사업비</SubTitle>
      <DataTable
        head={['항목', '금액', '산식 · 근거', '근거 등급']}
        numeric={[1]}
        rows={fin.costRows}
        highlightRow={fin.costRows.length - 1}
      />

      <SubTitle>자금 구성</SubTitle>
      <DataTable head={['구분', '금액', '비고']} numeric={[1]} rows={fin.fundingRows} />

      <div className="break-inside-avoid">
        <SubTitle>공사비 근거 — 신축 실적 (2026 환산)</SubTitle>
        <DataTable
          head={['집단', '㎡당 (연면적)', '평당 (연면적)', '평당 (공사면적)', '공사 기간']}
          numeric={[1, 2, 3, 4]}
          rows={fin.construction.rows}
          highlightRow={fin.construction.appliedRow}
        />
        <ul className="mt-2 space-y-1 text-xs text-ink-faint">
          {fin.construction.notes.map((n) => (
            <li key={n}>· {n}</li>
          ))}
        </ul>
      </div>

      {fin.costRows.some((r) => r[1] === '입력 대기') && (
        <p className="mt-4 text-xs leading-relaxed text-ink-faint">
          &lsquo;입력 대기&rsquo; 항목(공사 중 임대 손실 등)은 금액이 없어 총사업비에 들어 있지 않습니다. 실제 사업비는 시공사 견적과 세무 검토로 확정해야 합니다.
        </p>
      )}
      {fin.inputNotes.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs text-ink-faint">
          {fin.inputNotes.map((n) => (
            <li key={n}>· 가정값 메모: {n}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
