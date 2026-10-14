import AddressSearch from './AddressSearch'

// 샘플 S1(가상 건물, 손으로 쓴 숫자) 체험 카드는 2026-10-08 결정 9로 화면에서 숨겼다.
// /analysis?sample=S1, /report?sample=S1 경로와 lib/mock/sampleReport.S1.json 은 남아 있다.

/** ① 메인: 주소 입력 (애플 코리아 메인 구조: 가운데 정렬 큰 제목 → 한 줄 설명 → 행동 요소) */
export default function Home() {
  return (
    <main className="pb-24">
      <section className="mx-auto max-w-[1024px] px-4 pb-10 pt-16 text-center sm:px-6 sm:pt-24">
        <p className="text-xl font-semibold text-ink-soft sm:text-2xl">법규 완화 · 일조권 · 용적률 · 증축 사업성</p>
        <h1 className="mx-auto mt-2 max-w-3xl text-4xl font-semibold leading-[1.07] tracking-[-0.005em] text-ink sm:text-[56px]">
          내 건물, 몇 층 더 올릴 수 있을까?
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-xl leading-snug text-ink-soft sm:text-[21px]">
          주소를 입력하면 건축물대장을 바탕으로 현재 규모를 확인하고, 법규 완화를 적용했을 때 증축 가능 규모와
          수익성을 검토해 건축주 보고서로 정리합니다.
        </p>
      </section>

      <AddressSearch />
    </main>
  )
}
