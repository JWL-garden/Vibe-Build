'use client'

import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatWon } from '@/lib/format'
import type { CashflowYear } from '@/types'

/** "증축 안 함 vs 증축함" 10년 누적 순수익 라인 차트 (값은 계산 결과 그대로) */
export default function CashflowChart({ cashflow }: { cashflow: CashflowYear[] }) {
  const rows = cashflow.map((c) => ({
    year: `${c.year}년`,
    with: c.cumulativeWithWon / 1e8,
    without: c.cumulativeWithoutWon / 1e8,
  }))

  return (
    <div className="h-56 w-full break-inside-avoid">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
          <CartesianGrid stroke="#ededed" vertical={false} />
          <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#5c6161' }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fontSize: 10, fill: '#5c6161' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${v}억`}
          />
          <ReferenceLine y={0} stroke="#9a9f9f" />
          <Tooltip formatter={(v) => formatWon(Number(v) * 1e8)} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line
            name="증축함"
            dataKey="with"
            stroke="#e0621b"
            strokeWidth={2.5}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            name="증축 안 함"
            dataKey="without"
            stroke="#8d9494"
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
