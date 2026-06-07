import { useSimulation } from '../../../hook/useSimulation';
import './AnalysisControl.css';

function AnalysisControl() {
  const {
    commonState,
    updateCommonState,
    controlState,
    updateControlState,
  } = useSimulation();

  const isStationary = controlState.analysisMode === 'stationary';

  const updateTargetState = (delta) => {
    updateControlState(prev => ({
      targetStateIndex: Math.max(0, prev.targetStateIndex + delta),
    }));
  };

  return (
    <section className="analysis-control" aria-labelledby="analysis-control-title">
      <header className="panel-header">
        <h2 id="analysis-control-title">Analysis Control</h2>
        <span>{controlState.analysisMode}</span>
      </header>

      <div className="analysis-control-body">
        <div className="analysis-mode-switch" aria-label="Analysis mode">
          <button
            type="button"
            className={isStationary ? 'active' : ''}
            onClick={() => updateControlState({ analysisMode: 'stationary' })}
          >
            Stationary
          </button>
          <button
            type="button"
            className={!isStationary ? 'active' : ''}
            onClick={() => updateControlState({ analysisMode: 'evolution' })}
          >
            Evolution
          </button>
        </div>

        {isStationary ? (
          <div className="analysis-settings">
            <div className="stepper-field">
              <span>Target State</span>
              <div className="stepper-control">
                <button type="button" onClick={() => updateTargetState(-1)}>-</button>
                <strong>n = {controlState.targetStateIndex}</strong>
                <button type="button" onClick={() => updateTargetState(1)}>+</button>
              </div>
            </div>

            <button type="button" className="analysis-primary-action">
              Calculate
            </button>
          </div>
        ) : (
          <div className="analysis-settings">
            <label className="time-step-field">
              <span>Time Step</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={commonState.timeStep}
                onChange={(event) => updateCommonState({
                  timeStep: Number(event.target.value),
                })}
              />
            </label>

            <div className="analysis-actions">
              <button type="button" className="analysis-primary-action">
                Play
              </button>
              <button type="button" className="analysis-secondary-action">
                Reset
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default AnalysisControl;
