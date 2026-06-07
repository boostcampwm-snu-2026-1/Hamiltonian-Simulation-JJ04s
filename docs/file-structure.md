frontend/
├── src/
│   ├── equation-solvers/              # 핵심 수치해석 엔전
│   │   ├── time-independent-1d.js     # 1d 정적 상태 계산
│   │   ├── time-independent-2d.js     # 2d 정적 상태 계산
│   │   ├── time-evolution-1d.js       # 1d 시간 진화 계산
│   │   └── time-evolution-2d.js       # 2d 시간 진화 계산
│   ├── component/
│   │   └── workspace/                 # 메인 시뮬레이션 화면
│   │       ├── PotentialEditor/       # 퍼텐셜 에너지 편집기
│   │       ├── ParameterConfig/       # 물리 파라미터 편집기
│   │       ├── AnalysisControl/       # 분석 모드 설정
│   │       └── Visualizer/            # 분석 결과 시각화
│   ├── context/                       # 전역 상태 공유
│   │   └── SimulationContext.jsx
│   ├── hook/                          # 전역 상태 관리
│   │   └── useSimulation.js
│   ├── utils/                         # 수식 파싱 및 배열 생성
│   │   └── math-parser.js
...