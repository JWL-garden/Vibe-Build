import AddressSearch from './AddressSearch'

/** 랜딩: 주소 입력 */
export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-16">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-center text-3xl font-bold text-slate-800">건축물 증축 가능성 분석</h1>
        <p className="mt-3 text-center text-slate-500">
          주소를 입력하면 건축물대장 정보를 바탕으로 증축 가능성을 검토합니다.
        </p>

        <AddressSearch />

        <p className="mt-12 text-center text-xs text-slate-400">데이터: 서울 영등포구 건축물대장 표제부 (Mock 데이터)</p>
      </div>
    </main>
  )
}
