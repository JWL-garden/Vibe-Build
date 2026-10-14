'use client'

import { useEffect, useState } from 'react'

export interface ChapterNavItem {
  /** 앵커 id (쪽 틀의 anchorId 와 같음) */
  id: string
  /** 장 번호 (예: '3장', '부록 1') */
  no: string
  title: string
}

/** 화면 위쪽 이 비율보다 위로 올라온 마지막 장을 "현재 장"으로 본다 */
const SPY_LINE = 0.3

/** 보고서 오른쪽 스티키 목차: 장 앵커 링크 + 스크롤 스파이 (인쇄 시 숨김, 화면이 좁으면 숨김) */
export default function SiteChapterNav({ items }: { items: ChapterNavItem[] }) {
  const [active, setActive] = useState(items[0]?.id ?? '')

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const line = window.innerHeight * SPY_LINE
      let current = items[0]?.id ?? ''
      document.querySelectorAll<HTMLElement>('article[data-spy]').forEach((el) => {
        if (el.getBoundingClientRect().top <= line) current = el.dataset.spy ?? current
      })
      setActive(current)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [items])

  return (
    <nav
      aria-label="보고서 목차"
      className="fixed right-4 top-24 z-20 hidden max-h-[calc(100vh-7rem)] w-44 overflow-y-auto rounded-card border border-line bg-paper px-2 py-2 min-[1200px]:block print:hidden"
    >
      <ol className="space-y-0.5">
        {items.map((it) => {
          const on = it.id === active
          return (
            <li key={it.id}>
              <a
                href={`#${it.id}`}
                aria-current={on ? 'true' : undefined}
                onClick={(e) => {
                  const el = document.getElementById(it.id)
                  if (!el) return
                  e.preventDefault()
                  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  setActive(it.id)
                }}
                className={`flex items-baseline gap-2 rounded-md px-2 py-1.5 text-xs leading-snug transition-colors ${
                  on ? 'bg-mist font-semibold text-ink' : 'text-ink-soft hover:bg-mist hover:text-ink'
                }`}
              >
                <span className="w-10 shrink-0 tabular-nums">{it.no}</span>
                <span className="min-w-0">{it.title}</span>
              </a>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
