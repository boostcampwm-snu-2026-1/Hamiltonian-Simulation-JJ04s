const REAL_TOLERANCE = 1e-12;

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

function assertWavePacket1D(packet) {
  if (!packet || typeof packet !== 'object') {
    throw new Error('wavePacket must be an object.');
  }

  if (!Number.isFinite(packet.x0)) {
    throw new Error('wavePacket.x0 must be finite.');
  }

  if (!Number.isFinite(packet.k0)) {
    throw new Error('wavePacket.k0 must be finite.');
  }

  assertPositiveFinite(packet.sigma, 'wavePacket.sigma');
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

  if (
    value &&
    typeof value.real === 'number' &&
    typeof value.imaginary === 'number' &&
    Math.abs(value.imaginary) <= REAL_TOLERANCE
  ) {
    return value.real;
  }

  throw new Error(`${label} must be real.`);
}

function toComplexSample(value, label) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(`${label} must be finite.`);
    }

    return { real: value, imaginary: 0 };
  }

  if (Array.isArray(value)) {
    const real = Number(value[0]);
    const imaginary = Number(value[1]);

    if (!Number.isFinite(real) || !Number.isFinite(imaginary)) {
      throw new Error(`${label} must have finite complex components.`);
    }

    return { real, imaginary };
  }

  if (value && typeof value === 'object') {
    const real = Number(value.real ?? value.re);
    const imaginary = Number(value.imaginary ?? value.im ?? 0);

    if (!Number.isFinite(real) || !Number.isFinite(imaginary)) {
      throw new Error(`${label} must have finite complex components.`);
    }

    return { real, imaginary };
  }

  throw new Error(`${label} must be a complex sample.`);
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

function createWavefunction(psi, gridSteps) {
  if (!Array.isArray(psi) || psi.length !== gridSteps) {
    throw new Error('psi must be an array with length equal to gridSteps.');
  }

  return psi.map((value, index) => toComplexSample(value, `psi[${index}]`));
}

function addComplex(left, right) {
  return {
    real: left.real + right.real,
    imaginary: left.imaginary + right.imaginary,
  };
}

function subtractComplex(left, right) {
  return {
    real: left.real - right.real,
    imaginary: left.imaginary - right.imaginary,
  };
}

function multiplyComplex(left, right) {
  return {
    real: left.real * right.real - left.imaginary * right.imaginary,
    imaginary: left.real * right.imaginary + left.imaginary * right.real,
  };
}

function divideComplex(numerator, denominator) {
  const denominatorNorm = denominator.real * denominator.real
    + denominator.imaginary * denominator.imaginary;

  if (!Number.isFinite(denominatorNorm) || denominatorNorm <= 0) {
    throw new Error('Complex division denominator must be finite and non-zero.');
  }

  return {
    real: (
      numerator.real * denominator.real
      + numerator.imaginary * denominator.imaginary
    ) / denominatorNorm,
    imaginary: (
      numerator.imaginary * denominator.real
      - numerator.real * denominator.imaginary
    ) / denominatorNorm,
  };
}

function solveComplexTridiagonal(lower, diagonal, upper, rhs) {
  const size = diagonal.length;

  if (size === 0) {
    return [];
  }

  const cPrime = Array.from({ length: Math.max(size - 1, 0) });
  const dPrime = Array.from({ length: size });

  if (size > 1) {
    cPrime[0] = divideComplex(upper[0], diagonal[0]);
  }

  dPrime[0] = divideComplex(rhs[0], diagonal[0]);

  for (let index = 1; index < size; index += 1) {
    const denominator = subtractComplex(
      diagonal[index],
      multiplyComplex(lower[index - 1], cPrime[index - 1] ?? { real: 0, imaginary: 0 }),
    );

    if (index < size - 1) {
      cPrime[index] = divideComplex(upper[index], denominator);
    }

    dPrime[index] = divideComplex(
      subtractComplex(
        rhs[index],
        multiplyComplex(lower[index - 1], dPrime[index - 1]),
      ),
      denominator,
    );
  }

  const solution = Array.from({ length: size });
  solution[size - 1] = dPrime[size - 1];

  for (let index = size - 2; index >= 0; index -= 1) {
    solution[index] = subtractComplex(
      dPrime[index],
      multiplyComplex(cPrime[index], solution[index + 1]),
    );
  }

  return solution;
}

export function computeNorm1D(wavefunction, {
  length,
  gridSteps,
}) {
  assertPositiveFinite(length, 'length');
  assertGridSteps(gridSteps);

  const psi = createWavefunction(wavefunction, gridSteps);
  const dx = length / (gridSteps - 1);

  return psi.reduce((sum, sample) => (
    sum + (sample.real * sample.real + sample.imaginary * sample.imaginary) * dx
  ), 0);
}

export function normalizeWavefunction1D(wavefunction, {
  length,
  gridSteps,
}) {
  const norm = Math.sqrt(computeNorm1D(wavefunction, { length, gridSteps }));

  if (!Number.isFinite(norm) || norm <= 0) {
    throw new Error('Wavefunction norm must be finite and non-zero.');
  }

  return createWavefunction(wavefunction, gridSteps).map(sample => ({
    real: sample.real / norm,
    imaginary: sample.imaginary / norm,
  }));
}

export function createGaussianWavePacket1D({
  length,
  gridSteps,
  wavePacket,
}) {
  assertPositiveFinite(length, 'length');
  assertGridSteps(gridSteps);
  assertWavePacket1D(wavePacket);

  const dx = length / (gridSteps - 1);
  const start = -length / 2;
  const rawWavefunction = Array.from({ length: gridSteps }, (_, index) => {
    if (index === 0 || index === gridSteps - 1) {
      return { real: 0, imaginary: 0 };
    }

    const x = start + index * dx;
    const centeredX = x - wavePacket.x0;
    const envelope = Math.exp(
      -(centeredX * centeredX) / (2 * wavePacket.sigma * wavePacket.sigma),
    );
    const phase = wavePacket.k0 * centeredX;

    return {
      real: envelope * Math.cos(phase),
      imaginary: envelope * Math.sin(phase),
    };
  });

  return normalizeWavefunction1D(rawWavefunction, { length, gridSteps });
}

export function stepCrankNicolson1D({
  psi,
  mass,
  length,
  gridSteps,
  timeStep,
  potentialArray = [],
  hbar = 1,
}) {
  assertPositiveFinite(mass, 'mass');
  assertPositiveFinite(length, 'length');
  assertPositiveFinite(timeStep, 'timeStep');
  assertPositiveFinite(hbar, 'hbar');
  assertGridSteps(gridSteps);

  const currentPsi = createWavefunction(psi, gridSteps);
  const potential = createPotential1D(potentialArray, gridSteps);
  const dx = length / (gridSteps - 1);
  const alpha = (hbar * hbar) / (2 * mass * dx * dx);
  const crankScale = timeStep / (2 * hbar);
  const interiorSize = gridSteps - 2;

  const lower = Array.from({ length: interiorSize - 1 }, () => ({
    real: 0,
    imaginary: -crankScale * alpha,
  }));
  const upper = Array.from({ length: interiorSize - 1 }, () => ({
    real: 0,
    imaginary: -crankScale * alpha,
  }));
  const diagonal = Array.from({ length: interiorSize }, (_, row) => {
    const potentialIndex = row + 1;
    const hamiltonianDiagonal = 2 * alpha + potential[potentialIndex];

    return {
      real: 1,
      imaginary: crankScale * hamiltonianDiagonal,
    };
  });
  const rhsOffDiagonal = {
    real: 0,
    imaginary: crankScale * alpha,
  };
  const rhs = Array.from({ length: interiorSize }, (_, row) => {
    const psiIndex = row + 1;
    const hamiltonianDiagonal = 2 * alpha + potential[psiIndex];
    let value = multiplyComplex(
      { real: 1, imaginary: -crankScale * hamiltonianDiagonal },
      currentPsi[psiIndex],
    );

    if (row > 0) {
      value = addComplex(
        value,
        multiplyComplex(rhsOffDiagonal, currentPsi[psiIndex - 1]),
      );
    }

    if (row < interiorSize - 1) {
      value = addComplex(
        value,
        multiplyComplex(rhsOffDiagonal, currentPsi[psiIndex + 1]),
      );
    }

    return value;
  });
  const nextInterior = solveComplexTridiagonal(lower, diagonal, upper, rhs);

  return [
    { real: 0, imaginary: 0 },
    ...nextInterior,
    { real: 0, imaginary: 0 },
  ];
}

export function evolveCrankNicolson1D({
  steps,
  ...stepOptions
}) {
  if (!Number.isInteger(steps) || steps < 0) {
    throw new Error('steps must be a non-negative integer.');
  }

  let nextPsi = createWavefunction(stepOptions.psi, stepOptions.gridSteps);

  for (let index = 0; index < steps; index += 1) {
    nextPsi = stepCrankNicolson1D({
      ...stepOptions,
      psi: nextPsi,
    });
  }

  return nextPsi;
}
