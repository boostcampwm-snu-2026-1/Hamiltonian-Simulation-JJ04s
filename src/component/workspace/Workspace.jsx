import { useSimulation } from '../../hook/useSimulation';
import PhysicalParameters from './PhysicalParameters/PhysicalParameters';
import PotentialEditor from './PotentialEditor/PotentialEditor';
import './Workspace.css';

function Workspace() {
  const { commonState, updateCommonState, controlState } = useSimulation();

  return (
    <main className="workspace-shell">
      <header className="workspace-topbar">
        <div className="workspace-title">
          <p>Hamiltonian Simulation</p>
          <h1>Workspace</h1>
        </div>

        <div className="workspace-summary" aria-label="Current simulation settings">
          <div className="dimension-switch" aria-label="Dimension">
            <button
              type="button"
              className={commonState.type === '1D' ? 'active' : ''}
              onClick={() => updateCommonState({ type: '1D' })}
            >
              1D
            </button>
            <button
              type="button"
              className={commonState.type === '2D' ? 'active' : ''}
              onClick={() => updateCommonState({ type: '2D' })}
            >
              2D
            </button>
          </div>
          <span>Mass {commonState.mass}</span>
          <span>Grid {commonState.gridSteps}</span>
          <span>{controlState.analysisMode}</span>
          <span>{commonState.isCalculating ? 'Calculating' : 'Idle'}</span>
        </div>
      </header>

      <section className="workspace-base" aria-label="Simulation workspace base">
        <div className="workspace-left-column">
          <PotentialEditor />
          <PhysicalParameters />
        </div>

        <div className="workspace-canvas" />
      </section>
    </main>
  );
}

export default Workspace;
