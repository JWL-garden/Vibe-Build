'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { getExampleAddresses, searchSites } from '@/lib/services/dataService'
import type { ExampleAddress, SiteCandidate } from '@/types'

/** 메인 페이지의 주소 검색창. 입력칸을 누르면 T1·T2 예시 주소가 목록으로 나온다 (사용자 입력을 받으므로 클라이언트 컴포넌트) */
export default function AddressSearch() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [candidates, setCandidates] = useState<SiteCandidate[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [examples, setExamples] = useState<ExampleAddress[]>([])
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getExampleAddresses().then((list) => setExamples(list.filter((ex) => ex.tag)))
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

  const goToAnalysis = (pnu: string) => router.push(`/analysis?pnu=${pnu}`)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setCandidates([])
    setMessage(null)
    setOpen(false)

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
        <div ref={boxRef} className="relative">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-2 rounded-full border border-line bg-paper p-2 shadow-[0_8px_30px_rgba(21,23,23,0.06)] sm:flex-row sm:items-center"
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setOpen(true)}
              onClick={() => setOpen(true)}
              autoComplete="off"
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

          {open && examples.length > 0 && (
            <ul
              role="listbox"
              aria-label="예시 주소"
              className="absolute left-0 right-0 top-full z-10 mt-2 divide-y divide-line overflow-hidden rounded-card border border-line bg-paper shadow-[0_8px_30px_rgba(21,23,23,0.08)]"
            >
              {examples.map((ex) => (
                <li key={ex.pnu} role="option" aria-selected={false}>
                  <button
                    type="button"
                    onClick={() => goToAnalysis(ex.pnu)}
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
