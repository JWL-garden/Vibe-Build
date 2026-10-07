import Link from 'next/link'
import source from '@/lib/data/source.json'
import AddressSearch from './AddressSearch'

/** ① 메인: 주소 입력 */
export default function Home() {
  return (
    <main>
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-16 sm:px-6 sm:pt-24">
        <p className="text-sm font-medium tracking-wide text-accent">법규 완화 · 일조권 · 용적률 · 증축 사업성</p>
        <h1 className="mt-4 max-w-3xl font-serif text-4xl font-bold leading-tight text-ink sm:text-6xl">
          내 건물, 몇 층 더 올릴 수 있을까?
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">
          주소를 입력하면 건축물대장을 바탕으로 현재 규모를 확인하고, 법규 완화를 적용했을 때 증축 가능 규모와
          수익성을 검토해 건축주 보고서로 정리합니다.
        </p>
      </section>

      <AddressSearch />

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <Link
          href="/analysis?sample=S1"
          className="group flex flex-col gap-6 rounded-card bg-ink px-8 py-10 text-paper transition hover:bg-ink/90 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="text-sm text-paper/60">샘플 분석 · 가상 건물 S1</p>
            <h2 className="mt-2 font-serif text-2xl font-bold sm:text-3xl">4층 근린생활시설, 8층까지 올리면?</h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-paper/70">
              증축이 가능하다고 가정한 건물로 분석 화면부터 건축주 보고서 전체(요약·법규·계획·사업비·수익·리스크·일정)까지
              차례로 볼 수 있습니다.
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-paper px-6 py-3 text-center font-medium text-ink transition group-hover:translate-x-1">
            샘플로 체험하기 →
          </span>
        </Link>
      </section>

      <p className="mx-auto max-w-6xl px-4 pb-16 text-xs text-ink-faint sm:px-6">
        데이터: T1·T2는 기준 엑셀({source.version} · {source.sourceDate}), 그 외 주소는 서울 영등포구 건축물대장 표제부 (샘플 데이터) · 결과는
        개략 검토용 참고 자료입니다.
      </p>
    </main>
  )
}
