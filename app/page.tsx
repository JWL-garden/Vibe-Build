import AddressSearch, { ExampleGrid } from './AddressSearch'

// 샘플 S1(가상 건물, 손으로 쓴 숫자) 체험 카드는 2026-10-08 결정 9로 화면에서 숨겼다.
// /analysis?sample=S1, /report?sample=S1 경로와 lib/mock/sampleReport.S1.json 은 남아 있다.

/** ① 메인: 첫 화면(이미지 자리 → 큰 제목 → 주소 입력)은 화면 한 장을 채우고, 예시 카드는 스크롤해야 보인다 */
export default function Home() {
  return (
    <main className="pb-24">
      {/* 첫 화면: 상단 바(48px)를 뺀 화면 높이를 채워 예시 카드를 아래로 밀어 낸다 */}
      <div className="flex min-h-[calc(100svh-3rem)] flex-col">
        <section className="mx-auto w-full max-w-[1024px] px-4 pt-12 text-center sm:px-6 sm:pt-20">
          {/* 대표 이미지 자리: 이미지는 나중에 넣는다 (가로 약 620px, 가로:세로 약 2.1:1) */}
          <div aria-hidden className="mx-auto aspect-[2.1/1] w-full max-w-[620px]" />

          <h1 className="mt-8 text-3xl font-bold leading-[1.15] tracking-[-0.02em] text-ink sm:text-5xl lg:text-[56px]">
            내 건물, 몇 층 더 올릴 수 있을까?
          </h1>
        </section>

        <div className="mt-10">
          <AddressSearch />
        </div>
      </div>

      <ExampleGrid />
    </main>
  )
}
