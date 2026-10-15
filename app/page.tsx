import AddressSearch, { ExampleGrid } from './AddressSearch'
import HomeHero from './HomeHero'

// 샘플 S1(가상 건물, 손으로 쓴 숫자) 체험 카드는 2026-10-08 결정 9로 화면에서 숨겼다.
// /analysis?sample=S1, /report?sample=S1 경로와 lib/mock/sampleReport.S1.json 은 남아 있다.

/** ① 메인: 첫 화면(이미지 자리 → 큰 제목 → 주소 입력)은 화면 한 장을 채우고, 예시 카드는 스크롤해야 보인다 */
export default function Home() {
  return (
    <main className="pb-24">
      {/* 첫 화면: 상단 바(48px)를 뺀 화면 높이를 채워 예시 카드를 아래로 밀어 낸다 */}
      {/* 영상을 크게(가로 최대 880px) 위쪽 중앙에 두고, 제목·주소 입력창은 영상 바로 아래에 둔다 */}
      <div className="flex min-h-[calc(100svh-3rem)] flex-col pt-10 sm:pt-16">
        {/* 영상 → (영상 종료 0.5초 뒤 2초간) 제목 페이드인 → 주소 입력창: HomeHero.tsx */}
        <HomeHero>
          <AddressSearch />
        </HomeHero>
      </div>

      <ExampleGrid />
    </main>
  )
}
