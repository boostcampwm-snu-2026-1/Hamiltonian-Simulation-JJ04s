import { useEffect, useState } from 'react';
import { useSimulation } from '../../../hook/useSimulation';
import { parsePotential1D } from '../../../utils/math-parser';
import './PhysicalParameters.css';

const LIMITS = {
  mass: { min: 0.001, max: Number.MAX_SAFE_INTEGER },
  gridSteps: {
    min: 16,
    max1D: 512,
    max2D: 512,
  },
};

const SLIDER_LIMITS = {
  mass: { min: 0.1, max: 20 },
  gridSteps: {
    max1D: 512,
    max2D: 256,
  },
};

const validateFiniteNumber = (value, label) => {
  if (value.trim() === '') {
    return `${label} is required.`;
  }

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return `${label} must be a finite number.`;
  }

  return '';
};

const validateMass = (value) => {
  const baseError = validateFiniteNumber(value, 'Mass');
  const numberValue = Number(value);

  if (baseError) return baseError;
  if (numberValue < LIMITS.mass.min) return `Mass must be at least ${LIMITS.mass.min}.`;
  if (numberValue > LIMITS.mass.max) return `Mass must be ${LIMITS.mass.max} or less.`;

  return '';
};

const validateGridSteps = (value, dimension) => {
  const baseError = validateFiniteNumber(value, 'Grid steps');
  const numberValue = Number(value);
  const max = dimension === '2D' ? LIMITS.gridSteps.max2D : LIMITS.gridSteps.max1D;

  if (baseError) return baseError;
  if (!Number.isInteger(numberValue)) return 'Grid steps must be an integer.';
  if (numberValue < LIMITS.gridSteps.min) {
    return `Grid steps must be at least ${LIMITS.gridSteps.min}.`;
  }
  if (numberValue > max) {
    return `${dimension} grid steps must be ${max} or less.`;
  }

  return '';
};

const getRangeValue = (value, min, max) => {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) return min;

  return Math.min(max, Math.max(min, numberValue));
};

const resampleArray1D = (values, nextLength) => {
  if (!Array.isArray(values) || values.length === 0) {
    return Array.from({ length: nextLength }, () => 0);
  }

  if (values.length === nextLength) {
    return values;
  }

  if (nextLength === 1) {
    return [Number.isFinite(values[0]) ? values[0] : 0];
  }

  const lastSourceIndex = Math.max(values.length - 1, 1);
  const lastTargetIndex = nextLength - 1;

  return Array.from({ length: nextLength }, (_, index) => {
    const sourceIndex = (index / lastTargetIndex) * lastSourceIndex;
    const leftIndex = Math.floor(sourceIndex);
    const rightIndex = Math.min(values.length - 1, leftIndex + 1);
    const ratio = sourceIndex - leftIndex;
    const leftValue = Number.isFinite(values[leftIndex]) ? values[leftIndex] : 0;
    const rightValue = Number.isFinite(values[rightIndex]) ? values[rightIndex] : leftValue;

    return leftValue * (1 - ratio) + rightValue * ratio;
  });
};

function PhysicalParameters() {
  const {
    commonState,
    updateCommonState,
    state1D,
    updateState1D,
    state2D,
    updateState2D,
    updateControlState,
  } = useSimulation();
  const gridMax = commonState.type === '2D' ? LIMITS.gridSteps.max2D : LIMITS.gridSteps.max1D;
  const gridSliderMax = commonState.type === '2D'
    ? SLIDER_LIMITS.gridSteps.max2D
    : SLIDER_LIMITS.gridSteps.max1D;
  const [draft, setDraft] = useState({
    mass: String(commonState.mass),
    gridSteps: String(commonState.gridSteps),
  });

  useEffect(() => {
    setDraft({
      mass: String(commonState.mass),
      gridSteps: String(commonState.gridSteps),
    });
  }, [commonState.mass, commonState.gridSteps]);

  const updateDraftParameter = (key) => (event) => {
    setDraft(prev => ({ ...prev, [key]: event.target.value }));
  };

  const commitMass = () => {
    const value = draft.mass;
    const fallbackValue = commonState.mass;

    if (validateMass(value)) {
      setDraft(prev => ({ ...prev, mass: String(fallbackValue) }));
      return;
    }

    updateCommonState({ mass: Number(value) });
  };

  const applyGridSteps = () => {
    const value = draft.gridSteps;
    const fallbackValue = commonState.gridSteps;

    if (validateGridSteps(value, commonState.type)) {
      setDraft(prev => ({ ...prev, gridSteps: String(fallbackValue) }));
      return;
    }

    const nextValue = Number(value);

    if (nextValue === commonState.gridSteps) {
      return;
    }

    updateCommonState({
      gridSteps: nextValue,
      isSimulating: false,
      simulationTime: 0,
    });

    updateControlState({ targetStateIndex: 0 });

    if (commonState.type === '2D') {
      updateState2D({
        eigenvalues2D: [],
        eigenstate2D: [],
        currentPsi2D: [],
      });
      return;
    }

    let potentialArray1D = resampleArray1D(state1D.potentialArray1D, nextValue);

    if (state1D.potentialRaw1D.trim() !== '') {
      try {
        potentialArray1D = parsePotential1D(state1D.potentialRaw1D, {
          length: commonState.length,
          gridSteps: nextValue,
        });
      } catch {
        potentialArray1D = resampleArray1D(state1D.potentialArray1D, nextValue);
      }
    }

    updateState1D({
      potentialArray1D,
      eigenvalues1D: [],
      eigenstate1D: [],
      currentPsi1D: [],
    });
  };

  const commitParameter = (key) => {
    if (key === 'mass') {
      commitMass();
      return;
    }

    const value = draft[key];
    const validators = {
      gridSteps: (nextValue) => validateGridSteps(nextValue, commonState.type),
    };
    const fallbackValues = {
      gridSteps: commonState.gridSteps,
    };

    if (validators[key](value)) {
      setDraft(prev => ({ ...prev, [key]: String(fallbackValues[key]) }));
      return;
    }

    applyGridSteps();
  };

  const commitOnEnter = (key) => (event) => {
    if (event.key !== 'Enter') return;

    event.currentTarget.blur();
    commitParameter(key);
  };

  return (
    <section className="physical-parameters" aria-labelledby="physical-parameters-title">
      <header className="panel-header">
        <h2 id="physical-parameters-title">Physical Parameters</h2>
        <span>{commonState.type}</span>
      </header>

      <div className="physical-parameters-body">
        <label className="parameter-field">
          <div className="parameter-control-row">
            <span>Mass:</span>
            <input
              className="parameter-number-input"
              type="number"
              min={LIMITS.mass.min}
              max={LIMITS.mass.max}
              step="0.1"
              value={draft.mass}
              onChange={updateDraftParameter('mass')}
              onBlur={commitMass}
              onKeyDown={commitOnEnter('mass')}
            />
            <em className="parameter-unit">m / m0</em>
            <input
              className="parameter-range-input"
              type="range"
              min={SLIDER_LIMITS.mass.min}
              max={SLIDER_LIMITS.mass.max}
              step="0.1"
              value={getRangeValue(draft.mass, SLIDER_LIMITS.mass.min, SLIDER_LIMITS.mass.max)}
              onChange={updateDraftParameter('mass')}
              onBlur={commitMass}
              onKeyDown={commitOnEnter('mass')}
              aria-label="Mass slider"
            />
          </div>
        </label>

        <label className="parameter-field">
          <div className="parameter-control-row">
            <span>Grid:</span>
            <input
              className="parameter-number-input"
              type="number"
              min={LIMITS.gridSteps.min}
              max={gridMax}
              step="16"
              value={draft.gridSteps}
              onChange={updateDraftParameter('gridSteps')}
              onBlur={() => commitParameter('gridSteps')}
              onKeyDown={commitOnEnter('gridSteps')}
            />
            <em className="parameter-unit">points / axis</em>
            <input
              className="parameter-range-input"
              type="range"
              min={LIMITS.gridSteps.min}
              max={gridSliderMax}
              step="16"
              value={getRangeValue(draft.gridSteps, LIMITS.gridSteps.min, gridSliderMax)}
              onChange={updateDraftParameter('gridSteps')}
              onBlur={() => commitParameter('gridSteps')}
              onKeyDown={commitOnEnter('gridSteps')}
              aria-label="Grid steps slider"
            />
          </div>
        </label>
      </div>
    </section>
  );
}

export default PhysicalParameters;
