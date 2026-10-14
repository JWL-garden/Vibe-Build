// 보고서 장들이 함께 쓰는 작은 표시 부품 (계산 없음)

/** 장 안의 소제목 */
export function SubTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-3 mt-8 font-serif text-lg font-bold text-ink">{children}</h3>
}

/** 짧은 설명 문단 */
export function Lead({ children }: { children: React.ReactNode }) {
  return <p className="mt-6 text-sm leading-relaxed text-ink-soft">{children}</p>
}

export interface DataTableProps {
  head: string[]
  rows: React.ReactNode[][]
  /** 오른쪽 정렬할 열 번호 */
  numeric?: number[]
  /** 강조할 행 번호 */
  highlightRow?: number
}

/** 단순 표: 첫 줄은 머리글, 숫자 열은 오른쪽 정렬 */
export function DataTable({ head, rows, numeric = [], highlightRow }: DataTableProps) {
  return (
    <table className="w-full border-collapse text-sm break-inside-avoid">
      <thead>
        <tr className="border-y border-deep/70">
          {head.map((h, i) => (
            <th key={h} className={`whitespace-nowrap px-2 py-2 font-medium text-deep ${numeric.includes(i) ? 'text-right' : 'text-left'}`}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, r) => (
          <tr key={r} className={`border-b border-line ${r === highlightRow ? 'bg-mist font-medium' : ''}`}>
            {row.map((cell, i) => (
              <td key={i} className={`px-2 py-2 text-ink ${numeric.includes(i) ? 'whitespace-nowrap text-right tabular-nums' : ''}`}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** 큰 숫자 카드 */
export function StatCard({ label, value, caption }: { label: string; value: string; caption?: string | null }) {
  return (
    <div className="rounded-card border border-line px-4 py-4 break-inside-avoid">
      <p className="text-xs text-ink-faint">{label}</p>
      <p className="mt-1.5 font-serif text-xl font-bold text-ink">{value}</p>
      {caption && <p className="mt-1 whitespace-pre-line text-xs text-ink-soft">{caption}</p>}
    </div>
  )
}

/** 작은 배지 (예: 제한요인, 프로젝트 가정) */
export function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'accent' | 'danger' }) {
  const cls = {
    neutral: 'bg-mist text-ink-soft',
    accent: 'bg-mist text-deep',
    danger: 'bg-[#fdecec] text-[#c0392b]',
  }[tone]
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{children}</span>
}
