import { useSimulation } from '../../../hook/useSimulation';
import PotentialDraw1D from './PotentialDraw1D';
import './PotentialEditor.css';
import { parsePotential1D } from '../../../utils/math-parser';

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

function PotentialEditor() {
  const {
    commonState,
    updateCommonState,
    state1D,
    updateState1D,
    state2D,
    updateState2D,
    updateControlState,
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

  const applyFormula = () => {
    if (is2D) return;

    const expression = state1D.potentialRaw1D.trim();

    if (expression === '') return;

    updateCommonState({ isValidTesting: true });

    try {
      const potentialArray1D = parsePotential1D(expression, {
        length: commonState.length,
        gridSteps: commonState.gridSteps,
      });

      updateState1D({ potentialArray1D });
      updateControlState({ isPotentialValid: true });
    } catch (error) {
      updateControlState({ isPotentialValid: false });
      console.error(error);
    } finally {
      updateCommonState({ isValidTesting: false });
    }
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
          {!is2D && (
            <button type="button" onClick={applyFormula}>
              Apply
            </button>
          )}
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
          <PotentialDraw1D />
        )}
      </div>
    </section>
  );
}

export default PotentialEditor;
