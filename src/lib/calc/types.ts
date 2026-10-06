// 계산 모듈 전체에서 쓰는 데이터 형태(타입) 정의
// - 단위: 길이 m, 면적 ㎡, 비율 %  (변수명 끝에 M, M2, Percent로 표시)
// - 좌표: 대상 대지 중심이 (0,0)인 로컬 미터 좌표, +y = 정북

// ─────────────────────────────────────────────
// 기본 도형
// ─────────────────────────────────────────────

/** 로컬 좌표의 한 점 (m). x: 동쪽(+), y: 북쪽(+) */
export interface Point2 {
  x: number
  y: number
}

/** 다각형 꼭짓점 목록 (닫는 점은 반복하지 않음) */
export type Polygon = Point2[]

// ─────────────────────────────────────────────
// 용도지역
// ─────────────────────────────────────────────

/** 용도지역 이름 (지역지구구역 데이터의 표기와 동일) */
export type ZoneName =
  | '제1종전용주거지역'
  | '제2종전용주거지역'
  | '제1종일반주거지역'
  | '제2종일반주거지역'
  | '제3종일반주거지역'
  | '준주거지역'
  | '중심상업지역'
  | '일반상업지역'
  | '근린상업지역'
  | '유통상업지역'
  | '전용공업지역'
  | '일반공업지역'
  | '준공업지역'

/** 용도지역별 법정 기준표의 한 줄 (zoningTable 데이터) */
export interface ZoningStandard {
  zone: ZoneName
  /** 서울시 조례 용적률 상한 (%) — 기본값으로 사용 */
  farLimitPercent: number
  /** 국토계획법 시행령 용적률 상한 (%) — 완화 시나리오 A에서 사용 */
  farLimitNationalPercent: number
  /** 건폐율 상한 (%) — 수직증축이라 계산에는 안 쓰고 화면 표시용 */
  bcrLimitPercent: number
  /** 정북방향 일조권 적용 여부 (전용·일반주거지역만 true) */
  sunlightApplies: boolean
}

// ─────────────────────────────────────────────
// 대지 · 건물 · 주변 건물
// ─────────────────────────────────────────────

/** 대상 대지 (필지) */
export interface Site {
  /** 필지 고유번호 19자리 — 건축물대장·용도지역·지적도를 잇는 공통 키 */
  pnu: string
  /** 지번 주소 (예: 서울특별시 영등포구 ○○동 123-4) */
  address: string
  /** 도로명 주소 (없으면 null) */
  roadAddress: string | null
  /** 대지면적 (㎡) */
  siteAreaM2: number
  /** 용도지역 */
  zone: ZoneName
  /** 대지 경계 다각형 (로컬 좌표) */
  boundary: Polygon
  /** 가로구역별 최고높이 제한 (m). 제한이 없으면 null */
  heightLimitM: number | null
}

/** 대상 건축물 (건축물대장 표제부) */
export interface Building {
  pnu: string
  /** 주용도 (예: 다세대주택) */
  mainUse: string
  /** 구조 (예: 철근콘크리트구조) */
  structure: string
  /** 사용승인일 (YYYY-MM-DD) */
  approvalDate: string
  /** 건축면적 (㎡) — 1층 바닥 투영 면적 */
  buildingAreaM2: number
  /** 연면적 (㎡) — 지하 포함 모든 층 바닥면적 합 */
  totalFloorAreaM2: number
  /** 용적률산정연면적 (㎡) — 지하·주차 등을 뺀, 용적률 계산에 쓰는 면적 */
  farFloorAreaM2: number
  /** 지상 층수 */
  floorsAbove: number
  /** 지하 층수 */
  floorsBelow: number
  /** 건물 높이 (m) */
  heightM: number
  /** 건물 외곽선 (로컬 좌표). 증축층은 이 형태를 기준으로 쌓는다 */
  footprint: Polygon
  /** 건물 북측 외벽에서 정북방향 인접대지경계선까지 거리 (m) */
  northBoundaryDistanceM: number
}

/** 8방위 (대상 대지 중심에서 본 방향) */
export type Direction8 = '북' | '북동' | '동' | '남동' | '남' | '남서' | '서' | '북서'

/** 주변 건축물 */
export interface Neighbor {
  /** 화면·3D에서 구분하기 위한 고유 id */
  id: string
  pnu: string
  /** 주용도 (모르면 null) */
  mainUse: string | null
  /** 건물(또는 필지) 외곽선 (로컬 좌표) */
  footprint: Polygon
  /** 지상 층수 */
  floorsAbove: number
  /** 건물 높이 (m) */
  heightM: number
  /** 대상 대지 중심에서의 거리 (m) */
  distanceM: number
  /** 방위각 (도). 정북 0°, 시계방향으로 증가 */
  bearingDeg: number
  /** 방위 이름 */
  direction: Direction8
  /** 정북측 인접대지 여부 (일조권 판단 대상 → 화면에서 강조) */
  isNorthAdjacent: boolean
}

// ─────────────────────────────────────────────
// 규칙 (완화 전/후 모두 이 형태 하나로 계산)
// ─────────────────────────────────────────────

/** 정북방향 일조권 사선 규칙 (건축법 시행령 제86조) */
export interface SunlightRule {
  /** 기준높이 (m). 이 높이 이하 부분은 최소 이격만 적용 — 현행 10 */
  baseHeightM: number
  /** 기준높이 이하 부분의 최소 이격거리 (m) — 현행 1.5 */
  minSetbackM: number
  /** 기준높이 초과 부분: 높이 × 이 비율 이상 띄움 — 현행 0.5 */
  setbackRatio: number
}

/** 증축 계산에 넣는 최종 규칙 */
export interface Rules {
  /** 허용 용적률 (%) */
  farLimitPercent: number
  /** 노후건축물 특례: 기존 용적률산정연면적 × 이 비율만큼 연면적 추가 허용 (예: 0.3 = +30%). 없으면 0 */
  farBonusRatio: number
  /** 일조권 적용 여부 */
  sunlightApplies: boolean
  /** 일조권 사선 규칙값 */
  sunlight: SunlightRule
  /** 최고높이 제한 (m). 없으면 null */
  heightLimitM: number | null
}

/** 시나리오가 바꿀 규칙값 (바꿀 항목만 적음) */
export type RuleChanges = Partial<Omit<Rules, 'sunlight'>> & {
  sunlight?: Partial<SunlightRule>
}

/** 법규 완화 시나리오 (scenarios 데이터) */
export interface Scenario {
  /** 예: 'A' */
  id: string
  /** 예: '용적률 상한 완화' */
  name: string
  /** 화면에 보여줄 설명 */
  description: string
  /** 근거 조문 또는 '프로젝트 가정' */
  basis: string
  /** true면 화면에 "프로젝트 가정" 배지를 표시 */
  isProjectAssumption: boolean
  /** 모든 용도지역에 공통으로 덮어쓸 값 */
  changes: RuleChanges
  /** 용도지역마다 다른 값 (예: 2종 → 250%, 3종 → 300%). changes 다음에 덮어씀 */
  changesByZone?: Partial<Record<ZoneName, RuleChanges>>
}

// ─────────────────────────────────────────────
// 계산 설정 (프로젝트 가정값)
// ─────────────────────────────────────────────

/** 증축 계산 가정값 — 시나리오와 무관하게 사용자가 설정 */
export interface ExpansionSettings {
  /** 층고 (m) — 기본 3.3 */
  floorHeightM: number
  /** 이 면적보다 작은 층은 지을 수 없다고 봄 (㎡) */
  minFloorAreaM2: number
}

// ─────────────────────────────────────────────
// 계산 결과
// ─────────────────────────────────────────────

/** 용적률 계산 결과 (far.ts) */
export interface FarResult {
  /** 현재 용적률 (%) */
  currentFarPercent: number
  /** 허용 연면적 (㎡) = 대지면적 × 허용 용적률 (+ 특례 가산) */
  allowedFloorAreaM2: number
  /** 잔여 연면적 (㎡) = 허용 연면적 − 현재 용적률산정연면적 (음수면 이미 초과) */
  remainingFloorAreaM2: number
}

/** 층 하나의 결과 (3D와 표에서 사용) */
export interface FloorResult {
  /** 층 번호 (1층부터) */
  floor: number
  /** 기존 층이면 true, 증축층이면 false */
  isExisting: boolean
  /** 바닥 높이 (m) */
  bottomM: number
  /** 천장(상단) 높이 (m) */
  topM: number
  /** 이 층 높이에서 필요한 정북방향 이격거리 (m) */
  requiredSetbackM: number
  /** 일조권 때문에 북쪽을 깎아낸 길이 (m). 깎지 않았으면 0 */
  northCutM: number
  /** 깎은 뒤 바닥 외곽선 (로컬 좌표) */
  footprint: Polygon
  /** 깎은 뒤 바닥면적 (㎡) */
  floorAreaM2: number
}

/** 증축을 멈추게 한 조건 (지배조건) */
export type GoverningCondition =
  | 'sunlight' // 일조권: 깎고 남은 바닥면적이 최소 유효면적 미만
  | 'heightLimit' // 높이제한: 다음 층이 최고높이를 넘음
  | 'far' // 용적률: 다음 층을 올리면 허용 연면적 초과

/** 증축 산정 결과 (expansion.ts) — 완화 전/후 각각 하나씩 만든다 */
export interface ExpansionResult {
  /** 계산에 사용한 규칙 */
  rules: Rules
  /** 기존 층 + 증축층 전체 목록 (아래층부터) */
  floors: FloorResult[]
  /** 증축 가능한 층 수 (0이면 증축 불가) */
  addedFloors: number
  /** 증축 후 지상 층수 */
  totalFloors: number
  /** 추가되는 연면적 (㎡) */
  addedFloorAreaM2: number
  /** 증축 후 용적률산정연면적 (㎡) */
  finalFarFloorAreaM2: number
  /** 증축 후 용적률 (%) */
  finalFarPercent: number
  /** 증축 후 건물 높이 (m) */
  finalHeightM: number
  /** 증축을 멈추게 한 조건 */
  governing: GoverningCondition
}
