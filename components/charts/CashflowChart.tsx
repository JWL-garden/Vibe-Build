'use client'

import { CartesianGrid, Legend, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatWon } from '@/lib/format'
import type { CashflowYear } from '@/types'

/**
 * "안 함 vs 함" 누적 라인 차트 (값은 계산 결과 그대로, 기간은 cashflowRule.years).
 * 자산가치 반영 순자산(netWorth*)이 있으면 그 두 선을 그리고, 함이 안 함을 처음 넘는 연차를 표시한다 (교차점).
 * 없으면 임대수익 누적(기존 표시).
 */
export default function CashflowChart({ cashflow, label = '증축' }: { cashflow: CashflowYear[]; label?: string }) {
  const withAsset = cashflow.length > 0 && cashflow.every((c) => c.netWorthWithWon !== undefined && c.netWorthWithoutWon !== undefined)
  const rows = cashflow.map((c) => ({
    year: `${c.year}년`,
    with: (withAsset ? c.netWorthWithWon! : c.cumulativeWithWon) / 1e8,
    without: (withAsset ? c.netWorthWithoutWon! : c.cumulativeWithoutWon) / 1e8,
  }))
  // 함이 안 함을 처음 넘는 연차 (교차점)
  const cross = rows.findIndex((r) => r.with >= r.without)
  const crossRow = cross >= 0 ? rows[cross] : null

  return (
    <div className="h-64 w-full break-inside-avoid">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 12, right: 16, bottom: 0, left: -8 }}>
          <CartesianGrid stroke="#ededed" vertical={false} />
          <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#5c6161' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#5c6161' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}억`} />
          {!withAsset && <ReferenceLine y={0} stroke="#9a9f9f" />}
          <Tooltip formatter={(v) => formatWon(Number(v) * 1e8)} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line
            name={withAsset ? `${label}함 (순자산)` : `${label}함`}
            dataKey="with"
            stroke="#e0621b"
            strokeWidth={2.5}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            name={withAsset ? `${label} 안 함 (순자산)` : `${label} 안 함`}
            dataKey="without"
            stroke="#8d9494"
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
            isAnimationActive={false}
          />
          {crossRow && (
            <ReferenceDot
              x={crossRow.year}
              y={crossRow.with}
              r={5}
              fill="#151717"
              stroke="#fff"
              strokeWidth={1.5}
              label={{ value: `${crossRow.year} 교차`, position: 'top', fontSize: 11, fill: '#151717' }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
