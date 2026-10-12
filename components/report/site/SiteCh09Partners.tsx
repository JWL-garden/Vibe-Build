import type { SiteReport } from '@/types'
import { DataTable, Lead } from '../ReportParts'

/** 9장: 전문가 협업 구성 — SiteReport만 읽는다 */
export default function SiteCh09Partners({ report }: { report: SiteReport }) {
  return (
    <div>
      <Lead>증축·재건축 사업은 여러 분야 전문가가 순서대로 참여합니다. 누가 언제 무엇을 맡는지, 이 보고서의 어떤 값을 확인해 주는지 정리했습니다.</Lead>
      <div className="mt-8">
        <DataTable
          head={['전문가', '역할', '투입 시점', '이 보고서에서 확인할 항목']}
          rows={report.partners.map((p) => [<b key="r">{p.role}</b>, p.task, p.timing, p.focus])}
        />
      </div>
    </div>
  )
}
