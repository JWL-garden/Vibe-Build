'use client'

import { useState, type ReactNode } from 'react'

/** 영상이 시작된 뒤 제목이 나타나기까지 기다리는 시간(ms), 0 = 바로 */
const TITLE_DELAY_MS = 0
/** 제목이 아래에서 위로 차오르며 나타나는 시간(ms) */
const TITLE_FADE_MS = 3000
/** 아래(불투명) → 위(투명) 그라데이션. 가운데 구간이 부드러운 경계가 된다 */
const TITLE_MASK = 'linear-gradient(to top, #000 0%, #000 33%, transparent 66%, transparent 100%)'

/**
 * 메인 첫 화면: 대표 영상(음소거, 1회 재생) → 영상이 시작되면 바로 제목이 아래에서 위로 차오르며 나타난다.
 * 주소 입력창(children)은 제목 아래에 항상 보인다.
 */
export default function HomeHero({ children }: { children: ReactNode }) {
  const [titleShown, setTitleShown] = useState(false)

  return (
    <>
      <div className="mx-auto w-full max-w-[1024px] px-4 sm:px-6">
        {/* 영상 가장자리의 검은 줄은 영상을 틀보다 2% 키워 아래쪽을 잘라 낸다 (scale 대신 배치로 처리: 다른 페이지를 다녀와도 같게 보인다) */}
        <div className="relative mx-auto aspect-video w-full max-w-[880px] overflow-hidden rounded-[28px] bg-white">
          <video
            className="absolute left-0 top-0 block h-[102%] w-full bg-white object-cover outline-none"
            src="/videos/main-hero.mp4"
            autoPlay
            muted
            playsInline
            preload="auto"
            aria-hidden
            onPlaying={() => setTitleShown(true)}
            // 영상을 못 불러오거나 재생이 막혀도 제목은 보이게 한다
            onError={() => setTitleShown(true)}
          />
        </div>
      </div>

      <div className="pt-10 sm:pt-16">
        <h1
          className="mx-auto max-w-[1024px] px-4 text-center text-3xl font-bold leading-[1.15] tracking-[-0.02em] text-ink sm:px-6 sm:text-5xl lg:text-[56px]"
          style={{
            // 아래에서 위로 글자가 차오르는 그라데이션 마스크: 마스크를 3배 높이로 두고 위치만 옮긴다
            maskImage: TITLE_MASK,
            WebkitMaskImage: TITLE_MASK,
            maskSize: '100% 300%',
            WebkitMaskSize: '100% 300%',
            maskRepeat: 'no-repeat',
            WebkitMaskRepeat: 'no-repeat',
            maskPosition: titleShown ? '0% 100%' : '0% 0%',
            WebkitMaskPosition: titleShown ? '0% 100%' : '0% 0%',
            transitionProperty: 'mask-position, -webkit-mask-position',
            transitionDuration: `${TITLE_FADE_MS}ms`,
            transitionTimingFunction: 'ease-out',
            transitionDelay: titleShown ? `${TITLE_DELAY_MS}ms` : '0ms',
          }}
        >
          내 건물, 몇 층 더 올릴 수 있을까?
        </h1>
        <div className="mt-10">{children}</div>
      </div>
    </>
  )
}
