'use client'

import Link from 'next/link'

/** 보고서 상단 툴바 (인쇄 시 숨김): 돌아가기 · 시나리오 표시 · PDF 저장
 * TODO [6-2]: 법규·수익 시나리오 선택 드롭다운 */
export default function ReportToolbar({ backHref, backLabel, info }: { backHref: string; backLabel: string; info?: string }) {
  return (
    <div className="sticky top-16 z-10 border-b border-line bg-paper/90 backdrop-blur print:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href={backHref} className="text-sm text-ink-soft hover:text-ink">
          ← {backLabel}
        </Link>
        <div className="flex items-center gap-4">
          {info && <span className="hidden text-sm text-ink-faint sm:inline">{info}</span>}
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-full bg-action px-5 py-2 text-sm font-medium text-paper transition hover:bg-action-hover"
          >
            PDF로 저장
          </button>
        </div>
      </div>
    </div>
  )
}
