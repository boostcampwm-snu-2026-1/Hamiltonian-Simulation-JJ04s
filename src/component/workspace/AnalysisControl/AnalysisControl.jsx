import { useState } from 'react';
import { useSimulation } from '../../../hook/useSimulation';
import './AnalysisControl.css';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const formatValue = (value) => Number(value).toFixed(2);

const fallbackEnergyLevels = [
  { n: 0, energy: 0.7 },
  { n: 1, energy: 1.8 },
  { n: 2, energy: 3.2 },
  { n: 3, energy: 3.2 },
  { n: 4, energy: 5.1 },
  { n: 5, energy: 6.9 },
];

const getPositionPercent = (value, length) => {
  const halfLength = length / 2;
  return clamp((value + halfLength) / length, 0, 1);
};

const getEnergyLevels = (eigenvalues) => {
  if (!Array.isArray(eigenvalues) || eigenvalues.length === 0) {
    return fallbackEnergyLevels;
  }

  return eigenvalues.slice(0, 8).map((energy, index) => ({
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

function StationaryLevelPicker({ levels, selectedIndex, onSelect }) {
  const minEnergy = Math.min(...levels.map(level => level.energy));
  const maxEnergy = Math.max(...levels.map(level => level.energy));
  const range = Math.max(maxEnergy - minEnergy, 1);
  const selectedLevel = levels.find(level => level.n === selectedIndex) ?? levels[0];
  const selectedSliderIndex = Math.max(0, levels.findIndex(level => level.n === selectedLevel.n));
  const groups = getEnergyGroups(levels);
  const toY = (energy) => 152 - ((energy - minEnergy) / range) * 116;

  return (
    <div className="stationary-editor">
      <div className="stationary-selected-readout">
        <span>Selected</span>
        <strong>n = {selectedLevel.n}</strong>
        <em>E = {formatValue(selectedLevel.energy)}</em>
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
          <strong>n = {selectedLevel.n}</strong>
        </div>

        <div className="energy-level-frame">
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
    updateWavePacket1D,
    state2D,
    updateWavePacket2D,
    controlState,
    updateControlState,
  } = useSimulation();
  const [tab, setTab] = useState('position');

  const is2D = commonState.type === '2D';
  const isStationary = controlState.analysisMode === 'stationary';
  const length = commonState.length;
  const halfLength = length / 2;
  const packet = is2D ? state2D.wavePacket2D : state1D.wavePacket1D;
  const updatePacket = is2D ? updateWavePacket2D : updateWavePacket1D;
  const energyLevels = getEnergyLevels(is2D ? state2D.eigenvalues2D : state1D.eigenvalues1D);
  const stopEvolution = () => updateCommonState({ isSimulating: false });
  const resetEvolution = () => updateCommonState({ isSimulating: false, simulationTime: 0 });

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
          />
        ) : (
          <>
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
                      onChange={(value) => updatePacket({ x0: value })}
                    />
                    {is2D && (
                      <SliderRow
                        label="y0"
                        min={-halfLength}
                        max={halfLength}
                        value={packet.y0}
                        onChange={(value) => updatePacket({ y0: value })}
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
                      onChange={(value) => updatePacket(is2D ? { kx0: value } : { k0: value })}
                    />
                    {is2D && (
                      <SliderRow
                        label="ky0"
                        min={-12}
                        max={12}
                        value={packet.ky0}
                        onChange={(value) => updatePacket({ ky0: value })}
                      />
                    )}
                  </>
                )}
                <SliderRow
                  label="sigma"
                  min={0.2}
                  max={4}
                  value={packet.sigma}
                  onChange={(value) => updatePacket({ sigma: value })}
                />
                <div className="evolution-actions">
                  <button
                    type="button"
                    className="primary"
                    onClick={() => updateCommonState({ isSimulating: true })}
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
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export default AnalysisControl;
