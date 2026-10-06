// 서비스가 화면에 돌려주는 데이터 형태
// Mock(JSON)이든 실제 API든 반드시 이 형태로 돌려준다.

/** 건축물대장 표제부 한 건 (건물 한 동) */
export interface BuildingRecord {
  /** 관리건축물대장PK — 건물 한 동의 고유 id */
  id: string
  /** 필지 고유번호 19자리 */
  pnu: string
  /** 대지위치 (지번 주소) */
  address: string
  /** 도로명 대지위치 (없으면 null) */
  roadAddress: string | null
  buildingName: string | null
  /** 동 명칭 (예: 101동). 한 필지에 건물이 여러 동일 때 구분용 */
  dongName: string | null
  /** 대장 종류 (일반건축물 / 표제부) */
  registerType: string
  /** 대지면적 (㎡). 대장에 값이 없으면 null */
  siteAreaM2: number | null
  /** 건축면적 (㎡) */
  buildingAreaM2: number
  /** 건폐율 (%). 값이 없으면 null */
  bcrPercent: number | null
  /** 연면적 (㎡) */
  totalFloorAreaM2: number
  /** 용적률산정연면적 (㎡) */
  farFloorAreaM2: number
  /** 용적률 (%). 값이 없으면 null */
  farPercent: number | null
  /** 주용도 (주용도코드명) */
  mainUse: string
  /** 기타용도 */
  etcUse: string | null
  /** 세대수 */
  households: number
  /** 높이 (m). 값이 없으면 null */
  heightM: number | null
  floorsAbove: number
  floorsBelow: number
  /** 사용승인일 (YYYY-MM-DD). 값이 없으면 null */
  approvalDate: string | null
}

/** 주소 검색 결과 후보 (필지 단위) */
export interface SiteCandidate {
  pnu: string
  address: string
  roadAddress: string | null
  /** 이 필지에 있는 건물 동 수 */
  buildingCount: number
}

/** 첫 화면의 예시 주소 버튼 */
export interface ExampleAddress {
  label: string
  pnu: string
  note: string
}
