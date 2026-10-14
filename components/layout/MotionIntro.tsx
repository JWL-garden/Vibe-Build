'use client'

import { useEffect, useRef } from 'react'

export interface MotionStat {
  label: string
  /** 카운트업 목표값. null이면 '-' 로 표시 */
  value: number | null
  /** 소수 자릿수 */
  digits?: number
  unit?: string
}

/** 숫자가 올라가는 시간. 3D 모델 불러오기는 이 시간이 끝난 뒤 시작해 모션이 끊기지 않게 한다 (AnalysisLayout) */
export const MOTION_COUNT_MS = 1600

export interface MotionGroup {
  /** 구역 이름 (예: '증축', '재건축') */
  title: string
  /** 숫자 색 — 3D 뷰에서 쓰는 색과 맞춘다 (증축 #0066cc, 재건축 #0071e3) */
  color: string
  stats: MotionStat[]
}

/**
 * 분석 첫 화면 모션 (무드보드 2 · 07번): 숫자가 아래에서 떠오르며 올라간다.
 * 위에 증축, 아래에 재건축 구역을 차례로 둔다.
 * 스크롤이 아니라 화면이 열릴 때 바로 한 번 재생한다.
 * 숫자는 runAll 결과를 받아 표시만 한다. prefers-reduced-motion 이면 값을 바로 보여 준다.
 */
export default function MotionIntro({ groups }: { groups: MotionGroup[] }) {
  const root = useRef<HTMLDivElement>(null)
  // 값이 같으면 다시 세지 않는다 (부모가 다시 그려도 모션을 재생하지 않음)
  const signature = groups.map((g) => g.stats.map((s) => `${s.value}/${s.digits ?? 0}`).join(',')).join('|')

  useEffect(() => {
    const el = root.current
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const frames: number[] = []
    el.querySelectorAll<HTMLElement>('[data-to]').forEach((node) => {
      const to = Number(node.dataset.to)
      const d = Number(node.dataset.d ?? 0)
      if (reduce) {
        node.textContent = to.toFixed(d)
        return
      }
      let t0: number | null = null
      const step = (t: number) => {
        if (t0 === null) t0 = t
        const p = Math.min((t - t0) / MOTION_COUNT_MS, 1)
        // easeOutQuart: 처음엔 빠르고 끝에서 천천히 멈춘다
        node.textContent = (to * (1 - Math.pow(1 - p, 4))).toFixed(d)
        if (p < 1) frames.push(requestAnimationFrame(step))
      }
      frames.push(requestAnimationFrame(step))
    })
    return () => frames.forEach(cancelAnimationFrame)
  }, [signature])

  return (
    <div ref={root} className="relative grid h-full grid-rows-2 overflow-hidden rounded-[28px] bg-mist">
      {/* 두 칸 사이 선: 좌우 바깥에서 띄운다 */}
      <div aria-hidden className="pointer-events-none absolute left-8 right-8 top-1/2 border-t border-line" />
      {groups.map((g, gi) => (
        <section key={g.title} className="flex flex-col justify-center px-8 py-6">
          <h3 className="motion-rise font-serif text-lg font-bold text-ink" style={{ animationDelay: `${gi * 360}ms` }}>
            {g.title}
          </h3>
          <dl className="mt-3 flex flex-wrap gap-x-9 gap-y-4">
            {g.stats.map((s, i) => (
              <div key={s.label} className="motion-rise" style={{ animationDelay: `${gi * 360 + 120 + i * 120}ms` }}>
                <dd className="text-[36px] font-semibold leading-none tracking-[-0.025em] tabular-nums" style={{ color: s.value === null ? 'var(--color-ink-faint)' : g.color }}>
                  {s.value === null ? (
                    '-'
                  ) : (
                    <>
                      <span data-to={s.value} data-d={s.digits ?? 0}>
                        {(0).toFixed(s.digits ?? 0)}
                      </span>
                      {s.unit && <span className="ml-1 text-[0.4em] font-normal text-ink-soft">{s.unit}</span>}
                    </>
                  )}
                </dd>
                <dt className="mt-1.5 text-xs text-ink-faint">{s.label}</dt>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  )
}
