import { eigs } from 'mathjs';

const REAL_TOLERANCE = 1e-10;

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

function toPlainVector(vector) {
  const raw = Array.isArray(vector) ? vector : vector.toArray();

  return raw.flat().map((value, index) => (
    toFiniteReal(value, `Eigenvector component ${index}`)
  ));
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

export function buildHamiltonian1D({
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

  const hamiltonian = Array.from({ length: interiorSize }, (_, row) => {
    const rowValues = Array.from({ length: interiorSize }, () => 0);
    const potentialIndex = row + 1;

    rowValues[row] = 2 * alpha + potential[potentialIndex];

    if (row > 0) {
      rowValues[row - 1] = -alpha;
    }

    if (row < interiorSize - 1) {
      rowValues[row + 1] = -alpha;
    }

    return rowValues;
  });

  return {
    hamiltonian,
    dx,
    alpha,
    interiorSize,
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

  const { hamiltonian, dx, alpha, interiorSize } = buildHamiltonian1D({
    mass,
    length,
    gridSteps,
    potentialArray,
    hbar,
  });
  const selectedStateCount = Math.min(stateCount, interiorSize);
  const result = eigs(hamiltonian);

  const eigenpairs = result.eigenvectors
    .map(({ value, vector }) => ({
      value: toFiniteReal(value, 'Eigenvalue'),
      vector: toPlainVector(vector),
    }))
    .sort((left, right) => left.value - right.value)
    .slice(0, selectedStateCount);

  const eigenvalues = eigenpairs.map(({ value }) => value);
  const eigenstates = eigenpairs.map(({ vector }) => [
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
