import React, { createContext, useCallback, useState, useMemo } from 'react';

export const SimulationContext = createContext(null);

/**
 * Dimensionless unit convention used by the simulator.
 *
 * This project treats the existing numeric state values as simulator units,
 * not SI units. The reference scales are:
 * - Reference length: L0
 * - Reference mass: m0
 * - Reduced Planck constant: hbar = 1
 * - Reference energy: E0 = hbar^2 / (m0 * L0^2)
 * - Reference time: T0 = hbar / E0
 *
 * A stored value is therefore interpreted as:
 * - mass: m / m0
 * - length, x0, y0, sigma: value / L0
 * - k0, kx0, ky0: k * L0
 * - timeStep, simulationTime: t / T0
 * - potentialArray and eigenvalues: energy / E0
 * - gridSteps: grid point count per axis, not a physical unit
 */

/**
 * @typedef {Object} WavePacket1D
 * @property {number} x0 Initial position, x0 / L0.
 * @property {number} k0 Initial wave number, k0 * L0.
 * @property {number} sigma Packet width, sigma / L0.
 */

/**
 * @typedef {Object} WavePacket2D
 * @property {number} x0 Initial x position, x0 / L0.
 * @property {number} y0 Initial y position, y0 / L0.
 * @property {number} kx0 Initial x wave number, kx0 * L0.
 * @property {number} ky0 Initial y wave number, ky0 * L0.
 * @property {number} sigma Packet width, sigma / L0.
 */

/**
 * @typedef {Object} CommonSimulationState
 * @property {'1D' | '2D'} type Simulation dimension.
 * @property {number} mass Dimensionless particle mass, m / m0.
 * @property {number} length Dimensionless domain length, L / L0. In 2D, this is the square side length.
 * @property {number} gridSteps Number of grid points per axis. In 2D, the grid is gridSteps x gridSteps.
 * @property {number} timeStep Dimensionless time step, dt / T0.
 * @property {'draw'} potentialMode Reserved potential editing mode.
 * @property {boolean} isCalculating Whether stationary solver calculation is running.
 * @property {boolean} isSimulating Whether time evolution is running.
 * @property {number} simulationTime Dimensionless elapsed simulation time, t / T0.
 * @property {boolean} isValidTesting Whether potential validation is running.
 */

/**
 * @typedef {Object} SimulationState1D
 * @property {string} potentialRaw1D Raw 1D potential expression entered by the user.
 * @property {number[]} potentialArray1D 1D potential samples, V / E0.
 * @property {WavePacket1D} wavePacket1D Initial 1D wave packet parameters.
 * @property {number[]} eigenvalues1D Stationary-state eigenvalues, E / E0.
 * @property {Array} eigenstate1D Stationary-state wavefunction samples.
 * @property {Array} currentPsi1D Current time-evolved wavefunction samples.
 */

/**
 * @typedef {Object} SimulationState2D
 * @property {string} potentialRaw2D Raw 2D potential expression entered by the user.
 * @property {number[][]} potentialArray2D 2D potential samples, V / E0.
 * @property {WavePacket2D} wavePacket2D Initial 2D wave packet parameters.
 * @property {number[]} eigenvalues2D Stationary-state eigenvalues, E / E0.
 * @property {Array} eigenstate2D Stationary-state wavefunction samples.
 * @property {Array} currentPsi2D Current time-evolved wavefunction samples.
 */

/**
 * @typedef {Object} ControlState
 * @property {'stationary' | 'evolution'} analysisMode Selected analysis workflow.
 * @property {'single' | 'all'} energyTargetMode Whether stationary analysis targets one energy level or all levels.
 * @property {number} targetStateIndex Eigenstate index n used in stationary analysis.
 * @property {boolean} isPotentialValid Whether the current potential input is valid.
 */

/** @type {CommonSimulationState} */
const initialCommonState = {
  type: '1D',
  mass: 1.0,
  length: 10.0,
  gridSteps: 512,
  timeStep: 0.1,
  potentialMode: 'draw',
  isCalculating: false,
  isSimulating: false,
  simulationTime: 0.0,
  isValidTesting: false,
};

/** @type {SimulationState1D} */
const initialState1D = {
  potentialRaw1D: '',
  potentialArray1D: [],
  wavePacket1D: { x0: 0, k0: 5, sigma: 1 },
  eigenvalues1D: [],
  eigenstate1D: [],
  currentPsi1D: [],
};

/** @type {SimulationState2D} */
const initialState2D = {
  potentialRaw2D: '',
  potentialArray2D: [],
  wavePacket2D: { x0: 0, y0: 0, kx0: 5, ky0: 5, sigma: 1 },
  eigenvalues2D: [],
  eigenstate2D: [],
  currentPsi2D: [],
};

/** @type {ControlState} */
const initialControlState = {
  analysisMode: 'stationary',
  energyTargetMode: 'single',
  targetStateIndex: 0,
  isPotentialValid: false,
};

export const SimulationProvider = ({ children }) => {
  // A.1 공통 물리 및 환경 설정 (Common)
  const [commonState, setCommonState] = useState(initialCommonState);

  // A.2 1D 전용 상태 (1D Specific)
  const [state1D, setState1D] = useState(initialState1D);

  // A.3 2D 전용 상태 (2D Specific)
  const [state2D, setState2D] = useState(initialState2D);

  // A.4 분석 및 제어 설정
  const [controlState, setControlState] = useState(initialControlState);

  const updateCommonState = useCallback((updates) => {
    setCommonState(prev => ({
      ...prev,
      ...(typeof updates === 'function' ? updates(prev) : updates),
    }));
  }, []);

  const updateState1D = useCallback((updates) => {
    setState1D(prev => ({
      ...prev,
      ...(typeof updates === 'function' ? updates(prev) : updates),
    }));
  }, []);

  const updateWavePacket1D = useCallback((updates) => {
    setState1D(prev => ({
      ...prev,
      wavePacket1D: {
        ...prev.wavePacket1D,
        ...(typeof updates === 'function' ? updates(prev.wavePacket1D) : updates),
      },
    }));
  }, []);

  const updateState2D = useCallback((updates) => {
    setState2D(prev => ({
      ...prev,
      ...(typeof updates === 'function' ? updates(prev) : updates),
    }));
  }, []);

  const updateWavePacket2D = useCallback((updates) => {
    setState2D(prev => ({
      ...prev,
      wavePacket2D: {
        ...prev.wavePacket2D,
        ...(typeof updates === 'function' ? updates(prev.wavePacket2D) : updates),
      },
    }));
  }, []);

  const updateControlState = useCallback((updates) => {
    setControlState(prev => ({
      ...prev,
      ...(typeof updates === 'function' ? updates(prev) : updates),
    }));
  }, []);

  // 상태 업데이트를 위한 통합 밸류 (useMemo로 최적화)
  const value = useMemo(() => ({
    commonState,
    updateCommonState,
    state1D,
    updateState1D,
    updateWavePacket1D,
    state2D,
    updateState2D,
    updateWavePacket2D,
    controlState,
    updateControlState,
  }), [
    commonState,
    updateCommonState,
    state1D,
    updateState1D,
    updateWavePacket1D,
    state2D,
    updateState2D,
    updateWavePacket2D,
    controlState,
    updateControlState,
  ]);

  return (
    <SimulationContext.Provider value={value}>
      {children}
    </SimulationContext.Provider>
  );
};
