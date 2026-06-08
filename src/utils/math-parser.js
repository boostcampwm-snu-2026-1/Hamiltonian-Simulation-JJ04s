import { compile } from 'mathjs';

export function createGrid1D(length, gridSteps) {
    if (!Number.isFinite(length) || length <= 0) {
        throw new Error('length must be a positive finite number');
    }

    if(!Number.isInteger(gridSteps) || gridSteps <= 0) {
        throw new Error('gridSteps must be a positive integer');
    }

    if (gridSteps === 1) {
        return [0];
    }

    const start = -length / 2;
    const dx = length / (gridSteps - 1);

    return Array.from({ length: gridSteps }, (_, index) => start + dx * index);
}

export function parsePotential1D(expression, { length, gridSteps }) {
    const source = String(expression ?? '').trim();

    if (source === '') {
        throw new Error('Potential expression is empty');
    }
    
    const compiled = compile(source);
    const grid = createGrid1D(length, gridSteps);

    return grid.map((x) => {
        const value = compiled.evaluate({ x });

        if (typeof value !== 'number' || !Number.isFinite(value)) {
            throw new Error(`Potential must evaluate to a finite number at x=${x}`);
        }

        return value;
    });
}
