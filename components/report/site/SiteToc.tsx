export interface TocEntry {
  /** 장 번호 (예: '1장', '부록 1') */
  no: string
  title: string
  /** 한 줄 설명 */
  note: string
  /** 쪽 번호. 아직 작성하지 않은 장은 null */
  page: number | null
}

/** 보고서 목차 (쪽 번호·작성 여부만 표시, 계산하지 않음) */
export default function SiteToc({ entries }: { entries: TocEntry[] }) {
  return (
    <ol className="mt-4 divide-y divide-line border-y border-line">
      {entries.map((e) => (
        <li key={e.no} className="flex items-baseline gap-4 py-2">
          <span className="w-16 shrink-0 text-sm font-medium text-accent">{e.no}</span>
          <div className="min-w-0 flex-1">
            <p className={e.page === null ? 'text-ink-faint' : 'font-medium text-ink'}>{e.title}</p>
            <p className="mt-0.5 text-xs text-ink-faint">{e.note}</p>
          </div>
          <span className="w-16 shrink-0 text-right text-sm tabular-nums text-ink-faint">
            {e.page === null ? '추후 작성' : e.page}
          </span>
        </li>
      ))}
    </ol>
  )
}
