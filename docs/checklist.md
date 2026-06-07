### [구현 체크리스트 개요]

본 체크리스트는 프로젝트 설계 문서를 기반으로 수립된 향후 개발 로드맵입니다. 모든 작업은 **단일 책임 원칙(Single Responsibility Principle)**에 의거하여 수행되며, 구현 과정에서 효율적인 유지보수와 코드 품질을 위해 필요시 기능을 더 세부적인 단위로 쪼개어 진행할 수 있습니다. 이미 완료된 설계 및 문서화 작업은 제외하고, 실제 코드 구현을 위한 단계부터 기술합니다.

---

### 📝 실무 구현 체크리스트 (Revised)

#### Phase 1. 인프라 및 전역 상태 구축 (Foundation)
- [x] **SimulationContext 구현**: 1D/2D 분리형 상태 변수 및 `useSimulation` 훅 작성
- [x] **Workspace 레이아웃 설정**: 4분할 화면 구성을 위한 Container 및 레이아웃 시스템 구축

#### Phase 2. 입력 및 제어 시스템 (Input & Validation)
- [ ] **Potential Energy Editor UI (#4)**: 좌상단 편집기 프레임 및 모드 스위칭
- [ ] **물리량 및 분석 모드 설정 (#9, #10)**: 질량, 길이, 격자 수 및 분석 모드(Stationary/Evolution) UI
- [ ] **수식 파싱 및 유효성 검증 (#7, #8)**: `math.js` 연동 및 `isValidTesting` 기반 실시간 검사 루틴
- [ ] **영역 선택 및 상수 입력 (#5, #6)**: 드래그 영역 데이터 추출 및 일괄 퍼텐셜 값 적용

#### Phase 3. 수치해석 엔진 개발 (Numerical Engine)
- [ ] **Web Worker 통신 규격 정의**: 메인 스레드와 엔진 간의 메시지 프로토콜(INIT, START, TICK 등) 구축
- [ ] **Stationary Solver 구현**: 에너지 고유값($E_n$) 및 고유 상태($\psi_n$) 계산 로직 개발
- [ ] **Evolution Worker 구현**: 재귀적 루프를 통한 시간 진화($\psi(t+dt)$) 연산 엔진 구축
- [ ] **연산 최적화**: `Transferable Objects`를 통한 대용량 데이터 전송 병목 해결

#### Phase 4. 결과 시각화 및 피드백 (Visualization)
- [ ] **결과 표시 프레임 구축 (#11)**: 우하단 시각화 패널 레이아웃 구현
- [ ] **1D/2D 파동함수/확률밀도 시각화 (#12, #14)**: 엔진 결과값을 바탕으로 한 $\psi, |\psi|^2$ 렌더링
- [ ] **1D/2D 에너지 준위 시각화 (#13, #15)**: 계산된 고유값($E_n$)의 시각적 표시
- [ ] **고속 시각화 틱 시스템**: `useRef` + `requestAnimationFrame` 연동을 통한 실시간 애니메이션 완성
