import { textOrEmpty, withUnit } from '@/lib/format'
import type { BuildingRecord } from '@/types'

interface Props {
  building: BuildingRecord
}

/** ① 대상 건축물: 건축물대장 표제부 정보 카드
 * TODO [4-4]: 현재 임대 현황(건축주 입력값) 추가 */
export default function Step1Target({ building: b }: Props) {
  const items: { label: string; value: string }[] = [
    { label: '대지위치', value: b.address },
    { label: '대지면적', value: withUnit(b.siteAreaM2, '㎡') },
    { label: '건축면적', value: withUnit(b.buildingAreaM2, '㎡') },
    { label: '건폐율', value: withUnit(b.bcrPercent, '%') },
    { label: '연면적', value: withUnit(b.totalFloorAreaM2, '㎡') },
    { label: '용적률산정연면적', value: withUnit(b.farFloorAreaM2, '㎡') },
    { label: '용적률', value: withUnit(b.farPercent, '%') },
    { label: '주용도', value: b.mainUse },
    { label: '기타용도', value: textOrEmpty(b.etcUse) },
    { label: '세대수', value: withUnit(b.households, '세대', 0) },
    { label: '높이', value: withUnit(b.heightM, 'm') },
    { label: '지상층수', value: withUnit(b.floorsAbove, '층', 0) },
    { label: '지하층수', value: withUnit(b.floorsBelow, '층', 0) },
    { label: '사용승인일', value: textOrEmpty(b.approvalDate) },
  ]

  return (
    <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2">
      {items.map((item, i) => (
        <div
          key={item.label}
          className={`bg-paper px-5 py-4 ${i === 0 || (i === items.length - 1 && i % 2 === 1) ? 'sm:col-span-2' : ''}`}
        >
          <dt className="text-xs font-medium text-ink-faint">{item.label}</dt>
          <dd className="mt-1 font-medium text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
