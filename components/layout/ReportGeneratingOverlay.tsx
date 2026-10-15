'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

/** 진행 시간 (ms). 실제 계산은 보고서 화면에서 즉시 끝나므로, 신중히 검토한다는 느낌을 주는 연출용 시간이다 (10초) */
const DURATION_MS = 10000

/** 진행률 구간별 안내 문구 (percent 이상일 때 표시) — 맨 아래 단계 문구는 여기서 수정한다 */
const STAGES: { from: number; text: string }[] = [
  { from: 0, text: '대상 건축물 정보를 불러오는 중…' },
  { from: 25, text: '법규 완화 시나리오를 적용하는 중…' },
  { from: 50, text: '건물 모델링 및 보고서 작성 중…' },
  { from: 80, text: '사업성 분석 결과를 정리하는 중…' },
]

/**
 * 중앙 일러스트 5장 (public/images/generating, docs/reference/Infographics.png 에서 분리).
 * 전체 진행 시간 중 from(0~1) 이후가 되면 해당 그림으로 바뀐다 (진행률 %가 아니라 경과 시간 기준).
 * 앞의 4장이 시간을 고르게 나눠 갖고, 마지막 5장(보고서 완성)은 마지막 1초(= 90% 지점 이후)에만 나온다.
 * 같은 크기 캔버스라 위치가 흔들리지 않는다.
 * 1 대지·법규 조사 → 2 골조 → 3 외피 시공 → 4 준공 건물 → 5 보고서 완성
 */
const SCENES: { from: number; src: string }[] = [
  { from: 0, src: '/images/generating/step-1-site.png' },
  { from: 0.225, src: '/images/generating/step-2-structure.png' },
  { from: 0.45, src: '/images/generating/step-3-envelope.png' },
  { from: 0.675, src: '/images/generating/step-4-complete.png' },
  { from: 0.9, src: '/images/generating/step-5-report.png' },
]
/** 일러스트 캔버스 크기 (px) — 분리한 PNG 모두 같다 */
const SCENE_W = 512
const SCENE_H = 419

/** easeInOut: 처음·끝은 천천히, 가운데는 빠르게 */
const ease = (p: number) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2)

interface Props {
  /** 진행이 끝나면 이동할 보고서 주소 */
  href: string
  /** 닫기(X 버튼·Esc) — 진행을 멈추고 분석 화면으로 돌아간다 */
  onClose: () => void
}

/**
 * 분석 화면 위에 겹쳐 뜨는 "보고서 생성 중" 팝업.
 * 뒤 화면을 어둡게·흐리게 하고, 가운데 카드에서 일러스트와 진행률을 보여 준 뒤 보고서로 이동한다.
 */
export default function ReportGeneratingOverlay({ href, onClose }: Props) {
  const router = useRouter()
  const [percent, setPercent] = useState(0)
  /** 경과 시간 비율 (0~1) — 일러스트 전환 기준 */
  const [elapsed, setElapsed] = useState(0)

  // 팝업이 떠 있는 동안 뒤 화면 스크롤 잠금
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  // Esc 로 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const duration = reduce ? 800 : DURATION_MS
    let t0: number | null = null
    let frame = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    const step = (t: number) => {
      if (t0 === null) t0 = t
      const p = Math.min((t - t0) / duration, 1)
      setPercent(Math.round(ease(p) * 100))
      setElapsed(p)
      if (p < 1) frame = requestAnimationFrame(step)
      else timer = setTimeout(() => router.push(href), 350)
    }
    frame = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(frame)
      if (timer) clearTimeout(timer)
    }
  }, [href, router])

  const stage = [...STAGES].reverse().find((s) => percent >= s.from)?.text ?? STAGES[0].text
  const done = percent >= 100
  const scene = SCENES.reduce((cur, sc, i) => (elapsed >= sc.from ? i : cur), 0)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 px-4 backdrop-blur-sm print:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="보고서 생성 중"
    >
      <section
        aria-live="polite"
        className="relative w-full max-w-[520px] rounded-[28px] bg-gradient-to-b from-action-soft/70 to-paper px-8 py-9 text-center shadow-[0_24px_80px_rgba(0,0,0,0.25)]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-ink-faint transition hover:bg-black/5 hover:text-ink"
        >
          <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
            <path d="M2 2l8 8M10 2l-8 8" />
          </svg>
        </button>

        <h1 className="font-serif text-[26px] font-bold leading-tight text-ink">보고서를 생성하고 있습니다.</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          데이터를 분석하여 증축 계획과 사업성 보고서를 조립하는 중입니다.
          <br />
          잠시만 기다려 주세요.
        </p>

        {/* 중앙 일러스트: 진행률에 따라 한 장씩 바뀐다 (겹쳐 두고 투명도·위치만 전환) */}
        <div className="relative mx-auto my-6 w-full max-w-[340px]" style={{ aspectRatio: `${SCENE_W} / ${SCENE_H}` }} aria-hidden>
          {SCENES.map((sc, i) => {
            const state = i === scene ? 'now' : i < scene ? 'past' : 'next'
            return (
              <Image
                key={sc.src}
                src={sc.src}
                alt=""
                width={SCENE_W}
                height={SCENE_H}
                priority={i === 0}
                className="absolute inset-0 h-full w-full object-contain will-change-[opacity,transform]"
                style={{
                  opacity: state === 'now' ? 1 : 0,
                  transform: state === 'now' ? 'none' : state === 'past' ? 'translateY(-6px) scale(1.015)' : 'translateY(8px) scale(0.985)',
                  // 들어오는 그림은 천천히 나타나고(1.2초), 나가는 그림은 그 사이에 서서히 사라진다(0.9초) → 두 그림이 겹치며 교차
                  transition:
                    state === 'now'
                      ? 'opacity 1200ms cubic-bezier(0.4, 0, 0.2, 1) 150ms, transform 1400ms cubic-bezier(0.22, 1, 0.36, 1)'
                      : 'opacity 900ms cubic-bezier(0.4, 0, 0.2, 1), transform 1200ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              />
            )
          })}
        </div>

        <div
          aria-hidden
          className={`mx-auto h-8 w-8 rounded-full border-[3px] border-action-soft border-t-action ${done ? '' : 'animate-spin'}`}
        />
        <p className="mt-3 text-sm font-semibold text-ink tabular-nums">{done ? '완료' : `${percent}% 분석 중...`}</p>

        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="mt-4 h-2 w-full overflow-hidden rounded-full bg-action-soft"
        >
          <div className="h-full rounded-full bg-action transition-[width] duration-150 ease-out" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-4 text-sm text-ink-soft">{stage}</p>
      </section>
    </div>
  )
}
