import { useSimulation } from '../../../hook/useSimulation';
import './AnalysisControl.css';

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

function CompactNumberField({ label, value, step = '0.1', onChange }) {
  return (
    <label className="compact-number-field">
      <span>{label}</span>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(event) => onChange(toNumber(event.target.value))}
      />
    </label>
  );
}

function AnalysisControl() {
  const {
    commonState,
    updateCommonState,
    state1D,
    updateWavePacket1D,
    state2D,
    updateWavePacket2D,
    controlState,
    updateControlState,
  } = useSimulation();

  const isStationary = controlState.analysisMode === 'stationary';
  const is2D = commonState.type === '2D';
  const wavePacket = is2D ? state2D.wavePacket2D : state1D.wavePacket1D;
  const updateWavePacket = is2D ? updateWavePacket2D : updateWavePacket1D;
  const energyTargetMode = controlState.energyTargetMode ?? 'single';

  const updateTargetState = (delta) => {
    updateControlState(prev => ({
      targetStateIndex: Math.max(0, prev.targetStateIndex + delta),
    }));
  };

  const toggleSimulation = () => {
    updateCommonState(prev => ({ isSimulating: !prev.isSimulating }));
  };

  const resetEvolution = () => {
    updateCommonState({ isSimulating: false, simulationTime: 0 });
  };

  return (
    <section className="analysis-control" aria-labelledby="analysis-control-title">
      <header className="panel-header">
        <h2 id="analysis-control-title">
          {isStationary ? 'Stationary Settings' : 'Evolution Settings'}
        </h2>
        <span>{controlState.analysisMode}</span>
      </header>

      <div className="analysis-control-body">
        {isStationary ? (
          <div className="stationary-control-grid">
            <div className="energy-target-tabs" aria-label="Stationary target">
              <button
                type="button"
                className={energyTargetMode === 'single' ? 'active' : ''}
                onClick={() => updateControlState({ energyTargetMode: 'single' })}
              >
                Level
              </button>
              <button
                type="button"
                className={energyTargetMode === 'all' ? 'active' : ''}
                onClick={() => updateControlState({ energyTargetMode: 'all' })}
              >
                All
              </button>
            </div>

            {energyTargetMode === 'single' ? (
              <div className="target-state-stepper">
                <span>Energy</span>
                <button type="button" onClick={() => updateTargetState(-1)}>-</button>
                <strong>n = {controlState.targetStateIndex}</strong>
                <button type="button" onClick={() => updateTargetState(1)}>+</button>
              </div>
            ) : (
              <div className="energy-all-target">
                <span>Energy</span>
                <strong>all levels</strong>
              </div>
            )}
          </div>
        ) : (
          <div className="evolution-control-grid">
            <CompactNumberField
              label="x0"
              value={wavePacket.x0}
              onChange={(value) => updateWavePacket({ x0: value })}
            />
            {is2D && (
              <CompactNumberField
                label="y0"
                value={wavePacket.y0}
                onChange={(value) => updateWavePacket({ y0: value })}
              />
            )}
            <CompactNumberField
              label={is2D ? 'kx0' : 'k0'}
              value={is2D ? wavePacket.kx0 : wavePacket.k0}
              onChange={(value) => updateWavePacket(is2D ? { kx0: value } : { k0: value })}
            />
            {is2D && (
              <CompactNumberField
                label="ky0"
                value={wavePacket.ky0}
                onChange={(value) => updateWavePacket({ ky0: value })}
              />
            )}
            <CompactNumberField
              label="sigma"
              value={wavePacket.sigma}
              onChange={(value) => updateWavePacket({ sigma: value })}
            />
            <CompactNumberField
              label="dt"
              value={commonState.timeStep}
              step="0.01"
              onChange={(value) => updateCommonState({ timeStep: value })}
            />

            <button type="button" className="compact-action-button primary" onClick={toggleSimulation}>
              {commonState.isSimulating ? 'Pause' : 'Play'}
            </button>
            <button type="button" className="compact-action-button" onClick={resetEvolution}>
              Reset
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export default AnalysisControl;
