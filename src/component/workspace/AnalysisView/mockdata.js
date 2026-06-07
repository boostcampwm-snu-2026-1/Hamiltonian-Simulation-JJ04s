const sampleCount = 96;

export const buildMockStationary1DSamples = (stateIndex) => {
  const mode = stateIndex + 1;

  return Array.from({ length: sampleCount }, (_, index) => {
    const t = index / (sampleCount - 1);
    const centered = (t - 0.5) * 2;
    const envelope = Math.exp(-(centered ** 2) * 0.55);
    const real = Math.sin(mode * Math.PI * t) * envelope;
    const imaginary = 0.36 * Math.cos(mode * Math.PI * t) * envelope;

    return {
      t,
      real,
      imaginary,
      probability: real ** 2 + imaginary ** 2,
    };
  });
};

export const buildMockEvolution1DSamples = (time) => (
  Array.from({ length: sampleCount }, (_, index) => {
    const safeTime = Number.isFinite(time) ? time : 0;
    const t = index / (sampleCount - 1);
    const center = 0.32 + 0.22 * Math.sin(safeTime * 0.7);
    const centered = (t - center) / 0.18;
    const envelope = Math.exp(-(centered ** 2));
    const phase = 12 * t - safeTime;
    const real = Math.cos(phase) * envelope;
    const imaginary = Math.sin(phase) * envelope;
    const potential = t > 0.58 && t < 0.72
      ? 0.9
      : 0.18 * Math.exp(-((t - 0.18) ** 2) / 0.006);

    return {
      t,
      real,
      imaginary,
      potential,
      probability: real ** 2 + imaginary ** 2,
    };
  })
);

export const buildMockHighPotentialRegions2D = () => ([
  { x: 0.58, y: 0.08, width: 0.12, height: 0.38 },
  { x: 0.14, y: 0.62, width: 0.48, height: 0.12 },
  { x: 0.76, y: 0.55, width: 0.10, height: 0.28 },
]);

export const getMock2DContourLobes = (stateIndex, component) => {
  const mode = stateIndex % 4;
  const phaseOffset = component === 'imaginary' ? 20 : 0;

  if (mode === 0) {
    return [{ cx: 160, cy: 160, rx: 64, ry: 46, rotate: phaseOffset, sign: 1 }];
  }

  if (mode === 1) {
    return [
      { cx: 116, cy: 160, rx: 42, ry: 54, rotate: -18 + phaseOffset, sign: 1 },
      { cx: 204, cy: 160, rx: 42, ry: 54, rotate: 18 + phaseOffset, sign: -1 },
    ];
  }

  if (mode === 2) {
    return [
      { cx: 160, cy: 112, rx: 52, ry: 36, rotate: phaseOffset, sign: 1 },
      { cx: 160, cy: 208, rx: 52, ry: 36, rotate: phaseOffset, sign: -1 },
    ];
  }

  return [
    { cx: 118, cy: 118, rx: 34, ry: 42, rotate: -34 + phaseOffset, sign: 1 },
    { cx: 202, cy: 118, rx: 34, ry: 42, rotate: 34 + phaseOffset, sign: -1 },
    { cx: 118, cy: 202, rx: 34, ry: 42, rotate: 34 + phaseOffset, sign: -1 },
    { cx: 202, cy: 202, rx: 34, ry: 42, rotate: -34 + phaseOffset, sign: 1 },
  ];
};
