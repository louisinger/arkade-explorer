// src/components/Transaction/FlowDiagram.tsx

import { useState, useMemo, useRef, useEffect } from 'react';
import {
  FlowInput,
  FlowOutput,
  DIAGRAM_CONFIG,
  calculateTotalValue,
  generateInputLines,
  generateOutputLines,
} from './FlowDiagram.utils';

interface FlowDiagramProps {
  inputs: FlowInput[];
  outputs: FlowOutput[];
  fee?: number;
  onInputClick?: (index: number) => void;
  onOutputClick?: (index: number) => void;
}

export function FlowDiagram({
  inputs,
  outputs,
  fee = 0,
  onInputClick,
  onOutputClick,
}: FlowDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 200 });
  const [isVisible, setIsVisible] = useState(true);
  const [hoveredLine, setHoveredLine] = useState<{ type: 'input' | 'output'; index: number } | null>(null);

  // Responsive width
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        const height = Math.max(150, Math.min(300, inputs.length * 30 + outputs.length * 30));
        setDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [inputs.length, outputs.length]);

  const { width, height } = dimensions;
  const config = DIAGRAM_CONFIG;

  // Calculate combined weight based on width
  const combinedWeight = useMemo(() => {
    const txWidth = width - 20;
    return Math.min(config.maxCombinedWeight, Math.floor((txWidth - (2 * config.midWidth)) / 6));
  }, [width, config.maxCombinedWeight, config.midWidth]);

  // Generate SVG lines
  const { inputLines, outputLines, totalValue } = useMemo(() => {
    const total = calculateTotalValue(inputs, outputs, fee);
    const inLines = generateInputLines(inputs, total, combinedWeight, width, height);
    const outLines = generateOutputLines(outputs, total, combinedWeight, width, height);
    return { inputLines: inLines, outputLines: outLines, totalValue: total };
  }, [inputs, outputs, fee, combinedWeight, width, height]);

  // Middle bar path
  const middlePath = useMemo(() => {
    const midX = width / 2;
    const midY = height / 2;
    return `M ${midX - config.midWidth} ${midY + 0.25} L ${midX + config.midWidth} ${midY + 0.25}`;
  }, [width, height, config.midWidth]);

  // Colors based on theme
  const colors = {
    primary: '#9333ea',    // purple
    secondary: '#3b82f6',  // blue
    fee: '#6b7280',        // gray
  };

  if (!isVisible) {
    return (
      <div className="mb-4">
        <button
          onClick={() => setIsVisible(true)}
          className="text-sm text-arkade-purple hover:text-arkade-orange transition-colors uppercase font-bold"
        >
          Show Flow Diagram
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold text-arkade-purple uppercase">Flow</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-sm text-arkade-gray hover:text-arkade-purple transition-colors border border-arkade-gray hover:border-arkade-purple px-3 py-1 rounded"
        >
          Hide Diagram
        </button>
      </div>
      
      <div className="bg-arkade-black border border-arkade-purple rounded-lg p-4">
        <svg
          width="100%"
          height={height + 10}
          viewBox={`0 0 ${width} ${height + 10}`}
          preserveAspectRatio="none"
          className="overflow-visible"
        >
          <defs>
            {/* Input gradient: purple to blue */}
            <linearGradient id="input-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colors.primary} />
              <stop offset="100%" stopColor={colors.secondary} />
            </linearGradient>
            
            {/* Output gradient: blue to purple */}
            <linearGradient id="output-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colors.secondary} />
              <stop offset="100%" stopColor={colors.primary} />
            </linearGradient>
            
            {/* Hover gradients */}
            <linearGradient id="input-hover-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colors.primary} />
              <stop offset="30%" stopColor="white" />
              <stop offset="100%" stopColor={colors.secondary} />
            </linearGradient>
            
            <linearGradient id="output-hover-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colors.secondary} />
              <stop offset="70%" stopColor="white" />
              <stop offset="100%" stopColor={colors.primary} />
            </linearGradient>
            
            {/* Fee gradient */}
            <linearGradient id="fee-gradient" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor={colors.secondary} />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
            
            {/* Arrow markers */}
            <marker
              id="input-arrow"
              viewBox="-5 -5 10 10"
              refX="0"
              refY="0"
              markerUnits="strokeWidth"
              markerWidth="1.5"
              markerHeight="1"
              orient="auto"
            >
              <path d="M -5 -5 L 0 0 L -5 5 L 1 5 L 1 -5 Z" fill={colors.primary} />
            </marker>
            
            <marker
              id="output-arrow"
              viewBox="-5 -5 10 10"
              refX="0"
              refY="0"
              markerUnits="strokeWidth"
              markerWidth="1.5"
              markerHeight="1"
              orient="auto"
            >
              <path d="M 1 -5 L 0 -5 L -5 0 L 0 5 L 1 5 Z" fill={colors.primary} />
            </marker>
          </defs>
          
          {/* Middle bar */}
          <path
            d={middlePath}
            stroke={colors.secondary}
            strokeWidth={combinedWeight + 0.5}
            fill="none"
          />
          
          {/* Input lines */}
          {inputLines.map((line, i) => (
            <path
              key={`input-${i}`}
              d={line.path}
              stroke={
                hoveredLine?.type === 'input' && hoveredLine?.index === line.index
                  ? 'url(#input-hover-gradient)'
                  : 'url(#input-gradient)'
              }
              strokeWidth={line.thickness}
              fill="none"
              strokeLinecap={line.zeroValue ? 'round' : 'butt'}
              markerStart={!line.zeroValue ? 'url(#input-arrow)' : undefined}
              className="cursor-pointer transition-opacity"
              style={{ opacity: line.zeroValue ? 0.5 : 1 }}
              onMouseEnter={() => setHoveredLine({ type: 'input', index: line.index })}
              onMouseLeave={() => setHoveredLine(null)}
              onClick={() => onInputClick?.(line.index)}
            />
          ))}
          
          {/* Output lines */}
          {outputLines.map((line, i) => {
            const output = outputs.find(o => o.index === line.index);
            const isAnchor = output?.isAnchor;
            
            return (
              <path
                key={`output-${i}`}
                d={line.path}
                stroke={
                  hoveredLine?.type === 'output' && hoveredLine?.index === line.index
                    ? 'url(#output-hover-gradient)'
                    : 'url(#output-gradient)'
                }
                strokeWidth={line.thickness}
                fill="none"
                strokeLinecap={line.zeroValue ? 'round' : 'butt'}
                markerStart={!line.zeroValue ? 'url(#output-arrow)' : undefined}
                className="cursor-pointer transition-opacity"
                style={{ opacity: isAnchor || line.zeroValue ? 0.3 : 1 }}
                onMouseEnter={() => setHoveredLine({ type: 'output', index: line.index })}
                onMouseLeave={() => setHoveredLine(null)}
                onClick={() => onOutputClick?.(line.index)}
              />
            );
          })}
          
          {/* Fee line (only for commitment txs) */}
          {fee > 0 && (
            <path
              d={`M ${width / 2} ${height / 2} Q ${width / 2 + 40} ${height / 2 - 30}, ${width / 2 + 60} 15`}
              stroke="url(#fee-gradient)"
              strokeWidth={Math.max(2, (fee / totalValue) * combinedWeight * 0.5)}
              fill="none"
              strokeLinecap="round"
              className="opacity-60"
            />
          )}
        </svg>
      </div>
    </div>
  );
}

export type { FlowInput, FlowOutput };
