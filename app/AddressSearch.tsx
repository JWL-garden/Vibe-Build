'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { getExampleAddresses, searchSites } from '@/lib/services/dataService'
import type { ExampleAddress, SiteCandidate } from '@/types'

/** 랜딩 페이지의 주소 검색창 + 예시 주소 버튼 (사용자 입력을 받으므로 클라이언트 컴포넌트) */
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
      <form onSubmit={handleSubmit} className="mt-10 flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="주소 입력 (예: 영등포구 당산동6가 3-1)"
          className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
        />
        <button type="submit" className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700">
          분석
        </button>
      </form>

      {message && <p className="mt-4 text-sm text-slate-600">{message}</p>}

      {candidates.length > 0 && (
        <ul className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {candidates.map((c) => (
            <li key={c.pnu}>
              <button type="button" onClick={() => goToAnalysis(c.pnu)} className="w-full px-4 py-3 text-left hover:bg-blue-50">
                <div className="font-medium text-slate-800">{c.address}</div>
                <div className="text-sm text-slate-500">
                  {c.roadAddress ?? '도로명 주소 없음'}
                  {c.buildingCount > 1 && ` · 건물 ${c.buildingCount}동`}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <section className="mt-12">
        <h2 className="text-sm font-semibold text-slate-500">예시 주소</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {examples.map((ex) => (
            <button
              key={ex.pnu}
              type="button"
              onClick={() => goToAnalysis(ex.pnu)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-left shadow-sm hover:border-blue-400 hover:bg-blue-50"
            >
              <div className="font-medium text-slate-800">{ex.label}</div>
              <div className="mt-1 text-xs text-slate-500">{ex.note}</div>
            </button>
          ))}
        </div>
      </section>
    </>
  )
}
