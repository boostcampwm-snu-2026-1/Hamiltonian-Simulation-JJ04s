import { useEffect, useRef, useState } from 'react';
import { useSimulation } from '../../../hook/useSimulation';
import { solveStationary1D } from '../../../equation-solvers/stationary-1d';
import {
  createGaussianWavePacket1D,
  stepCrankNicolson1D,
} from '../../../equation-solvers/time-evolution-1d';
import './AnalysisControl.css';

const EVOLUTION_FRAME_INTERVAL_MS = 33;
const MAX_EVOLUTION_STEPS_PER_FRAME = 8;
const PLAYBACK_SPEEDS = [0.25, 0.5, 1, 2, 4];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const formatValue = (value) => Number(value).toFixed(2);

const getPlaybackSpeed = (value) => {
  const speed = Number(value);
  return PLAYBACK_SPEEDS.includes(speed) ? speed : 1;
};

const getPositionPercent = (value, length) => {
  const halfLength = length / 2;
  return clamp((value + halfLength) / length, 0, 1);
};

const getEnergyLevels = (eigenvalues) => {
  if (!Array.isArray(eigenvalues) || eigenvalues.length === 0) {
    return [];
  }

  return eigenvalues.slice(0, 6).map((energy, index) => ({
    n: index,
    energy,
  }));
};

const getEnergyGroups = (levels) => {
  const groups = [];

  levels.forEach((level) => {
    const group = groups.find(item => Math.abs(item.energy - level.energy) < 1e-6);

    if (group) {
      group.levels.push(level);
      return;
    }

    groups.push({ energy: level.energy, levels: [level] });
  });

  return groups;
};

const buildGaussianPath = (x0, sigma, length) => {
  const width = 300;
  const left = 24;
  const baseline = 116;
  const amplitude = 54;
  const center = left + getPositionPercent(x0, length) * width;
  const sigmaPx = clamp((sigma / length) * width, 12, 92);
  const points = Array.from({ length: 64 }, (_, index) => {
    const x = left + (index / 63) * width;
    const y = baseline - amplitude * Math.exp(-((x - center) ** 2) / (2 * sigmaPx ** 2));
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
  });

  return points.join(' ');
};

function SliderRow({ label, min, max, step = 0.1, value, onChange }) {
  return (
    <label className="evolution-slider-row">
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <strong>{formatValue(value)}</strong>
    </label>
  );
}

function OneDPreview({ tab, packet, length }) {
  const centerX = 24 + getPositionPercent(packet.x0, length) * 300;
  const arrowLength = clamp(Math.abs(packet.k0) * 5, 14, 72);
  const arrowSign = packet.k0 >= 0 ? 1 : -1;
  const arrowStart = centerX - (arrowLength * arrowSign) / 2;
  const arrowEnd = centerX + (arrowLength * arrowSign) / 2;

  return (
    <svg className="evolution-preview one-d-preview" viewBox="0 0 348 148" role="img" aria-label="1D wave packet preview">
      <line className="preview-axis" x1="24" y1="116" x2="324" y2="116" />
      <path className="preview-wave" d={buildGaussianPath(packet.x0, packet.sigma, length)} />
      <circle className={tab === 'position' ? 'preview-point active' : 'preview-point'} cx={centerX} cy="116" r="5" />
      <g className={tab === 'momentum' ? 'preview-arrow active' : 'preview-arrow'}>
        <line x1={arrowStart} y1="42" x2={arrowEnd} y2="42" />
        <path d={arrowSign >= 0
          ? `M ${arrowEnd} 42 L ${arrowEnd - 10} 36 L ${arrowEnd - 10} 48 Z`
          : `M ${arrowEnd} 42 L ${arrowEnd + 10} 36 L ${arrowEnd + 10} 48 Z`}
        />
      </g>
    </svg>
  );
}

function TwoDPreview({ tab, packet, length }) {
  const centerX = 24 + getPositionPercent(packet.x0, length) * 140;
  const centerY = 164 - getPositionPercent(packet.y0, length) * 140;
  const radius = clamp((packet.sigma / length) * 140, 12, 48);
  const momentumLength = clamp(Math.hypot(packet.kx0, packet.ky0) * 4, 14, 58);
  const norm = Math.max(Math.hypot(packet.kx0, packet.ky0), 0.001);
  const arrowEndX = centerX + (packet.kx0 / norm) * momentumLength;
  const arrowEndY = centerY - (packet.ky0 / norm) * momentumLength;

  return (
    <svg className="evolution-preview two-d-preview" viewBox="0 0 188 188" role="img" aria-label="2D contour packet preview">
      <rect className="preview-domain" x="24" y="24" width="140" height="140" />
      <ellipse className="preview-contour faint" cx={centerX} cy={centerY} rx={radius * 1.45} ry={radius * 1.1} />
      <ellipse className="preview-contour" cx={centerX} cy={centerY} rx={radius} ry={radius * 0.76} />
      <ellipse className="preview-contour strong" cx={centerX} cy={centerY} rx={radius * 0.48} ry={radius * 0.36} />
      <circle className={tab === 'position' ? 'preview-point active' : 'preview-point'} cx={centerX} cy={centerY} r="5" />
      <g className={tab === 'momentum' ? 'preview-arrow active' : 'preview-arrow'}>
        <line x1={centerX} y1={centerY} x2={arrowEndX} y2={arrowEndY} />
        <circle cx={arrowEndX} cy={arrowEndY} r="4" />
      </g>
    </svg>
  );
}

function StationaryLevelPicker({
  levels,
  selectedIndex,
  onSelect,
  onCalculate,
  isCalculating,
  canCalculate,
}) {
  const hasLevels = levels.length > 0;
  const minEnergy = hasLevels ? Math.min(...levels.map(level => level.energy)) : 0;
  const maxEnergy = hasLevels ? Math.max(...levels.map(level => level.energy)) : 1;
  const range = Math.max(maxEnergy - minEnergy, 1);
  const selectedLevel = hasLevels ? levels.find(level => level.n === selectedIndex) ?? levels[0] : null;
  const selectedSliderIndex = hasLevels
    ? Math.max(0, levels.findIndex(level => level.n === selectedLevel.n))
    : -1;
  const groups = getEnergyGroups(levels);
  const toY = (energy) => 152 - ((energy - minEnergy) / range) * 116;

  return (
    <div className="stationary-editor">
      <div className="stationary-selected-readout">
        <span>Selected</span>
        <strong>n = {selectedLevel ? selectedLevel.n : '-'}</strong>
        <em>E = {selectedLevel ? formatValue(selectedLevel.energy) : '--'}</em>
        <button
          type="button"
          onClick={onCalculate}
          disabled={!canCalculate || isCalculating}
        >
          {isCalculating ? 'Calculating' : 'Calculate'}
        </button>
      </div>

      <div className="stationary-level-layout">
        <div className="stationary-n-selector" aria-label="Select energy level n">
          <div className="stationary-n-track">
            {levels.map((level, index) => (
              <button
                key={level.n}
                type="button"
                className={index === selectedSliderIndex ? 'active' : ''}
                onClick={() => onSelect(level.n)}
                aria-label={`Select n ${level.n}`}
              >
                {level.n}
              </button>
            ))}
          </div>
          <strong>n = {selectedLevel ? selectedLevel.n : '-'}</strong>
        </div>

        <div className="energy-level-frame">
          {hasLevels ? (
            <svg className="energy-level-chart" viewBox="0 0 280 180" role="img" aria-label="Stationary energy level picker">
              <line className="energy-axis" x1="46" y1="28" x2="46" y2="158" />
              <text className="energy-axis-label" x="16" y="34">E</text>
              {groups.map((group) => {
                const y = toY(group.energy);
                const segmentGap = 10;
                const totalWidth = 156;
                const segmentWidth = (totalWidth - segmentGap * (group.levels.length - 1)) / group.levels.length;

                return group.levels.map((level, index) => {
                  const x1 = 70 + index * (segmentWidth + segmentGap);
                  const x2 = x1 + segmentWidth;
                  const isSelected = level.n === selectedIndex;

                  return (
                    <g
                      key={level.n}
                      className={isSelected ? 'energy-level selected' : 'energy-level'}
                      role="button"
                      tabIndex="0"
                      onClick={() => onSelect(level.n)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') onSelect(level.n);
                      }}
                    >
                      <line x1={x1} y1={y} x2={x2} y2={y} />
                      <text x={(x1 + x2) / 2} y={y - 7}>n{level.n}</text>
                    </g>
                  );
                });
              })}
            </svg>
          ) : (
            <div className="energy-level-empty">
              No calculated energy levels
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AnalysisControl() {
  const {
    commonState,
    updateCommonState,
    state1D,
    updateState1D,
    updateWavePacket1D,
    state2D,
    updateWavePacket2D,
    controlState,
    updateControlState,
  } = useSimulation();
  const [tab, setTab] = useState('position');
  const animationFrameRef = useRef(null);
  const psiRef = useRef([]);
  const simulationTimeRef = useRef(0);
  const evolutionConfigRef = useRef(null);

  const is2D = commonState.type === '2D';
  const isStationary = controlState.analysisMode === 'stationary';
  const length = commonState.length;
  const halfLength = length / 2;
  const packet = is2D ? state2D.wavePacket2D : state1D.wavePacket1D;
  const updatePacket = is2D ? updateWavePacket2D : updateWavePacket1D;
  const energyLevels = getEnergyLevels(is2D ? state2D.eigenvalues2D : state1D.eigenvalues1D);
  const simulationTime = Number.isFinite(commonState.simulationTime)
    ? commonState.simulationTime
    : 0;
  const playbackSpeed = getPlaybackSpeed(controlState.playbackSpeed);

  const createInitialPsi1D = () => createGaussianWavePacket1D({
    length: commonState.length,
    gridSteps: commonState.gridSteps,
    wavePacket: state1D.wavePacket1D,
  });

  const calculateEvolution1D = () => {
    if (is2D || commonState.isCalculating) return;

    updateCommonState({ isCalculating: true, isSimulating: false });

    window.setTimeout(() => {
      try {
        const initialPsi = createInitialPsi1D();

        psiRef.current = initialPsi;
        simulationTimeRef.current = 0;
        updateState1D({ currentPsi1D: initialPsi });
        updateCommonState({ simulationTime: 0 });
      } catch (error) {
        console.error(error);
        updateState1D({ currentPsi1D: [] });
        updateCommonState({ simulationTime: 0 });
      } finally {
        updateCommonState({ isCalculating: false });
      }
    }, 0);
  };

  const startEvolution = () => {
    if (is2D) {
      updateCommonState({ isSimulating: true });
      return;
    }

    try {
      const hasCurrentPsi = Array.isArray(state1D.currentPsi1D)
        && state1D.currentPsi1D.length === commonState.gridSteps;
      const initialPsi = hasCurrentPsi ? state1D.currentPsi1D : createInitialPsi1D();

      psiRef.current = initialPsi;
      simulationTimeRef.current = hasCurrentPsi ? simulationTime : 0;
      updateState1D({ currentPsi1D: initialPsi });
      updateCommonState({
        isSimulating: true,
        simulationTime: simulationTimeRef.current,
      });
    } catch (error) {
      console.error(error);
      updateCommonState({ isSimulating: false });
    }
  };

  const stopEvolution = () => updateCommonState({ isSimulating: false });

  const resetEvolution = () => {
    if (is2D) {
      updateCommonState({ isSimulating: false, simulationTime: 0 });
      return;
    }

    try {
      const initialPsi = createInitialPsi1D();

      psiRef.current = initialPsi;
      simulationTimeRef.current = 0;
      updateState1D({ currentPsi1D: initialPsi });
      updateCommonState({ isSimulating: false, simulationTime: 0 });
    } catch (error) {
      console.error(error);
      updateState1D({ currentPsi1D: [] });
      updateCommonState({ isSimulating: false, simulationTime: 0 });
    }
  };

  const updatePacketParameter = (updates) => {
    updatePacket(updates);

    if (is2D) return;

    psiRef.current = [];
    simulationTimeRef.current = 0;
    updateState1D({ currentPsi1D: [] });
    updateCommonState({ isSimulating: false, simulationTime: 0 });
  };

  const calculateStationary1D = () => {
    if (is2D || !isStationary || commonState.isCalculating) return;

    updateCommonState({ isCalculating: true });

    window.setTimeout(() => {
      try {
        const { eigenvalues, eigenstates } = solveStationary1D({
          mass: commonState.mass,
          length: commonState.length,
          gridSteps: commonState.gridSteps,
          potentialArray: state1D.potentialArray1D,
          stateCount: 6,
        });

        updateState1D({
          eigenvalues1D: eigenvalues,
          eigenstate1D: eigenstates,
        });
        updateControlState((previousControlState) => {
          const lastStateIndex = eigenvalues.length - 1;

          if (lastStateIndex < 0) {
            return { targetStateIndex: 0 };
          }

          if (previousControlState.targetStateIndex > lastStateIndex) {
            return { targetStateIndex: lastStateIndex };
          }

          return {};
        });
      } catch (error) {
        console.error(error);
        updateState1D({
          eigenvalues1D: [],
          eigenstate1D: [],
        });
        updateControlState({ targetStateIndex: 0 });
      } finally {
        updateCommonState({ isCalculating: false });
      }
    }, 0);
  };

  useEffect(() => {
    if (commonState.type !== '1D') {
      evolutionConfigRef.current = null;
      return;
    }

    const previousConfig = evolutionConfigRef.current;
    const nextConfig = {
      mass: commonState.mass,
      length: commonState.length,
      gridSteps: commonState.gridSteps,
      potentialArray: state1D.potentialArray1D,
    };

    evolutionConfigRef.current = nextConfig;

    if (!previousConfig) return;

    const hasChanged = previousConfig.mass !== nextConfig.mass
      || previousConfig.length !== nextConfig.length
      || previousConfig.gridSteps !== nextConfig.gridSteps
      || previousConfig.potentialArray !== nextConfig.potentialArray;

    if (!hasChanged) return;

    psiRef.current = [];
    simulationTimeRef.current = 0;
    updateState1D({ currentPsi1D: [] });
    updateCommonState({ isSimulating: false, simulationTime: 0 });
  }, [
    commonState.type,
    commonState.mass,
    commonState.length,
    commonState.gridSteps,
    state1D.potentialArray1D,
    updateCommonState,
    updateState1D,
  ]);

  useEffect(() => {
    if (
      commonState.type !== '1D'
      || controlState.analysisMode !== 'evolution'
      || !commonState.isSimulating
    ) {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      return undefined;
    }

    let lastFrameTimestamp = 0;

    const runFrame = (timestamp) => {
      if (lastFrameTimestamp === 0) {
        lastFrameTimestamp = timestamp;
        animationFrameRef.current = window.requestAnimationFrame(runFrame);
        return;
      }

      const elapsedFrameTime = Math.min(
        timestamp - lastFrameTimestamp,
        EVOLUTION_FRAME_INTERVAL_MS * MAX_EVOLUTION_STEPS_PER_FRAME,
      );
      lastFrameTimestamp = timestamp;

      try {
        let nextPsi = psiRef.current.length === commonState.gridSteps
          ? psiRef.current
          : createInitialPsi1D();
        let nextSimulationTime = simulationTimeRef.current;
        const baseTimeStep = Number.isFinite(commonState.timeStep) && commonState.timeStep > 0
          ? commonState.timeStep
          : 0;
        const frameTimeStep = baseTimeStep
          * playbackSpeed
          * (elapsedFrameTime / EVOLUTION_FRAME_INTERVAL_MS);

        if (frameTimeStep <= 0) {
          animationFrameRef.current = window.requestAnimationFrame(runFrame);
          return;
        }

        const frameSteps = Math.min(
          MAX_EVOLUTION_STEPS_PER_FRAME,
          Math.max(1, Math.ceil(frameTimeStep / baseTimeStep)),
        );
        const subTimeStep = frameTimeStep / frameSteps;

        for (let index = 0; index < frameSteps; index += 1) {
          nextPsi = stepCrankNicolson1D({
            psi: nextPsi,
            mass: commonState.mass,
            length: commonState.length,
            gridSteps: commonState.gridSteps,
            timeStep: subTimeStep,
            potentialArray: state1D.potentialArray1D,
          });
          nextSimulationTime += subTimeStep;
        }

        psiRef.current = nextPsi;
        simulationTimeRef.current = nextSimulationTime;
        updateState1D({ currentPsi1D: nextPsi });
        updateCommonState({ simulationTime: nextSimulationTime });
      } catch (error) {
        console.error(error);
        updateCommonState({ isSimulating: false });
        return;
      }

      animationFrameRef.current = window.requestAnimationFrame(runFrame);
    };

    animationFrameRef.current = window.requestAnimationFrame(runFrame);

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [
    commonState.type,
    commonState.isSimulating,
    commonState.mass,
    commonState.length,
    commonState.gridSteps,
    commonState.timeStep,
    controlState.analysisMode,
    playbackSpeed,
    state1D.potentialArray1D,
    state1D.wavePacket1D,
    updateCommonState,
    updateState1D,
  ]);

  return (
    <section className="analysis-control" aria-labelledby="analysis-control-title">
      <header className="panel-header">
        <h2 id="analysis-control-title">
          {isStationary ? 'Stationary Settings' : 'Evolution Settings'}
        </h2>
        <span>{is2D ? '2D' : '1D'}</span>
      </header>

      <div className="analysis-control-body">
        {isStationary ? (
          <StationaryLevelPicker
            levels={energyLevels}
            selectedIndex={controlState.targetStateIndex}
            onSelect={(targetStateIndex) => updateControlState({ targetStateIndex })}
            onCalculate={calculateStationary1D}
            isCalculating={commonState.isCalculating}
            canCalculate={!is2D}
          />
        ) : (
          <>
            <div className="stationary-selected-readout evolution-readout">
              <span>Prepared</span>
              <strong>t = {simulationTime.toFixed(2)}</strong>
              <em>Grid = {commonState.gridSteps}</em>
              <button
                type="button"
                onClick={calculateEvolution1D}
                disabled={is2D || commonState.isCalculating}
              >
                {commonState.isCalculating ? 'Calculating' : 'Calculate'}
              </button>
            </div>

            <div className="evolution-mode-tabs" aria-label="Evolution parameter type">
              <button
                type="button"
                className={tab === 'position' ? 'active' : ''}
                onClick={() => setTab('position')}
              >
                Position
              </button>
              <button
                type="button"
                className={tab === 'momentum' ? 'active' : ''}
                onClick={() => setTab('momentum')}
              >
                Momentum
              </button>
            </div>

            <div className={is2D ? 'evolution-editor is-2d' : 'evolution-editor'}>
              <div className="evolution-preview-frame">
                {is2D ? (
                  <TwoDPreview tab={tab} packet={packet} length={length} />
                ) : (
                  <OneDPreview tab={tab} packet={packet} length={length} />
                )}
              </div>

              <div className="evolution-sliders">
                {tab === 'position' ? (
                  <>
                    <SliderRow
                      label="x0"
                      min={-halfLength}
                      max={halfLength}
                      value={packet.x0}
                      onChange={(value) => updatePacketParameter({ x0: value })}
                    />
                    {is2D && (
                      <SliderRow
                        label="y0"
                        min={-halfLength}
                        max={halfLength}
                        value={packet.y0}
                        onChange={(value) => updatePacketParameter({ y0: value })}
                      />
                    )}
                  </>
                ) : (
                  <>
                    <SliderRow
                      label={is2D ? 'kx0' : 'k0'}
                      min={-12}
                      max={12}
                      value={is2D ? packet.kx0 : packet.k0}
                      onChange={(value) => updatePacketParameter(is2D ? { kx0: value } : { k0: value })}
                    />
                    {is2D && (
                      <SliderRow
                        label="ky0"
                        min={-12}
                        max={12}
                        value={packet.ky0}
                        onChange={(value) => updatePacketParameter({ ky0: value })}
                      />
                    )}
                  </>
                )}
                <SliderRow
                  label="sigma"
                  min={0.2}
                  max={4}
                  value={packet.sigma}
                  onChange={(value) => updatePacketParameter({ sigma: value })}
                />
                <div className="evolution-actions">
                  <button
                    type="button"
                    className="primary"
                    onClick={startEvolution}
                  >
                    Play
                  </button>
                  <button type="button" onClick={stopEvolution}>
                    Stop
                  </button>
                  <button type="button" onClick={resetEvolution}>
                    Reset
                  </button>
                </div>
                <div className="evolution-speed-control" aria-label="Playback speed">
                  <span>Speed</span>
                  <div className="evolution-speed-options">
                    {PLAYBACK_SPEEDS.map((speed) => (
                      <button
                        key={speed}
                        type="button"
                        className={playbackSpeed === speed ? 'active' : ''}
                        onClick={() => updateControlState({ playbackSpeed: speed })}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export default AnalysisControl;
