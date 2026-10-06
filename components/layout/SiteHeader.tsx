import Link from 'next/link'

/** 모든 페이지 공통 상단 바: 왼쪽 서비스 이름(홈으로), 오른쪽 주소 검색 버튼. 인쇄 시 숨김 */
export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur print:hidden">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="font-serif text-xl font-bold tracking-tight text-ink">
          Vibe Build
        </Link>
        <Link
          href="/#search"
          className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-paper transition hover:bg-ink/80"
        >
          주소 검색
        </Link>
      </div>
    </header>
  )
}
