/*
 * 1D time evolution tests for the Crank-Nicolson solver.
 *
 * Verification targets:
 * - Initial Gaussian packet normalization
 * - Norm conservation under free evolution
 * - Probability-density conservation for a stationary eigenstate
 */
import { solveStationary1D } from '../equation-solvers/stationary-1d.js';
import {
  computeNorm1D,
  createGaussianWavePacket1D,
  evolveCrankNicolson1D,
  stepCrankNicolson1D,
} from '../equation-solvers/time-evolution-1d.js';

function assertClose(actual, expected, tolerance, label) {
  const error = Math.abs(actual - expected);

  if (error > tolerance) {
    throw new Error(`${label}: expected ${expected}, got ${actual}, error ${error}`);
  }

  console.log(`PASS: ${label}`);
}

function assert(condition, label) {
  if (!condition) {
    throw new Error(label);
  }

  console.log(`PASS: ${label}`);
}

function probability(sample) {
  if (typeof sample === 'number') {
    return sample * sample;
  }

  return sample.real * sample.real + sample.imaginary * sample.imaginary;
}

function testGaussianPacketNormalization() {
  const length = 10;
  const gridSteps = 96;
  const psi = createGaussianWavePacket1D({
    length,
    gridSteps,
    wavePacket: { x0: -1.2, k0: 4.5, sigma: 0.8 },
  });

  assert(psi.length === gridSteps, 'Gaussian packet has gridSteps samples');
  assertClose(
    computeNorm1D(psi, { length, gridSteps }),
    1,
    1e-12,
    'Gaussian packet norm'
  );
}

function testFreeEvolutionNormConservation() {
  const mass = 1;
  const length = 10;
  const gridSteps = 96;
  const timeStep = 0.02;
  const potentialArray = Array.from({ length: gridSteps }, () => 0);
  const initialPsi = createGaussianWavePacket1D({
    length,
    gridSteps,
    wavePacket: { x0: -2, k0: 5, sigma: 0.7 },
  });
  const evolvedPsi = evolveCrankNicolson1D({
    psi: initialPsi,
    mass,
    length,
    gridSteps,
    timeStep,
    potentialArray,
    steps: 120,
  });

  assertClose(
    computeNorm1D(evolvedPsi, { length, gridSteps }),
    1,
    1e-10,
    'Free evolution conserves norm'
  );
}

function testStationaryStateProbabilityConservation() {
  const mass = 1;
  const length = 10;
  const gridSteps = 80;
  const timeStep = 0.03;
  const potentialArray = Array.from({ length: gridSteps }, () => 0);
  const stationaryResult = solveStationary1D({
    mass,
    length,
    gridSteps,
    potentialArray,
    stateCount: 1,
  });
  const initialPsi = stationaryResult.eigenstates[0];
  let evolvedPsi = initialPsi;

  for (let index = 0; index < 60; index += 1) {
    evolvedPsi = stepCrankNicolson1D({
      psi: evolvedPsi,
      mass,
      length,
      gridSteps,
      timeStep,
      potentialArray,
    });
  }

  const maxProbabilityError = initialPsi.reduce((maxError, sample, index) => (
    Math.max(
      maxError,
      Math.abs(probability(evolvedPsi[index]) - probability(sample)),
    )
  ), 0);

  assertClose(
    maxProbabilityError,
    0,
    1e-10,
    'Stationary state probability density is conserved'
  );
}

testGaussianPacketNormalization();
testFreeEvolutionNormConservation();
testStationaryStateProbabilityConservation();

console.log('All evolution 1D tests passed.');
