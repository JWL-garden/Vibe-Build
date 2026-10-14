'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import BuildingIllustration from '@/components/layout/BuildingIllustration'
import { runAll } from '@/lib/calc'
import { formatRate } from '@/lib/format'
import { getExampleAddresses, getSiteData, searchSites } from '@/lib/services/dataService'
import type { ExampleAddress, SiteCandidate } from '@/types'

/** 메인 페이지의 주소 검색창 (아래 예시 카드 목록은 ExampleGrid). 입력칸을 누르면 T1·T2 예시 주소가 목록으로 나온다 (사용자 입력을 받으므로 클라이언트 컴포넌트) */
export default function AddressSearch() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [candidates, setCandidates] = useState<SiteCandidate[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [examples, setExamples] = useState<ExampleAddress[]>([])
  const [open, setOpen] = useState(false)
  /** 목록에서 고른 예시 주소의 PNU. 있으면 [분석하기]를 눌렀을 때 바로 그 필지로 이동 */
  const [selectedPnu, setSelectedPnu] = useState<string | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getExampleAddresses().then(setExamples)
  }, [])

  // 입력칸 바깥을 누르거나 Esc 를 누르면 예시 목록을 닫는다
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  // 입력칸을 눌렀을 때는 우선 분석 대상(T1·T2, tag 있음)만 보여 준다. 아래 카드 그리드는 전체
  const dropdownExamples = examples.filter((ex) => ex.tag)

  const goToAnalysis = (pnu: string) => router.push(`/analysis?pnu=${pnu}`)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setCandidates([])
    setMessage(null)
    setOpen(false)

    if (selectedPnu) {
      goToAnalysis(selectedPnu)
      return
    }
    if (query.trim() === '') {
      setMessage('주소를 입력해 주세요.')
      return
    }
    const found = await searchSites(query)
    if (found.length === 0) {
      setMessage('일치하는 주소가 없습니다. 지번(예: 당산동6가 3-1) 또는 도로명(예: 양평로 2)으로 입력해 보세요.')
    } else if (found.length === 1) {
      goToAnalysis(found[0].pnu)
    } else {
      setCandidates(found)
      setMessage(`${found.length}개의 주소가 검색되었습니다. 분석할 주소를 선택하세요.`)
    }
  }

  return (
    <>
      <section id="search" className="mx-auto max-w-[680px] scroll-mt-24 px-4 sm:px-6">
        <div ref={boxRef} className="relative">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-2 rounded-full border border-line bg-paper p-2 sm:flex-row sm:items-center"
          >
            <input
              type="text"
              value={query}
              onChange={(e) => {
              setQuery(e.target.value)
              setSelectedPnu(null)
            }}
              onFocus={() => setOpen(true)}
              onClick={() => setOpen(true)}
              autoComplete="off"
              placeholder="주소를 입력하세요 (예: 영등포구 당산동6가 3-1)"
              aria-label="주소"
              className="min-w-0 flex-1 rounded-full bg-transparent px-5 py-3 text-ink outline-none placeholder:text-ink-faint"
            />
            <button
              type="submit"
              className="rounded-full bg-action px-8 py-3 font-medium text-paper transition hover:bg-action-hover"
            >
              분석하기
            </button>
          </form>

          {open && dropdownExamples.length > 0 && (
            <ul
              role="listbox"
              aria-label="예시 주소"
              className="absolute left-0 right-0 top-full z-10 mt-2 divide-y divide-line overflow-hidden rounded-card border border-line bg-paper shadow-[0_8px_30px_rgba(21,23,23,0.08)]"
            >
              {dropdownExamples.map((ex) => (
                <li key={ex.pnu} role="option" aria-selected={false}>
                  <button
                    type="button"
                    onClick={() => {
                      // 선택만 한다: 입력칸에 주소를 채우고, 이동은 [분석하기]를 눌렀을 때
                      setQuery(ex.label)
                      setSelectedPnu(ex.pnu)
                      setMessage(null)
                      setCandidates([])
                      setOpen(false)
                    }}
                    className="w-full px-5 py-4 text-left transition hover:bg-mist"
                  >
                    <div className="font-medium text-ink">{ex.label}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {message && <p className="mt-4 px-2 text-sm text-ink-soft">{message}</p>}

        {candidates.length > 0 && (
          <ul className="mt-3 divide-y divide-line overflow-hidden rounded-card border border-line bg-paper">
            {candidates.map((c) => (
              <li key={c.pnu}>
                <button
                  type="button"
                  onClick={() => goToAnalysis(c.pnu)}
                  className="w-full px-5 py-4 text-left transition hover:bg-mist"
                >
                  <div className="font-medium text-ink">{c.address}</div>
                  <div className="mt-0.5 text-sm text-ink-soft">
                    {c.roadAddress ?? '도로명 주소 없음'}
                    {c.buildingCount > 1 && ` · 건물 ${c.buildingCount}동`}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

/** 메인 아래쪽 예시 주소 카드 (첫 화면 아래로 스크롤했을 때만 보인다). 카드는 전체 예시 10개 */
export function ExampleGrid() {
  const router = useRouter()
  const [examples, setExamples] = useState<ExampleAddress[]>([])
  /** 카드별 ROI: 복합 완화(증축) 시나리오 · 수익 기준 시나리오의 runAll 결과. undefined = 계산 전, null = 증축 불가 등 계산 없음 */
  const [roiByPnu, setRoiByPnu] = useState<Record<string, number | null>>({})

  useEffect(() => {
    getExampleAddresses().then(setExamples)
  }, [])

  useEffect(() => {
    let cancelled = false
    examples.forEach((ex) => {
      void getSiteData(ex.pnu).then((data) => {
        if (cancelled) return
        const roi = data ? runAll(data, 'ALL').finance.byScenario.BASE.metrics.roi : null
        setRoiByPnu((prev) => ({ ...prev, [ex.pnu]: roi }))
      })
    })
    return () => {
      cancelled = true
    }
  }, [examples])

  const goToAnalysis = (pnu: string) => router.push(`/analysis?pnu=${pnu}`)

  return (
      <section className="mx-auto max-w-[1024px] px-4 pb-8 pt-6 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-[17px] font-semibold leading-snug text-ink-faint">예시 주소로 바로 보기</h2>
          <span className="shrink-0 text-xs text-ink-faint">샘플 데이터 · {examples.length}개</span>
        </div>
        <div className="mt-6 grid gap-[14px] md:grid-cols-2">
          {examples.map((ex) => (
            <button
              key={ex.pnu}
              type="button"
              onClick={() => goToAnalysis(ex.pnu)}
              className="group flex flex-col overflow-hidden rounded-[28px] bg-mist text-left transition duration-300 hover:-translate-y-1"
            >
              <div className="relative flex h-48 items-end justify-center px-6 pt-6">
                {ex.tag && (
                  <span className="absolute left-6 top-6 rounded-full bg-action/10 px-3 py-1 text-xs font-semibold text-action">
                    {ex.tag}
                  </span>
                )}
                <BuildingIllustration floors={ex.floorsAbove} showAddition className="h-40 w-full" />
              </div>
              <div className="px-7 py-6">
                <div className="text-xl font-semibold leading-snug tracking-[-0.01em] text-ink">{ex.label}</div>
                {/* 세대수 줄: 왼쪽 세대수 + [ROI], 오른쪽 살펴보기 (같은 행·같은 높이) */}
                <div className="mt-1 flex items-baseline justify-between gap-3 text-sm leading-6">
                  <span className="min-w-0 text-ink-soft">
                    {ex.note}
                    {roiByPnu[ex.pnu] !== undefined && roiByPnu[ex.pnu] !== null && (
                      <span className="ml-1.5 font-medium text-ink">[ROI {formatRate(roiByPnu[ex.pnu])}]</span>
                    )}
                  </span>
                  <span className="shrink-0 font-medium text-link">살펴보기 ›</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>
  )
}
