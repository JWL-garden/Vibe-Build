import type { SiteReport } from '@/types'
import { DataTable, Lead, StatCard, SubTitle } from '../ReportParts'

/**
 * 5장: 수익 분석 — 임대수익·지표(ROI·회수기간·ROE·자산가치 증가), 수익 시나리오, 임대 사례,
 * 증축(재건축) 전·후 자산가치(토지가액 + 건물가치). SiteReport만 읽고 계산하지 않는다.
 */
export default function SiteCh05Return({ report }: { report: SiteReport }) {
  const { asset, status, finance: fin } = report
  const work = report.analysis.asset.demolished ? '재건축' : '증축'
  return (
    <div>
      <Lead>
        임대 모델(보증금 + 월세, 사업주체 대표 1인) 기준 수익성입니다. 임대료는 당산동6가 연립·다세대 신규 전월세 실거래(최근 12개월)의
        ㎡당 월 환산 임대료 중위값으로 추정했습니다. {fin.status === 'ok' ? fin.scenarioLabel : fin.statusText}
      </Lead>

      {fin.status === 'ok' && (
        <>
          <div className="mt-6 grid grid-cols-4 gap-3">
            {fin.kpis.map((k) => (
              <StatCard key={k.label} label={k.label} value={k.value} caption={k.caption} />
            ))}
          </div>

          <div className="break-inside-avoid">
            <SubTitle>연 임대수익</SubTitle>
            <DataTable head={['항목', '금액 (연)', '근거']} numeric={[1]} rows={fin.revenueRows} highlightRow={fin.revenueRows.length - 1} />
          </div>

          <div className="break-inside-avoid">
            <SubTitle>세대별 예상 임대료</SubTitle>
            <DataTable
              head={['세대', '전용', '사례 구간', '월 환산 임대료', '참고: 구간 중위 보증금 / 월세']}
              numeric={[1, 3]}
              rows={fin.unitRows}
            />
          </div>

          <div className="break-inside-avoid">
            <SubTitle>수익 시나리오</SubTitle>
            <DataTable
              head={['시나리오', '전월세 전환율', '총사업비', '연 NOI 증가', 'ROI', '회수기간']}
              numeric={[2, 3, 4, 5]}
              rows={fin.scenarioRows}
              highlightRow={1}
            />
            <p className="mt-2 text-xs text-ink-faint">
              보수 = 전환율 법정 상한 · 공실·운영비·예비비·금리 불리한 값 / 낙관 = 유리한 값 (부록 가정값 표의 범위)
            </p>
          </div>
        </>
      )}

      <div className="break-inside-avoid">
        <SubTitle>임대 사례 (신규 계약, 최근 12개월)</SubTitle>
        <DataTable head={['전용 구간', '사례', '지역', '중위 보증금', '중위 월세', '㎡당 월 환산 (기준)']} numeric={[1, 3, 4, 5]} rows={fin.bandRows} />
      </div>

      <div className="mt-6 grid grid-cols-4 gap-3">
        {asset.kpis.map((k) => (
          <StatCard key={k.label} label={k.label} value={k.value} caption={k.caption} />
        ))}
      </div>
      <p className="mt-2 text-xs text-ink-faint">{status.land.basisNote}</p>

      <div className="break-inside-avoid">
        <SubTitle>{work} 전·후 자산가치 (원가 기준 참고)</SubTitle>
        <DataTable head={['항목', `${work} 전`, `${work} 후`, '근거']} numeric={[1, 2]} rows={asset.rows} />
      </div>

      <SubTitle>토지 포함 수익률</SubTitle>
      <p className="text-sm text-ink-soft">{asset.yieldNote}</p>

      <ul className="mt-6 space-y-1 text-xs text-ink-faint">
        {[...fin.notes, ...asset.notes].map((n) => (
          <li key={n}>· {n}</li>
        ))}
      </ul>
    </div>
  )
}
