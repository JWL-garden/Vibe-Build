'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/** 모든 페이지 공통 상단 바 (애플 코리아식 44px 반투명 바). 메인(/)은 서비스 이름만, 다른 화면은 오른쪽에 주소 검색 버튼. 인쇄 시 숨김 */
export default function SiteHeader() {
  const isHome = usePathname() === '/'
  return (
    <header className="sticky top-0 z-20 border-b border-line/60 bg-paper/80 backdrop-blur-xl backdrop-saturate-150 print:hidden">
      <div className="mx-auto flex h-11 max-w-[1024px] items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-[15px] font-semibold tracking-tight text-ink">
          Vibe Build
        </Link>
        {!isHome && (
          <Link href="/#search" className="text-xs text-ink-soft transition hover:text-ink">
            주소 검색
          </Link>
        )}
      </div>
    </header>
  )
}
