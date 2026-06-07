import { useSimulation } from "../../../hook/useSimulation";
import { useState } from "react";

function PotentialDraw1D() {
    const { commonState, state1D, updateState1D } = useSimulation();

    const gridSteps = commonState.gridSteps;
    const potentialArray = state1D.potentialArray1D;

    const potential = 
        potentialArray.length === gridSteps
            ? potentialArray
            : Array.from({ length: gridSteps }, () => 0);

    const [dragStart, setDragStart] = useState(null);
    const [dragEnd, setDragEnd] = useState(null);
    const [dragValue, setDragValue] = useState(5);
    const [isDragging, setIsDragging] = useState(false);

    function xToIndex(clientX, element, gridSteps) {
        const rect = element.getBoundingClientRect();
        const styles = window.getComputedStyle(element);
        const paddingLeft = Number.parseFloat(styles.paddingLeft) || 0;
        const paddingRight = Number.parseFloat(styles.paddingRight) || 0;
        const contentLeft = rect.left + paddingLeft;
        const contentWidth = rect.width - paddingLeft - paddingRight;

        if (contentWidth <= 0 || gridSteps <= 0) return 0;

        const ratio = (clientX - contentLeft) / contentWidth;
        const ratioNorm = Math.min(1, Math.max(0, ratio));

        return Math.min(
            gridSteps - 1,
            Math.floor(ratioNorm * gridSteps)
        );
    }

    function handlePointerDown(event) {
        const index = xToIndex(event.clientX, event.currentTarget, gridSteps);

        event.currentTarget.setPointerCapture(event.pointerId);

        setIsDragging(true);
        setDragStart(index);
        setDragEnd(index);
    }

    function handlePointerMove(event) {
        if (dragStart === null || isDragging === false) return;

        const index = xToIndex(event.clientX, event.currentTarget, gridSteps);

        setDragEnd(index);
    }

    function handlePointerUp(event) {
        if (dragStart === null || dragEnd === null || isDragging === false) return;

        const index = xToIndex(event.clientX, event.currentTarget, gridSteps);

        setDragEnd(index);
        setIsDragging(false);
    }

    function applySelection() {
        if (dragStart === null || dragEnd === null) return;

        const start = Math.min(dragStart, dragEnd);
        const end = Math.max(dragStart, dragEnd);
        const value = Number(dragValue);

        if (!Number.isFinite(value)) return;

        const next = [...potential];

        for (let i = start; i <= end; i += 1) {
            next[i] = value;
        }

        updateState1D({
            potentialArray1D: next,
            potentialRaw1D: '',
        });
    }

    function isSelected(index) {
        if (dragStart === null || dragEnd === null) return false;

        const start = Math.min(dragStart, dragEnd);
        const end = Math.max(dragStart, dragEnd);

        return index >= start && index <= end;
    }

    function valueToHeight(value) {
        return Math.max(2, Math.min(100, Math.abs(value) * 10));
    }

    function valueToClassName(value) {
        const magnitude = Math.abs(value);

        if (magnitude === 0) return 'base';
        if (magnitude < 4) return 'soft';

        return 'raised';
    }

    return (
        <div
            className="potential-interval-editor"
            aria-label="1D potential interval editor"
            style={{ '--grid-steps': gridSteps }}
        >
            <div className="interval-axis-y">V</div>

            <div
                className="interval-plot"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
            >
                {potential.map((value, index) => (
                    <span
                        key={index}
                        className={[
                            'interval-cell',
                            valueToClassName(value),
                            isSelected(index) ? 'selected' : '',
                        ].filter(Boolean).join(' ')}
                        style={{ height: `${valueToHeight(value)}%` }}
                    />
                ))}
            </div>

            <div className="interval-grid">
                {potential.map((_, index) => (
                    <span
                        key={index}
                        className={[
                            'interval-tick',
                            valueToClassName(potential[index]),
                            isSelected(index) ? 'selected' : '',
                        ].filter(Boolean).join(' ')}
                    />
                ))}
            </div>

            <div className="interval-axis-x">x</div>

            <div className="value-strip interval-value-strip">
                <span>V</span>
                <input
                    type="number"
                    value={dragValue}
                    onChange={(event) => setDragValue(event.target.value)}
                />
                <button type="button" onClick={applySelection}>
                    Apply
                </button>
            </div>
        </div>
    );
}

export default PotentialDraw1D;
