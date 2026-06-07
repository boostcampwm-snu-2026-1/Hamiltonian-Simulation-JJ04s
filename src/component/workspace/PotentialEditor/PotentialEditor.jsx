import { useSimulation } from '../../../hook/useSimulation';
import './PotentialEditor.css';

const gridCells = Array.from({ length: 144 }, (_, index) => {
  const row = Math.floor(index / 12);
  const col = index % 12;
  const isSelected = row >= 4 && row <= 7 && col >= 4 && col <= 7;
  const isRaised = row >= 3 && row <= 8 && col >= 3 && col <= 8;
  const isSoft = row >= 2 && row <= 9 && col >= 2 && col <= 9;

  if (isSelected) {
    return 'selected';
  }

  if (isRaised) {
    return 'raised';
  }

  if (isSoft) {
    return 'soft';
  }

  return 'base';
});

const intervalCells = Array.from({ length: 18 }, (_, index) => {
  if (index >= 7 && index <= 11) {
    return 'selected';
  }

  if (index >= 4 && index <= 13) {
    return 'raised';
  }

  if (index >= 2 && index <= 15) {
    return 'soft';
  }

  return 'base';
});

function PotentialEditor() {
  const {
    commonState,
    state1D,
    updateState1D,
    state2D,
    updateState2D,
  } = useSimulation();

  const is2D = commonState.type === '2D';
  const expressionLabel = is2D ? 'V(x,y) =' : 'V(x) =';
  const expressionValue = is2D ? state2D.potentialRaw2D : state1D.potentialRaw1D;

  const updateExpression = (event) => {
    if (is2D) {
      updateState2D({ potentialRaw2D: event.target.value });
      return;
    }

    updateState1D({ potentialRaw1D: event.target.value });
  };

  return (
    <section className="potential-editor" aria-labelledby="potential-editor-title">
      <header className="panel-header">
        <h2 id="potential-editor-title">Potential Energy Editor</h2>
        <span>{commonState.type}</span>
      </header>

      <div className="potential-editor-body">
        <label className="expression-field">
          <span>{expressionLabel}</span>
          <input
            type="text"
            value={expressionValue}
            onChange={updateExpression}
            placeholder={is2D ? 'x^2 + y^2' : 'x^2 / 2'}
          />
        </label>

        {is2D ? (
          <div className="potential-grid-editor" aria-label="2D potential grid preview">
            <div className="axis-label axis-label-y">y</div>
            <div className="potential-grid">
              {gridCells.map((cell, index) => (
                <span key={index} className={`grid-cell ${cell}`} />
              ))}
            </div>
            <div className="axis-label axis-label-x">x</div>
            <div className="value-strip">
              <span>V 0</span>
              <div />
              <span>V 12</span>
            </div>
          </div>
        ) : (
          <div className="potential-interval-editor" aria-label="1D potential interval preview">
            <div className="interval-axis-y">V</div>
            <div className="interval-plot">
              {intervalCells.map((cell, index) => (
                <span key={index} className={`interval-cell ${cell}`} />
              ))}
            </div>
            <div className="interval-grid">
              {intervalCells.map((cell, index) => (
                <span key={index} className={`interval-tick ${cell}`} />
              ))}
            </div>
            <div className="interval-axis-x">x</div>
            <div className="value-strip interval-value-strip">
              <span>V 0</span>
              <div />
              <span>V 8</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default PotentialEditor;
