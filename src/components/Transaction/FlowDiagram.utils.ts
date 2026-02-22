// src/components/Transaction/FlowDiagram.utils.ts

export interface FlowInput {
  amount: number;
  index: number;
  label?: string;
  txid?: string;      // Previous tx that created this input
  vout?: number;      // Output index in previous tx
}

export interface FlowOutput {
  amount: number;
  index: number;
  label?: string;
  isAnchor?: boolean;
  scriptHex?: string; // Output script
  spentBy?: string;   // Txid that spent this output (if spent)
}

export interface SvgLine {
  path: string;
  thickness: number;
  type: 'input' | 'output' | 'fee';
  index: number;
  zeroValue?: boolean;
  outerY: number;  // Y position of the outer endpoint (for connectors)
}

export interface LineParams {
  weight: number;
  thickness: number;
  offset: number;
  innerY: number;
  outerY: number;
}

export const DIAGRAM_CONFIG = {
  minWeight: 2,
  maxCombinedWeight: 100,
  connectorWidth: 20,
  midWidth: 10,
  zeroValueThickness: 20,
  zeroValueWidth: 60,
  maxStrands: 24,
};

export function calculateTotalValue(
  inputs: FlowInput[],
  outputs: FlowOutput[],
  fee: number = 0
): number {
  const inputTotal = inputs.reduce((sum, inp) => sum + inp.amount, 0);
  const outputTotal = outputs.reduce((sum, out) => sum + out.amount, 0);
  return Math.max(inputTotal, outputTotal + fee);
}

export function calculateLineParams(
  xputs: Array<{ amount: number }>,
  totalValue: number,
  combinedWeight: number,
  height: number
): LineParams[] {
  const config = DIAGRAM_CONFIG;
  
  const weights = xputs.map((put) => 
    totalValue > 0 
      ? combinedWeight * (put.amount / totalValue)
      : combinedWeight / xputs.length
  );
  
  const lineParams: LineParams[] = weights.map((w, i) => ({
    weight: w,
    thickness: xputs[i].amount === 0 
      ? config.zeroValueThickness 
      : Math.min(combinedWeight + 0.5, Math.max(config.minWeight - 1, w) + 1),
    offset: 0,
    innerY: 0,
    outerY: 0,
  }));
  
  const visibleStrands = Math.min(config.maxStrands, xputs.length);
  const visibleWeight = lineParams.slice(0, visibleStrands).reduce((acc, v) => v.thickness + acc, 0);
  const gaps = Math.max(1, visibleStrands - 1);
  
  const innerTop = (height / 2) - (combinedWeight / 2);
  const innerBottom = innerTop + combinedWeight + 0.5;
  const spacing = Math.max(4, (height - visibleWeight) / gaps);
  
  let lastOuter = 0;
  let lastInner = innerTop;
  let offset = 0;
  let minOffset = 0;
  let maxOffset = 0;
  let lastWeight = 0;
  
  lineParams.forEach((line, i) => {
    if (xputs[i].amount === 0) {
      line.outerY = lastOuter + (config.zeroValueThickness / 2);
      if (xputs.length === 1) {
        line.outerY = height / 2;
      }
      lastOuter += config.zeroValueThickness + spacing;
      return;
    }
    
    line.outerY = lastOuter + (line.thickness / 2);
    line.innerY = Math.min(
      innerBottom - (line.thickness / 2),
      Math.max(innerTop + (line.thickness / 2), lastInner + (line.weight / 2))
    );
    
    if (xputs.length === 1) {
      line.outerY = height / 2;
    }
    
    lastOuter += line.thickness + spacing;
    lastInner += line.weight;
    
    const w = 200;
    const y1 = line.outerY;
    const y2 = line.innerY;
    const t = (lastWeight + line.weight) / 2;
    
    const dx = 0.75 * w;
    const dy = 1.5 * (y2 - y1);
    const a = Math.atan2(dy, dx);
    
    if (Math.sin(a) !== 0) {
      offset += Math.max(Math.min(t * (1 - Math.cos(a)) / Math.sin(a), t), -t);
    }
    
    line.offset = offset;
    minOffset = Math.min(minOffset, offset);
    maxOffset = Math.max(maxOffset, offset);
    lastWeight = line.weight;
  });
  
  lineParams.forEach((line) => {
    line.offset -= minOffset;
  });
  
  return lineParams;
}

export function makePath(
  side: 'in' | 'out',
  outer: number,
  inner: number,
  weight: number,
  offset: number,
  pad: number,
  width: number,
  midWidth: number,
  connectorWidth: number
): string {
  const start = (weight * 0.5) + connectorWidth;
  const curveStart = Math.max(start + 5, pad + connectorWidth - offset);
  const end = width / 2 - (midWidth * 0.9) + 1;
  const curveEnd = end - offset - 10;
  const midpoint = (curveStart + curveEnd) / 2;
  
  let adjustedOuter = outer;
  if (Math.round(outer) === Math.round(inner)) {
    adjustedOuter = outer - 1;
  }
  
  if (side === 'in') {
    return `M ${start} ${adjustedOuter} L ${curveStart} ${adjustedOuter} C ${midpoint} ${adjustedOuter}, ${midpoint} ${inner}, ${curveEnd} ${inner} L ${end} ${inner}`;
  } else {
    return `M ${width - start} ${adjustedOuter} L ${width - curveStart} ${adjustedOuter} C ${width - midpoint} ${adjustedOuter}, ${width - midpoint} ${inner}, ${width - curveEnd} ${inner} L ${width - end} ${inner}`;
  }
}

export function makeZeroValuePath(
  side: 'in' | 'out',
  y: number,
  width: number,
  connectorWidth: number,
  zeroValueWidth: number,
  zeroValueThickness: number
): string {
  const offset = zeroValueThickness / 2;
  const start = (connectorWidth / 2) + 10;
  
  if (side === 'in') {
    return `M ${start + offset} ${y} L ${start + zeroValueWidth + offset} ${y}`;
  } else {
    return `M ${width - start - offset} ${y} L ${width - start - zeroValueWidth - offset} ${y}`;
  }
}

export function generateInputLines(
  inputs: FlowInput[],
  totalValue: number,
  combinedWeight: number,
  width: number,
  height: number
): SvgLine[] {
  const config = DIAGRAM_CONFIG;
  const lineParams = calculateLineParams(inputs, totalValue, combinedWeight, height);
  
  let maxOffset = 0;
  let pad = 0;
  lineParams.forEach((line) => {
    maxOffset = Math.max(maxOffset, line.offset);
    pad = Math.max(pad, line.thickness / 2);
  });
  
  return lineParams.map((line, i) => {
    if (inputs[i].amount === 0) {
      return {
        path: makeZeroValuePath('in', line.outerY, width, config.connectorWidth, config.zeroValueWidth, config.zeroValueThickness),
        thickness: config.zeroValueThickness,
        type: 'input' as const,
        index: inputs[i].index,
        zeroValue: true,
        outerY: line.outerY,
      };
    }
    
    return {
      path: makePath('in', line.outerY, line.innerY, line.thickness, line.offset, pad + maxOffset, width, config.midWidth, config.connectorWidth),
      thickness: line.thickness,
      type: 'input' as const,
      index: inputs[i].index,
      outerY: line.outerY,
    };
  });
}

export function generateOutputLines(
  outputs: FlowOutput[],
  totalValue: number,
  combinedWeight: number,
  width: number,
  height: number
): SvgLine[] {
  const config = DIAGRAM_CONFIG;
  const lineParams = calculateLineParams(outputs, totalValue, combinedWeight, height);
  
  let maxOffset = 0;
  let pad = 0;
  lineParams.forEach((line) => {
    maxOffset = Math.max(maxOffset, line.offset);
    pad = Math.max(pad, line.thickness / 2);
  });
  
  return lineParams.map((line, i) => {
    if (outputs[i].amount === 0) {
      return {
        path: makeZeroValuePath('out', line.outerY, width, config.connectorWidth, config.zeroValueWidth, config.zeroValueThickness),
        thickness: config.zeroValueThickness,
        type: 'output' as const,
        index: outputs[i].index,
        zeroValue: true,
        outerY: line.outerY,
      };
    }
    
    return {
      path: makePath('out', line.outerY, line.innerY, line.thickness, line.offset, pad + maxOffset, width, config.midWidth, config.connectorWidth),
      thickness: line.thickness,
      type: 'output' as const,
      index: outputs[i].index,
      outerY: line.outerY,
    };
  });
}
