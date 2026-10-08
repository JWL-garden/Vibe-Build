import { formatNumber, formatRate, formatWon, formatWonExact } from '@/lib/format'
import { LAND_BADGE, landAreaSource, landBasisNote } from '@/lib/report/landText'
import type { SiteAnalysis } from '@/types'

const TONE_CLASS = {
  accent: 'bg-accent-soft text-accent',
  danger: 'bg-ink text-paper',
  neutral: 'border border-ink/30 bg-paper text-ink',
} as const

/**
 * ⑧ 수익성 — 지금은 토지가액(공시지가 기준)과 증축 전·후 자산가치(원가 기준)만 표시.
 * 숫자는 runAll 결과(analysis.land·asset)만 쓰고 화면에서 다시 계산하지 않는다.
 * TODO [5-4]: 사업비·임대수익·ROI (수익성 엔진 [3-2]~[3-4] 연결 후)
 */
export default function Step8Finance({ analysis }: { analysis: SiteAnalysis }) {
  const { land, asset } = analysis
  const badge = LAND_BADGE[land.basis]
  const b = asset.existingBuilding
  const unitCost = `${formatNumber(b.unitCostWon / 1e4, 0)}만원/㎡`
  const work = asset.demolished ? '재건축' : '증축'

  return (
    <div className="space-y-8">
      <section>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-serif text-lg font-bold text-ink">토지가액</h3>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE_CLASS[badge.tone]}`}>{badge.badge}</span>
        </div>
        <p className="mt-1 text-xs text-ink-faint">{landBasisNote(land)}</p>
        <p className="mt-3 font-serif text-3xl font-bold text-ink">{formatWon(land.valueWon)}</p>
        {land.valueWon !== null && <p className="text-sm text-ink-soft">{formatWonExact(land.valueWon)}</p>}

        {land.lots.length > 0 && (
          <ul className="mt-4 divide-y divide-line rounded-card border border-line text-sm">
            {land.lots.map((l) => (
              <li key={l.pnu} className="flex flex-wrap justify-between gap-2 px-4 py-2">
                <span className="text-ink-soft">{l.pnu}</span>
                <span className="text-ink">
                  {formatNumber(l.areaM2)}㎡ ({landAreaSource(land)}) × {formatNumber(l.pricePerM2, 0)}원/㎡ ={' '}
                  <b>{formatWonExact(l.valueWon)}</b>
                </span>
              </li>
            ))}
          </ul>
        )}
        <ul className="mt-3 space-y-1 text-xs text-ink-faint">
          {land.reasons.map((r) => (
            <li key={r}>· {r}</li>
          ))}
          {land.siteAreaM2 !== null && land.basis !== 'estimated' && (
            <li>· 건축물대장 대지면적 {formatNumber(land.siteAreaM2)}㎡ (용적률·증축 계산에 사용)</li>
          )}
          <li>· 공시지가는 세금·부담금 산정용 공적 가격으로 시세와 다릅니다.</li>
        </ul>
      </section>

      <section>
        <h3 className="font-serif text-lg font-bold text-ink">{work} 전·후 자산가치 (원가 기준 참고)</h3>
        <p className="mt-1 text-xs text-ink-faint">
          토지가액 + 건물가치 · {analysis.scenarioId} 시나리오 · 재조달단가 {unitCost} 등 예시 가정값 (감정평가 아님)
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[28rem] text-sm">
            <thead>
              <tr className="border-b border-ink/20 text-left text-xs text-ink-faint">
                <th className="py-2 font-normal">항목</th>
                <th className="py-2 text-right font-normal">{work} 전</th>
                <th className="py-2 text-right font-normal">{work} 후</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              <Row label={`토지가액 (${badge.badge})`} before={formatWonExact(land.valueWon)} after={formatWonExact(land.valueWon)} />
              <Row
                label={`기존 건물 (잔가율 ${formatRate(b.residualRate)}, 경과 ${b.ageYears ?? '–'}년)`}
                before={formatWonExact(b.valueWon)}
                after={asset.demolished ? '– (철거)' : formatWonExact(b.valueWon)}
              />
              <Row
                label={asset.addBuilding.gfaM2 > 0 ? `${work} ${formatNumber(asset.addBuilding.gfaM2, 1)}㎡ (신축)` : '증축 (증축안 없음)'}
                before="–"
                after={asset.addBuilding.gfaM2 > 0 ? formatWonExact(asset.addBuilding.valueWon) : '–'}
              />
              <Row label="합계" before={formatWonExact(asset.beforeWon)} after={formatWonExact(asset.afterWon)} strong />
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-card border border-line bg-mist px-5 py-4 text-sm text-ink-soft">
        <p className="font-medium text-ink">사업비·임대수익·ROI·토지 포함 수익률</p>
        <p className="mt-1">
          임대료·공사비 예시 가정값과 수익성 계산 엔진을 연결한 뒤 표시됩니다. 토지 포함 수익률 = (기존 NOI + 증축 NOI
          증가) ÷ (증축 전 자산가치 + 총사업비).
        </p>
      </section>
    </div>
  )
}

function Row({ label, before, after, strong }: { label: string; before: string; after: string; strong?: boolean }) {
  const cls = strong ? 'font-bold text-ink' : 'text-ink'
  return (
    <tr>
      <td className={`py-2 ${strong ? 'font-bold text-ink' : 'text-ink-soft'}`}>{label}</td>
      <td className={`py-2 text-right ${cls}`}>{before}</td>
      <td className={`py-2 text-right ${cls}`}>{after}</td>
    </tr>
  )
}
