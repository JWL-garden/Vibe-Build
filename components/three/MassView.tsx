'use client'

// 화면·보고서가 쓰는 3D 매스 뷰 (증축 전 또는 증축 후 한 장)
// - GLB 모델(public/models)에 이 필지가 있으면 ParcelMassView, 없으면 BuildingIllustration
// - 재건축(rebuildFloors 지정): 증축 후 = 기존 + 증축 전체를 신축 매스(옅은 청록)로 표시
// - three.js는 브라우저에서만 동작하므로 next/dynamic(ssr: false)으로 불러온다. 불러오는 동안·서버 렌더에서는 일러스트
// - 숫자(증축·신축 층수)는 runAll 결과를 받아 쓰고 여기서 계산하지 않는다

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
  /** 재건축: 계산 엔진의 신축 지상 층수. 지정하면 증축 후 뷰를 신축 매스로 표시 (재건축이 아니면 생략) */
  rebuildFloors?: number | null
  /** 증축 연면적에 포함된 측면 보강부 면적 (㎡, 계산 엔진). 0이면 3D에서 숨김, 생략하면 모델 그대로 */
  sideAreaM2?: number
  /** false면 GLB를 쓰지 않고 일러스트 */
  useModel?: boolean
  /** false면 회전·확대 잠금 (보고서용) */
  interactive?: boolean
  /** 높이 등 크기 (예: 'h-56') */
  className?: string
}

/** 범례 색 — ParcelMassView 의 COLORS 와 맞춘다 */
const SWATCH = {
  existing: '#a9a9a9',
  addition: '#f07828',
  rebuilt: '#7fcfc4',
  context: '#8f8f8f',
}

function Legend({ items }: { items: { color: string; label: string; faint?: boolean }[] }) {
  return (
    <ul className="mt-1.5 flex flex-wrap justify-center gap-x-3 gap-y-0.5 text-[11px] text-ink-faint">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm border border-ink/20" style={{ background: i.color, opacity: i.faint ? 0.45 : 1 }} />
          {i.label}
        </li>
      ))}
    </ul>
  )
}

export default function MassView({
  pnu,
  mode,
  floorsAbove,
  addFloors,
  rebuildFloors = null,
  sideAreaM2,
  useModel = true,
  interactive = true,
  className = 'h-56',
}: Props) {
  const [info, setInfo] = useState<MassInfo | null>(null)
  const rebuild = rebuildFloors !== null
  const illustration = (
    <BuildingIllustration
      floors={rebuild && mode === 'after' && rebuildFloors > 0 ? rebuildFloors : floorsAbove}
      addFloors={rebuild ? null : addFloors}
      showAddition={mode === 'after'}
      className={`${className} w-full`}
    />
  )
  if (!useModel) return illustration

  // 모델과 계산 결과의 층수가 다르면 알려준다 (모델 = 형상 참고, 층수 = 계산 결과)
  const notes: string[] = []
  if (mode === 'after' && info) {
    if (info.rebuild) {
      if (info.modelTopFloor !== info.shownTopFloor) notes.push(`3D 모델 ${info.modelTopFloor}개층 중 계산 결과 ${info.shownTopFloor}개층 표시`)
    } else {
      if (addFloors !== null && info.modelAddFloors !== info.shownAddFloors) {
        notes.push(`3D 모델 증축 ${info.modelAddFloors}개층 중 계산 결과 ${info.shownAddFloors}개층 표시`)
      }
      if (info.sideShown && sideAreaM2 !== undefined && sideAreaM2 > 0) {
        notes.push(`측면 보강부 +${sideAreaM2.toFixed(1)}㎡는 증축 연면적에 포함됩니다 (3D 모델 형상에서 추출)`)
      }
    }
  }

  const legend =
    mode === 'after' && rebuild
      ? [
          { color: SWATCH.rebuilt, label: '재건축 신축' },
          { color: SWATCH.context, label: '주변 건물', faint: true },
        ]
      : mode === 'after'
        ? [
            { color: SWATCH.existing, label: '기존' },
            { color: SWATCH.addition, label: '증축' },
            { color: SWATCH.context, label: '주변 건물', faint: true },
          ]
        : [
            { color: SWATCH.existing, label: '기존' },
            { color: SWATCH.context, label: '주변 건물', faint: true },
          ]

  return (
    <div className="w-full">
      <div className={`${className} w-full`}>
        <ParcelMassView
          pnu={pnu}
          mode={mode}
          addFloors={addFloors}
          rebuildFloors={rebuildFloors}
          sideIncluded={sideAreaM2 === undefined ? undefined : sideAreaM2 > 0}
          interactive={interactive}
          fallback={illustration}
          onInfo={setInfo}
        />
      </div>
      <Legend items={legend} />
      {notes.map((n) => (
        <p key={n} className="mt-1 text-center text-[11px] text-ink-faint">
          {n}
        </p>
      ))}
    </div>
  )
}
