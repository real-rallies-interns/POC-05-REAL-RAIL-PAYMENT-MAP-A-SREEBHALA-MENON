"use client";

/**
 * RelationalStage.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Real Rails PoC #05 — Group 2: Relational Archetype
 * Replaces the Geographic Leaflet map with a D3 force-directed network graph
 * showing how money/data hops between RTP schemes, regions, and operators.
 *
 * PRESERVED: All props contract identical to MapView (schemes, selected, onSelect)
 * ADDED:     D3 force simulation, node/link rendering, zoom/pan, hover tooltips,
 *            region cluster hulls, interoperability edge drawing
 * DNA:       #030712 bg, cyan/indigo accent, glassmorphism overlays
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef, useCallback } from "react";
import type { RTPScheme } from "@/types";
import { MATURITY_COLOR } from "@/lib/api";

// ─── D3 node / link types ────────────────────────────────────────────────────

interface SchemeNode {
  id: string;               // country_code
  label: string;            // scheme_name
  country: string;
  maturity: string;
  region: string;
  status: string;
  operator: string;
  launch_year: number | null;
  p2p: boolean;
  p2b: boolean;
  b2b: boolean;
  interoperability?: string;
  description?: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
  _scheme: RTPScheme;
}

interface SchemeLink {
  source: string | SchemeNode;
  target: string | SchemeNode;
  type: "interop" | "regional" | "standard";
  label?: string;
}

// ─── Interoperability edges drawn from known linkages ──────────────────────
const KNOWN_INTEROP_EDGES: [string, string, string][] = [
  ["IN",  "SG",  "UPI ↔ PayNow"],
  ["IN",  "AE",  "UPI ↔ Aani"],
  ["IN",  "MY",  "UPI ↔ DuitNow"],
  ["SG",  "MY",  "PayNow ↔ DuitNow"],
  ["SG",  "TH",  "PayNow ↔ PromptPay"],
  ["MY",  "TH",  "DuitNow ↔ PromptPay"],
  ["MY",  "ID",  "DuitNow ↔ BI-FAST"],
  ["TH",  "ID",  "PromptPay ↔ BI-FAST"],
  ["KE",  "TZ",  "M-PESA ↔ TIPS"],
  ["KE",  "RW",  "M-PESA ↔ RwandaRapide"],
  ["EU",  "DE",  "SCT Inst → Bundesbank TIPS"],
  ["EU",  "FR",  "SCT Inst → STET"],
  ["EU",  "ES",  "SCT Inst → Bizum"],
  ["EU",  "NL",  "SCT Inst → iDEAL"],
  ["EU",  "PL",  "SCT Inst → Express Elixir"],
  ["NO",  "SE",  "Vipps ↔ Swish (Nordic)"],
  ["US",  "MX",  "FedNow ↔ SPEI (pilot)"],
  ["BR",  "AR",  "Pix ↔ Transferencias 3.0 (pilot)"],
  ["SA",  "AE",  "SARIE ↔ Aani (GCC Buna)"],
];

// Region cluster centres (normalised, scaled during render)
const REGION_CENTERS: Record<string, [number, number]> = {
  "Asia-Pacific":  [0.75, 0.45],
  "Europe":        [0.35, 0.28],
  "North America": [0.12, 0.38],
  "Latin America": [0.22, 0.70],
  "Africa":        [0.45, 0.65],
  "Middle East":   [0.58, 0.42],
};

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  schemes: RTPScheme[];
  selected: RTPScheme | null;
  onSelect: (s: RTPScheme) => void;
}

export default function RelationalStage({ schemes, selected, onSelect }: Props) {
  const svgRef   = useRef<SVGSVGElement>(null);
  const simRef   = useRef<any>(null);
  const d3Ref    = useRef<typeof import("d3") | null>(null);

  // ── Build graph data from schemes ─────────────────────────────────────────
  const buildGraph = useCallback(
    (d3: typeof import("d3"), width: number, height: number) => {
      const nodes: SchemeNode[] = schemes.map((s) => ({
        id:             s.country_code,
        label:          s.scheme_name,
        country:        s.country_name,
        maturity:       s.maturity,
        region:         s.region,
        status:         s.status,
        operator:       s.operator,
        launch_year:    s.launch_year,
        p2p:            s.p2p,
        p2b:            s.p2b,
        b2b:            s.b2b,
        interoperability: s.interoperability,
        description:    s.description,
        _scheme:        s,
      }));

      const nodeIds = new Set(nodes.map((n) => n.id));

      // Interop edges from known table
      const links: SchemeLink[] = KNOWN_INTEROP_EDGES
        .filter(([a, b]) => nodeIds.has(a) && nodeIds.has(b))
        .map(([a, b, lbl]) => ({ source: a, target: b, type: "interop" as const, label: lbl }));

      // Regional cluster edges — lightweight same-region links
      const byRegion: Record<string, string[]> = {};
      nodes.forEach((n) => {
        if (!byRegion[n.region]) byRegion[n.region] = [];
        byRegion[n.region].push(n.id);
      });
      Object.values(byRegion).forEach((ids) => {
        // Link each node to the "heaviest" (first = Pioneer/most mature) in region
        const anchor = ids[0];
        ids.slice(1).forEach((id) => {
          // Only add if not already an interop edge
          const exists = links.some(
            (l) =>
              (l.source === anchor && l.target === id) ||
              (l.source === id && l.target === anchor)
          );
          if (!exists) {
            links.push({ source: anchor, target: id, type: "regional" });
          }
        });
      });

      return { nodes, links };
    },
    [schemes]
  );

  // ── Main D3 render ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!svgRef.current || !schemes.length) return;

    let cancelled = false;

    import("d3").then((d3) => {
      if (cancelled || !svgRef.current) return;
      d3Ref.current = d3;

      const container = svgRef.current.parentElement!;
      const width     = container.clientWidth  || 900;
      const totalH    = container.clientHeight || 600;
      const height    = totalH - 140; // reserve 140px for TimelineBar at bottom

      // ── Clear previous ──────────────────────────────────────────────────
      d3.select(svgRef.current).selectAll("*").remove();

      const svg = d3
        .select(svgRef.current)
        .attr("width",  width)
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("background", "#030712")
        .style("display", "block"); // prevent inline baseline gap

      // ── Defs: glow filters + arrow markers ──────────────────────────────
      const defs = svg.append("defs");

      // Cyan glow filter
      const glowCyan = defs.append("filter").attr("id", "glow-cyan").attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
      glowCyan.append("feGaussianBlur").attr("stdDeviation", "3").attr("result", "blur");
      const mergeCyan = glowCyan.append("feMerge");
      mergeCyan.append("feMergeNode").attr("in", "blur");
      mergeCyan.append("feMergeNode").attr("in", "SourceGraphic");

      // Indigo glow
      const glowInd = defs.append("filter").attr("id", "glow-indigo").attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
      glowInd.append("feGaussianBlur").attr("stdDeviation", "2.5").attr("result", "blur");
      const mergeInd = glowInd.append("feMerge");
      mergeInd.append("feMergeNode").attr("in", "blur");
      mergeInd.append("feMergeNode").attr("in", "SourceGraphic");

      // Arrow marker for interop edges
      defs.append("marker")
        .attr("id", "arrow-interop")
        .attr("viewBox", "0 -4 8 8")
        .attr("refX", 20)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-4L8,0L0,4")
        .attr("fill", "rgba(56,189,248,0.6)");

      defs.append("marker")
        .attr("id", "arrow-regional")
        .attr("viewBox", "0 -4 8 8")
        .attr("refX", 20)
        .attr("refY", 0)
        .attr("markerWidth", 4)
        .attr("markerHeight", 4)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-4L8,0L0,4")
        .attr("fill", "rgba(31,41,55,0.8)");

      // ── Zoom layer ───────────────────────────────────────────────────────
      const g = svg.append("g").attr("class", "zoom-layer");
      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.3, 4])
        .on("zoom", (event) => g.attr("transform", event.transform));
      svg.call(zoom);

      // Reset zoom button target
      (svgRef.current as any).__resetZoom = () =>
        svg.transition().duration(600).call(zoom.transform, d3.zoomIdentity);

      // ── Build graph ──────────────────────────────────────────────────────
      const { nodes, links } = buildGraph(d3, width, height);

      // Seed positions from region cluster centers
      nodes.forEach((n) => {
        const center = REGION_CENTERS[n.region] || [0.5, 0.5];
        n.x = center[0] * width  + (Math.random() - 0.5) * 80;
        n.y = center[1] * height + (Math.random() - 0.5) * 80;
      });

      // ── Force simulation ─────────────────────────────────────────────────
      if (simRef.current) simRef.current.stop();

      const sim = d3.forceSimulation<SchemeNode>(nodes)
        .force("link", d3.forceLink<SchemeNode, SchemeLink>(links)
          .id((d) => d.id)
          .distance((l) => l.type === "interop" ? 160 : 90)
          .strength((l) => l.type === "interop" ? 0.4 : 0.15))
        .force("charge",  d3.forceManyBody().strength(-280))
        .force("center",  d3.forceCenter(width / 2, height / 2).strength(0.04))
        .force("collide", d3.forceCollide<SchemeNode>(48))
        // Region cluster attraction
        .force("cluster", () => {
          nodes.forEach((n) => {
            const center = REGION_CENTERS[n.region];
            if (!center) return;
            const cx = center[0] * width;
            const cy = center[1] * height;
            const dx = cx - (n.x ?? 0);
            const dy = cy - (n.y ?? 0);
            n.vx = (n.vx ?? 0) + dx * 0.008;
            n.vy = (n.vy ?? 0) + dy * 0.008;
          });
        })
        .alphaDecay(0.025);

      simRef.current = sim;

      // ── Region label backgrounds ─────────────────────────────────────────
      const regionLabelGroup = g.append("g").attr("class", "region-labels");
      const regions = Array.from(new Set(nodes.map((n) => n.region)));
      regions.forEach((region) => {
        const center = REGION_CENTERS[region];
        if (!center) return;
        const cx = center[0] * width;
        const cy = center[1] * height - 95; // pushed further above cluster
        regionLabelGroup.append("text")
          .attr("x", cx).attr("y", cy)
          .attr("text-anchor", "middle")
          .attr("font-size", "9.5px")
          .attr("font-family", "Inter, sans-serif")
          .attr("letter-spacing", "0.15em")
          .attr("fill", "rgba(107,114,128,0.35)")
          .attr("font-weight", "600")
          .attr("pointer-events", "none")
          .text(region.toUpperCase());
      });

      // ── Links ────────────────────────────────────────────────────────────
      const linkGroup = g.append("g").attr("class", "links");
      const linkEls = linkGroup
        .selectAll("line")
        .data(links)
        .join("line")
        .attr("stroke", (d) =>
          d.type === "interop" ? "rgba(56,189,248,0.35)" : "rgba(31,41,55,0.6)"
        )
        .attr("stroke-width",  (d) => d.type === "interop" ? 1.5 : 0.75)
        .attr("stroke-dasharray", (d) => d.type === "interop" ? "none" : "3 4")
        .attr("marker-end", (d) =>
          d.type === "interop" ? "url(#arrow-interop)" : "url(#arrow-regional)"
        );

      // ── Edge labels (interop only) ───────────────────────────────────────
      const edgeLabelGroup = g.append("g").attr("class", "edge-labels").attr("pointer-events", "none");
      const edgeLabels = edgeLabelGroup
        .selectAll("text")
        .data(links.filter((l) => l.type === "interop" && l.label))
        .join("text")
        .attr("font-size", "8px")
        .attr("font-family", "JetBrains Mono, monospace")
        .attr("fill", "rgba(56,189,248,0.5)")
        .attr("text-anchor", "middle")
        .attr("opacity", 0)   // hidden by default — shown on node hover
        .text((d) => d.label || "");

      // ── Node groups ──────────────────────────────────────────────────────
      const nodeGroup = g.append("g").attr("class", "nodes");

      const nodeEls = nodeGroup
        .selectAll<SVGGElement, SchemeNode>("g")
        .data(nodes, (d) => d.id)
        .join("g")
        .attr("class", "node")
        .attr("cursor", "pointer")
        .call(
          d3.drag<SVGGElement, SchemeNode>()
            .on("start", (event, d) => {
              if (!event.active) sim.alphaTarget(0.3).restart();
              d.fx = d.x; d.fy = d.y;
            })
            .on("drag", (event, d) => { d.fx = event.x; d.fy = event.y; })
            .on("end", (event, d) => {
              if (!event.active) sim.alphaTarget(0);
              d.fx = null; d.fy = null;
            })
        )
        .on("click", (event, d) => {
          event.stopPropagation();
          onSelect(d._scheme);
        });

      // Outer pulse ring (for Pioneer nodes)
      nodeEls
        .filter((d) => d.maturity === "Pioneer")
        .append("circle")
        .attr("class", "pulse-outer")
        .attr("r", 18)
        .attr("fill", "none")
        .attr("stroke", (d) => MATURITY_COLOR[d.maturity] || "#38BDF8")
        .attr("stroke-width", 1)
        .attr("opacity", 0.3)
        .append("animate")
          .attr("attributeName", "r")
          .attr("from", "14")
          .attr("to", "22")
          .attr("dur", "2s")
          .attr("repeatCount", "indefinite");

      // Main circle
      nodeEls
        .append("circle")
        .attr("class", "node-circle")
        .attr("r", (d) => {
          if (d.maturity === "Pioneer") return 13;
          if (d.maturity === "Growing") return 10;
          return 8;
        })
        .attr("fill", (d) => {
          const col = MATURITY_COLOR[d.maturity] || "#6B7280";
          return col + "22"; // translucent fill
        })
        .attr("stroke", (d) => MATURITY_COLOR[d.maturity] || "#6B7280")
        .attr("stroke-width", (d) => (d.maturity === "Pioneer" ? 2 : 1.5))
        .attr("filter", (d) =>
          d.maturity === "Pioneer" ? "url(#glow-cyan)" : "none"
        );

      // Inner dot
      nodeEls
        .append("circle")
        .attr("r", (d) => (d.maturity === "Pioneer" ? 4 : 3))
        .attr("fill", (d) => MATURITY_COLOR[d.maturity] || "#6B7280")
        .attr("opacity", 0.9);

      // Scheme name label — only visible for Pioneer by default
      nodeEls
        .append("text")
        .attr("class", "node-label")
        .attr("dy", (d) => (d.maturity === "Pioneer" ? 26 : 22))
        .attr("text-anchor", "middle")
        .attr("font-size", "9px")
        .attr("font-family", "JetBrains Mono, monospace")
        .attr("fill", (d) => MATURITY_COLOR[d.maturity] || "#6B7280")
        .attr("font-weight", "500")
        .attr("opacity", (d) => (d.maturity === "Pioneer" ? 1 : 0))
        .text((d) => {
          // Truncate long names to avoid overlap
          const name = d.label;
          return name.length > 14 ? name.slice(0, 13) + "…" : name;
        });

      // Country code — only for Pioneer
      nodeEls
        .append("text")
        .attr("class", "node-country")
        .attr("dy", (d) => (d.maturity === "Pioneer" ? 36 : 31))
        .attr("text-anchor", "middle")
        .attr("font-size", "7.5px")
        .attr("font-family", "Inter, sans-serif")
        .attr("fill", "rgba(148,163,184,0.55)")
        .attr("opacity", (d) => (d.maturity === "Pioneer" ? 1 : 0))
        .text((d) => d.id);

      // ── Hover tooltip ────────────────────────────────────────────────────
      const tooltip = d3.select("body")
        .selectAll(".rr-d3-tooltip")
        .data([null])
        .join("div")
        .attr("class", "rr-d3-tooltip")
        .style("position", "fixed")
        .style("pointer-events", "none")
        .style("background", "rgba(11,17,23,0.97)")
        .style("border", "1px solid #1F2937")
        .style("border-radius", "8px")
        .style("padding", "10px 14px")
        .style("font-family", "Inter, sans-serif")
        .style("font-size", "12px")
        .style("color", "#E2E8F0")
        .style("box-shadow", "0 4px 24px rgba(0,0,0,0.6)")
        .style("opacity", "0")
        .style("transition", "opacity 0.15s ease")
        .style("z-index", "9999")
        .style("max-width", "220px")
        .style("line-height", "1.5");

      nodeEls
        .on("mouseenter", (event, d) => {
          const color = MATURITY_COLOR[d.maturity] || "#6B7280";

          // Show label for non-Pioneer nodes on hover
          d3.select(event.currentTarget as SVGGElement)
            .selectAll(".node-label, .node-country")
            .attr("opacity", 1);

          tooltip
            .html(`
              <div style="color:${color};font-size:11px;font-weight:600;margin-bottom:4px;letter-spacing:0.05em">
                ${d.label}
              </div>
              <div style="color:#94A3B8;font-size:10px;margin-bottom:6px">${d.country}</div>
              <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">
                <span style="color:${color};background:${color}18;border:1px solid ${color}30;border-radius:4px;padding:1px 6px;font-size:10px">${d.maturity}</span>
                <span style="color:${d.status === "Live" ? "#34D399" : "#FBBF24"};background:${d.status === "Live" ? "#34D39918" : "#FBBF2418"};border:1px solid ${d.status === "Live" ? "#34D39930" : "#FBBF2430"};border-radius:4px;padding:1px 6px;font-size:10px">${d.status}</span>
              </div>
              ${d.description ? `<div style="color:#94A3B8;font-size:10px;line-height:1.5">${d.description.slice(0, 100)}…</div>` : ""}
            `)
            .style("opacity", "1")
            .style("left", `${event.clientX + 14}px`)
            .style("top",  `${event.clientY - 10}px`);

          // Highlight connected links
          linkEls
            .attr("stroke", (l) => {
              const src = (l.source as SchemeNode).id;
              const tgt = (l.target as SchemeNode).id;
              if (src === d.id || tgt === d.id) return "rgba(56,189,248,0.9)";
              return l.type === "interop" ? "rgba(56,189,248,0.08)" : "rgba(31,41,55,0.15)";
            })
            .attr("stroke-width", (l) => {
              const src = (l.source as SchemeNode).id;
              const tgt = (l.target as SchemeNode).id;
              return src === d.id || tgt === d.id ? 2 : (l.type === "interop" ? 1 : 0.5);
            });

          // Show edge labels for this node's interop connections only
          edgeLabels.attr("opacity", (l) => {
            const src = (l.source as SchemeNode).id;
            const tgt = (l.target as SchemeNode).id;
            return (src === d.id || tgt === d.id) ? 1 : 0;
          });
        })
        .on("mousemove", (event) => {
          tooltip
            .style("left", `${event.clientX + 14}px`)
            .style("top",  `${event.clientY - 10}px`);
        })
        .on("mouseleave", (event, d) => {
          tooltip.style("opacity", "0");

          // Hide labels again for non-Pioneer nodes
          if (d.maturity !== "Pioneer") {
            d3.select(event.currentTarget as SVGGElement)
              .selectAll(".node-label, .node-country")
              .attr("opacity", 0);
          }

          // Restore link styles
          linkEls
            .attr("stroke", (l) =>
              l.type === "interop" ? "rgba(56,189,248,0.35)" : "rgba(31,41,55,0.6)"
            )
            .attr("stroke-width", (l) => (l.type === "interop" ? 1.5 : 0.75));

          // Hide all edge labels again
          edgeLabels.attr("opacity", 0);
        });

      // Deselect on svg background click
      svg.on("click", () => {
        // no-op — let Dashboard handle clearing via onClose
      });

      // ── Tick ─────────────────────────────────────────────────────────────
      sim.on("tick", () => {
        linkEls
          .attr("x1", (d) => (d.source as SchemeNode).x ?? 0)
          .attr("y1", (d) => (d.source as SchemeNode).y ?? 0)
          .attr("x2", (d) => (d.target as SchemeNode).x ?? 0)
          .attr("y2", (d) => (d.target as SchemeNode).y ?? 0);

        edgeLabels
          .attr("x", (d) => {
            const s = d.source as SchemeNode;
            const t = d.target as SchemeNode;
            return ((s.x ?? 0) + (t.x ?? 0)) / 2;
          })
          .attr("y", (d) => {
            const s = d.source as SchemeNode;
            const t = d.target as SchemeNode;
            return ((s.y ?? 0) + (t.y ?? 0)) / 2 - 4;
          });

        nodeEls.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
      });

      // ── Highlight selected node ──────────────────────────────────────────
      if (selected) {
        nodeEls.selectAll<SVGCircleElement, SchemeNode>(".node-circle")
          .attr("stroke-width", (d) =>
            d.id === selected.country_code ? 3 : (d.maturity === "Pioneer" ? 2 : 1.5)
          )
          .attr("stroke", (d) =>
            d.id === selected.country_code ? "#38BDF8" : (MATURITY_COLOR[d.maturity] || "#6B7280")
          )
          .attr("filter", (d) =>
            d.id === selected.country_code ? "url(#glow-cyan)" : (d.maturity === "Pioneer" ? "url(#glow-cyan)" : "none")
          );
      }
    });

    return () => {
      cancelled = true;
      if (simRef.current) { simRef.current.stop(); }
      // Clean up tooltip
      if (typeof document !== "undefined") {
        document.querySelectorAll(".rr-d3-tooltip").forEach((el) => el.remove());
      }
    };
  }, [schemes, buildGraph]); // Re-render when schemes change (filter updates)

  // ── Highlight selected without full re-render ─────────────────────────────
  useEffect(() => {
    if (!svgRef.current || !d3Ref.current) return;
    const d3 = d3Ref.current;
    d3.select(svgRef.current)
      .selectAll<SVGCircleElement, SchemeNode>(".node-circle")
      .attr("stroke-width", (d) =>
        d.id === selected?.country_code ? 3 : (d.maturity === "Pioneer" ? 2 : 1.5)
      )
      .attr("stroke", (d) =>
        d.id === selected?.country_code
          ? "#38BDF8"
          : (MATURITY_COLOR[d.maturity] || "#6B7280")
      )
      .attr("filter", (d) =>
        d.id === selected?.country_code
          ? "url(#glow-cyan)"
          : (d.maturity === "Pioneer" ? "url(#glow-cyan)" : "none")
      );
  }, [selected]);

  const handleResetZoom = () => {
    if (svgRef.current && (svgRef.current as any).__resetZoom) {
      (svgRef.current as any).__resetZoom();
    }
  };

  return (
    <div className="relative w-full h-full bg-rr-black overflow-hidden">
      {/* D3 SVG canvas */}
      <svg ref={svgRef} className="w-full h-full" />

      {/* ── Overlay: graph type label + node count in one row ── */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <div className="glass-card px-3 py-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-rr-cyan animate-pulse flex-none" />
          <span className="text-[11px] font-mono text-rr-cyan">RELATIONAL</span>
          <span className="text-[11px] text-rr-muted hidden sm:inline">Payment Flow Network</span>
        </div>
        <div className="glass-card px-3 py-2">
          <span className="text-[11px] font-mono text-rr-cyan">{schemes.length}</span>
          <span className="text-[11px] text-rr-muted ml-1">nodes</span>
        </div>
      </div>

      {/* ── Legend — sits above the TimelineBar ── */}
      <div className="absolute left-4 z-10 glass-card px-3 py-2" style={{ bottom: "155px" }}>
        <div className="flex items-center gap-4">
          {/* Maturity */}
          <div className="flex items-center gap-3">
            {Object.entries({ Pioneer: "#38BDF8", Growing: "#818CF8", Emerging: "#34D399" }).map(
              ([label, color]) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full flex-none"
                    style={{ background: color, boxShadow: `0 0 5px ${color}60` }}
                  />
                  <span className="text-[10px] text-rr-dim">{label}</span>
                </div>
              )
            )}
          </div>
          {/* Divider */}
          <span className="w-px h-3 bg-rr-border" />
          {/* Edge types */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="h-px w-4 flex-none" style={{ background: "rgba(56,189,248,0.7)" }} />
              <span className="text-[10px] text-rr-dim">Interop</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="h-px w-4 flex-none"
                style={{ borderTop: "1px dashed rgba(100,116,139,0.5)" }}
              />
              <span className="text-[10px] text-rr-dim">Regional</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Reset zoom button — sits above timeline ── */}
      <button
        onClick={handleResetZoom}
        className="absolute right-4 z-10 glass-card px-3 py-2 text-[11px] text-rr-muted hover:text-rr-cyan transition-colors font-mono"
        style={{ bottom: "155px" }}
      >
        Reset View
      </button>

      {/* ── Interaction hint — inside the graph area, not over timeline ── */}
      <div
        className="absolute left-1/2 -translate-x-1/2 z-10 text-[10px] text-rr-muted/40 font-mono pointer-events-none"
        style={{ bottom: "158px" }}
      >
        Scroll to zoom · Drag nodes · Click to inspect
      </div>
    </div>
  );
}
