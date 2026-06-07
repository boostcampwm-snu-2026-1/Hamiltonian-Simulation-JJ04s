import { useEffect, useMemo, useState } from 'react';
import { useSimulation } from '../../../hook/useSimulation';
import './PhysicalParameters.css';

const LIMITS = {
  mass: { min: 0.001, max: 1000 },
  length: { min: 0.1, max: 10000 },
  gridSteps: {
    min: 16,
    max1D: 4096,
    max2D: 512,
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

const validateLength = (value) => {
  const baseError = validateFiniteNumber(value, 'Length');
  const numberValue = Number(value);

  if (baseError) return baseError;
  if (numberValue < LIMITS.length.min) return `Length must be at least ${LIMITS.length.min}.`;
  if (numberValue > LIMITS.length.max) return `Length must be ${LIMITS.length.max} or less.`;

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

function PhysicalParameters() {
  const { commonState, updateCommonState } = useSimulation();
  const [draft, setDraft] = useState({
    mass: String(commonState.mass),
    length: String(commonState.length),
    gridSteps: String(commonState.gridSteps),
  });

  useEffect(() => {
    setDraft({
      mass: String(commonState.mass),
      length: String(commonState.length),
      gridSteps: String(commonState.gridSteps),
    });
  }, [commonState.mass, commonState.length, commonState.gridSteps]);

  const errors = useMemo(() => ({
    mass: validateMass(draft.mass),
    length: validateLength(draft.length),
    gridSteps: validateGridSteps(draft.gridSteps, commonState.type),
  }), [commonState.type, draft]);

  const updateParameter = (key) => (event) => {
    const value = event.target.value;
    const nextDraft = { ...draft, [key]: value };
    const validators = {
      mass: validateMass,
      length: validateLength,
      gridSteps: (nextValue) => validateGridSteps(nextValue, commonState.type),
    };

    setDraft(nextDraft);

    if (!validators[key](value)) {
      updateCommonState({ [key]: Number(value) });
    }
  };

  return (
    <section className="physical-parameters" aria-labelledby="physical-parameters-title">
      <header className="panel-header">
        <h2 id="physical-parameters-title">Physical Parameters</h2>
        <span>{commonState.type}</span>
      </header>

      <div className="physical-parameters-body">
        <label className="parameter-field">
          <span>Mass</span>
          <div className="parameter-input">
            <input
              type="number"
              min={LIMITS.mass.min}
              max={LIMITS.mass.max}
              step="0.1"
              value={draft.mass}
              onChange={updateParameter('mass')}
              aria-invalid={Boolean(errors.mass)}
            />
            <em>m / m0</em>
          </div>
          <small className={errors.mass ? 'visible' : ''}>
            {errors.mass || 'No validation error.'}
          </small>
        </label>

        <label className="parameter-field">
          <span>Length</span>
          <div className="parameter-input">
            <input
              type="number"
              min={LIMITS.length.min}
              max={LIMITS.length.max}
              step="0.5"
              value={draft.length}
              onChange={updateParameter('length')}
              aria-invalid={Boolean(errors.length)}
            />
            <em>L / L0</em>
          </div>
          <small className={errors.length ? 'visible' : ''}>
            {errors.length || 'No validation error.'}
          </small>
        </label>

        <label className="parameter-field">
          <span>Grid Steps</span>
          <div className="parameter-input">
            <input
              type="number"
              min={LIMITS.gridSteps.min}
              max={commonState.type === '2D' ? LIMITS.gridSteps.max2D : LIMITS.gridSteps.max1D}
              step="16"
              value={draft.gridSteps}
              onChange={updateParameter('gridSteps')}
              aria-invalid={Boolean(errors.gridSteps)}
            />
            <em>points / axis</em>
          </div>
          <small className={errors.gridSteps ? 'visible' : ''}>
            {errors.gridSteps || 'No validation error.'}
          </small>
        </label>
      </div>
    </section>
  );
}

export default PhysicalParameters;
