import { useState, useMemo } from "react";

// ─── TYPES ───

interface TriangleDataPoint {
  name: string;
  speedScore: number;
  costScore: number;
  qualityScore: number;
}

interface TriangleChartProps {
  data: TriangleDataPoint[];
  width?: number;
  height?: number;
  /** Worst (highest) raw cost across all runs – shown on Kosten vertex hover */
  worstCost?: number;
  /** Worst (highest) raw latency in ms across all runs – shown on Latenz vertex hover */
  worstLatency?: number;
  /** Formatter for cost values (default: raw number) */
  formatCost?: (v: number) => string;
  /** Formatter for latency values (default: raw number + "ms") */
  formatLatency?: (v: number) => string;
}

// ─── MARKER SHAPES ───

const MARKERS: Array<{
  shape: "circle" | "square" | "diamond" | "triangle" | "cross";
  dash: string;
}> = [
  { shape: "circle", dash: "" },
  { shape: "square", dash: "" },
  { shape: "diamond", dash: "" },
  { shape: "triangle", dash: "" },
  { shape: "cross", dash: "" },
];

function MarkerShape({ shape, x, y, size = 8, filled }: { shape: string; x: number; y: number; size?: number; filled?: boolean }) {
  const fill = filled ? "currentColor" : "white";
  const stroke = "currentColor";
  const sw = 2.5;

  switch (shape) {
    case "square":
      return <rect x={x - size} y={y - size} width={size * 2} height={size * 2} fill={fill} stroke={stroke} strokeWidth={sw} />;
    case "diamond":
      return (
        <polygon
          points={`${x},${y - size * 1.2} ${x + size},${y} ${x},${y + size * 1.2} ${x - size},${y}`}
          fill={fill} stroke={stroke} strokeWidth={sw}
        />
      );
    case "triangle":
      return (
        <polygon
          points={`${x},${y - size * 1.1} ${x + size},${y + size * 0.8} ${x - size},${y + size * 0.8}`}
          fill={fill} stroke={stroke} strokeWidth={sw}
        />
      );
    case "cross": {
      const t = size * 0.4;
      return (
        <g>
          <rect x={x - t} y={y - size} width={t * 2} height={size * 2} fill={fill} stroke={stroke} strokeWidth={sw} />
          <rect x={x - size} y={y - t} width={size * 2} height={t * 2} fill={fill} stroke={stroke} strokeWidth={sw} />
        </g>
      );
    }
    default: // circle
      return <circle cx={x} cy={y} r={size} fill={fill} stroke={stroke} strokeWidth={sw} />;
  }
}

// ─── TRIANGLE CHART ───

export function TriangleChart({ data, width = 440, height = 400, worstCost, worstLatency, formatCost: fmtCost, formatLatency: fmtLatency }: TriangleChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [hoveredVertex, setHoveredVertex] = useState<"quality" | "cost" | "speed" | null>(null);

  const padding = 60;
  const labelPadding = 28;

  // Equilateral triangle vertices
  const vertices = useMemo(() => {
    const cx = width / 2;
    const triW = width - padding * 2;
    const triH = triW * (Math.sqrt(3) / 2);
    const topY = (height - triH) / 2;
    return {
      quality: { x: cx, y: topY },                           // top
      speed: { x: padding, y: topY + triH },                 // bottom-left
      cost: { x: width - padding, y: topY + triH },          // bottom-right
    };
  }, [width, height, padding]);

  // Interpolation lines for reference grid (at 25%, 50%, 75%)
  const gridLines = useMemo(() => {
    const levels = [0.25, 0.5, 0.75];
    const { quality: Q, speed: S, cost: C } = vertices;
    const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];

    for (const t of levels) {
      // Lines parallel to each edge
      // Parallel to S-C (bottom edge) → from Q-S edge to Q-C edge
      const p1 = { x: Q.x + t * (S.x - Q.x), y: Q.y + t * (S.y - Q.y) };
      const p2 = { x: Q.x + t * (C.x - Q.x), y: Q.y + t * (C.y - Q.y) };
      lines.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });

      // Parallel to Q-C (right edge) → from S-Q edge to S-C edge  
      const p3 = { x: S.x + t * (Q.x - S.x), y: S.y + t * (Q.y - S.y) };
      const p4 = { x: S.x + t * (C.x - S.x), y: S.y + t * (C.y - S.y) };
      lines.push({ x1: p3.x, y1: p3.y, x2: p4.x, y2: p4.y });

      // Parallel to Q-S (left edge) → from C-Q edge to C-S edge
      const p5 = { x: C.x + t * (Q.x - C.x), y: C.y + t * (Q.y - C.y) };
      const p6 = { x: C.x + t * (S.x - C.x), y: C.y + t * (S.y - C.y) };
      lines.push({ x1: p5.x, y1: p5.y, x2: p6.x, y2: p6.y });
    }
    return lines;
  }, [vertices]);

  // Compute point positions using barycentric coordinates
  const points = useMemo(() => {
    const { quality: Q, speed: S, cost: C } = vertices;

    return data.map((d, i) => {
      const s = Math.max(d.speedScore, 0.01);
      const c = Math.max(d.costScore, 0.01);
      const q = Math.max(d.qualityScore, 0.01);
      const total = s + c + q;
      const ns = s / total;
      const nc = c / total;
      const nq = q / total;

      const x = ns * S.x + nc * C.x + nq * Q.x;
      const y = ns * S.y + nc * C.y + nq * Q.y;

      return { ...d, x, y, ns, nc, nq, marker: MARKERS[i % MARKERS.length] };
    });
  }, [data, vertices]);

  const { quality: Q, speed: S, cost: C } = vertices;

  return (
    <div className="flex flex-col items-center w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto max-h-[380px]"
        style={{ fontFamily: "'Silkscreen', monospace" }}
      >
        {/* Grid lines */}
        {gridLines.map((l, i) => (
          <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="currentColor" strokeWidth={1} strokeOpacity={0.15} />
        ))}

        {/* Triangle outline */}
        <polygon
          points={`${Q.x},${Q.y} ${S.x},${S.y} ${C.x},${C.y}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
        />

        {/* Vertex dots with hover */}
        <circle cx={Q.x} cy={Q.y} r={8} fill="currentColor" className="cursor-pointer" onMouseEnter={() => setHoveredVertex("quality")} onMouseLeave={() => setHoveredVertex(null)} />
        <circle cx={S.x} cy={S.y} r={8} fill="currentColor" className="cursor-pointer" onMouseEnter={() => setHoveredVertex("speed")} onMouseLeave={() => setHoveredVertex(null)} />
        <circle cx={C.x} cy={C.y} r={8} fill="currentColor" className="cursor-pointer" onMouseEnter={() => setHoveredVertex("cost")} onMouseLeave={() => setHoveredVertex(null)} />

        {/* Vertex labels */}
        <text x={Q.x} y={Q.y - labelPadding} textAnchor="middle" fontSize={13} fontWeight="bold" fill="currentColor">
          QUALITÄT
        </text>
        <text x={S.x - labelPadding + 10} y={S.y + labelPadding} textAnchor="middle" fontSize={13} fontWeight="bold" fill="currentColor">
          LATENZ
        </text>
        <text x={C.x + labelPadding - 10} y={C.y + labelPadding} textAnchor="middle" fontSize={13} fontWeight="bold" fill="currentColor">
          KOSTEN
        </text>

        {/* Vertex hover tooltips */}
        {hoveredVertex === "quality" && (() => {
          const tw = 130; const th = 36;
          const tx = Q.x - tw / 2; const ty = Q.y - labelPadding - th - 4;
          return (
            <g>
              <rect x={tx} y={ty} width={tw} height={th} fill="white" stroke="currentColor" strokeWidth={2.5} />
              <text x={tx + tw / 2} y={ty + 23} textAnchor="middle" fontSize={11} fontWeight="bold" fill="currentColor">Max: 10</text>
            </g>
          );
        })()}
        {hoveredVertex === "speed" && worstLatency != null && (() => {
          const label = fmtLatency ? fmtLatency(worstLatency) : `${Math.round(worstLatency)}ms`;
          const tw = Math.max(130, label.length * 8 + 40); const th = 36;
          const tx = S.x - labelPadding + 10 - tw / 2; const ty = S.y + labelPadding + 8;
          return (
            <g>
              <rect x={tx} y={ty} width={tw} height={th} fill="white" stroke="currentColor" strokeWidth={2.5} />
              <text x={tx + tw / 2} y={ty + 23} textAnchor="middle" fontSize={11} fontWeight="bold" fill="currentColor">Schlechteste: {label}</text>
            </g>
          );
        })()}
        {hoveredVertex === "cost" && worstCost != null && (() => {
          const label = fmtCost ? fmtCost(worstCost) : String(worstCost);
          const tw = Math.max(130, label.length * 8 + 40); const th = 36;
          const tx = C.x + labelPadding - 10 - tw / 2; const ty = C.y + labelPadding + 8;
          return (
            <g>
              <rect x={tx} y={ty} width={tw} height={th} fill="white" stroke="currentColor" strokeWidth={2.5} />
              <text x={tx + tw / 2} y={ty + 23} textAnchor="middle" fontSize={11} fontWeight="bold" fill="currentColor">Schlechteste: {label}</text>
            </g>
          );
        })()}

        {/* Center crosshair */}
        <g opacity={0.2}>
          <line x1={(Q.x + S.x + C.x) / 3 - 6} y1={(Q.y + S.y + C.y) / 3} x2={(Q.x + S.x + C.x) / 3 + 6} y2={(Q.y + S.y + C.y) / 3} stroke="currentColor" strokeWidth={1.5} />
          <line x1={(Q.x + S.x + C.x) / 3} y1={(Q.y + S.y + C.y) / 3 - 6} x2={(Q.x + S.x + C.x) / 3} y2={(Q.y + S.y + C.y) / 3 + 6} stroke="currentColor" strokeWidth={1.5} />
        </g>

        {/* Data points – render non-hovered first, hovered last for z-ordering */}
        {points.map((p, i) => hoveredIdx === i ? null : (
          <g
            key={p.name}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
            className="cursor-pointer"
          >
            <MarkerShape shape={p.marker.shape} x={p.x} y={p.y} size={8} filled={false} />
            <text x={p.x} y={p.y - 14} textAnchor="middle" fontSize={10} fontWeight="bold" fill="currentColor">
              {p.name}
            </text>
          </g>
        ))}
        {hoveredIdx !== null && points[hoveredIdx] && (() => {
          const p = points[hoveredIdx];
          return (
            <g
              key={`hover-${p.name}`}
              onMouseLeave={() => setHoveredIdx(null)}
              className="cursor-pointer"
            >
              <MarkerShape shape={p.marker.shape} x={p.x} y={p.y} size={10} filled={true} />
              <text x={p.x} y={p.y - 14} textAnchor="middle" fontSize={10} fontWeight="bold" fill="currentColor">
                {p.name}
              </text>
            </g>
          );
        })()}

        {/* Tooltip on hover */}
        {hoveredIdx !== null && points[hoveredIdx] && (() => {
          const p = points[hoveredIdx];
          const tw = 170;
          const th = 62;
          let tx = p.x + 16;
          let ty = p.y - th / 2;
          // Keep tooltip inside SVG bounds
          if (tx + tw > width - 5) tx = p.x - tw - 16;
          if (ty < 5) ty = 5;
          if (ty + th > height - 5) ty = height - th - 5;

          return (
            <g>
              <rect x={tx} y={ty} width={tw} height={th} fill="white" stroke="currentColor" strokeWidth={2.5} />
              <text x={tx + 8} y={ty + 16} fontSize={11} fontWeight="bold" fill="currentColor">{p.name}</text>
              <text x={tx + 8} y={ty + 32} fontSize={10} fill="currentColor">
                Qualität: {p.qualityScore.toFixed(1)} | Latenz: {p.speedScore.toFixed(1)}
              </text>
              <text x={tx + 8} y={ty + 48} fontSize={10} fill="currentColor">
                Kosten: {p.costScore.toFixed(1)}
              </text>
            </g>
          );
        })()}
      </svg>

      {/* Legend */}
      {points.length > 0 && (
        <div className="flex flex-wrap justify-center gap-4 mt-3 px-2">
          {points.map((p) => (
            <div key={p.name} className="flex items-center gap-1.5">
              <svg width="18" height="18" viewBox="0 0 18 18">
                <MarkerShape shape={p.marker.shape} x={9} y={9} size={6} filled={false} />
              </svg>
              <span className="font-bold uppercase text-xs">{p.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TriangleChart;
