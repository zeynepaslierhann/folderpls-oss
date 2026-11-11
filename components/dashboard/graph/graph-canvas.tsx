"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/i18n-context";
import { cn } from "@/lib/utils";
import {
  GRAPH_COLORS,
  placeLabels,
  truncateLabel,
  type GraphEdge,
  type GraphNode,
  type GraphNodeType,
  type LabelSide,
  type LayoutPoint,
} from "@/lib/graph";
import { useGraphPalette } from "./use-graph-palette";

/**
 * Düğüm yarıçapı EKRAN pikseli cinsinden: görünüm kutusu az düğümde ne kadar
 * yakınlaşırsa yakınlaşsın düğümler ve yazılar aynı boyutta kalır (eskiden
 * birim cinsindendi; 6 düğümde klasörler ekranın en baskın öğesi oluyordu).
 */
const NODE_RADIUS_PX: Record<GraphNodeType, number> = {
  root: 11,
  folder: 9,
  file: 5,
  label: 7,
  cluster: 10,
};
/** Düğüm adları 12px (spec §1.6 text-xs); sayfa başlığından (16px) hep küçük. */
const LABEL_PX = 12;

interface GraphCanvasProps {
  nodes: readonly GraphNode[];
  edges: readonly GraphEdge[];
  positions: ReadonlyMap<string, LayoutPoint>;
  centerId: string | null;
  selectedId: string | null;
  onSelect: (nodeId: string, nodeType: GraphNodeType) => void;
  onFocusHere: (nodeId: string) => void;
  onExpandCluster: (groupKey: string) => void;
  reducedMotion: boolean;
}

export function GraphCanvas({
  nodes,
  edges,
  positions,
  centerId,
  selectedId,
  onSelect,
  onFocusHere,
  onExpandCluster,
  reducedMotion,
}: GraphCanvasProps) {
  const { t } = useI18n();
  const palette = useGraphPalette();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  // Only used to keep node labels a constant, readable pixel size regardless of
  // how much the viewBox zooms in/out (a handful of nodes vs. a wide neighborhood).
  // Genişlik VE yükseklik: `meet` ölçeği kısa kenar belirler (geniş ekranda
  // yükseklik); yalnız genişliğe bakınca 1440'ta yazılar 8-9 px'e düşüyordu.
  const [pixelSize, setPixelSize] = useState({ w: 900, h: 600 });

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setPixelSize((prev) => (prev.w === rect.width && prev.h === rect.height ? prev : { w: rect.width || 900, h: rect.height || 600 }));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const connectedIds = useMemo(() => {
    if (!hoveredId) return null;
    const set = new Set<string>([hoveredId]);
    for (const edge of edges) {
      if (edge.source === hoveredId) set.add(edge.target);
      if (edge.target === hoveredId) set.add(edge.source);
    }
    return set;
  }, [hoveredId, edges]);

  const box = useMemo(() => computeViewBox(positions), [positions]);
  const unitsPerPixel = Math.max((box.halfW * 2) / pixelSize.w, (box.halfH * 2) / pixelSize.h);
  const labelFontSize = LABEL_PX * unitsPerPixel;

  // Çakışan adlar: öncelik sırası odak, kök, klasör, etiket, dosya.
  const labelSides = useMemo(() => {
    const rank: Record<GraphNodeType, number> = { root: 1, folder: 2, label: 3, file: 4, cluster: 5 };
    const items = nodes
      .filter((n) => n.type !== "cluster")
      .map((n) => {
        const pos = positions.get(n.id) ?? { x: 0, y: 0 };
        const focused = n.id === centerId || n.id === selectedId;
        return {
          id: n.id,
          x: pos.x / unitsPerPixel,
          y: pos.y / unitsPerPixel,
          r: NODE_RADIUS_PX[n.type],
          text: focused ? n.name : truncateLabel(n.name),
          priority: focused ? 0 : rank[n.type],
        };
      });
    return placeLabels(items, LABEL_PX);
  }, [nodes, positions, centerId, selectedId, unitsPerPixel]);

  return (
    <svg
      ref={svgRef}
      className="w-full h-full"
      viewBox={`${box.cx - box.halfW} ${box.cy - box.halfH} ${box.halfW * 2} ${box.halfH * 2}`}
      preserveAspectRatio="xMidYMid meet"
      role="group"
      aria-label={t("graphView.title")}
    >
      <defs>
        <marker id="graph-relation-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L8,4 L0,8 Z" fill={palette.colors.edgeRelation} />
        </marker>
      </defs>

      {/* Edges first, under the nodes */}
      <g>
        {edges.map((edge) => {
          const a = positions.get(edge.source);
          const b = positions.get(edge.target);
          if (!a || !b) return null;
          const dimmed = connectedIds ? !(connectedIds.has(edge.source) && connectedIds.has(edge.target)) : false;
          return (
            <line
              key={edge.id}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={edgeColor(edge.type, palette.colors)}
              strokeWidth={(edge.type === "file-relation" ? 1.75 : 1.25) * unitsPerPixel}
              strokeDasharray={edge.type === "parent-child" ? undefined : `${4 * unitsPerPixel},${4 * unitsPerPixel}`}
              opacity={dimmed ? 0.12 : 0.7}
              markerEnd={edge.type === "file-relation" ? "url(#graph-relation-arrow)" : undefined}
            />
          );
        })}
      </g>

      {/* Nodes */}
      <g>
        {nodes.map((node) => {
          const pos = positions.get(node.id) ?? { x: 0, y: 0 };
          const dimmed = connectedIds ? !connectedIds.has(node.id) : false;
          const labelSide = labelSides.get(node.id);
          return (
            <NodeShape
              key={node.id}
              node={node}
              x={pos.x}
              y={pos.y}
              isCenter={node.id === centerId}
              isSelected={node.id === selectedId}
              dimmed={dimmed}
              reducedMotion={reducedMotion}
              label={t(`graphView.${node.type}`)}
              labelFontSize={labelFontSize}
              labelSide={labelSide === undefined ? "below" : labelSide}
              radius={NODE_RADIUS_PX[node.type] * unitsPerPixel}
              ringWidth={2 * unitsPerPixel}
              onHover={setHoveredId}
              onActivate={() => {
                if (node.type === "cluster" && node.clusterGroupKey) onExpandCluster(node.clusterGroupKey);
                else onSelect(node.id, node.type);
              }}
              onFocusHere={() => node.type !== "cluster" && onFocusHere(node.id)}
              isHovered={node.id === hoveredId}
              fill={palette.node(node.type, node.labelColor)}
              stroke={node.type === "folder" ? palette.colors.folderBorder : undefined}
            />
          );
        })}
      </g>
    </svg>
  );
}

function edgeColor(type: GraphEdge["type"], colors: Record<keyof typeof GRAPH_COLORS, string>): string {
  switch (type) {
    case "file-label":
      return colors.edgeLabel;
    case "file-relation":
      return colors.edgeRelation;
    default:
      return colors.edgeHierarchy;
  }
}

interface ViewBox {
  cx: number;
  cy: number;
  halfW: number;
  halfH: number;
}

function computeViewBox(positions: ReadonlyMap<string, LayoutPoint>): ViewBox {
  const pad = 50;
  const minHalfW = 170;
  const minHalfH = 130;
  if (positions.size === 0) return { cx: 0, cy: 0, halfW: minHalfW, halfH: minHalfH };

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of positions.values()) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return {
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    halfW: Math.max((maxX - minX) / 2 + pad, minHalfW),
    halfH: Math.max((maxY - minY) / 2 + pad, minHalfH),
  };
}

interface NodeShapeProps {
  node: GraphNode;
  x: number;
  y: number;
  isCenter: boolean;
  isSelected: boolean;
  dimmed: boolean;
  reducedMotion: boolean;
  label: string;
  labelFontSize: number;
  labelSide: LabelSide;
  radius: number;
  ringWidth: number;
  onHover: (id: string | null) => void;
  onActivate: () => void;
  onFocusHere: () => void;
  isHovered: boolean;
  fill: string;
  /** Dolgunun yanında ince kontur (klasör: --control). */
  stroke?: string;
}

function NodeShape({
  node,
  x,
  y,
  isCenter,
  isSelected,
  dimmed,
  reducedMotion,
  label,
  labelFontSize,
  labelSide,
  radius: r,
  ringWidth,
  onHover,
  onActivate,
  onFocusHere,
  isHovered,
  fill,
  stroke,
}: NodeShapeProps) {
  const isFocused = isCenter || isSelected;
  const showFullName = isFocused || isHovered;
  const displayName = showFullName ? node.name : truncateLabel(node.name);
  // Çakışma yüzünden gizlenen ad, üzerine gelinince/seçilince yine görünür.
  const side: LabelSide = labelSide ?? (showFullName ? "below" : null);

  return (
    <g
      transform={`translate(${x} ${y})`}
      className={cn("cursor-pointer outline-none", !reducedMotion && "transition-transform duration-[var(--dur-slow)] ease-panel")}
      tabIndex={0}
      role="button"
      aria-label={`${label}: ${node.name}`}
      aria-current={isCenter ? "true" : undefined}
      opacity={dimmed ? 0.2 : 1}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(node.id)}
      onBlur={() => onHover(null)}
      onClick={onActivate}
      onDoubleClick={onFocusHere}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onActivate();
        }
      }}
    >
      {node.type !== "cluster" && !showFullName && <title>{node.name}</title>}
      <NodeGlyph type={node.type} r={r} fill={fill} stroke={stroke} highlighted={isFocused} ringWidth={ringWidth} />
      {node.type === "cluster" && (
        <text
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={labelFontSize * 0.95}
          fill="#fff"
          pointerEvents="none"
        >
          {node.name}
        </text>
      )}
      {node.type !== "cluster" && side && (
        <text
          textAnchor="middle"
          y={side === "below" ? r + labelFontSize * 1.25 : -r - labelFontSize * 0.45}
          fontSize={labelFontSize}
          className="fill-fg-2"
          style={{ paintOrder: "stroke", stroke: "var(--color-background)", strokeWidth: labelFontSize * 0.28 }}
          pointerEvents="none"
        >
          {displayName}
        </text>
      )}
    </g>
  );
}

function NodeGlyph({
  type,
  r,
  fill,
  stroke,
  highlighted,
  ringWidth,
}: {
  type: GraphNodeType;
  r: number;
  fill: string;
  stroke?: string;
  highlighted: boolean;
  ringWidth: number;
}) {
  const ringProps = highlighted
    ? { stroke: "var(--color-ring)", strokeWidth: ringWidth }
    : { stroke: stroke ?? "rgba(0,0,0,0.18)", strokeWidth: ringWidth * 0.5 };

  switch (type) {
    case "root":
      return <rect x={-r * 0.75} y={-r * 0.75} width={r * 1.5} height={r * 1.5} rx={r * 0.2} fill={fill} transform="rotate(45)" {...ringProps} />;
    case "folder":
      return <rect x={-r} y={-r * 0.72} width={r * 2} height={r * 1.44} rx={r * 0.25} fill={fill} {...ringProps} />;
    case "label":
      return <polygon points={hexPoints(r)} fill={fill} {...ringProps} />;
    case "cluster":
      return <circle r={r} fill={fill} strokeDasharray="3,3" {...ringProps} />;
    case "file":
    default:
      return <circle r={r} fill={fill} {...ringProps} />;
  }
}

function hexPoints(r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    return `${(r * Math.cos(angle)).toFixed(2)},${(r * Math.sin(angle)).toFixed(2)}`;
  }).join(" ");
}
