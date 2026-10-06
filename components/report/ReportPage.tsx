interface Props {
  /** 머리글에 표시할 대상 주소 */
  address: string
  /** 장 번호와 제목 (표지는 null → 머리글·장 제목 없이 본문만) */
  chapter: { no: string; title: string } | null
  /** 쪽 번호 */
  page: number
  /** 바닥글 데이터 출처 문구 (예: '샘플 데이터 · 개략 검토') */
  sourceLabel: string
  children: React.ReactNode
}

/** 보고서 A4 한 장 틀 (210×297mm). 화면에서는 종이처럼, 인쇄 시 장마다 페이지 나눔 */
export default function ReportPage({ address, chapter, page, sourceLabel, children }: Props) {
  return (
    <article className="mx-auto flex min-h-[297mm] w-full max-w-[210mm] flex-col bg-paper px-[16mm] py-[14mm] shadow-[0_2px_24px_rgba(21,23,23,0.08)] print:break-after-page print:shadow-none">
      {chapter && (
        <header className="flex items-center justify-between border-b border-line pb-3 text-xs text-ink-faint">
          <span className="font-serif font-bold text-ink">Vibe Build</span>
          <span>{address}</span>
        </header>
      )}

      {chapter && (
        <div className="mt-10">
          <p className="text-sm font-medium text-accent">{chapter.no}</p>
          <h2 className="mt-1 font-serif text-3xl font-bold text-ink">{chapter.title}</h2>
        </div>
      )}

      <div className="flex-1">{children}</div>

      <footer className="mt-10 flex items-center justify-between border-t border-line pt-3 text-xs text-ink-faint">
        <span>{sourceLabel}</span>
        <span>{page}</span>
      </footer>
    </article>
  )
}
