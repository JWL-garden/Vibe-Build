import type { SiteReport } from '@/types'
import { DataTable, SubTitle } from '../ReportParts'

/** 부록: 법규·완화 가정, 적용 기준값, 데이터 출처(기준 엑셀 시트명), 엑셀 산정 근거, 계산식, 면책 */
export default function SiteAppendix({ report }: { report: SiteReport }) {
  const a = report.appendix
  return (
    <div>
      <SubTitle>데이터 출처</SubTitle>
      <p className="mb-3 text-sm text-ink-soft">
        기준 엑셀: <b className="text-ink">{a.sourceFile}</b>
      </p>
      <DataTable head={['항목', '출처 (시트·파일)', '비고']} rows={a.sourceRows} />

      <SubTitle>관련 정책</SubTitle>
      <DataTable head={['정책', '내용', '반영 방식']} rows={a.policyRows} />
      <p className="mt-2 text-xs text-ink-faint">출처: {a.policySource}</p>

      <SubTitle>법규 시나리오 (완화 가정)</SubTitle>
      <DataTable head={['시나리오', '변경 내용', '근거', '구분']} rows={a.scenarioRows} />

      <SubTitle>적용 기준값</SubTitle>
      <DataTable head={['항목', '값', '근거']} rows={a.ruleRows} />

      <SubTitle>기준 엑셀 산정 근거</SubTitle>
      <ul className="list-disc space-y-1 pl-5 text-xs leading-relaxed text-ink-soft">
        {a.excelNotes.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>

      <SubTitle>계산식 요약</SubTitle>
      <ul className="list-disc space-y-1 pl-5 text-sm text-ink-soft">
        {a.formulas.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>

      <div className="mt-8 space-y-1.5 rounded-card border border-line bg-mist px-5 py-4 text-sm leading-relaxed text-ink break-inside-avoid">
        {a.disclaimer.map((d) => (
          <p key={d}>{d}</p>
        ))}
      </div>
    </div>
  )
}
