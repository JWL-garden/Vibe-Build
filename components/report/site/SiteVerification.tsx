import type { SiteReport } from '@/types'
import { Badge, DataTable, Lead, SubTitle } from '../ReportParts'

/** 데이터 검증: 기준 엑셀 대조 결과 + 추가로 확인·수정할 데이터 목록 */
export default function SiteVerification({ report }: { report: SiteReport }) {
  const v = report.verification
  return (
    <div>
      <Lead>
        보고서 숫자가 기준 엑셀과 같은지 대조한 결과와, 아직 도면·자료로 확인해 입력해야 하는 데이터 목록입니다.
      </Lead>

      <SubTitle>기준 엑셀 대조</SubTitle>
      <div className="mb-3 flex items-center gap-3 text-sm">
        {v.allMatch ? (
          <Badge tone="accent">{v.parityRows.length}개 항목 모두 일치</Badge>
        ) : (
          <Badge tone="danger">불일치 {v.parityRows.filter((r) => r[3] !== '일치').length}건</Badge>
        )}
        <span className="text-xs text-ink-faint">{v.parityNote}</span>
      </div>
      <DataTable
        head={['엑셀 항목', '엑셀값', '계산값', '결과']}
        numeric={[1, 2]}
        rows={v.parityRows.map((r) => [
          r[0],
          r[1],
          r[2],
          <Badge key="b" tone={r[3] === '일치' ? 'accent' : 'danger'}>
            {r[3]}
          </Badge>,
        ])}
      />

      <SubTitle>추가로 확인·수정할 데이터</SubTitle>
      <DataTable
        head={['데이터', '현재 값', '상태', '수정 위치']}
        rows={v.todoRows.map((r) => [
          r[0],
          r[1],
          r[2],
          <span key="w" className="text-xs text-ink-soft">
            {r[3]}
          </span>,
        ])}
      />
    </div>
  )
}
