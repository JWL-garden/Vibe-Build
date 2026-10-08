import source from '@/lib/data/source.json'
import AddressSearch from './AddressSearch'

// 샘플 S1(가상 건물, 손으로 쓴 숫자) 체험 카드는 2026-10-08 결정 9로 화면에서 숨겼다.
// /analysis?sample=S1, /report?sample=S1 경로와 lib/mock/sampleReport.S1.json 은 남아 있다.

/** ① 메인: 주소 입력 */
export default function Home() {
  const base = source.sources.base
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

      <p className="mx-auto max-w-6xl px-4 pb-16 text-xs text-ink-faint sm:px-6">
        데이터: T1·T2는 기준 엑셀({base.version} · {base.sourceDate}), 그 외 주소는 서울 영등포구 건축물대장 표제부 (샘플 데이터) · 결과는
        개략 검토용 참고 자료입니다.
      </p>
    </main>
  )
}
