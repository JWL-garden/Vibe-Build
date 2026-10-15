'use client'

import { Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

/** 상단 메뉴 (보고서 제외 모든 페이지) (나중에 이름·링크를 바꿔 끼운다). href 가 '#'이면 아직 이동하지 않는다 */
const HOME_MENU: { label: string; href: string }[] = [
  { label: '사업성 검토', href: '#' },
  { label: '설계안 작성', href: '#' },
  { label: '건축사례', href: '#' },
  { label: '협력사', href: '/partners' },
  { label: '고객지원', href: '#' },
]

/** 보고서 화면 상단 바 오른쪽: ← 분석으로 돌아가기 · PDF로 저장 (예전 보고서 툴바를 상단 바로 옮김) */
function ReportActions() {
  const params = useSearchParams()
  const sample = params.get('sample')
  const pnu = params.get('pnu')
  const backHref = sample ? `/analysis?sample=${sample}` : pnu ? `/analysis?pnu=${pnu}` : '/'
  return (
    <div className="flex items-center gap-4 justify-self-end">
      <Link href={backHref} className="text-ink-soft transition hover:text-ink">
        ← 분석으로 돌아가기
      </Link>
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-full bg-action px-3 py-1 text-xs font-medium text-paper transition hover:bg-action-hover"
      >
        PDF로 저장
      </button>
    </div>
  )
}

/** 모든 페이지 공통 상단 바 (애플 코리아식 48px 반투명 바). 보고서를 제외한 페이지(메인·분석 등)는 왼쪽 서비스 이름 + 가운데 메뉴 5개(분석 화면은 오른쪽에 주소 검색 링크), 보고서는 오른쪽에 돌아가기·PDF 저장. 인쇄 시 숨김 */
export default function SiteHeader() {
  const pathname = usePathname()
  const isHome = pathname === '/'
  const isReport = pathname.startsWith('/report')
  return (
    <header className="sticky top-0 z-20 border-b border-black/10 bg-paper/80 backdrop-blur-xl backdrop-saturate-150 print:hidden">
      <div className="mx-auto grid h-12 max-w-[1024px] grid-cols-[1fr_auto_1fr] items-center px-4 text-xs sm:px-[22px]">
        <Link href="/" className="flex items-center gap-2 justify-self-start text-[15px] font-semibold tracking-tight text-ink">
          <Image src="/logo.png" alt="" width={115} height={96} className="h-[20px] w-auto" priority />
          Vibe Build
        </Link>
        {isReport ? (
          <>
            <span />
            <Suspense fallback={null}>
              <ReportActions />
            </Suspense>
          </>
        ) : (
          <>
            <nav aria-label="메인 메뉴">
              <ul className="flex items-center gap-8 text-ink/80 sm:gap-[52px]">
                {HOME_MENU.map((m) => (
                  <li key={m.label}>
                    {m.href === '#' ? (
                      <a href="#" onClick={(e) => e.preventDefault()} className="transition hover:text-ink">
                        {m.label}
                      </a>
                    ) : (
                      <Link
                        href={m.href}
                        aria-current={pathname === m.href ? 'page' : undefined}
                        className={`transition hover:text-ink ${pathname === m.href ? 'font-semibold text-ink' : ''}`}
                      >
                        {m.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
            {isHome ? (
              <span />
            ) : (
              <Link href="/#search" className="justify-self-end text-ink-soft transition hover:text-ink">
                주소 검색
              </Link>
            )}
          </>
        )}
      </div>
    </header>
  )
}
