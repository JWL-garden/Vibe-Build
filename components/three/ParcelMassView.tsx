'use client'

// 필지 PNU 하나를 받아 GLB 매스 모델에서 그 필지만 골라 "증축 전 / 증축 후"로 보여주는 3D 뷰
//
// - 모델: public/models/261012_dangsan_sunlight_v5_T1T2.glb — 원본 v5에서 T1·T2와 주변만 남긴 경량판 (npm run model:trim)
//   노드 이름 규칙은 lib/geo/massModel.ts 참고
// - 증축 전: 대상 필지 EXIST 층만 / 증축 후: EXIST + REV (REV는 계산 엔진의 증축 층수만큼 — addFloors)
//   · REV_F{n}_TOP = 기존 최상층 위의 새 층, REV_F{n}_SIDE = 일조 사선으로 물러난 기존 층의 측면 보강부
// - 재건축(rebuildFloors 지정) 증축 후: 기존 + 증축 전체를 "재건축 신축 매스"(파랑 #0071e3)로 그린다. 계산된 지상 층수까지만
// - 주변 건물은 회색 반투명(반경 CONTEXT_RADIUS_M 안), 주변 증축안(REV)은 숨김. 지형(TERRAIN)이 있으면 지면으로 쓴다
// - GLB 좌표가 TM 절대좌표(약 191,000 / -548,000)라서 대상 필지 중심을 (0,0), 대상 건물 바닥을 y=0 으로 옮긴다
//   (설계서 7-3 좌표 규칙: x=동, -z=북, y=높이)
// - 증축 전/후 두 뷰는 같은 카메라(북서쪽 위 45° 조감, 건물이 화면 가득 — lib/geo/cameraFit.ts)라 나란히 놓으면 바로 비교된다
// - 인쇄(PDF)용: 렌더가 끝나면 PNG 스냅샷을 만들어 인쇄 시 캔버스 대신 이미지로 출력한다

import { Suspense, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useThree } from '@react-three/fiber'
import { MASS_VIEW, fitCamera, type Vec3 } from '@/lib/geo/cameraFit'
import { OrbitControls, useGLTF } from '@react-three/drei'
import {
  CONTEXT_RADIUS_M,
  TERRAIN_NODE_NAME,
  isSameParcel,
  massRole,
  parseMassNodeName,
  summarizeFloors,
  type MassNodeInfo,
  type MassRole,
  type MassViewMode,
  type MassViewOptions,
} from '@/lib/geo/massModel'

export const DEFAULT_MASS_MODEL_URL = '/models/261012_dangsan_sunlight_v5_T1T2.glb'

// 색은 globals.css 의 --color-existing / --color-accent 와 맞춰 둔다
const COLORS = {
  targetExisting: '#a9a9a9',
  /** 증축분 — 파랑 #0066cc */
  targetAddition: '#0066cc',
  /** 재건축 신축 매스 — 파랑 #0071e3 */
  targetRebuilt: '#0071e3',
  /** 주변 건물 — 회색 반투명 */
  context: '#8f8f8f',
  edge: '#4a4a4a',
  contextEdge: '#b9b9b9',
  ground: '#efeee9',
  terrain: '#ebe7dc',
}

/** 주변 건물 불투명도 (0 = 투명, 1 = 불투명) */
const CONTEXT_OPACITY = 0.35

type Status = 'loading' | 'ready' | 'missing'

interface Props {
  /** 대상 필지 PNU (앱의 건축물대장 PNU 그대로 넣으면 됨) */
  pnu: string
  mode: MassViewMode
  /** 계산 엔진의 증축 층수 (runAll) — 증축 후 뷰에서 모델의 증축 부분을 이만큼만 보여준다. null이면 모델 그대로 */
  addFloors?: number | null
  /** 재건축: 계산 엔진의 신축 지상 층수. 지정하면 증축 후 뷰는 기존 + 증축 전체를 신축 매스로 그린다 */
  rebuildFloors?: number | null
  /** 측면 보강부(SIDE)가 증축 연면적에 포함됐는지 (계산 엔진). false면 숨긴다 */
  sideIncluded?: boolean
  /** GLB 경로 (public/ 기준) */
  url?: string
  className?: string
  /** false면 회전·확대 잠금 (보고서용) */
  interactive?: boolean
  /** 이 필지가 모델에 없을 때 대신 보여줄 것 (예: BuildingIllustration) */
  fallback?: React.ReactNode
  /** 스냅샷(PNG dataURL)이 만들어지면 호출 — store 에 저장해 보고서에서 재사용할 때 */
  onSnapshot?: (dataUrl: string) => void
  /** 모델 정보 (모델 층수, 그중 표시한 층수) — 캡션용 */
  onInfo?: (info: MassInfo) => void
}

export interface MassInfo {
  /** true면 재건축 표현 */
  rebuild: boolean
  /** 모델의 증축 층수 (모델 최상층 − 기존 최상층) */
  modelAddFloors: number
  /** 증축 후 뷰에 표시한 증축 층수 */
  shownAddFloors: number
  /** 모델 최상층 (재건축 캡션용) */
  modelTopFloor: number
  /** 증축 후 뷰에 표시한 최상층 */
  shownTopFloor: number
  /** 증축 후 뷰에 측면 보강부(SIDE)가 표시되는지 */
  sideShown: boolean
}

export default function ParcelMassView({
  pnu,
  mode,
  addFloors = null,
  rebuildFloors = null,
  sideIncluded,
  url = DEFAULT_MASS_MODEL_URL,
  className,
  interactive = true,
  fallback = null,
  onSnapshot,
  onInfo,
}: Props) {
  const [status, setStatus] = useState<Status>('loading')
  const [shot, setShot] = useState<string | null>(null)

  if (status === 'missing' && fallback) return <>{fallback}</>

  return (
    <div className={`relative h-full w-full ${className ?? ''}`}>
      <div className={`h-full w-full ${shot ? 'print:hidden' : ''}`}>
        <Canvas
          frameloop="demand"
          dpr={[2, 3]}
          camera={{ fov: MASS_VIEW.fovDeg, near: 0.5, far: 5000 }}
          gl={{ preserveDrawingBuffer: true, antialias: true }}
        >
          <hemisphereLight args={['#ffffff', '#d9d6cf', 1.1]} />
          {/* 카메라(북서) 쪽에서 비추는 빛 — 보이는 북·서 면이 어둡지 않게 */}
          <directionalLight position={[-40, 80, -30]} intensity={1.6} />
          <Suspense fallback={null}>
            <MassModel
              url={url}
              pnu={pnu}
              mode={mode}
              addFloors={addFloors}
              rebuildFloors={rebuildFloors}
              sideIncluded={sideIncluded}
              interactive={interactive}
              onStatus={setStatus}
              onInfo={onInfo}
              onSnapshot={(d) => {
                setShot(d)
                onSnapshot?.(d)
              }}
            />
          </Suspense>
        </Canvas>
      </div>

      {shot && (
        // 캔버스 스냅샷(data URL)이라 next/image 최적화 대상이 아님
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={shot}
          alt={mode === 'before' ? '증축 전 3D 매스' : rebuildFloors !== null ? '재건축 후 3D 매스' : '증축 후 3D 매스'}
          className="absolute inset-0 hidden h-full w-full object-contain print:block"
        />
      )}

      {status !== 'ready' && (
        <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-ink-faint">
          {status === 'loading' ? '3D 모델 불러오는 중…' : '이 필지의 3D 모델이 없습니다'}
        </p>
      )}
    </div>
  )
}

/* ───────────────────────── 모델 조립 ───────────────────────── */

interface Built {
  group: THREE.Group
  /** 대상 필지 매스(기존+증축) 크기 — 전/후 뷰가 같은 화면 비율이 되도록 둘 다 이 값으로 카메라를 잡는다 */
  size: THREE.Vector3
  found: boolean
  /** 지형을 그렸는지 (아니면 원형 지면을 대신 그린다) */
  hasTerrain: boolean
  info: MassInfo
  dispose: () => void
}

function collectMeshes(root: THREE.Object3D): THREE.Mesh[] {
  const out: THREE.Mesh[] = []
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) out.push(child as THREE.Mesh)
  })
  return out
}

function buildMass(
  source: THREE.Object3D,
  pnu: string,
  mode: MassViewMode,
  addFloors: number | null,
  rebuildFloors: number | null,
  sideIncluded: boolean | undefined,
): Built {
  source.updateMatrixWorld(true)

  // 0) 대상 필지의 모델 층 정보 (기존 최상층 → 증축 표시 기준)
  const targetInfos: MassNodeInfo[] = []
  source.traverse((obj) => {
    const info = parseMassNodeName(obj.name)
    if (info && isSameParcel(info.pnu, pnu)) targetInfos.push(info)
  })
  const floors = summarizeFloors(targetInfos)
  const opts: MassViewOptions = { existTopFloor: floors.existTopFloor, addFloors, rebuildFloors, sideIncluded }

  // 1) 이름 규칙에 맞는 노드를 찾아 역할을 정하고, 그 아래 Mesh 를 모은다
  //    (GLTFLoader 는 primitive 가 여러 개인 노드를 Group + 자식 Mesh 로 만든다)
  // inFrame: 카메라 범위에 넣을 메시 = 증축 후 뷰에 보이는 대상 필지 매스 (증축 전·후 뷰 모두 같은 범위 → 화면 비율 동일)
  const picked: { mesh: THREE.Mesh; role: MassRole; inFrame: boolean }[] = []
  let shownTopFloor = 0
  let sideShown = false
  source.traverse((obj) => {
    const info = parseMassNodeName(obj.name)
    if (!info) return
    const role = massRole(info, pnu, mode, opts)
    const afterRole = massRole(info, pnu, 'after', opts)
    const isTarget = isSameParcel(info.pnu, pnu)
    const inFrame = isTarget && afterRole !== 'hidden'
    if (inFrame) {
      shownTopFloor = Math.max(shownTopFloor, info.floor)
      if (info.part === 'SIDE') sideShown = true
    }
    for (const mesh of collectMeshes(obj)) picked.push({ mesh, role, inFrame })
  })

  // 2) 대상 필지 범위
  const box = new THREE.Box3()
  for (const p of picked) {
    if (!p.inFrame) continue
    p.mesh.geometry.computeBoundingBox()
    box.union(p.mesh.geometry.boundingBox!.clone().applyMatrix4(p.mesh.matrixWorld))
  }
  const found = !box.isEmpty()
  const center = found ? box.getCenter(new THREE.Vector3()) : new THREE.Vector3()
  // 대상 필지 중심 → (0,0), 대상 건물 바닥 → y=0
  const shift = new THREE.Matrix4().makeTranslation(-center.x, found ? -box.min.y : 0, -center.z)

  // 3) 지오메트리를 복제해 원점 근처로 옮긴다 (절대좌표 그대로 두면 GPU float 정밀도 때문에 떨림·깨짐이 생김)
  const materials = {
    targetExisting: new THREE.MeshStandardMaterial({ color: COLORS.targetExisting, roughness: 0.9 }),
    targetAddition: new THREE.MeshStandardMaterial({ color: COLORS.targetAddition, roughness: 0.7 }),
    targetRebuilt: new THREE.MeshStandardMaterial({ color: COLORS.targetRebuilt, roughness: 0.8 }),
    // 주변 건물: 회색 반투명 (depthWrite 끔 — 겹친 건물이 서로 가리지 않게)
    context: new THREE.MeshStandardMaterial({
      color: COLORS.context,
      roughness: 1,
      transparent: true,
      opacity: CONTEXT_OPACITY,
      depthWrite: false,
    }),
  }
  const edgeMat = new THREE.LineBasicMaterial({ color: COLORS.edge })
  const contextEdgeMat = new THREE.LineBasicMaterial({ color: COLORS.contextEdge, transparent: true, opacity: 0.5 })
  const terrainMat = new THREE.MeshStandardMaterial({
    color: COLORS.terrain,
    roughness: 1,
    side: THREE.DoubleSide,
    // 건물 바닥과 지형이 겹쳐 깜빡이지 않게 지형을 조금 뒤로 민다
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  })

  const group = new THREE.Group()
  const geometries: THREE.BufferGeometry[] = []
  const meshCenter = new THREE.Vector3()

  for (const { mesh, role } of picked) {
    if (role === 'hidden') continue
    if (role === 'context' && found) {
      // 대상 건물 중심에서 반경 밖의 주변 건물은 그리지 않는다 (모델 835동 — 성능)
      mesh.geometry.computeBoundingBox()
      mesh.geometry.boundingBox!.clone().applyMatrix4(mesh.matrixWorld).getCenter(meshCenter)
      if (Math.hypot(meshCenter.x - center.x, meshCenter.z - center.z) > CONTEXT_RADIUS_M) continue
    }
    const geom = mesh.geometry.clone()
    geom.applyMatrix4(mesh.matrixWorld)
    geom.applyMatrix4(shift)
    const edges = new THREE.EdgesGeometry(geom, 20)
    geometries.push(geom, edges)
    group.add(new THREE.Mesh(geom, materials[role]))
    group.add(new THREE.LineSegments(edges, role === 'context' ? contextEdgeMat : edgeMat))
  }

  // 4) 지형 — 같은 변환으로 옮겨서 주변 건물이 제 높이에 앉게 한다
  let hasTerrain = false
  source.traverse((obj) => {
    if (obj.name !== TERRAIN_NODE_NAME) return
    for (const mesh of collectMeshes(obj)) {
      const geom = mesh.geometry.clone()
      geom.applyMatrix4(mesh.matrixWorld)
      geom.applyMatrix4(shift)
      // 대상 건물 아래(+3m 여유)의 지형이 건물 바닥(y=0)보다 높으면 건물 아래층을 덮으므로 그만큼 지형을 내린다
      if (found) {
        const pos = geom.getAttribute('position')
        const half = box.getSize(new THREE.Vector3()).multiplyScalar(0.5)
        let maxUnder = -Infinity
        for (let i = 0; i < pos.count; i++) {
          if (Math.abs(pos.getX(i)) <= half.x + 3 && Math.abs(pos.getZ(i)) <= half.z + 3) maxUnder = Math.max(maxUnder, pos.getY(i))
        }
        if (maxUnder > -0.05) geom.translate(0, -(maxUnder + 0.05), 0)
      }
      geometries.push(geom)
      const m = new THREE.Mesh(geom, terrainMat)
      m.renderOrder = -1
      group.add(m)
      hasTerrain = true
    }
  })

  const rebuild = rebuildFloors !== null
  return {
    group,
    size: found ? box.getSize(new THREE.Vector3()) : new THREE.Vector3(10, 10, 10),
    found,
    hasTerrain,
    info: {
      rebuild,
      modelAddFloors: floors.modelAddFloors,
      shownAddFloors: Math.max(0, shownTopFloor - floors.existTopFloor),
      modelTopFloor: floors.modelTopFloor,
      shownTopFloor,
      sideShown,
    },
    dispose: () => {
      geometries.forEach((g) => g.dispose())
      Object.values(materials).forEach((m) => m.dispose())
      edgeMat.dispose()
      contextEdgeMat.dispose()
      terrainMat.dispose()
    },
  }
}

function MassModel({
  url,
  pnu,
  mode,
  addFloors,
  rebuildFloors,
  sideIncluded,
  interactive,
  onStatus,
  onInfo,
  onSnapshot,
}: {
  url: string
  pnu: string
  mode: MassViewMode
  addFloors: number | null
  rebuildFloors: number | null
  sideIncluded: boolean | undefined
  interactive: boolean
  onStatus: (s: Status) => void
  onInfo?: (info: MassInfo) => void
  onSnapshot: (dataUrl: string) => void
}) {
  const { scene: source } = useGLTF(url)
  const { camera, gl, scene, invalidate, size } = useThree()
  const built = useMemo(
    () => buildMass(source, pnu, mode, addFloors, rebuildFloors, sideIncluded),
    [source, pnu, mode, addFloors, rebuildFloors, sideIncluded],
  )
  useEffect(() => () => built.dispose(), [built])

  // 북서쪽 위 45° 조감 — 대상 건물(증축 후 매스) 상자가 화면 비율에 맞게 가득 차도록 (lib/geo/cameraFit.ts)
  // 대상 건물은 buildMass에서 중심 (0,0)·바닥 y=0으로 옮겨져 있다
  const aspect = size.width / Math.max(size.height, 1)
  const { position, target, groundRadius } = useMemo(() => {
    const s = built.size
    const fit = fitCamera([-s.x / 2, 0, -s.z / 2] as Vec3, [s.x / 2, s.y, s.z / 2] as Vec3, aspect)
    return {
      position: new THREE.Vector3(...fit.position),
      target: new THREE.Vector3(...fit.target),
      groundRadius: Math.max(s.x, s.z) * 3,
    }
  }, [built, aspect])

  useLayoutEffect(() => {
    camera.position.copy(position)
    camera.lookAt(target)
    camera.updateProjectionMatrix()
    camera.updateMatrixWorld()
    invalidate()
  }, [camera, position, target, invalidate])

  // 상태 알림 + 인쇄용 스냅샷 (카메라 세팅 후 한 번 직접 렌더해서 캡처)
  useEffect(() => {
    onStatus(built.found ? 'ready' : 'missing')
    onInfo?.(built.info)
    if (!built.found) return
    gl.render(scene, camera)
    onSnapshot(gl.domElement.toDataURL('image/png'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [built, gl, scene, camera])

  return (
    <>
      <primitive object={built.group} />

      {/* 지면 — 모델에 지형이 있으면 지형을 쓰고, 없으면 원형 평면 */}
      {!built.hasTerrain && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
          <circleGeometry args={[groundRadius, 64]} />
          <meshStandardMaterial color={COLORS.ground} roughness={1} />
        </mesh>
      )}

      <OrbitControls
        target={target}
        enabled={interactive}
        enableDamping={false}
        maxPolarAngle={Math.PI / 2 - 0.05}
      />
    </>
  )
}

useGLTF.preload(DEFAULT_MASS_MODEL_URL)
