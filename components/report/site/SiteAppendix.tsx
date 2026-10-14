import type { SiteReport } from '@/types'
import { DataTable, SubTitle } from '../ReportParts'

/** 출처 칸: 줄마다 "자료명, 기관 (도메인)" — 괄호 안 도메인을 링크로 */
function SourceCell({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((line, i) => {
        const m = line.match(/^(.*)\(([a-z0-9.-]+\.[a-z]{2,})\)$/)
        return (
          <div key={i}>
            {m ? (
              <>
                {m[1]}(
                <a href={`https://${m[2]}`} target="_blank" rel="noreferrer" className="text-deep underline">
                  {m[2]}
                </a>
                )
              </>
            ) : (
              line
            )}
          </div>
        )
      })}
    </>
  )
}

/** 부록: 법규·완화 가정, 적용 기준값, 데이터 출처(기준 엑셀 시트명), 엑셀 산정 근거, 계산식, 면책 */
export default function SiteAppendix({ report }: { report: SiteReport }) {
  const a = report.appendix
  return (
    <div>
      <SubTitle>데이터 출처</SubTitle>
      <DataTable head={['항목', '출처 (자료명, 기관 (공식 URL))', '비고']} rows={a.sourceRows.map(([item, src, note]) => [item, <SourceCell key="s" text={src} />, note])} />

      <SubTitle>관련 정책</SubTitle>
      <DataTable head={['정책', '내용', '반영 방식']} rows={a.policyRows} />
      <p className="mt-2 text-xs text-ink-faint">출처: {a.policySource}</p>

      <SubTitle>법규 시나리오 (완화 가정)</SubTitle>
      <DataTable head={['시나리오', '변경 내용', '근거', '구분']} rows={a.scenarioRows} />

      <SubTitle>적용 기준값</SubTitle>
      <DataTable head={['항목', '값', '근거']} rows={a.ruleRows} />

      <SubTitle>수익성 가정값 (기준 · 범위 · 근거 등급)</SubTitle>
      <DataTable head={['항목', '적용값 (기준)', '범위 (보수 ~ 낙관)', '근거 등급', '출처 · 메모']} rows={a.assumptionRows} />
      <p className="mt-2 text-xs text-ink-faint">
        근거 등급: A 공식 데이터·법령 / B 공개자료 기반 / C 프로젝트 가정 (범위와 함께 표시) / 입력 대기 = 자료 없음
      </p>
      {a.assumptionNotes.map((n) => (
        <p key={n} className="mt-1 text-xs text-ink-faint">
          · 가정값 메모: {n}
        </p>
      ))}

      <SubTitle>전월세 전환율</SubTitle>
      <DataTable head={['구분', '법정 상한', '시장', '보수 적용', '기준 적용', '근거']} numeric={[1, 2, 3, 4]} rows={a.conversionRows} />

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
