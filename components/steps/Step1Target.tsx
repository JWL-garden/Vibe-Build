import type { InfoRow } from '@/lib/report/buildingRows'

/** ① 대상 건축물: 건축물 정보 카드 (항목 목록은 lib/report/buildingRows.ts 에서 만든다)
 * TODO [4-4]: 현재 임대 현황(건축주 입력값) 추가 */
export default function Step1Target({ items }: { items: InfoRow[] }) {
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
