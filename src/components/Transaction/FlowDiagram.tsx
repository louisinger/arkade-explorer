// src/components/Transaction/FlowDiagram.tsx

import { useMemo, useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FlowInput,
  FlowOutput,
  DIAGRAM_CONFIG,
  calculateTotalValue,
  generateInputLines,
  generateOutputLines,
  SvgLine,
} from './FlowDiagram.utils';

interface FlowDiagramProps {
  inputs: FlowInput[];
  outputs: FlowOutput[];
  fee?: number;
}

export function FlowDiagram({
  inputs,
  outputs,
  fee = 0,
}: FlowDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 200 });
  const [isVisible, setIsVisible] = useState(true);
  // Hover effects removed per user request

  // Responsive width
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        const height = Math.max(150, Math.min(400, Math.max(inputs.length, outputs.length) * 40 + 40));
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

  // Colors
  const colors = {
    primary: '#9333ea',    // purple
    secondary: '#3b82f6',  // blue
  };

  // Hover effects removed

  // Generate connector path (filled polygon with chevron) for inputs
  // The tip must reach exactly where the line starts: (thickness/2) + connectorWidth
  const makeInputConnectorPath = (y: number, thickness: number) => {
    const halfWidth = thickness / 2;
    const connectorWidth = config.connectorWidth;
    // Line starts at: halfWidth + connectorWidth
    // Chevron tip should be at the same point (or slightly past for overlap)
    const tipX = halfWidth + connectorWidth;
    const indentX = connectorWidth - 5; // Inner part of chevron
    
    return `M ${indentX} ${y - halfWidth} 
            L ${tipX} ${y} 
            L ${indentX} ${y + halfWidth} 
            L -10 ${y + halfWidth} 
            L -10 ${y - halfWidth} Z`;
  };

  // Generate connector path for outputs (chevron pointing right at the end)
  const makeOutputConnectorPath = (y: number, thickness: number) => {
    const halfWidth = thickness / 2;
    const connectorWidth = config.connectorWidth;
    // Line ends at: width - (halfWidth + connectorWidth)
    const tipX = width - halfWidth - connectorWidth;
    const indentX = width - connectorWidth + 5;
    
    return `M ${indentX} ${y - halfWidth} 
            L ${tipX} ${y} 
            L ${indentX} ${y + halfWidth} 
            L ${width + 10} ${y + halfWidth} 
            L ${width + 10} ${y - halfWidth} Z`;
  };

  if (!isVisible) {
    return (
      <div className="mb-6 flex justify-end">
        <button
          onClick={() => setIsVisible(true)}
          className="text-sm text-arkade-gray hover:text-arkade-purple transition-colors border border-arkade-gray hover:border-arkade-purple px-3 py-1 rounded"
        >
          Show Diagram
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="mb-6 relative">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold text-arkade-purple uppercase">Flow</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-sm text-arkade-gray hover:text-arkade-purple transition-colors border border-arkade-gray hover:border-arkade-purple px-3 py-1 rounded"
        >
          Hide Diagram
        </button>
      </div>
      
      <div className="bg-arkade-black border border-arkade-purple rounded-lg p-4 relative overflow-hidden">
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
            
            {/* Connector gradients - fade from transparent to color */}
            <linearGradient id="input-connector-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colors.primary} stopOpacity="0" />
              <stop offset="80%" stopColor={colors.primary} />
            </linearGradient>
            
            <linearGradient id="output-connector-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="20%" stopColor={colors.primary} />
              <stop offset="100%" stopColor={colors.primary} stopOpacity="0" />
            </linearGradient>

            {/* Fee gradient */}
            <linearGradient id="fee-gradient" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor={colors.secondary} />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>
          
          {/* Middle bar */}
          <path
            d={middlePath}
            stroke={colors.secondary}
            strokeWidth={combinedWeight + 0.5}
            fill="none"
          />
          
          {/* Input connectors (filled polygon with chevron) */}
          {inputLines.map((line: SvgLine, i: number) => {
            const input = inputs.find(inp => inp.index === line.index);
            if (!input || line.zeroValue) return null;
            
            return (
              <path
                key={`input-connector-${i}`}
                d={makeInputConnectorPath(line.outerY, line.thickness)}
                fill="url(#input-connector-gradient)"
                stroke="none"
                className={input.txid ? 'cursor-pointer' : ''}
              />
            );
          })}
          
          {/* Input lines */}
          {inputLines.map((line: SvgLine, i: number) => {
            const input = inputs.find(inp => inp.index === line.index);
            
            return (
              <path
                key={`input-${i}`}
                d={line.path}
                stroke="url(#input-gradient)"
                strokeWidth={line.thickness}
                fill="none"
                strokeLinecap={line.zeroValue ? 'round' : 'butt'}
                className={input?.txid ? 'cursor-pointer' : ''}
                style={{ opacity: line.zeroValue ? 0.5 : 1 }}
              />
            );
          })}
          
          {/* Output lines */}
          {outputLines.map((line: SvgLine, i: number) => {
            const output = outputs.find(o => o.index === line.index);
            const isAnchor = output?.isAnchor;
            
            return (
              <path
                key={`output-${i}`}
                d={line.path}
                stroke="url(#output-gradient)"
                strokeWidth={line.thickness}
                fill="none"
                strokeLinecap={line.zeroValue ? 'round' : 'butt'}
                className={output?.spentBy ? 'cursor-pointer' : ''}
                style={{ opacity: isAnchor || line.zeroValue ? 0.3 : 1 }}
              />
            );
          })}

          {/* Output connectors (for spent outputs) */}
          {outputLines.map((line: SvgLine, i: number) => {
            const output = outputs.find(o => o.index === line.index);
            if (!output || line.zeroValue || output.isAnchor || !output.spentBy) return null;
            
            return (
              <path
                key={`output-connector-${i}`}
                d={makeOutputConnectorPath(line.outerY, line.thickness)}
                fill="url(#output-connector-gradient)"
                stroke="none"
                className="cursor-pointer"
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

        {/* Clickable overlay areas for navigation */}
        {inputLines.map((line: SvgLine, i: number) => {
          const input = inputs.find(inp => inp.index === line.index);
          if (!input?.txid) return null;
          
          return (
            <Link
              key={`input-link-${i}`}
              to={`/tx/${input.txid}`}
              className="absolute"
              style={{
                left: 0,
                top: line.outerY - line.thickness / 2 + 16, // +16 for padding
                width: config.connectorWidth + 30,
                height: Math.max(line.thickness, 20),
              }}
            />
          );
        })}

        {outputLines.map((line: SvgLine, i: number) => {
          const output = outputs.find(o => o.index === line.index);
          if (!output?.spentBy) return null;
          
          return (
            <Link
              key={`output-link-${i}`}
              to={`/tx/${output.spentBy}`}
              className="absolute"
              style={{
                right: 0,
                top: line.outerY - line.thickness / 2 + 16,
                width: config.connectorWidth + 30,
                height: Math.max(line.thickness, 20),
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

export type { FlowInput, FlowOutput };
