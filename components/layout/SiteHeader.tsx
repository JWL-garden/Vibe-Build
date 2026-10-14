'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/** 메인 상단 메뉴 (나중에 이름·링크를 바꿔 끼운다). href 가 '#'이면 아직 이동하지 않는다 */
const HOME_MENU: { label: string; href: string }[] = [
  { label: '메뉴1', href: '#' },
  { label: '메뉴2', href: '#' },
  { label: '메뉴3', href: '#' },
  { label: '메뉴4', href: '#' },
]

/** 모든 페이지 공통 상단 바 (애플 코리아식 48px 반투명 바). 메인(/)은 왼쪽 서비스 이름 + 가운데 메뉴 4개, 다른 화면은 오른쪽에 주소 검색 링크. 인쇄 시 숨김 */
export default function SiteHeader() {
  const isHome = usePathname() === '/'
  return (
    <header className="sticky top-0 z-20 border-b border-black/10 bg-paper/80 backdrop-blur-xl backdrop-saturate-150 print:hidden">
      <div className="mx-auto grid h-12 max-w-[1024px] grid-cols-[1fr_auto_1fr] items-center px-4 text-xs sm:px-[22px]">
        <Link href="/" className="justify-self-start text-[15px] font-semibold tracking-tight text-ink">
          Vibe Build
        </Link>
        {isHome ? (
          <nav aria-label="메인 메뉴">
            <ul className="flex items-center gap-8 text-ink/80 sm:gap-[52px]">
              {HOME_MENU.map((m) => (
                <li key={m.label}>
                  <a
                    href={m.href}
                    onClick={m.href === '#' ? (e) => e.preventDefault() : undefined}
                    className="transition hover:text-ink"
                  >
                    {m.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : (
          <>
            <span />
            <Link href="/#search" className="justify-self-end text-ink-soft transition hover:text-ink">
              주소 검색
            </Link>
          </>
        )}
      </div>
    </header>
  )
}
