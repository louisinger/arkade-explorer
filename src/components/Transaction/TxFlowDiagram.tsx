import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { truncateHash } from '../../lib/utils';
import { MoneyDisplay } from '../UI/MoneyDisplay';
import { useTheme } from '../../contexts/ThemeContext';

interface FlowInput {
  txid?: string;
  vout?: number;
  address?: string;
  amount?: number;
  label?: string;
  type?: 'regular' | 'coinbase' | 'forfeit';
}

interface FlowOutput {
  address?: string;
  amount?: number;
  label?: string;
  type?: 'regular' | 'anchor' | 'forfeit' | 'connector' | 'batch';
  spentBy?: string;
  linkTo?: string;
}

interface TxFlowDiagramProps {
  txid: string;
  inputs: FlowInput[];
  outputs: FlowOutput[];
  width?: number;
  height?: number;
  fee?: number;
}

interface FlowLine {
  txid?: string;
  vout?: number;
  address?: string;
  amount?: number;
  label?: string;
  type?: 'regular' | 'coinbase' | 'forfeit' | 'anchor' | 'connector' | 'batch';
  spentBy?: string;
  linkTo?: string;
  path: string;
  markerPath: string;
  connectorPath: string;
  thickness: number;
  outerY: number;
  innerY: number;
  color: string;
}

export function TxFlowDiagram({ 
  txid: _txid, 
  inputs, 
  outputs, 
  width = 800, 
  height = 400,
  fee 
}: TxFlowDiagramProps) {
  // txid is available for future use (e.g., tooltips)
  void _txid;
  const { resolvedTheme } = useTheme();
  
  // Colors based on theme
  const colors = useMemo(() => ({
    primary: resolvedTheme === 'dark' ? '#9333ea' : '#7c3aed', // arkade-purple
    secondary: resolvedTheme === 'dark' ? '#f97316' : '#ea580c', // arkade-orange
    connector: '#3b82f6', // blue
    fee: '#ef4444', // red
    text: resolvedTheme === 'dark' ? '#ffffff' : '#1f2937',
    muted: resolvedTheme === 'dark' ? '#9ca3af' : '#6b7280',
    bg: resolvedTheme === 'dark' ? '#0a0a0a' : '#ffffff',
  }), [resolvedTheme]);

  // Layout constants
  const midWidth = Math.min(10, Math.ceil(width / 100));
  const txWidth = width - 40;
  const connectorWidth = 20;
  const minWeight = 2;
  const maxStrands = 24;
  const spacing = 8;

  // Calculate total values
  const totalInputValue = inputs.reduce((acc, input) => acc + (input.amount || 0), 0);
  const totalOutputValue = outputs.reduce((acc, output) => acc + (output.amount || 0), 0);
  const totalValue = Math.max(totalInputValue, totalOutputValue) || 1;

  // Calculate combined weight for the middle section
  const combinedWeight = Math.min(100, Math.floor((txWidth - (2 * midWidth)) / 6));

  // Generate input lines
  const inputLines: FlowLine[] = useMemo(() => {
    const visibleInputs = inputs.slice(0, maxStrands);
    const totalWeight = visibleInputs.reduce((acc, input) => {
      const weight = ((input.amount || 0) / totalValue) * combinedWeight;
      return acc + Math.max(minWeight, weight);
    }, 0);
    
    const gap = visibleInputs.length > 1 
      ? Math.max(spacing, (height - totalWeight) / (visibleInputs.length - 1))
      : 0;
    
    let currentY = (height - totalWeight - gap * (visibleInputs.length - 1)) / 2;
    
    return visibleInputs.map((input, i): FlowLine => {
      const weight = ((input.amount || 0) / totalValue) * combinedWeight;
      const thickness = Math.max(minWeight, Math.min(combinedWeight, weight)) + 1;
      const outerY = currentY + thickness / 2;
      
      // Calculate inner Y position (where it meets the middle)
      const innerTop = (height / 2) - (combinedWeight / 2);
      const innerY = innerTop + (i / Math.max(1, visibleInputs.length - 1)) * combinedWeight;
      
      currentY += thickness + gap;
      
      const color = input.type === 'forfeit' ? colors.secondary : colors.primary;
      
      return {
        ...input,
        thickness,
        outerY,
        innerY: visibleInputs.length === 1 ? height / 2 : innerY,
        color,
        path: makePath('in', outerY, visibleInputs.length === 1 ? height / 2 : innerY, thickness, width, midWidth, connectorWidth),
        markerPath: makeMarkerPath('in', outerY, thickness, connectorWidth),
        connectorPath: makeConnectorPath('in', outerY, thickness, connectorWidth),
      };
    });
  }, [inputs, totalValue, combinedWeight, height, width, midWidth, colors]);

  // Generate output lines
  const outputLines: FlowLine[] = useMemo(() => {
    // Filter out anchor outputs for visualization
    const visibleOutputs = outputs.filter(o => o.type !== 'anchor').slice(0, maxStrands);
    const totalWeight = visibleOutputs.reduce((acc, output) => {
      const weight = ((output.amount || 0) / totalValue) * combinedWeight;
      return acc + Math.max(minWeight, weight);
    }, 0);
    
    const gap = visibleOutputs.length > 1 
      ? Math.max(spacing, (height - totalWeight) / (visibleOutputs.length - 1))
      : 0;
    
    let currentY = (height - totalWeight - gap * (visibleOutputs.length - 1)) / 2;
    
    return visibleOutputs.map((output, i): FlowLine => {
      const weight = ((output.amount || 0) / totalValue) * combinedWeight;
      const thickness = Math.max(minWeight, Math.min(combinedWeight, weight)) + 1;
      const outerY = currentY + thickness / 2;
      
      // Calculate inner Y position
      const innerTop = (height / 2) - (combinedWeight / 2);
      const innerY = innerTop + (i / Math.max(1, visibleOutputs.length - 1)) * combinedWeight;
      
      currentY += thickness + gap;
      
      let color = colors.primary;
      if (output.type === 'forfeit') color = colors.secondary;
      if (output.type === 'connector') color = colors.connector;
      if (output.type === 'batch') color = colors.secondary;
      
      return {
        ...output,
        thickness,
        outerY,
        innerY: visibleOutputs.length === 1 ? height / 2 : innerY,
        color,
        path: makePath('out', outerY, visibleOutputs.length === 1 ? height / 2 : innerY, thickness, width, midWidth, connectorWidth),
        markerPath: makeMarkerPath('out', outerY, thickness, connectorWidth, width),
        connectorPath: makeConnectorPath('out', outerY, thickness, connectorWidth, width),
      };
    });
  }, [outputs, totalValue, combinedWeight, height, width, midWidth, colors]);

  // Middle bar path
  const middlePath = `M ${(width / 2) - midWidth} ${height / 2} L ${(width / 2) + midWidth} ${height / 2}`;

  return (
    <div className="relative w-full overflow-hidden">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        style={{ maxWidth: width }}
      >
        <defs>
          {/* Input arrow marker */}
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
            <path
              d="M -5 -5 L 0 0 L -5 5 L 1 5 L 1 -5 Z"
              fill={colors.primary}
              strokeWidth="0"
            />
          </marker>
          
          {/* Output arrow marker */}
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
            <path
              d="M 1 -5 L 0 -5 L -5 0 L 0 5 L 1 5 Z"
              fill={colors.primary}
              strokeWidth="0"
            />
          </marker>

          {/* Gradients for input lines */}
          <linearGradient id="input-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.primary} />
            <stop offset="100%" stopColor={colors.secondary} />
          </linearGradient>
          
          {/* Gradients for output lines */}
          <linearGradient id="output-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.secondary} />
            <stop offset="100%" stopColor={colors.primary} />
          </linearGradient>
        </defs>

        {/* Middle connection bar */}
        <path
          d={middlePath}
          stroke={colors.secondary}
          strokeWidth={combinedWeight + 0.5}
          fill="none"
        />

        {/* Input lines */}
        {inputLines.map((line, i) => (
          <g key={`input-${i}`}>
            {/* Connector (arrow head on the left) */}
            <path
              d={line.connectorPath}
              fill={line.color}
              opacity={0.8}
              className="cursor-pointer hover:opacity-100 transition-opacity"
            />
            {/* Main line */}
            <path
              d={line.path}
              stroke={line.color}
              strokeWidth={line.thickness}
              fill="none"
              markerStart="url(#input-arrow)"
              className="cursor-pointer hover:stroke-white transition-colors"
            />
          </g>
        ))}

        {/* Output lines */}
        {outputLines.map((line, i) => (
          <g key={`output-${i}`}>
            {/* Connector (arrow head on the right) */}
            <path
              d={line.connectorPath}
              fill={line.color}
              opacity={0.8}
              className="cursor-pointer hover:opacity-100 transition-opacity"
            />
            {/* Main line */}
            <path
              d={line.path}
              stroke={line.color}
              strokeWidth={line.thickness}
              fill="none"
              markerStart="url(#output-arrow)"
              className="cursor-pointer hover:stroke-white transition-colors"
            />
          </g>
        ))}
      </svg>

      {/* Input labels (positioned absolutely) */}
      <div className="absolute left-0 top-0 h-full flex flex-col justify-center pointer-events-none" style={{ width: connectorWidth + 80 }}>
        {inputLines.map((line, i) => (
          <div
            key={`input-label-${i}`}
            className="absolute left-2 transform -translate-y-1/2 pointer-events-auto"
            style={{ top: line.outerY }}
          >
            {line.txid && (
              <Link
                to={`/tx/${line.txid}`}
                className="text-xs font-mono text-arkade-purple hover:text-arkade-orange transition-colors"
              >
                {truncateHash(line.txid, 4, 4)}
              </Link>
            )}
            {line.amount !== undefined && (
              <div className="text-xs">
                <MoneyDisplay sats={line.amount} valueClassName="text-arkade-gray" unitClassName="text-arkade-gray" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Output labels (positioned absolutely) */}
      <div className="absolute right-0 top-0 h-full flex flex-col justify-center pointer-events-none" style={{ width: connectorWidth + 80 }}>
        {outputLines.map((line, i) => (
          <div
            key={`output-label-${i}`}
            className="absolute right-2 transform -translate-y-1/2 text-right pointer-events-auto"
            style={{ top: line.outerY }}
          >
            {line.linkTo && (
              <Link
                to={line.linkTo}
                className="text-xs font-mono text-arkade-purple hover:text-arkade-orange transition-colors"
              >
                {line.address ? truncateHash(line.address, 4, 4) : line.label || `Output ${i}`}
              </Link>
            )}
            {!line.linkTo && line.address && (
              <span className="text-xs font-mono text-arkade-gray">
                {truncateHash(line.address, 4, 4)}
              </span>
            )}
            {line.amount !== undefined && (
              <div className="text-xs">
                <MoneyDisplay sats={line.amount} valueClassName="text-arkade-gray" unitClassName="text-arkade-gray" />
              </div>
            )}
            {line.label && (
              <div className="text-xs text-arkade-orange font-bold uppercase">
                {line.label}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Fee display in the middle */}
      {fee !== undefined && fee > 0 && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
          <div className="text-xs text-arkade-gray uppercase">Fee</div>
          <MoneyDisplay sats={fee} valueClassName="text-xs text-arkade-orange font-bold" unitClassName="text-xs text-arkade-orange" />
        </div>
      )}
    </div>
  );
}

// Helper: Create the main curved path from outer edge to middle
function makePath(
  side: 'in' | 'out',
  outer: number,
  inner: number,
  thickness: number,
  width: number,
  midWidth: number,
  connectorWidth: number
): string {
  const start = (thickness * 0.5) + connectorWidth;
  const curveStart = start + 10;
  const end = width / 2 - (midWidth * 0.9) + 1;
  const curveEnd = end - 10;
  const midpoint = (curveStart + curveEnd) / 2;

  // Correct for svg horizontal gradient bug
  const adjustedOuter = Math.round(outer) === Math.round(inner) ? outer - 1 : outer;

  if (side === 'in') {
    return `M ${start} ${adjustedOuter} L ${curveStart} ${adjustedOuter} C ${midpoint} ${adjustedOuter}, ${midpoint} ${inner}, ${curveEnd} ${inner} L ${end} ${inner}`;
  } else {
    return `M ${width - start} ${adjustedOuter} L ${width - curveStart} ${adjustedOuter} C ${width - midpoint} ${adjustedOuter}, ${width - midpoint} ${inner}, ${width - curveEnd} ${inner} L ${width - end} ${inner}`;
  }
}

// Helper: Create the arrow marker path (invisible click target)
function makeMarkerPath(
  side: 'in' | 'out',
  y: number,
  thickness: number,
  connectorWidth: number,
  width?: number
): string {
  const halfWidth = thickness * 0.5;
  const offset = 10;
  const lineEnd = connectorWidth;

  if (side === 'in') {
    return `M ${lineEnd - offset} ${y - halfWidth} L ${halfWidth + lineEnd - offset} ${y} L ${lineEnd - offset} ${y + halfWidth} L ${thickness + lineEnd} ${y + halfWidth} L ${thickness + lineEnd} ${y - halfWidth}`;
  } else {
    const w = width || 800;
    return `M ${w - halfWidth - lineEnd + offset} ${y - halfWidth} L ${w - lineEnd + offset} ${y} L ${w - halfWidth - lineEnd + offset} ${y + halfWidth} L ${w - halfWidth - lineEnd} ${y + halfWidth} L ${w - halfWidth - lineEnd} ${y - halfWidth}`;
  }
}

// Helper: Create the connector path (arrow head shape)
function makeConnectorPath(
  side: 'in' | 'out',
  y: number,
  thickness: number,
  connectorWidth: number,
  width?: number
): string {
  const halfWidth = thickness * 0.5;
  const offset = 10;
  const lineEnd = connectorWidth;

  if (side === 'in') {
    // Arrow pointing right (input side)
    return `M ${lineEnd - offset} ${y - halfWidth} L ${halfWidth + lineEnd - offset} ${y} L ${lineEnd - offset} ${y + halfWidth} L 0 ${y + halfWidth} L 0 ${y - halfWidth} Z`;
  } else {
    // Arrow pointing left (output side)
    const w = width || 800;
    return `M ${w - halfWidth - lineEnd + offset} ${y - halfWidth} L ${w - lineEnd + offset} ${y} L ${w - halfWidth - lineEnd + offset} ${y + halfWidth} L ${w} ${y + halfWidth} L ${w} ${y - halfWidth} Z`;
  }
}
