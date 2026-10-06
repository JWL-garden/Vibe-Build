'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import BuildingIllustration from '@/components/layout/BuildingIllustration'
import { getExampleAddresses, searchSites } from '@/lib/services/dataService'
import type { ExampleAddress, SiteCandidate } from '@/types'

/** 메인 페이지의 주소 검색창 + 예시 주소 카드 (사용자 입력을 받으므로 클라이언트 컴포넌트) */
export default function AddressSearch() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [candidates, setCandidates] = useState<SiteCandidate[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [examples, setExamples] = useState<ExampleAddress[]>([])

  useEffect(() => {
    getExampleAddresses().then(setExamples)
  }, [])

  const goToAnalysis = (pnu: string) => router.push(`/analysis?pnu=${pnu}`)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setCandidates([])
    setMessage(null)

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
      <section id="search" className="mx-auto max-w-6xl scroll-mt-24 px-4 sm:px-6">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-2 rounded-full border border-line bg-paper p-2 shadow-[0_8px_30px_rgba(21,23,23,0.06)] sm:flex-row sm:items-center"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="주소를 입력하세요 (예: 영등포구 당산동6가 3-1)"
            aria-label="주소"
            className="min-w-0 flex-1 rounded-full bg-transparent px-5 py-3 text-ink outline-none placeholder:text-ink-faint"
          />
          <button
            type="submit"
            className="rounded-full bg-ink px-8 py-3 font-medium text-paper transition hover:bg-ink/80"
          >
            분석하기
          </button>
        </form>

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

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="flex items-end justify-between border-b border-line pb-4">
          <h2 className="font-serif text-2xl font-bold text-ink">예시 주소로 바로 보기</h2>
          <span className="text-sm text-ink-faint">발표용 샘플</span>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-3">
          {examples.map((ex) => (
            <button
              key={ex.pnu}
              type="button"
              onClick={() => goToAnalysis(ex.pnu)}
              className="group overflow-hidden rounded-card border border-line bg-paper text-left transition hover:border-ink/30"
            >
              <div className="flex h-44 items-end justify-center bg-mist px-6 pt-4">
                <BuildingIllustration floors={ex.floorsAbove} showAddition className="h-40 w-full" />
              </div>
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <div className="font-medium text-ink">{ex.label}</div>
                  <div className="mt-1 text-sm text-ink-soft">{ex.note}</div>
                </div>
                <span className="text-sm font-medium text-ink transition group-hover:translate-x-1">살펴보기 →</span>
              </div>
            </button>
          ))}
        </div>
      </section>
    </>
  )
}
