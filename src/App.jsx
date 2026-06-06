import { useSimulation } from './hook/useSimulation';

function App() {
  const { commonState } = useSimulation();

  return (
    <div>
      <h1>Hamiltonian Simulation Workspace</h1>
      <p>Phase 1: Foundation - SimulationContext 구현 완료</p>
      <div>
        <h3>초기 상태 확인:</h3>
        <ul>
          <li>차원: {commonState.type}</li>
          <li>입자 질량: {commonState.mass}</li>
          <li>격자 수: {commonState.gridSteps}</li>
        </ul>
      </div>
    </div>
  )
}

export default App
