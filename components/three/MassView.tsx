'use client'

// 화면·보고서가 쓰는 3D 매스 뷰 (증축 전 또는 증축 후 한 장)
// - GLB 모델(public/models)에 이 필지가 있으면 ParcelMassView, 없거나 재건축이면 BuildingIllustration
// - three.js는 브라우저에서만 동작하므로 next/dynamic(ssr: false)으로 불러온다. 불러오는 동안·서버 렌더에서는 일러스트
// - 숫자(증축 층수)는 runAll 결과를 받아 쓰고 여기서 계산하지 않는다

import dynamic from 'next/dynamic'
import { useState } from 'react'
import BuildingIllustration from '@/components/layout/BuildingIllustration'
import type { MassViewMode } from '@/lib/geo/massModel'
import type { MassInfo } from './ParcelMassView'

const ParcelMassView = dynamic(() => import('./ParcelMassView'), { ssr: false })

interface Props {
  pnu: string
  mode: MassViewMode
  /** 현재 지상 층수 (일러스트용) */
  floorsAbove: number
  /** 계산 엔진의 증축 층수 (모르면 null) */
  addFloors: number | null
  /** false면 GLB를 쓰지 않고 일러스트 (예: 재건축 — 모델은 증축안만 있음) */
  useModel?: boolean
  /** false면 회전·확대 잠금 (보고서용) */
  interactive?: boolean
  /** 높이 등 크기 (예: 'h-56') */
  className?: string
}

export default function MassView({ pnu, mode, floorsAbove, addFloors, useModel = true, interactive = true, className = 'h-56' }: Props) {
  const [info, setInfo] = useState<MassInfo | null>(null)
  const illustration = (
    <BuildingIllustration
      floors={floorsAbove}
      addFloors={addFloors}
      showAddition={mode === 'after'}
      className={`${className} w-full`}
    />
  )
  if (!useModel) return illustration

  // 모델의 증축층 수와 계산 결과가 다르면 알려준다 (모델 = 형상 참고, 층수 = 계산 결과)
  const note =
    mode === 'after' && info && addFloors !== null && info.modelRevFloors !== info.shownRevFloors
      ? `3D 모델 증축 ${info.modelRevFloors}개층 중 계산 결과 ${info.shownRevFloors}개층 표시`
      : null

  return (
    <div className="w-full">
      <div className={`${className} w-full`}>
        <ParcelMassView pnu={pnu} mode={mode} addFloors={addFloors} interactive={interactive} fallback={illustration} onInfo={setInfo} />
      </div>
      {note && <p className="mt-1 text-center text-[11px] text-ink-faint">{note}</p>}
    </div>
  )
}
