import Image from 'next/image'
import {
  COVER_ACCENT_WORD,
  COVER_BRAND_NAME,
  COVER_ORG,
  COVER_SAMPLE_NOTE,
  COVER_SUBTITLE,
} from '@/lib/report/constants'
import { COVER_TEXT_BLOCK, COVER_VIEW, layoutCoverTitle } from '@/lib/report/coverLayout'
import CoverIllustration from './CoverIllustration'

interface Props {
  /** 표지 제목 (요약 쪽 제목과 같은 문구). 끝의 '보고서'만 파랑 */
  title: string
  /** 기존 지상 층수 — 배경 일러스트의 건물 층수 (증축분은 표지에 그리지 않는다) */
  floorsAbove: number
  /** 샘플 데이터 보고서면 하단에 표기 */
  sample?: boolean
}

/** 794px 기준 좌표를 컨테이너 너비 비율(cqw)로 바꾼다 → 화면·인쇄 크기와 관계없이 A4 비율 유지 */
const u = (px: number) => `${((px / COVER_VIEW.w) * 100).toFixed(3)}cqw`

/** 제목 한 줄. 끝의 포인트 단어만 파랑 */
function TitleText({ text }: { text: string }) {
  if (!text.endsWith(COVER_ACCENT_WORD)) return <>{text}</>
  return (
    <>
      {text.slice(0, text.length - COVER_ACCENT_WORD.length)}
      <em className="not-italic text-action">{COVER_ACCENT_WORD}</em>
    </>
  )
}

/**
 * 보고서 표지 한 장 (A4 210×297mm). ReportPage bare 안에 넣는다.
 * 모든 값은 props로 받고 계산하지 않는다. 디자인은 docs/reference/cover.html 기준.
 */
export default function ReportCover({ title, floorsAbove, sample = false }: Props) {
  const { text, fontSize } = layoutCoverTitle(title)
  return (
    <div
      className="relative h-full w-full overflow-hidden bg-paper text-ink"
      style={{
        containerType: 'inline-size',
        fontFamily: "var(--font-pretendard), 'Pretendard Variable', Pretendard, 'Malgun Gothic', sans-serif",
        wordBreak: 'keep-all',
        printColorAdjust: 'exact',
        WebkitPrintColorAdjust: 'exact',
      }}
    >
      {/* 배경 일러스트: 기존 건물만 (증축분 표시 없음) */}
      <CoverIllustration floors={floorsAbove} addFloors={null} className="absolute inset-0 h-full w-full" />

      {/* 하단 중앙 브랜드: 로고 + Vibe Build (주)바이브빌드 건축사사무소 */}
      <div className="absolute inset-x-0 flex items-center justify-center" style={{ bottom: u(84), gap: u(8), fontSize: u(13) }}>
        <Image src="/logo.png" alt="" width={115} height={96} style={{ height: u(20), width: 'auto' }} />
        <span className="font-semibold tracking-[-0.01em]">{COVER_BRAND_NAME}</span>
        <span className="text-ink-soft">{COVER_ORG}</span>
      </div>

      {/* 상단 중앙: 제목 → 부제 (모두 한 줄) */}
      <div className="absolute inset-x-0 text-center" style={{ top: u(COVER_TEXT_BLOCK.top) }}>
        <h1 className="whitespace-nowrap font-semibold tracking-[-0.03em]" style={{ fontSize: u(fontSize), lineHeight: 1.16 }}>
          <TitleText text={text} />
        </h1>
        <p className="whitespace-nowrap tracking-[-0.01em] text-ink-soft" style={{ marginTop: u(24), fontSize: u(16.8), lineHeight: 1.55 }}>
          {COVER_SUBTITLE}
        </p>
      </div>

      {sample && (
        <p className="absolute inset-x-0 text-center text-ink-faint" style={{ bottom: u(36), fontSize: u(10) }}>
          {COVER_SAMPLE_NOTE}
        </p>
      )}
    </div>
  )
}
