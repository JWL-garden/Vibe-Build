import Image from 'next/image'

interface Props {
  /** 대상 주소 (머리글에는 현재 장 목차를 표시하므로 쓰지 않음) */
  address: string
  /** 장 번호와 제목 (표지는 null → 머리글·장 제목 없이 본문만) */
  chapter: { no: string; title: string } | null
  /** 쪽 번호 (null이면 번호 없이 출처 문구만) */
  page: number | null
  /** 바닥글 데이터 출처 문구 (예: '샘플 데이터 · 개략 검토') */
  sourceLabel: string
  children: React.ReactNode
  /** true면 A4 한 장 높이로 고정 (페이지 나눔을 직접 계산하는 보고서용). 넘치는 내용은 잘린다 */
  fixedHeight?: boolean
  /** true면 장 제목을 쓰지 않는다 (한 장이 여러 쪽일 때 둘째 쪽부터) */
  continued?: boolean
  /** true면 표지용: 여백·머리글·바닥글·쪽 번호 없이 A4 한 장을 통째로 쓴다 */
  bare?: boolean
  /** 앵커 링크 대상 id (장의 첫 쪽에만) */
  anchorId?: string
  /** 스크롤 스파이용 장 식별자 (장의 모든 쪽) */
  spyId?: string
}

/** 보고서 A4 한 장 틀 (210×297mm). 화면에서는 종이처럼, 인쇄 시 장마다 페이지 나눔 */
export default function ReportPage({ chapter, page, sourceLabel, children, fixedHeight = false, continued = false, bare = false, anchorId, spyId }: Props) {
  // fixedHeight(쪽 나눔 보고서)는 본문 공간을 더 확보하려고 여백·제목을 조금 줄인다
  return (
    <article
      id={anchorId}
      data-spy={spyId}
      className={`mx-auto flex w-full max-w-[210mm] flex-col scroll-mt-20 bg-paper ${bare ? '' : 'px-[16mm]'} shadow-[0_2px_24px_rgba(21,23,23,0.08)] print:break-after-page print:shadow-none ${
        fixedHeight ? `h-[297mm] overflow-hidden ${bare ? '' : 'py-[11mm]'} print:h-[296.5mm] print:last:break-after-auto` : `min-h-[297mm] ${bare ? '' : 'py-[14mm]'}`
      }`}
    >
      {chapter && (
        <header className="flex items-center justify-between border-b border-line pb-2 text-xs text-ink-faint">
          <span className="flex items-center gap-1.5 font-serif font-bold text-ink">
            <Image src="/logo.png" alt="" width={115} height={96} className="h-[14px] w-auto" />
            Vibe Build
          </span>
          <span>{chapter.no === chapter.title ? chapter.title : `${chapter.no} ${chapter.title}`}</span>
        </header>
      )}

      {chapter && !continued && (
        <div className={fixedHeight ? 'mt-5' : 'mt-10'}>
          <h2 className={`font-serif font-bold text-ink ${fixedHeight ? 'text-2xl' : 'text-3xl'}`}>
            {chapter.no !== chapter.title && <span className="mr-2 text-deep">{chapter.no}</span>}
            {chapter.title}
          </h2>
        </div>
      )}

      <div className={`min-h-0 flex-1 ${fixedHeight && !bare ? 'pt-3' : ''}`}>{children}</div>

      {!bare && (
      <footer className={`flex items-center justify-between border-t border-line pt-2 text-[11px] text-ink-faint ${fixedHeight ? 'mt-4' : 'mt-10'}`}>
        <span className="whitespace-pre-line leading-snug">{sourceLabel}</span>
        {page !== null && <span className="ml-6 shrink-0">{page}</span>}
      </footer>
      )}
    </article>
  )
}
