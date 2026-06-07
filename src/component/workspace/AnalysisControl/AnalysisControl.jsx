import { useState } from 'react';
import { useSimulation } from '../../../hook/useSimulation';
import './AnalysisControl.css';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const formatValue = (value) => Number(value).toFixed(2);

const getPositionPercent = (value, length) => {
  const halfLength = length / 2;
  return clamp((value + halfLength) / length, 0, 1);
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

function AnalysisControl() {
  const {
    commonState,
    state1D,
    updateWavePacket1D,
    state2D,
    updateWavePacket2D,
  } = useSimulation();
  const [tab, setTab] = useState('position');

  const is2D = commonState.type === '2D';
  const length = commonState.length;
  const halfLength = length / 2;
  const packet = is2D ? state2D.wavePacket2D : state1D.wavePacket1D;
  const updatePacket = is2D ? updateWavePacket2D : updateWavePacket1D;

  return (
    <section className="analysis-control" aria-labelledby="analysis-control-title">
      <header className="panel-header">
        <h2 id="analysis-control-title">Evolution Settings</h2>
        <span>{is2D ? '2D' : '1D'}</span>
      </header>

      <div className="analysis-control-body">
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
          </div>
        </div>
      </div>
    </section>
  );
}

export default AnalysisControl;
