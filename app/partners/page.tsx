import Image from "next/image";

// 협력사 탭 — 강사님 감사 인사
// 이미지: public/partners/park-jinhoon.jpg (출처: 건설기술교육원 YouTube)
// 한 화면(스크롤 없음)에 들어가도록 이미지 너비를 화면 높이에서 계산한다:
//   이미지 너비 = min(화면 너비 − 여백, 56rem, (화면 높이 − 상단 바 − 문구 영역) × 16/9)
// 모든 문구는 이미지 왼쪽 선에 맞춰 정렬하고, 마무리 문구는 한 줄(기본 45px, 폭이 좁으면 줄어듦)로 왼쪽에서 오른쪽으로 나타난다.

export default function PartnersPage() {
  return (
    <main className="flex h-[calc(100dvh-48px)] items-center justify-center overflow-hidden px-5">
      <div className="w-[max(20rem,min(calc(100vw-2.5rem),56rem,calc((100dvh-26rem)*1.7778)))] [container-type:inline-size]">
        <p className="text-sm font-medium text-[#5b3a22]">Special Thanks</p>
        <h1 className="mt-2 font-serif text-2xl leading-snug font-bold text-stone-900 sm:text-3xl">
          저희가 한 층 더 올라갈 수 있었던 건 두 분 덕분입니다.
        </h1>

        <figure className="mt-5">
          <Image
            src="/partners/park-jinhoon.jpg"
            alt="박진훈 강사님 강의 소개 이미지"
            width={1024}
            height={576}
            className="w-full rounded-lg"
            sizes="(min-width: 896px) 56rem, 100vw"
            priority
          />
          <figcaption className="mt-1.5 text-xs text-stone-500">출처: 건설기술교육원 YouTube</figcaption>
        </figure>
        <p className="mt-3 text-sm font-medium text-stone-900">박진훈 강사님 · Lead Mentor</p>
        <p className="mt-1 text-sm font-medium text-stone-900">백수민 보조강사님 · Technical Mentor</p>

        {/* 기존 text-2xl/3xl(24·30px)의 1.5배 = 36·45px. 한 줄 유지를 위해 폭에 맞춰 줄어든다 */}
        <p
          className="reveal-ltr mt-6 font-serif font-bold whitespace-nowrap text-stone-900"
          style={{ fontSize: "min(45px, 4.4cqw)" }}
        >
          다음 층도 두 분께 배운 대로 올리겠습니다.
        </p>

        <p className="mt-5 border-t border-stone-200 pt-3 text-xs text-stone-500">
          건설기술교육원 BIM-IT 융합과정 1조 VIBE BUILD
        </p>
      </div>
    </main>
  );
}
