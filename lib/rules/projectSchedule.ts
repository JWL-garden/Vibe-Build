// 추진 절차·기간 (보고서 8장, 설계서 11장) — 2026-10-12 사용자 결정
// 단계별 기간은 아래 값으로 정했고, 공사 기간만 층별·면적별 실적(하우빌드 공사 기간)으로 갈음한다 (runAll 가정값 constructionMonths /
// rebuildConstructionMonths). 실제 기간은 인허가·시공사 일정에 따라 달라진다.

export interface ScheduleStageRule {
  key: string
  name: string
  /** 기간 (개월). 'construction'이면 층별·면적별 공사 기간 실적을 쓴다 */
  months: number | 'construction'
  /** 건축주가 이 단계 끝에 결정할 일 */
  ownerDecision: string | null
  /** 이 단계에서 나가는 비용 설명 (금액은 4장 사업비 항목에서 채운다) */
  costNote: string | null
  /** 사업비 항목 키 (SiteCostItem.key) — 있으면 그 항목의 금액을 붙인다 */
  costKeys?: ('construction' | 'permit' | 'tax' | 'finance' | 'constructionLoss')[]
  /** true면 재건축에만 넣는다 / expansionOnly = 증축에만 넣는다 / 생략 = 둘 다 */
  rebuildOnly?: boolean
  expansionOnly?: boolean
}

export const scheduleStages: ScheduleStageRule[] = [
  {
    key: 'precheck',
    name: '사전 검토·현황 조사·구조진단',
    months: 1,
    ownerDecision: '정밀 타당성 검토·구조 보강 필요 여부에 따라 진행 여부 결정',
    costNote: '현황 실측·구조안전 진단비 (사업비 미반영)',
  },
  {
    key: 'design',
    name: '기본·실시설계',
    months: 1,
    ownerDecision: '증축 규모·세대 구성·평면 확정',
    costNote: '설계비 (사업비 미반영 — 설계·감리비율 가정값 없음)',
  },
  {
    key: 'permit',
    name: '건축 인허가',
    months: 2,
    ownerDecision: '허가 조건(주차·일조·구조) 반영 여부',
    costNote: '인허가 등 제반비용',
    costKeys: ['permit'],
  },
  {
    key: 'tender',
    name: '시공사 선정·계약',
    months: 1,
    ownerDecision: '공사비 견적 비교 후 시공사 확정, 대출 실행 시점 결정',
    costNote: '계약금 지급 (공사비의 일부)',
  },
  {
    key: 'relocation',
    name: '이주·철거',
    months: 1,
    ownerDecision: '임차인 이주 보상·철거 일정 확정',
    costNote: '철거비는 신축 공사비에 포함, 이주 기간 임대수입 중단',
    costKeys: ['constructionLoss'],
    rebuildOnly: true,
  },
  {
    key: 'construction',
    name: '공사',
    months: 'construction',
    ownerDecision: '설계 변경·추가 공사 승인',
    costNote: '기성 지급',
    costKeys: ['construction', 'finance'],
  },
  {
    key: 'completion',
    name: '준공·사용승인',
    months: 1,
    ownerDecision: '사용승인 후 세무 신고·임대 조건 확정',
    costNote: '준공 시 비용 정산',
    costKeys: ['tax'],
  },
]

/** 이주·철거 기간 (개월) — 재건축 공사 중 임대 손실 산정에도 쓴다 */
export const RELOCATION_MONTHS = scheduleStages.find((s) => s.key === 'relocation')!.months as number
