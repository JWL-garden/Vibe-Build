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
 * 진행률이 from 이상이 되면 해당 그림으로 바뀐다 (같은 크기 캔버스라 위치가 흔들리지 않는다).
 * 1 대지·법규 조사 → 2 골조 → 3 외피 시공 → 4 준공 건물 → 5 보고서 완성
 */
const SCENES: { from: number; src: string }[] = [
  { from: 0, src: '/images/generating/step-1-site.png' },
  { from: 20, src: '/images/generating/step-2-structure.png' },
  { from: 40, src: '/images/generating/step-3-envelope.png' },
  { from: 60, src: '/images/generating/step-4-complete.png' },
  { from: 80, src: '/images/generating/step-5-report.png' },
]
/** 일러스트 캔버스 크기 (px) — 분리한 PNG 모두 같다 */
const SCENE_W = 512
const SCENE_H = 419

/** easeInOut: 처음·끝은 천천히, 가운데는 빠르게 */
const ease = (p: number) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2)

interface Props {
  /** 진행이 끝나면 이동할 보고서 주소 */
  href: string
}

/**
 * 분석 화면 위에 겹쳐 뜨는 "보고서 생성 중" 팝업.
 * 뒤 화면을 어둡게·흐리게 하고, 가운데 카드에서 일러스트와 진행률을 보여 준 뒤 보고서로 이동한다.
 */
export default function ReportGeneratingOverlay({ href }: Props) {
  const router = useRouter()
  const [percent, setPercent] = useState(0)

  // 팝업이 떠 있는 동안 뒤 화면 스크롤 잠금
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

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
  const scene = SCENES.reduce((cur, sc, i) => (percent >= sc.from ? i : cur), 0)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 px-4 backdrop-blur-sm print:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="보고서 생성 중"
    >
      <section
        aria-live="polite"
        className="w-full max-w-[520px] rounded-[28px] bg-gradient-to-b from-action-soft/70 to-paper px-8 py-9 text-center shadow-[0_24px_80px_rgba(0,0,0,0.25)]"
      >
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
                className="absolute inset-0 h-full w-full object-contain transition-[opacity,transform] duration-700 ease-out"
                style={{
                  opacity: state === 'now' ? 1 : 0,
                  transform: state === 'now' ? 'none' : state === 'past' ? 'translateY(-10px) scale(0.97)' : 'translateY(14px) scale(0.97)',
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
