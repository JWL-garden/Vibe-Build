import AddressSearch, { ExampleGrid } from './AddressSearch'

// 샘플 S1(가상 건물, 손으로 쓴 숫자) 체험 카드는 2026-10-08 결정 9로 화면에서 숨겼다.
// /analysis?sample=S1, /report?sample=S1 경로와 lib/mock/sampleReport.S1.json 은 남아 있다.

/** ① 메인: 첫 화면(이미지 자리 → 큰 제목 → 주소 입력)은 화면 한 장을 채우고, 예시 카드는 스크롤해야 보인다 */
export default function Home() {
  return (
    <main className="pb-24">
      {/* 첫 화면: 상단 바(48px)를 뺀 화면 높이를 채워 예시 카드를 아래로 밀어 낸다 */}
      {/* 영상을 크게(가로 최대 880px) 위쪽 중앙에 두고, 제목·주소 입력창은 영상 바로 아래에 둔다 */}
      <div className="flex min-h-[calc(100svh-3rem)] flex-col pt-10 sm:pt-16">
        <div className="mx-auto w-full max-w-[1024px] px-4 sm:px-6">
          {/* 대표 영상: 음소거 자동 재생(브라우저는 muted 일 때만 자동 재생 허용), 1회 재생 후 마지막 장면에서 멈춤.
              영상 가장자리의 검은 줄은 살짝 확대(scale)해 잘라 낸다 */}
          <div className="mx-auto w-full max-w-[880px] overflow-hidden rounded-[28px]">
            <video
              className="block w-full scale-[1.03]"
              src="/videos/main-hero.mp4"
              autoPlay
              muted
              playsInline
              preload="auto"
              aria-hidden
            />
          </div>
        </div>

        <div className="pt-10 sm:pt-16">
          <h1 className="mx-auto max-w-[1024px] px-4 text-center text-3xl font-bold leading-[1.15] tracking-[-0.02em] text-ink sm:px-6 sm:text-5xl lg:text-[56px]">
            내 건물, 몇 층 더 올릴 수 있을까?
          </h1>
          <div className="mt-10">
            <AddressSearch />
          </div>
        </div>
      </div>

      <ExampleGrid />
    </main>
  )
}
