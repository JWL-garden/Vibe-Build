import type { SiteReport } from '@/types'
import { DataTable, Lead, StatCard, SubTitle } from '../ReportParts'

/**
 * 5장: 수익 분석 — 지금은 토지가액(공시지가 기준)과 증축 전·후 자산가치(원가 기준)만.
 * 임대수입·NOI·ROI는 수익성 엔진([3-2]~[3-4]) 연결 후 추가한다. SiteReport만 읽고 계산하지 않는다.
 */
export default function SiteCh05Return({ report }: { report: SiteReport }) {
  const { asset, status } = report
  const work = report.analysis.asset.demolished ? '재건축' : '증축'
  return (
    <div>
      <Lead>
        증축(재건축) 전·후 보유 자산의 가치를 토지가액(개별공시지가 기준)과 건물가치(재조달 원가 기준)로 비교한 참고값입니다. 임대수익·ROI는
        임대료·공사비 가정값 입력 후 이 장에 추가됩니다.
      </Lead>

      <div className="mt-6 grid grid-cols-4 gap-3">
        {asset.kpis.map((k) => (
          <StatCard key={k.label} label={k.label} value={k.value} caption={k.caption} />
        ))}
      </div>
      <p className="mt-2 text-xs text-ink-faint">{status.land.basisNote}</p>

      <div className="break-inside-avoid">
        <SubTitle>{work} 전·후 자산가치</SubTitle>
        <DataTable head={['항목', `${work} 전`, `${work} 후`, '근거']} numeric={[1, 2]} rows={asset.rows} />
      </div>

      <SubTitle>토지 포함 수익률</SubTitle>
      <p className="text-sm text-ink-soft">{asset.yieldNote}</p>

      <ul className="mt-6 space-y-1 text-xs text-ink-faint">
        {asset.notes.map((n) => (
          <li key={n}>· {n}</li>
        ))}
      </ul>
    </div>
  )
}
