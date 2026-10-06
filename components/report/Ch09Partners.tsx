import type { ReportData } from '@/types'
import { DataTable, Lead } from './ReportParts'

/** 9장: 전문가 협업 구성 */
export default function Ch09Partners({ data }: { data: ReportData }) {
  return (
    <div>
      <Lead>증축 사업은 여러 분야 전문가가 순서대로 참여합니다. 누가 언제 무엇을 맡는지 정리했습니다.</Lead>
      <div className="mt-8">
        <DataTable head={['전문가', '역할', '투입 시점']} rows={data.partners.map((p) => [<b key="r">{p.role}</b>, p.task, p.timing])} />
      </div>
    </div>
  )
}
