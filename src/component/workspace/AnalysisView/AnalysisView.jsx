import { useMemo, useState } from 'react';
import { useSimulation } from '../../../hook/useSimulation';
import {
  buildMockEvolution1DSamples,
  buildMockHighPotentialRegions2D,
  buildMockStationary1DSamples,
  getMock2DContourLobes,
} from './mockdata';
import './AnalysisView.css';

const contourDomain = { x: 32, y: 32, size: 256 };

const getMinMax = (samples, keys) => {
  const values = samples
    .flatMap(sample => keys.map(key => sample[key]))
    .filter(Number.isFinite);

  if (values.length === 0) {
    return { min: -1, max: 1 };
  }

  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
};

const buildPath = (samples, key, bounds, width, height, padding) => {
  const range = Math.max(bounds.max - bounds.min, 0.001);

  return samples.map((sample, index) => {
    const x = padding.left + sample.t * (width - padding.left - padding.right);
    const value = Number.isFinite(sample[key]) ? sample[key] : 0;
    const y = padding.top + (1 - ((value - bounds.min) / range)) * (height - padding.top - padding.bottom);
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(' ');
};

function WaveFunctionChart({ samples }) {
  const width = 640;
  const height = 210;
  const padding = { top: 22, right: 22, bottom: 28, left: 42 };
  const bounds = getMinMax(samples, ['real', 'imaginary']);
  const zeroY = padding.top + (1 - ((0 - bounds.min) / Math.max(bounds.max - bounds.min, 0.001)))
    * (height - padding.top - padding.bottom);

  return (
    <svg className="analysis-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Real and imaginary wavefunction graph">
      <line className="chart-axis" x1={padding.left} y1={zeroY} x2={width - padding.right} y2={zeroY} />
      <line className="chart-axis vertical" x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} />
      <path className="wave-real-line" d={buildPath(samples, 'real', bounds, width, height, padding)} />
      <path className="wave-imaginary-line" d={buildPath(samples, 'imaginary', bounds, width, height, padding)} />
      <g className="chart-legend">
        <line className="wave-real-line" x1="474" y1="24" x2="504" y2="24" />
        <text x="510" y="28">Real</text>
        <line className="wave-imaginary-line" x1="554" y1="24" x2="584" y2="24" />
        <text x="590" y="28">Imaginary</text>
      </g>
    </svg>
  );
}

function EvolutionWaveChart({ samples }) {
  const width = 640;
  const height = 210;
  const padding = { top: 22, right: 22, bottom: 28, left: 42 };
  const waveBounds = getMinMax(samples, ['real', 'imaginary']);
  const potentialBounds = { min: 0, max: Math.max(...samples.map(sample => sample.potential), 0.001) };
  const zeroY = padding.top + (1 - ((0 - waveBounds.min) / Math.max(waveBounds.max - waveBounds.min, 0.001)))
    * (height - padding.top - padding.bottom);

  return (
    <svg className="analysis-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Evolution wavefunction and potential graph">
      <line className="chart-axis" x1={padding.left} y1={zeroY} x2={width - padding.right} y2={zeroY} />
      <line className="chart-axis vertical" x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} />
      <path className="potential-fill" d={`${buildPath(samples, 'potential', potentialBounds, width, height, padding)} L ${width - padding.right} ${height - padding.bottom} L ${padding.left} ${height - padding.bottom} Z`} />
      <path className="potential-line" d={buildPath(samples, 'potential', potentialBounds, width, height, padding)} />
      <path className="wave-real-line" d={buildPath(samples, 'real', waveBounds, width, height, padding)} />
      <path className="wave-imaginary-line" d={buildPath(samples, 'imaginary', waveBounds, width, height, padding)} />
      <g className="chart-legend">
        <line className="potential-line" x1="414" y1="24" x2="444" y2="24" />
        <text x="450" y="28">V</text>
        <line className="wave-real-line" x1="484" y1="24" x2="514" y2="24" />
        <text x="520" y="28">Real</text>
        <line className="wave-imaginary-line" x1="558" y1="24" x2="588" y2="24" />
        <text x="594" y="28">Imag</text>
      </g>
    </svg>
  );
}

function ProbabilityChart({ samples }) {
  const width = 640;
  const height = 190;
  const padding = { top: 18, right: 22, bottom: 28, left: 42 };
  const bounds = { min: 0, max: Math.max(...samples.map(sample => sample.probability), 0.001) };
  const path = buildPath(samples, 'probability', bounds, width, height, padding);
  const floorY = height - padding.bottom;
  const firstX = padding.left;
  const lastX = width - padding.right;

  return (
    <svg className="analysis-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Probability density graph">
      <line className="chart-axis" x1={padding.left} y1={floorY} x2={lastX} y2={floorY} />
      <line className="chart-axis vertical" x1={padding.left} y1={padding.top} x2={padding.left} y2={floorY} />
      <path className="density-fill" d={`${path} L ${lastX} ${floorY} L ${firstX} ${floorY} Z`} />
      <path className="density-line" d={path} />
      <text className="density-label" x="502" y="26">|psi|^2</text>
    </svg>
  );
}

function ContourEllipse({ lobe, scale = 1, className = '' }) {
  return (
    <ellipse
      className={className}
      cx={lobe.cx}
      cy={lobe.cy}
      rx={lobe.rx * scale}
      ry={lobe.ry * scale}
      transform={`rotate(${lobe.rotate} ${lobe.cx} ${lobe.cy})`}
    />
  );
}

function PotentialRegionOverlay({ regions }) {
  if (regions.length === 0) {
    return null;
  }

  return (
    <g className="potential-region-layer" aria-hidden="true">
      {regions.map((region, index) => (
        <rect
          key={`${region.x}-${region.y}-${index}`}
          className="potential-region"
          x={contourDomain.x + region.x * contourDomain.size}
          y={contourDomain.y + region.y * contourDomain.size}
          width={region.width * contourDomain.size}
          height={region.height * contourDomain.size}
        />
      ))}
    </g>
  );
}

function WavefunctionContour({ stateIndex, component, potentialRegions = [] }) {
  const lobes = getMock2DContourLobes(stateIndex, component);

  return (
    <svg className="contour-chart" viewBox="0 0 320 320" role="img" aria-label="2D wavefunction contour">
      <rect className="contour-domain" x="32" y="32" width="256" height="256" />
      <PotentialRegionOverlay regions={potentialRegions} />
      {lobes.map((lobe, index) => (
        <g key={`${lobe.cx}-${lobe.cy}-${index}`} className={lobe.sign > 0 ? 'signed-contour positive' : 'signed-contour negative'}>
          <ContourEllipse lobe={lobe} scale={1.42} className="contour-line faint" />
          <ContourEllipse lobe={lobe} scale={1} className="contour-line" />
          <ContourEllipse lobe={lobe} scale={0.56} className="contour-line strong" />
        </g>
      ))}
    </svg>
  );
}

function ProbabilityContour({ stateIndex }) {
  const lobes = getMock2DContourLobes(stateIndex, 'real').map(lobe => ({
    ...lobe,
    sign: 1,
    rx: lobe.rx * 1.08,
    ry: lobe.ry * 1.08,
  }));

  return (
    <svg className="contour-chart" viewBox="0 0 320 320" role="img" aria-label="2D probability density contour">
      <rect className="contour-domain" x="32" y="32" width="256" height="256" />
      {lobes.map((lobe, index) => (
        <g key={`${lobe.cx}-${lobe.cy}-${index}`} className="density-contour">
          <ContourEllipse lobe={lobe} scale={1.5} className="density-fill low" />
          <ContourEllipse lobe={lobe} scale={0.98} className="density-fill mid" />
          <ContourEllipse lobe={lobe} scale={0.5} className="density-fill high" />
          <ContourEllipse lobe={lobe} scale={1.36} className="contour-line faint" />
          <ContourEllipse lobe={lobe} scale={0.95} className="contour-line" />
          <ContourEllipse lobe={lobe} scale={0.52} className="contour-line strong" />
        </g>
      ))}
    </svg>
  );
}

function Stationary2DView({ stateIndex, showPotentialRegions = false }) {
  const [component, setComponent] = useState('real');
  const potentialRegions = showPotentialRegions ? buildMockHighPotentialRegions2D() : [];

  return (
    <div className="analysis-view-body stationary-2d-body">
      <div className="analysis-graph-panel contour-panel">
        <div className="analysis-graph-header">
          <span>Wavefunction</span>
          <div className="contour-toggle" aria-label="Wavefunction component">
            <button
              type="button"
              className={component === 'real' ? 'active' : ''}
              onClick={() => setComponent('real')}
            >
              Real
            </button>
            <button
              type="button"
              className={component === 'imaginary' ? 'active' : ''}
              onClick={() => setComponent('imaginary')}
            >
              Imaginary
            </button>
          </div>
        </div>
        <WavefunctionContour
          stateIndex={stateIndex}
          component={component}
          potentialRegions={potentialRegions}
        />
      </div>

      <div className="analysis-graph-panel contour-panel">
        <div className="analysis-graph-header">
          <span>Probability Density</span>
          <strong>|psi|^2</strong>
        </div>
        <ProbabilityContour stateIndex={stateIndex} />
      </div>
    </div>
  );
}

function AnalysisView() {
  const { commonState, controlState } = useSimulation();
  const dimension = String(commonState.type).toUpperCase();
  const analysisMode = controlState.analysisMode;
  const simulationTime = Number.isFinite(commonState.simulationTime)
    ? commonState.simulationTime
    : 0;
  const isStationary1D = dimension === '1D' && analysisMode === 'stationary';
  const isStationary2D = dimension === '2D' && analysisMode === 'stationary';
  const isEvolution1D = dimension === '1D' && analysisMode === 'evolution';
  const isEvolution2D = dimension === '2D' && analysisMode === 'evolution';
  const samples = useMemo(
    () => buildMockStationary1DSamples(controlState.targetStateIndex),
    [controlState.targetStateIndex],
  );
  const evolutionSamples = useMemo(
    () => buildMockEvolution1DSamples(simulationTime),
    [simulationTime],
  );

  return (
    <section className="analysis-view" aria-labelledby="analysis-view-title">
      <header className="panel-header">
        <h2 id="analysis-view-title">Analysis View</h2>
        <span>{controlState.analysisMode}</span>
      </header>

      {isStationary1D ? (
        <div className="analysis-view-body">
          <div className="analysis-graph-panel wavefunction-panel">
            <div className="analysis-graph-header">
              <span>Wavefunction</span>
              <strong>n = {controlState.targetStateIndex}</strong>
            </div>
            <WaveFunctionChart samples={samples} />
          </div>

          <div className="analysis-graph-panel probability-panel">
            <div className="analysis-graph-header">
              <span>Probability Density</span>
              <strong>|psi|^2</strong>
            </div>
            <ProbabilityChart samples={samples} />
          </div>
        </div>
      ) : isStationary2D ? (
        <Stationary2DView stateIndex={controlState.targetStateIndex} />
      ) : isEvolution1D ? (
        <div className="analysis-view-body">
          <div className="analysis-graph-panel wavefunction-panel">
            <div className="analysis-graph-header">
              <span>Wavefunction + Potential</span>
              <strong>t = {simulationTime.toFixed(2)}</strong>
            </div>
            <EvolutionWaveChart samples={evolutionSamples} />
          </div>

          <div className="analysis-graph-panel probability-panel">
            <div className="analysis-graph-header">
              <span>Probability Density</span>
              <strong>|psi|^2</strong>
            </div>
            <ProbabilityChart samples={evolutionSamples} />
          </div>
        </div>
      ) : isEvolution2D ? (
        <Stationary2DView
          stateIndex={controlState.targetStateIndex}
          showPotentialRegions
        />
      ) : (
        <div className="analysis-view-empty" />
      )}
    </section>
  );
}

export default AnalysisView;
