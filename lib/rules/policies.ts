// 관련 정부 정책 (설정 데이터) — 보고서 부록 '관련 정책' 표에 그대로 출력
// 출처: 「수도권 23만호+α 추가 공급, 주택 공급 촉진 및 청년 등 실수요자 금융지원 강화」 관계부처 합동 보도자료 (2026.8.13)

import type { PolicyNote } from '@/types'

const SOURCE = '관계부처 합동 보도자료 「수도권 23만호+α 추가 공급」 (2026.8.13)'

export const policyNotes: PolicyNote[] = [
  {
    id: 'multi-family-standard',
    title: '다가구·다세대 건축기준 합리화',
    detail: '(면적) 660→1,000㎡ 미만, (다가구 층수) 3→4개층 이하, (일조) 4~5층도 수직 건축 허용',
    source: SOURCE,
    usage: '시나리오 C·ALL에 반영 (발표 단계, 법령 개정 전). 일조 수직 허용 높이 15m는 프로젝트 가정',
  },
  {
    id: 'small-new-housing-tax',
    title: '소형 신축 일반주택 주택수 제외 세제특례 연장',
    detail: '적용 기한 ~2027년 → ~2028년',
    source: SOURCE,
    usage: '증축 규모 산정과 무관 — 수익성(세금) 검토 단계에서 반영 예정, 세무 전문가 확인 필요',
  },
]
