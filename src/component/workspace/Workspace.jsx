import React from 'react';
import { useSimulation } from '../../hook/useSimulation';
import AnalysisControl from './AnalysisControl/AnalysisControl';
import AnalysisView from './AnalysisView/AnalysisView';
import PhysicalParameters from './PhysicalParameters/PhysicalParameters';
import PotentialEditor from './PotentialEditor/PotentialEditor';
import './Workspace.css';

const IS_2D_ENABLED = false;

function Workspace() {
  const {
    commonState,
    updateCommonState,
    controlState,
    updateControlState,
  } = useSimulation();

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
              disabled={!IS_2D_ENABLED}
              onClick={() => updateCommonState({ type: '2D' })}
            >
              2D
            </button>
          </div>
          <div className="analysis-mode-tabs" aria-label="Analysis mode">
            <button
              type="button"
              className={controlState.analysisMode === 'stationary' ? 'active' : ''}
              onClick={() => updateControlState({ analysisMode: 'stationary' })}
            >
              Stationary
            </button>
            <button
              type="button"
              className={controlState.analysisMode === 'evolution' ? 'active' : ''}
              onClick={() => updateControlState({ analysisMode: 'evolution' })}
            >
              Evolution
            </button>
          </div>
          <span>{commonState.isCalculating ? 'Calculating' : 'Idle'}</span>
        </div>
      </header>

      <section className="workspace-base" aria-label="Simulation workspace base">
        <div className="workspace-left-column">
          <PotentialEditor />
          <AnalysisControl />
        </div>

        <div className="workspace-right-column">
          <PhysicalParameters />
          <AnalysisView />
        </div>
      </section>
    </main>
  );
}

export default Workspace;
