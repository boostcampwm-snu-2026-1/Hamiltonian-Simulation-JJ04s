const REAL_TOLERANCE = 1e-10;
const EIGENVALUE_TOLERANCE = 1e-12;
const INVERSE_ITERATION_LIMIT = 10;
const MIN_PIVOT = 1e-14;

function assertPositiveFinite(value, label) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive finite number.`);
  }
}

function assertGridSteps(gridSteps) {
  if (!Number.isInteger(gridSteps) || gridSteps < 3) {
    throw new Error('gridSteps must be an integer greater than or equal to 3.');
  }
}

function assertStateCount(stateCount) {
  if (!Number.isInteger(stateCount) || stateCount <= 0) {
    throw new Error('stateCount must be a positive integer.');
  }
}

function toFiniteReal(value, label) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(`${label} must be finite.`);
    }

    return value;
  }

  if (
    value &&
    typeof value.re === 'number' &&
    typeof value.im === 'number' &&
    Math.abs(value.im) <= REAL_TOLERANCE
  ) {
    return value.re;
  }

  throw new Error(`${label} must be real.`);
}

function normalizeEuclidean(vector) {
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));

  if (!Number.isFinite(norm) || norm === 0) {
    throw new Error('Vector norm must be finite and non-zero.');
  }

  return vector.map(value => value / norm);
}

function subtractProjection(vector, basis) {
  return basis.reduce((nextVector, basisVector) => {
    const dot = nextVector.reduce((sum, value, index) => (
      sum + value * basisVector[index]
    ), 0);

    return nextVector.map((value, index) => value - dot * basisVector[index]);
  }, vector);
}

function normalizeInteriorState(interiorState, dx) {
  const norm = Math.sqrt(
    interiorState.reduce((sum, value) => sum + value * value * dx, 0)
  );

  if (!Number.isFinite(norm) || norm === 0) {
    throw new Error('Eigenstate norm must be finite and non-zero.');
  }

  const normalized = interiorState.map(value => value / norm);
  const pivot = normalized.reduce((bestIndex, value, index) => (
    Math.abs(value) > Math.abs(normalized[bestIndex]) ? index : bestIndex
  ), 0);
  const sign = normalized[pivot] < 0 ? -1 : 1;

  return normalized.map(value => sign * value);
}

function createPotential1D(potentialArray, gridSteps) {
  if (!potentialArray || potentialArray.length === 0) {
    return Array.from({ length: gridSteps }, () => 0);
  }

  if (!Array.isArray(potentialArray) || potentialArray.length !== gridSteps) {
    throw new Error('potentialArray must be an array with length equal to gridSteps.');
  }

  return potentialArray.map((value, index) => (
    toFiniteReal(value, `Potential value ${index}`)
  ));
}

function buildTridiagonalHamiltonian1D({
  mass,
  length,
  gridSteps,
  potentialArray = [],
  hbar = 1,
}) {
  assertPositiveFinite(mass, 'mass');
  assertPositiveFinite(length, 'length');
  assertPositiveFinite(hbar, 'hbar');
  assertGridSteps(gridSteps);

  const potential = createPotential1D(potentialArray, gridSteps);
  const dx = length / (gridSteps - 1);
  const alpha = (hbar * hbar) / (2 * mass * dx * dx);
  const interiorSize = gridSteps - 2;
  const diagonal = Array.from({ length: interiorSize }, (_, index) => (
    2 * alpha + potential[index + 1]
  ));
  const offDiagonal = Array.from({ length: Math.max(interiorSize - 1, 0) }, () => -alpha);

  return {
    diagonal,
    offDiagonal,
    dx,
    alpha,
    interiorSize,
  };
}

export function buildHamiltonian1D({
  mass,
  length,
  gridSteps,
  potentialArray = [],
  hbar = 1,
}) {
  const {
    diagonal,
    offDiagonal,
    dx,
    alpha,
    interiorSize,
  } = buildTridiagonalHamiltonian1D({
    mass,
    length,
    gridSteps,
    potentialArray,
    hbar,
  });

  const hamiltonian = Array.from({ length: interiorSize }, (_, row) => {
    const rowValues = Array.from({ length: interiorSize }, () => 0);

    rowValues[row] = diagonal[row];

    if (row > 0) {
      rowValues[row - 1] = offDiagonal[row - 1];
    }

    if (row < interiorSize - 1) {
      rowValues[row + 1] = offDiagonal[row];
    }

    return rowValues;
  });

  return {
    hamiltonian,
    diagonal,
    offDiagonal,
    dx,
    alpha,
    interiorSize,
  };
}

function getGershgorinBounds(diagonal, offDiagonal) {
  return diagonal.reduce((bounds, value, index) => {
    const radius = Math.abs(offDiagonal[index - 1] ?? 0) + Math.abs(offDiagonal[index] ?? 0);

    return {
      min: Math.min(bounds.min, value - radius),
      max: Math.max(bounds.max, value + radius),
    };
  }, { min: Infinity, max: -Infinity });
}

function stabilizePivot(value) {
  if (Math.abs(value) >= MIN_PIVOT) return value;

  return value < 0 ? -MIN_PIVOT : MIN_PIVOT;
}

function countEigenvaluesAtMost(diagonal, offDiagonal, shift) {
  let count = 0;
  let pivot = stabilizePivot(diagonal[0] - shift);

  if (pivot <= 0) count += 1;

  for (let index = 1; index < diagonal.length; index += 1) {
    pivot = diagonal[index] - shift - (offDiagonal[index - 1] ** 2) / pivot;
    pivot = stabilizePivot(pivot);

    if (pivot <= 0) count += 1;
  }

  return count;
}

function findEigenvalueByIndex(diagonal, offDiagonal, targetCount, lowerBound, upperBound) {
  let lower = lowerBound;
  let upper = upperBound;

  for (let iteration = 0; iteration < 90; iteration += 1) {
    const middle = (lower + upper) / 2;
    const count = countEigenvaluesAtMost(diagonal, offDiagonal, middle);

    if (count < targetCount) {
      lower = middle;
    } else {
      upper = middle;
    }

    if (Math.abs(upper - lower) <= EIGENVALUE_TOLERANCE * Math.max(1, Math.abs(upper))) {
      break;
    }
  }

  return (lower + upper) / 2;
}

function solveShiftedTridiagonal(diagonal, offDiagonal, shift, rhs) {
  const size = diagonal.length;
  const upper = offDiagonal.slice();
  const values = diagonal.map(value => value - shift);
  const solution = rhs.slice();

  values[0] = stabilizePivot(values[0]);

  for (let index = 1; index < size; index += 1) {
    const factor = offDiagonal[index - 1] / values[index - 1];

    values[index] = stabilizePivot(values[index] - factor * upper[index - 1]);
    solution[index] -= factor * solution[index - 1];
  }

  solution[size - 1] /= values[size - 1];

  for (let index = size - 2; index >= 0; index -= 1) {
    solution[index] = (solution[index] - upper[index] * solution[index + 1]) / values[index];
  }

  return solution;
}

function createInitialVector(size, mode) {
  return normalizeEuclidean(
    Array.from({ length: size }, (_, index) => (
      Math.sin((mode * Math.PI * (index + 1)) / (size + 1))
    ))
  );
}

function findEigenvector(diagonal, offDiagonal, eigenvalue, mode, previousVectors) {
  const scale = Math.max(1, Math.abs(eigenvalue));
  const shift = eigenvalue - EIGENVALUE_TOLERANCE * scale;
  let vector = createInitialVector(diagonal.length, mode);

  for (let iteration = 0; iteration < INVERSE_ITERATION_LIMIT; iteration += 1) {
    let nextVector = solveShiftedTridiagonal(diagonal, offDiagonal, shift, vector);

    nextVector = subtractProjection(nextVector, previousVectors);
    nextVector = normalizeEuclidean(nextVector);

    const overlap = Math.abs(nextVector.reduce((sum, value, index) => (
      sum + value * vector[index]
    ), 0));

    vector = nextVector;

    if (1 - overlap < 1e-8) {
      break;
    }
  }

  return vector;
}

function solveLowestTridiagonalEigenpairs({ diagonal, offDiagonal, stateCount }) {
  const selectedStateCount = Math.min(stateCount, diagonal.length);
  const bounds = getGershgorinBounds(diagonal, offDiagonal);
  const margin = Math.max(bounds.max - bounds.min, 1) * 0.01;
  const lowerBound = bounds.min - margin;
  const upperBound = bounds.max + margin;
  const eigenvalues = [];
  const eigenvectors = [];

  for (let index = 0; index < selectedStateCount; index += 1) {
    const eigenvalue = findEigenvalueByIndex(
      diagonal,
      offDiagonal,
      index + 1,
      lowerBound,
      upperBound,
    );
    const eigenvector = findEigenvector(
      diagonal,
      offDiagonal,
      eigenvalue,
      index + 1,
      eigenvectors,
    );

    eigenvalues.push(eigenvalue);
    eigenvectors.push(eigenvector);
  }

  return {
    eigenvalues,
    eigenvectors,
  };
}

export function buildFreeStationary1D({
  mass,
  length,
  gridSteps,
  stateCount = 6,
  hbar = 1,
}) {
  assertPositiveFinite(mass, 'mass');
  assertPositiveFinite(length, 'length');
  assertPositiveFinite(hbar, 'hbar');
  assertGridSteps(gridSteps);
  assertStateCount(stateCount);

  const dx = length / (gridSteps - 1);
  const alpha = (hbar * hbar) / (2 * mass * dx * dx);
  const interiorSize = gridSteps - 2;
  const selectedStateCount = Math.min(stateCount, interiorSize);

  const eigenvalues = Array.from({ length: selectedStateCount }, (_, index) => {
    const mode = index + 1;

    return 2 * alpha * (1 - Math.cos((mode * Math.PI) / (gridSteps - 1)));
  });

  const eigenstates = Array.from({ length: selectedStateCount }, (_, index) => {
    const mode = index + 1;
    const interiorState = Array.from({ length: interiorSize }, (_, interiorIndex) => (
      Math.sin((mode * Math.PI * (interiorIndex + 1)) / (gridSteps - 1))
    ));

    return [
      0,
      ...normalizeInteriorState(interiorState, dx),
      0,
    ];
  });

  return {
    eigenvalues,
    eigenstates,
    dx,
    alpha,
  };
}

export function solveStationary1D({
  mass,
  length,
  gridSteps,
  potentialArray = [],
  stateCount = 6,
  hbar = 1,
}) {
  assertStateCount(stateCount);

  const {
    diagonal,
    offDiagonal,
    dx,
    alpha,
    interiorSize,
  } = buildTridiagonalHamiltonian1D({
    mass,
    length,
    gridSteps,
    potentialArray,
    hbar,
  });
  const selectedStateCount = Math.min(stateCount, interiorSize);
  const { eigenvalues, eigenvectors } = solveLowestTridiagonalEigenpairs({
    diagonal,
    offDiagonal,
    stateCount: selectedStateCount,
  });
  const eigenstates = eigenvectors.map(vector => [
    0,
    ...normalizeInteriorState(vector, dx),
    0,
  ]);

  return {
    eigenvalues,
    eigenstates,
    dx,
    alpha,
  };
}
