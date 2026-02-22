// src/components/Transaction/FlowDiagram.tsx

import { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MoneyDisplay } from '../UI/MoneyDisplay';
import { truncateHash } from '../../lib/utils';
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
}

export function FlowDiagram({
  inputs,
  outputs,
  fee = 0,
}: FlowDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 200 });
  const [isVisible, setIsVisible] = useState(true);
  const [hoveredLine, setHoveredLine] = useState<{ type: 'input' | 'output'; index: number } | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

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

  // Get hovered item data for tooltip
  const hoveredData = useMemo(() => {
    if (!hoveredLine) return null;
    if (hoveredLine.type === 'input') {
      return inputs.find(i => i.index === hoveredLine.index);
    } else {
      return outputs.find(o => o.index === hoveredLine.index);
    }
  }, [hoveredLine, inputs, outputs]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setTooltipPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
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

  // Generate connector path (chevron shape) for inputs
  const makeConnectorPath = (y: number, thickness: number) => {
    const halfHeight = thickness / 2;
    const connectorWidth = 15;
    const startX = 5;
    // Chevron pointing right: starts flat, goes to point, comes back
    return `M ${startX} ${y - halfHeight} 
            L ${startX + connectorWidth} ${y} 
            L ${startX} ${y + halfHeight}`;
  };

  // Generate connector path for outputs (chevron pointing right at the end)
  const makeOutputConnectorPath = (y: number, thickness: number) => {
    const halfHeight = thickness / 2;
    const connectorWidth = 15;
    const endX = width - 5;
    return `M ${endX - connectorWidth} ${y - halfHeight} 
            L ${endX} ${y} 
            L ${endX - connectorWidth} ${y + halfHeight}`;
  };

  return (
    <div ref={containerRef} className="mb-6 relative" onMouseMove={handleMouseMove}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold text-arkade-purple uppercase">Flow</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-sm text-arkade-gray hover:text-arkade-purple transition-colors border border-arkade-gray hover:border-arkade-purple px-3 py-1 rounded"
        >
          Hide Diagram
        </button>
      </div>
      
      <div className="bg-arkade-black border border-arkade-purple rounded-lg p-4 relative">
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

            {/* Connector gradient */}
            <linearGradient id="connector-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="100%" stopColor={colors.primary} />
            </linearGradient>
          </defs>
          
          {/* Middle bar */}
          <path
            d={middlePath}
            stroke={colors.secondary}
            strokeWidth={combinedWeight + 0.5}
            fill="none"
          />
          
          {/* Input connectors (chevron shapes) */}
          {inputLines.map((line, i) => {
            const input = inputs.find(inp => inp.index === line.index);
            if (!input || line.zeroValue) return null;
            
            const isHovered = hoveredLine?.type === 'input' && hoveredLine?.index === line.index;
            const hasLink = input.txid;
            
            return (
              <g key={`input-connector-${i}`}>
                {/* Connector shape (filled chevron) */}
                <path
                  d={makeConnectorPath(line.outerY, line.thickness)}
                  fill={isHovered ? 'white' : colors.primary}
                  stroke="none"
                  className={hasLink ? 'cursor-pointer' : ''}
                  style={{ opacity: 0.8 }}
                  onMouseEnter={() => setHoveredLine({ type: 'input', index: line.index })}
                  onMouseLeave={() => setHoveredLine(null)}
                />
              </g>
            );
          })}
          
          {/* Input lines */}
          {inputLines.map((line, i) => {
            const input = inputs.find(inp => inp.index === line.index);
            const isHovered = hoveredLine?.type === 'input' && hoveredLine?.index === line.index;
            
            return (
              <path
                key={`input-${i}`}
                d={line.path}
                stroke={isHovered ? 'url(#input-hover-gradient)' : 'url(#input-gradient)'}
                strokeWidth={line.thickness}
                fill="none"
                strokeLinecap={line.zeroValue ? 'round' : 'butt'}
                className={input?.txid ? 'cursor-pointer' : ''}
                style={{ opacity: line.zeroValue ? 0.5 : 1 }}
                onMouseEnter={() => setHoveredLine({ type: 'input', index: line.index })}
                onMouseLeave={() => setHoveredLine(null)}
              />
            );
          })}
          
          {/* Output lines */}
          {outputLines.map((line, i) => {
            const output = outputs.find(o => o.index === line.index);
            const isAnchor = output?.isAnchor;
            const isHovered = hoveredLine?.type === 'output' && hoveredLine?.index === line.index;
            
            return (
              <path
                key={`output-${i}`}
                d={line.path}
                stroke={isHovered ? 'url(#output-hover-gradient)' : 'url(#output-gradient)'}
                strokeWidth={line.thickness}
                fill="none"
                strokeLinecap={line.zeroValue ? 'round' : 'butt'}
                className={output?.spentBy ? 'cursor-pointer' : ''}
                style={{ opacity: isAnchor || line.zeroValue ? 0.3 : 1 }}
                onMouseEnter={() => setHoveredLine({ type: 'output', index: line.index })}
                onMouseLeave={() => setHoveredLine(null)}
              />
            );
          })}

          {/* Output connectors (for spent outputs) */}
          {outputLines.map((line, i) => {
            const output = outputs.find(o => o.index === line.index);
            if (!output || line.zeroValue || output.isAnchor || !output.spentBy) return null;
            
            const isHovered = hoveredLine?.type === 'output' && hoveredLine?.index === line.index;
            
            return (
              <g key={`output-connector-${i}`}>
                <path
                  d={makeOutputConnectorPath(line.outerY, line.thickness)}
                  fill={isHovered ? 'white' : colors.primary}
                  stroke="none"
                  className="cursor-pointer"
                  style={{ opacity: 0.8 }}
                  onMouseEnter={() => setHoveredLine({ type: 'output', index: line.index })}
                  onMouseLeave={() => setHoveredLine(null)}
                />
              </g>
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

        {/* Tooltip */}
        {hoveredData && (
          <div
            className="absolute pointer-events-none bg-arkade-black/95 border border-arkade-purple rounded-lg px-3 py-2 text-xs z-50 max-w-xs"
            style={{
              left: Math.min(tooltipPos.x + 10, width - 200),
              top: tooltipPos.y + 10,
            }}
          >
            {hoveredLine?.type === 'input' && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-arkade-gray">Amount:</span>
                  <MoneyDisplay sats={(hoveredData as FlowInput).amount} />
                </div>
                {(hoveredData as FlowInput).txid && (
                  <div className="flex items-center gap-2">
                    <span className="text-arkade-gray">From:</span>
                    <span className="text-arkade-purple font-mono">
                      {truncateHash((hoveredData as FlowInput).txid!, 8, 8)}:{(hoveredData as FlowInput).vout}
                    </span>
                  </div>
                )}
                {(hoveredData as FlowInput).txid && (
                  <div className="text-arkade-orange text-xs mt-1">Click to view source tx</div>
                )}
              </div>
            )}
            {hoveredLine?.type === 'output' && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-arkade-gray">Amount:</span>
                  <MoneyDisplay sats={(hoveredData as FlowOutput).amount} />
                </div>
                {(hoveredData as FlowOutput).scriptHex && (
                  <div className="flex items-center gap-2">
                    <span className="text-arkade-gray">Script:</span>
                    <span className="text-arkade-purple font-mono">
                      {truncateHash((hoveredData as FlowOutput).scriptHex!, 10, 10)}
                    </span>
                  </div>
                )}
                {(hoveredData as FlowOutput).isAnchor && (
                  <div className="text-arkade-gray italic">Anchor output</div>
                )}
                {(hoveredData as FlowOutput).spentBy && (
                  <div className="text-arkade-orange text-xs mt-1">Click to view spending tx</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Clickable overlay areas for navigation */}
        {inputLines.map((line, i) => {
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
                width: 80,
                height: line.thickness,
              }}
              onMouseEnter={() => setHoveredLine({ type: 'input', index: line.index })}
              onMouseLeave={() => setHoveredLine(null)}
            />
          );
        })}

        {outputLines.map((line, i) => {
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
                width: 80,
                height: line.thickness,
              }}
              onMouseEnter={() => setHoveredLine({ type: 'output', index: line.index })}
              onMouseLeave={() => setHoveredLine(null)}
            />
          );
        })}
      </div>
    </div>
  );
}

export type { FlowInput, FlowOutput };
