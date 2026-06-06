import React, { createContext, useCallback, useState, useMemo } from 'react';

export const SimulationContext = createContext(null);

export const SimulationProvider = ({ children }) => {
  // A.1 공통 물리 및 환경 설정 (Common)
  const [commonState, setCommonState] = useState({
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
  });

  // A.2 1D 전용 상태 (1D Specific)
  const [state1D, setState1D] = useState({
    potentialRaw1D: '',
    potentialArray1D: [],
    wavePacket1D: { x0: 0, k0: 5, sigma: 1 },
    eigenvalues1D: [],
    eigenstate1D: [],
    currentPsi1D: [],
  });

  // A.3 2D 전용 상태 (2D Specific)
  const [state2D, setState2D] = useState({
    potentialRaw2D: '',
    potentialArray2D: [],
    wavePacket2D: { x0: 0, y0: 0, kx0: 5, ky0: 5, sigma: 1 },
    eigenvalues2D: [],
    eigenstate2D: [],
    currentPsi2D: [],
  });

  // A.4 분석 및 제어 설정
  const [controlState, setControlState] = useState({
    analysisMode: 'stationary',
    targetStateIndex: 0,
    isPotentialValid: false,
  });

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
