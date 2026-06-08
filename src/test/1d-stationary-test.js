/* 
 * 1D stationary의 수치해법이 이론값에 근접하는지 확인
 * 
 * 검증 대상:
 * - Harmonic Oscillator
 * - Particle In a Box
 */
import { solveStationary1D } from '../equation-solvers/stationary-1d.js';

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

function createHarmonicPotential({ length, gridSteps, mass = 1, omega = 1 }) {
  const dx = length / (gridSteps - 1);
  const start = -length / 2;

  return Array.from({ length: gridSteps }, (_, index) => {
    const x = start + dx * index;
    return 0.5 * mass * omega * omega * x * x;
  });
}

function testInfiniteWellDiscreteEigenvalues() {
  const mass = 1;
  const length = 10;
  const gridSteps = 64;
  const stateCount = 4;

  const result = solveStationary1D({
    mass,
    length,
    gridSteps,
    potentialArray: [],
    stateCount,
  });

  const dx = length / (gridSteps - 1);
  const alpha = 1 / (2 * mass * dx * dx);
  const interiorSize = gridSteps - 2;

  result.eigenvalues.forEach((energy, index) => {
    const j = index + 1;
    const expected = 2 * alpha * (1 - Math.cos((j * Math.PI) / (interiorSize + 1)));

    assertClose(
      energy,
      expected,
      1e-8,
      `infinite well discrete E_${j}`
    );
  });
}

function testHarmonicOscillatorLowEnergies() {
  const mass = 1;
  const length = 12;
  const gridSteps = 128;
  const potentialArray = createHarmonicPotential({ length, gridSteps });

  const result = solveStationary1D({
    mass,
    length,
    gridSteps,
    potentialArray,
    stateCount: 3,
  });

  const expected = [0.5, 1.5, 2.5];

  result.eigenvalues.forEach((energy, index) => {
    assertClose(
      energy,
      expected[index],
      0.08,
      `harmonic oscillator E_${index}`
    );
  });
}

testInfiniteWellDiscreteEigenvalues();
testHarmonicOscillatorLowEnergies();

console.log('All stationary 1D tests passed.');