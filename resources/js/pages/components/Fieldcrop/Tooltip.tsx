import React, { useState, useRef } from 'react';

interface TooltipProps {
    children: React.ReactNode;
    content: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

const Tooltip = React.memo(function Tooltip({ children, content, position = 'top' }: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
    const tooltipRef = useRef<HTMLDivElement>(null);

    const handleMouseEnter = (e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        let x = rect.left + rect.width / 2;
        let y = rect.top - 10;

        if (position === 'bottom') {
            y = rect.bottom + 10;
        } else if (position === 'left') {
            x = rect.left - 10;
            y = rect.top + rect.height / 2;
        } else if (position === 'right') {
            x = rect.right + 10;
            y = rect.top + rect.height / 2;
        }

        setTooltipPosition({ x, y });
        setIsVisible(true);
    };

    const handleMouseLeave = () => {
        setIsVisible(false);
    };

    return (
        <div
            className="relative inline-block"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {children}
            {isVisible && (
                <div
                    ref={tooltipRef}
                    className="fixed z-50 max-w-xs whitespace-nowrap rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white shadow-lg"
                    style={{
                        left: tooltipPosition.x,
                        top: tooltipPosition.y,
                        transform:
                            position === 'top'
                                ? 'translate(-50%, -100%)'
                                : position === 'bottom'
                                  ? 'translate(-50%, 10px)'
                                  : position === 'left'
                                    ? 'translate(-100%, -50%)'
                                    : 'translate(10px, -50%)',
                    }}
                >
                    {content}
                    <div
                        className={`absolute ${
                            position === 'top'
                                ? 'bottom-0 left-1/2 -translate-x-1/2 translate-y-full transform'
                                : position === 'bottom'
                                  ? 'left-1/2 top-0 -translate-x-1/2 -translate-y-full transform'
                                  : position === 'left'
                                    ? 'right-0 top-1/2 -translate-y-1/2 translate-x-full transform'
                                    : 'left-0 top-1/2 -translate-x-full -translate-y-1/2 transform'
                        }`}
                    >
                        <div
                            className={`h-2 w-2 rotate-45 border bg-gray-900 ${
                                position === 'top'
                                    ? 'border-b border-r'
                                    : position === 'bottom'
                                      ? 'border-l border-t'
                                      : position === 'left'
                                        ? 'border-r border-t'
                                        : 'border-b border-l'
                            } border-gray-700`}
                        ></div>
                    </div>
                </div>
            )}
        </div>
    );
});

export default Tooltip;
