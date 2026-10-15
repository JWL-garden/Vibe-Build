'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

/** 진행 시간 (ms). 실제 계산은 보고서 화면에서 즉시 끝나므로, 신중히 검토한다는 느낌을 주는 연출용 시간이다 (10초) */
const DURATION_MS = 10000

/** 진행률 구간별 안내 문구 (percent 이상일 때 표시) — 맨 아래 단계 문구는 여기서 수정한다 */
const STAGES: { from: number; text: string }[] = [
  { from: 0, text: '대상 건축물 정보를 불러오는 중…' },
  { from: 25, text: '법규 완화 시나리오를 적용하는 중…' },
  { from: 50, text: '건물 모델링 및 보고서 작성 중…' },
  { from: 80, text: '사업성 분석 결과를 정리하는 중…' },
]

/** 이동할 주소는 보고서 경로만 허용한다 (다른 주소로 보내지 않음) */
function safeNext(raw: string | null): string | null {
  if (!raw || !raw.startsWith('/report?')) return null
  return raw
}

/** easeInOut: 처음·끝은 천천히, 가운데는 빠르게 */
const ease = (p: number) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2)

export default function GeneratingView() {
  const router = useRouter()
  const next = safeNext(useSearchParams().get('next'))
  const [percent, setPercent] = useState(0)

  useEffect(() => {
    if (!next) {
      router.replace('/')
      return
    }
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
      else timer = setTimeout(() => router.replace(next), 350)
    }
    frame = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(frame)
      if (timer) clearTimeout(timer)
    }
  }, [next, router])

  const stage = [...STAGES].reverse().find((s) => percent >= s.from)?.text ?? STAGES[0].text
  const done = percent >= 100

  return (
    <main className="min-h-[calc(100vh-48px)] bg-mist px-4 py-8">
      <section
        role="status"
        aria-live="polite"
        // 보고서 한 쪽과 같은 크기 (A4 210×297mm — components/report/ReportPage.tsx)
        className="mx-auto flex min-h-[297mm] w-full max-w-[210mm] flex-col justify-center bg-gradient-to-b from-action-soft/60 to-paper px-[16mm] py-[14mm] text-center shadow-[0_2px_24px_rgba(21,23,23,0.08)]"
      >
        <h1 className="font-serif text-[35px] font-bold leading-tight text-ink">보고서를 생성하고 있습니다.</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          <br />
          데이터를 분석하여 증축 계획과 사업성 보고서를 조립하는 중입니다.
          <br />
          잠시만 기다려 주세요.
        </p>

        {/* 중앙 이미지 자리 — 이미지는 나중에 삽입 (비워 둠) */}
        <div className="mx-auto my-10 h-[320px] w-full" aria-hidden />

        <div
          aria-hidden
          className={`mx-auto h-9 w-9 rounded-full border-[3px] border-action-soft border-t-action ${done ? '' : 'animate-spin'}`}
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
    </main>
  )
}
