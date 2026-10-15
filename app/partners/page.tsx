import Image from "next/image";

// 협력사 탭 — 강사님 감사 인사
// 이미지: public/partners/park-jinhoon.jpg (출처: 건설기술교육원 YouTube)

export default function PartnersPage() {
  return (
    <main className="mx-auto max-w-5xl px-5 py-16 sm:py-24">
      <p className="text-sm font-medium text-[#5b3a22]">Special Thanks</p>
      <p className="mt-4 text-lg text-stone-500">내 건물, 몇 층 더 올릴 수 있을까?</p>
      <h1 className="mt-2 font-serif text-3xl leading-snug font-bold text-stone-900 sm:text-4xl">
        저희가 한 층 더 올라갈 수 있었던 건
        <br />
        두 분 덕분입니다.
      </h1>

      <figure className="mt-12 max-w-3xl">
        <Image
          src="/partners/park-jinhoon.jpg"
          alt="박진훈 강사님 강의 소개 이미지"
          width={1024}
          height={576}
          className="w-full rounded-lg"
          sizes="(min-width: 768px) 48rem, 100vw"
        />
        <figcaption className="mt-2 text-xs text-stone-500">출처: 건설기술교육원 YouTube</figcaption>
      </figure>
      <p className="mt-5 font-medium text-stone-900">박진훈 강사님 · Lead Mentor</p>
      <p className="mt-1.5 font-medium text-stone-900">백수민 보조강사님 · Technical Mentor</p>

      <p className="mt-14 font-serif text-2xl leading-normal font-bold text-stone-900 sm:text-3xl">
        다음 층도
        <br />
        두 분께 배운 대로 올리겠습니다.
      </p>

      <p className="mt-20 border-t border-stone-200 pt-6 text-sm text-stone-500">
        건설기술교육원 BIM-IT 융합과정 1조 VIBE BUILD
      </p>
    </main>
  );
}
