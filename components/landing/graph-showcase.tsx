"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n/i18n-context";
import { useTheme } from "next-themes";
import { easeOutCubic, segment } from "@/lib/motion/tokens";

/* ─── Types ───────────────────────────────────────────────────────────────── */
interface MockNode {
    id: string;
    label: string;
    type: "root" | "folder" | "file" | "label";
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    radius: number;
    /** Per-label unique color key */
    colorKey?: string;
    pulsePhase: number;
    appearAt: number;
    /** 0..1, derived from scroll progress every frame. */
    alpha: number;
}
interface MockLink {
    source: string;
    target: string;
    type: "parent-child" | "file-label" | "file-relation";
    /** Color key for label links — matches the label's colorKey */
    colorKey?: string;
}

/* ─── Palette ─────────────────────────────────────────────────────────────── */
const PALETTE = {
    light: {
        root: "#FFE500",
        folder: "#9BB3D0",
        file: "#64748b",
        link: "rgba(0,0,0,0.10)",
        text: "#1a1a1a",
        textMuted: "#71717a",
    },
    dark: {
        root: "#FFE500",
        folder: "#9BB3D0",
        file: "#94a3b8",
        link: "rgba(255,255,255,0.07)",
        text: "#e4e4e7",
        textMuted: "#a1a1aa",
    },
};

/** Distinct colors for each label — light / dark variants */
const LABEL_COLORS_DARK: Record<string, { fill: string; stroke: string; link: string; particle: string }> = {
    approved: { fill: "#22c55e25", stroke: "#22c55e90", link: "rgba(34,197,94,", particle: "#22c55eC0" },
    draft:    { fill: "#8b5cf625", stroke: "#8b5cf690", link: "rgba(139,92,246,", particle: "#8b5cf6C0" },
    q1:       { fill: "#f59e0b25", stroke: "#f59e0b90", link: "rgba(245,158,11,", particle: "#f59e0bC0" },
    urgent:   { fill: "#f43f5e25", stroke: "#f43f5e90", link: "rgba(244,63,94,",  particle: "#f43f5eC0" },
    public:   { fill: "#06b6d425", stroke: "#06b6d490", link: "rgba(6,182,212,",  particle: "#06b6d4C0" },
};
const LABEL_COLORS_LIGHT: Record<string, { fill: string; stroke: string; link: string; particle: string }> = {
    approved: { fill: "#22c55e40", stroke: "#16a34aCC", link: "rgba(22,163,74,",  particle: "#16a34aE0" },
    draft:    { fill: "#8b5cf640", stroke: "#7c3aedCC", link: "rgba(124,58,237,", particle: "#7c3aedE0" },
    q1:       { fill: "#f59e0b40", stroke: "#d97706CC", link: "rgba(217,119,6,",  particle: "#d97706E0" },
    urgent:   { fill: "#f43f5e40", stroke: "#e11d48CC", link: "rgba(225,29,72,",  particle: "#e11d48E0" },
    public:   { fill: "#06b6d440", stroke: "#0891b2CC", link: "rgba(8,145,178,",  particle: "#0891b2E0" },
};

const NODE_FADE_DURATION = 0.6;

/* ─── Build demo data ─────────────────────────────────────────────────────── */
function buildDemoGraph(w: number, h: number, locale: string) {
    const cx = w / 2;
    const cy = h / 2;
    const isEn = locale !== "tr";

    // Scale factor so it fills nicely on different screen sizes
    const sx = w / 800;
    const sy = h / 500;
    const p = (x: number, y: number) => ({ x: cx + x * sx, y: cy + y * sy });

    let t = 0;
    const gap = 0.45;
    const next = () => { const v = t; t += gap; return v; };

    const nodes: MockNode[] = [
        // ── ROOT ──
        { id: "root", label: isEn ? "My Drive" : "Drive'ım", type: "root", x: cx, y: cy, targetX: p(0, 0).x, targetY: p(0, 0).y, radius: 28, pulsePhase: 0, appearAt: next(), alpha: 0 },

        // ── FOLDERS (5) — inner ring ──
        { id: "f-mkt",  label: "Marketing",                     type: "folder", x: cx, y: cy, targetX: p(-200, -100).x, targetY: p(-200, -100).y, radius: 20, pulsePhase: 0.4, appearAt: next(), alpha: 0 },
        { id: "f-des",  label: isEn ? "Design" : "Tasarım",     type: "folder", x: cx, y: cy, targetX: p(80, -130).x,   targetY: p(80, -130).y,   radius: 20, pulsePhase: 1.0, appearAt: next(), alpha: 0 },
        { id: "f-dev",  label: isEn ? "Development" : "Geliştirme", type: "folder", x: cx, y: cy, targetX: p(-120, 110).x,  targetY: p(-120, 110).y,  radius: 20, pulsePhase: 0.7, appearAt: next(), alpha: 0 },
        { id: "f-sal",  label: isEn ? "Sales" : "Satış",        type: "folder", x: cx, y: cy, targetX: p(220, -30).x,   targetY: p(220, -30).y,   radius: 20, pulsePhase: 1.3, appearAt: next(), alpha: 0 },
        { id: "f-hr",   label: isEn ? "HR" : "İK",              type: "folder", x: cx, y: cy, targetX: p(130, 120).x,   targetY: p(130, 120).y,   radius: 20, pulsePhase: 0.9, appearAt: next(), alpha: 0 },

        // ── FILES (15) — outer ring, near parents ──
        // Marketing files
        { id: "d-brief",  label: isEn ? "campaign-brief.pdf" : "kampanya-özet.pdf", type: "file", x: cx, y: cy, targetX: p(-310, -50).x,  targetY: p(-310, -50).y,  radius: 12, pulsePhase: 1.5, appearAt: next(), alpha: 0 },
        { id: "d-social", label: isEn ? "social-post.png" : "sosyal-paylaşım.png", type: "file", x: cx, y: cy, targetX: p(-280, -170).x, targetY: p(-280, -170).y, radius: 12, pulsePhase: 2.0, appearAt: next(), alpha: 0 },
        { id: "d-brand",  label: isEn ? "brand-guide.pdf" : "marka-kılavuzu.pdf", type: "file", x: cx, y: cy, targetX: p(-140, -190).x, targetY: p(-140, -190).y, radius: 12, pulsePhase: 0.3, appearAt: next(), alpha: 0 },

        // Design files
        { id: "d-logo",   label: "logo-v3.svg",    type: "file", x: cx, y: cy, targetX: p(30, -210).x,  targetY: p(30, -210).y,  radius: 12, pulsePhase: 1.8, appearAt: next(), alpha: 0 },
        { id: "d-mockup", label: "ui-mockup.fig",   type: "file", x: cx, y: cy, targetX: p(160, -200).x, targetY: p(160, -200).y, radius: 12, pulsePhase: 0.6, appearAt: next(), alpha: 0 },
        { id: "d-icons",  label: "icon-set.svg",    type: "file", x: cx, y: cy, targetX: p(-20, -80).x,  targetY: p(-20, -80).y,  radius: 12, pulsePhase: 2.3, appearAt: next(), alpha: 0 },

        // Development files
        { id: "d-api",    label: "api-spec.md",     type: "file", x: cx, y: cy, targetX: p(-260, 130).x,  targetY: p(-260, 130).y,  radius: 12, pulsePhase: 1.1, appearAt: next(), alpha: 0 },
        { id: "d-readme", label: "readme.md",       type: "file", x: cx, y: cy, targetX: p(-180, 190).x,  targetY: p(-180, 190).y,  radius: 12, pulsePhase: 0.2, appearAt: next(), alpha: 0 },
        { id: "d-deploy", label: "deploy.yml",      type: "file", x: cx, y: cy, targetX: p(-60, 190).x,   targetY: p(-60, 190).y,   radius: 12, pulsePhase: 1.7, appearAt: next(), alpha: 0 },

        // Sales files
        { id: "d-pitch",  label: isEn ? "pitch-deck.pptx" : "sunum.pptx", type: "file", x: cx, y: cy, targetX: p(310, -100).x, targetY: p(310, -100).y, radius: 12, pulsePhase: 0.8, appearAt: next(), alpha: 0 },
        { id: "d-price",  label: isEn ? "pricing.xlsx" : "fiyatlandırma.xlsx", type: "file", x: cx, y: cy, targetX: p(330, 20).x,   targetY: p(330, 20).y,   radius: 12, pulsePhase: 2.1, appearAt: next(), alpha: 0 },
        { id: "d-demo",   label: "demo-video.mp4",  type: "file", x: cx, y: cy, targetX: p(300, 90).x,   targetY: p(300, 90).y,   radius: 12, pulsePhase: 0.5, appearAt: next(), alpha: 0 },

        // HR files
        { id: "d-hbook",  label: isEn ? "handbook.pdf" : "el-kitabı.pdf", type: "file", x: cx, y: cy, targetX: p(60, 200).x,  targetY: p(60, 200).y,  radius: 12, pulsePhase: 1.4, appearAt: next(), alpha: 0 },
        { id: "d-onb",    label: isEn ? "onboarding.pdf" : "oryantasyon.pdf", type: "file", x: cx, y: cy, targetX: p(210, 170).x, targetY: p(210, 170).y, radius: 12, pulsePhase: 0.1, appearAt: next(), alpha: 0 },

        // ── LABELS (5) — positioned between the files they connect ──
        // Approved (green) — brand-guide, logo-v3, pitch-deck → cross-folder approval
        { id: "l-approved", label: isEn ? "Approved" : "Onaylı", type: "label", x: cx, y: cy, targetX: p(100, -100).x, targetY: p(100, -100).y, radius: 15, colorKey: "approved", pulsePhase: 0.7, appearAt: next(), alpha: 0 },
        // Draft (purple) — brief, api-spec, handbook → drafts across teams
        { id: "l-draft", label: isEn ? "Draft" : "Taslak", type: "label", x: cx, y: cy, targetX: p(-220, 40).x, targetY: p(-220, 40).y, radius: 15, colorKey: "draft", pulsePhase: 1.3, appearAt: next(), alpha: 0 },
        // Q1 (amber) — social-post, demo-video, readme → Q1 deliverables
        { id: "l-q1", label: "Q1-2026", type: "label", x: cx, y: cy, targetX: p(50, 80).x, targetY: p(50, 80).y, radius: 15, colorKey: "q1", pulsePhase: 2.2, appearAt: next(), alpha: 0 },
        // Urgent (red) — mockup, deploy → urgent items
        { id: "l-urgent", label: isEn ? "Urgent" : "Acil", type: "label", x: cx, y: cy, targetX: p(60, -10).x, targetY: p(60, -10).y, radius: 15, colorKey: "urgent", pulsePhase: 0.9, appearAt: next(), alpha: 0 },
        // Public (cyan) — brand-guide, pitch-deck, onboarding → public-facing
        { id: "l-public", label: isEn ? "Public" : "Herkese Açık", type: "label", x: cx, y: cy, targetX: p(240, 60).x, targetY: p(240, 60).y, radius: 15, colorKey: "public", pulsePhase: 1.6, appearAt: next(), alpha: 0 },
    ];

    const links: MockLink[] = [
        // ── Parent-child (hierarchy) ──
        { source: "root", target: "f-mkt", type: "parent-child" },
        { source: "root", target: "f-des", type: "parent-child" },
        { source: "root", target: "f-dev", type: "parent-child" },
        { source: "root", target: "f-sal", type: "parent-child" },
        { source: "root", target: "f-hr",  type: "parent-child" },
        // Marketing
        { source: "f-mkt", target: "d-brief",  type: "parent-child" },
        { source: "f-mkt", target: "d-social", type: "parent-child" },
        { source: "f-mkt", target: "d-brand",  type: "parent-child" },
        // Design
        { source: "f-des", target: "d-logo",   type: "parent-child" },
        { source: "f-des", target: "d-mockup", type: "parent-child" },
        { source: "f-des", target: "d-icons",  type: "parent-child" },
        // Development
        { source: "f-dev", target: "d-api",    type: "parent-child" },
        { source: "f-dev", target: "d-readme", type: "parent-child" },
        { source: "f-dev", target: "d-deploy", type: "parent-child" },
        // Sales
        { source: "f-sal", target: "d-pitch",  type: "parent-child" },
        { source: "f-sal", target: "d-price",  type: "parent-child" },
        { source: "f-sal", target: "d-demo",   type: "parent-child" },
        // HR
        { source: "f-hr", target: "d-hbook",   type: "parent-child" },
        { source: "f-hr", target: "d-onb",     type: "parent-child" },

        // ── File ↔ Label: SHARED TAGS cross folders ──
        // Approved (green): Marketing/brand-guide + Design/logo-v3 + Sales/pitch-deck
        { source: "d-brand", target: "l-approved", type: "file-label", colorKey: "approved" },
        { source: "d-logo",  target: "l-approved", type: "file-label", colorKey: "approved" },
        { source: "d-pitch", target: "l-approved", type: "file-label", colorKey: "approved" },

        // Draft (purple): Marketing/brief + Dev/api-spec + HR/handbook
        { source: "d-brief", target: "l-draft", type: "file-label", colorKey: "draft" },
        { source: "d-api",   target: "l-draft", type: "file-label", colorKey: "draft" },
        { source: "d-hbook", target: "l-draft", type: "file-label", colorKey: "draft" },

        // Q1 (amber): Marketing/social-post + Sales/demo-video + Dev/readme
        { source: "d-social", target: "l-q1", type: "file-label", colorKey: "q1" },
        { source: "d-demo",   target: "l-q1", type: "file-label", colorKey: "q1" },
        { source: "d-readme", target: "l-q1", type: "file-label", colorKey: "q1" },

        // Urgent (red): Design/mockup + Dev/deploy
        { source: "d-mockup", target: "l-urgent", type: "file-label", colorKey: "urgent" },
        { source: "d-deploy", target: "l-urgent", type: "file-label", colorKey: "urgent" },

        // Public (cyan): Marketing/brand-guide + Sales/pitch-deck + HR/onboarding
        { source: "d-brand", target: "l-public", type: "file-label", colorKey: "public" },
        { source: "d-pitch", target: "l-public", type: "file-label", colorKey: "public" },
        { source: "d-onb",   target: "l-public", type: "file-label", colorKey: "public" },

        // ── File ↔ File relations ──
        { source: "d-brand", target: "d-logo",  type: "file-relation" },
        { source: "d-pitch", target: "d-demo",  type: "file-relation" },
        { source: "d-api",   target: "d-deploy", type: "file-relation" },
    ];

    return { nodes, links };
}

/** Scroll progress (0..1) → virtual build time → per-node alpha + position. */
function layoutAtProgress(nodes: MockNode[], progress: number, w: number, h: number, time: number, drift: boolean) {
    const last = nodes.reduce((m, n) => Math.max(m, n.appearAt), 0);
    const buildTime = last + NODE_FADE_DURATION;
    const virtual = progress * buildTime;
    const cx = w / 2;
    const cy = h / 2;
    for (const node of nodes) {
        node.alpha = segment(virtual, node.appearAt, NODE_FADE_DURATION);
        const travel = easeOutCubic(node.alpha);
        node.x = cx + (node.targetX - cx) * travel;
        node.y = cy + (node.targetY - cy) * travel;
        if (drift && node.alpha >= 1) {
            node.x += Math.sin(time * 0.35 + node.pulsePhase) * 3;
            node.y += Math.cos(time * 0.25 + node.pulsePhase * 1.3) * 3;
        }
    }
}

/* ─── Canvas Painter ──────────────────────────────────────────────────────── */
function drawGraph(
    ctx: CanvasRenderingContext2D,
    nodes: MockNode[],
    links: MockLink[],
    palette: typeof PALETTE.dark,
    lc_map: typeof LABEL_COLORS_DARK,
    isDark: boolean,
    elapsed: number,
    dpr: number,
    fontFamily: string,
) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    // Light mode needs stronger opacities against bright background
    const linkLabelAlpha = isDark ? 0.45 : 0.75;
    const linkRelAlpha = isDark ? 0.3 : 0.55;
    const linkParentAlpha = isDark ? 0.16 : 0.32;
    const particleGlobalAlpha = isDark ? 0.8 : 1;
    const particleSizeMul = isDark ? 1 : 1.3;

    // ── Draw links ──
    for (const link of links) {
        const s = nodeMap.get(link.source);
        const t = nodeMap.get(link.target);
        if (!s || !t) continue;

        const la = Math.min(s.alpha, t.alpha);
        if (la <= 0) continue;

        // The edge grows from source to target as both ends settle: graph
        // nodes visibly "connect" while you scroll.
        const reach = easeOutCubic(la);
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x + (t.x - s.x) * reach, s.y + (t.y - s.y) * reach);

        if (link.type === "file-label" && link.colorKey) {
            const lc = lc_map[link.colorKey];
            ctx.strokeStyle = lc.link + `${linkLabelAlpha * la})`;
            ctx.setLineDash([5, 4]);
            ctx.lineWidth = isDark ? 1.5 : 2;
        } else if (link.type === "file-relation") {
            ctx.strokeStyle = `rgba(168,85,247,${linkRelAlpha * la})`;
            ctx.setLineDash([3, 5]);
            ctx.lineWidth = isDark ? 1 : 1.5;
        } else {
            ctx.strokeStyle = palette.link.replace(/[\d.]+\)$/, `${linkParentAlpha * la})`);
            ctx.setLineDash([]);
            ctx.lineWidth = isDark ? 1 : 1.2;
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Particles
        if (la > 0.5) {
            const speed = link.type === "file-label" ? 0.35 : 0.25;
            const offset = (link.source.charCodeAt(2) + link.target.charCodeAt(2)) * 0.3;
            const particlePos = ((elapsed * speed + offset) % 1);
            const px = s.x + (t.x - s.x) * particlePos;
            const py = s.y + (t.y - s.y) * particlePos;
            const baseSize = link.type === "file-label" ? 2.2 : 1.6;
            ctx.beginPath();
            ctx.arc(px, py, baseSize * particleSizeMul, 0, Math.PI * 2);
            if (link.type === "file-label" && link.colorKey) {
                ctx.fillStyle = lc_map[link.colorKey].particle;
            } else if (link.type === "file-relation") {
                ctx.fillStyle = isDark ? "#a855f7A0" : "#7c3aedD0";
            } else {
                ctx.fillStyle = isDark ? palette.root + "70" : palette.root + "C0";
            }
            ctx.globalAlpha = la * particleGlobalAlpha;
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }

    // ── Draw nodes ──
    for (const node of nodes) {
        const alpha = node.alpha;
        if (alpha <= 0) continue;

        const scaleT = alpha;
        const scale = scaleT < 1 ? 1 - Math.pow(1 - scaleT, 3) : 1;
        const pulse = Math.sin(elapsed * 1.5 + node.pulsePhase) * 0.03 + 1;
        const r = node.radius * scale * pulse;

        ctx.globalAlpha = alpha;

        // ── Glow for root ──
        if (node.type === "root") {
            const glow = ctx.createRadialGradient(node.x, node.y, r, node.x, node.y, r * 3);
            glow.addColorStop(0, palette.root + (isDark ? "35" : "55"));
            glow.addColorStop(1, palette.root + "00");
            ctx.beginPath();
            ctx.arc(node.x, node.y, r * 3, 0, Math.PI * 2);
            ctx.fillStyle = glow;
            ctx.fill();
        }

        // ── Shape ──
        ctx.beginPath();
        if (node.type === "root") {
            // Rounded square
            const s = r * 1.4;
            const br = 7;
            ctx.moveTo(node.x - s / 2 + br, node.y - s / 2);
            ctx.arcTo(node.x + s / 2, node.y - s / 2, node.x + s / 2, node.y + s / 2, br);
            ctx.arcTo(node.x + s / 2, node.y + s / 2, node.x - s / 2, node.y + s / 2, br);
            ctx.arcTo(node.x - s / 2, node.y + s / 2, node.x - s / 2, node.y - s / 2, br);
            ctx.arcTo(node.x - s / 2, node.y - s / 2, node.x + s / 2, node.y - s / 2, br);
            ctx.fillStyle = palette.root;
            ctx.fill();
            if (!isDark) {
                ctx.strokeStyle = "#d4a500";
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
        } else if (node.type === "folder") {
            // Rounded rect with folder tab
            const w = r * 2.2;
            const h = r * 1.6;
            const br = 5;
            // Small tab at top-left
            ctx.moveTo(node.x - w / 2, node.y - h / 2 - 3);
            ctx.lineTo(node.x - w / 2 + w * 0.35, node.y - h / 2 - 3);
            ctx.lineTo(node.x - w / 2 + w * 0.4, node.y - h / 2);
            ctx.lineTo(node.x + w / 2 - br, node.y - h / 2);
            ctx.arcTo(node.x + w / 2, node.y - h / 2, node.x + w / 2, node.y + h / 2, br);
            ctx.arcTo(node.x + w / 2, node.y + h / 2, node.x - w / 2, node.y + h / 2, br);
            ctx.arcTo(node.x - w / 2, node.y + h / 2, node.x - w / 2, node.y - h / 2 - 3, br);
            ctx.closePath();
            ctx.fillStyle = palette.folder + (isDark ? "28" : "45");
            ctx.fill();
            ctx.strokeStyle = palette.folder + (isDark ? "80" : "B0");
            ctx.lineWidth = isDark ? 1.5 : 2;
            ctx.stroke();
        } else if (node.type === "label") {
            // Hexagon — color depends on colorKey
            const lc = node.colorKey ? lc_map[node.colorKey] : null;
            const sides = 6;
            for (let i = 0; i < sides; i++) {
                const angle = (Math.PI / 3) * i - Math.PI / 6;
                const px = node.x + r * Math.cos(angle);
                const py = node.y + r * Math.sin(angle);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fillStyle = lc ? lc.fill : "#f59e0b25";
            ctx.fill();
            ctx.strokeStyle = lc ? lc.stroke : "#f59e0b90";
            ctx.lineWidth = isDark ? 1.5 : 2;
            ctx.stroke();

            // Glow for labels — stronger in light mode
            if (lc) {
                const glowR = isDark ? r * 2 : r * 2.5;
                const glow = ctx.createRadialGradient(node.x, node.y, r, node.x, node.y, glowR);
                const glowAlpha = isDark ? "18" : "30";
                glow.addColorStop(0, lc.stroke.replace(/[0-9a-fA-F]{2}$/, glowAlpha));
                glow.addColorStop(1, lc.stroke.replace(/[0-9a-fA-F]{2}$/, "00"));
                ctx.beginPath();
                ctx.arc(node.x, node.y, glowR, 0, Math.PI * 2);
                ctx.fillStyle = glow;
                ctx.fill();
            }
        } else {
            // Circle for files
            ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
            ctx.fillStyle = palette.file + (isDark ? "18" : "35");
            ctx.fill();
            ctx.strokeStyle = palette.file + (isDark ? "50" : "85");
            ctx.lineWidth = isDark ? 1 : 1.5;
            ctx.stroke();
        }

        // ── Icons ── (vector paths: glyphs like ◈/▤ forced a system-font
        // fallback search on the first frame — a 50 ms+ long task on phones)
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        if (node.type === "root") {
            const d = r * 0.32;
            ctx.beginPath();
            ctx.moveTo(node.x, node.y - d);
            ctx.lineTo(node.x + d, node.y);
            ctx.lineTo(node.x, node.y + d);
            ctx.lineTo(node.x - d, node.y);
            ctx.closePath();
            ctx.strokeStyle = "#2a2a2a";
            ctx.lineWidth = 1.6;
            ctx.stroke();
            ctx.fillStyle = "#2a2a2a";
            ctx.fillRect(node.x - d * 0.35, node.y - d * 0.35, d * 0.7, d * 0.7);
        } else if (node.type === "folder") {
            const hw = r * 0.34;
            ctx.strokeStyle = isDark ? palette.folder : "#5b83a8";
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            for (const dy of [-0.28, 0, 0.28]) {
                ctx.moveTo(node.x - hw, node.y + dy * r);
                ctx.lineTo(node.x + hw, node.y + dy * r);
            }
            ctx.stroke();
        } else if (node.type === "label") {
            const lc = node.colorKey ? lc_map[node.colorKey] : null;
            ctx.font = `bold ${r * 0.6}px ${fontFamily}`;
            ctx.fillStyle = lc ? lc.stroke.replace(/[0-9a-fA-F]{2}$/, "ff") : "#f59e0b";
            ctx.fillText("#", node.x, node.y + 1);
        }

        // ── Label text ──
        const fontSize = node.type === "root" ? 11 : node.type === "folder" ? 10 : 9;
        const fontWeight = node.type === "root" || node.type === "folder" ? "bold " : "";
        ctx.font = `${fontWeight}${fontSize}px ${fontFamily}`;
        if (node.type === "label") {
            const lc = node.colorKey ? lc_map[node.colorKey] : null;
            ctx.fillStyle = lc ? lc.stroke.replace(/[0-9a-fA-F]{2}$/, isDark ? "dd" : "ff") : "#f59e0b";
        } else {
            ctx.fillStyle = palette.text;
        }
        ctx.globalAlpha = alpha * (isDark ? 0.85 : 0.95);
        ctx.fillText(node.label, node.x, node.y + r + 12);

        ctx.globalAlpha = 1;
    }

    ctx.restore();
}

/* ─── Component ───────────────────────────────────────────────────────────── */
export function GraphShowcase() {
    const { locale } = useI18n();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === "dark";

    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const isEn = locale !== "tr";

    const badgeText = isEn ? "Knowledge Graph" : "Bilgi Grafiği";

    const bullets = isEn
        ? [
            { icon: "◈", text: "See which files share a tag", color: "text-brand-dark dark:text-brand-lemon" },
            { icon: "#", text: "Shared tags glow across folders, so connections are easy to spot", color: "text-amber-700 dark:text-amber-400" },
            { icon: "⟷", text: "Spot files that belong together", color: "text-purple-700 dark:text-purple-400" },
            { icon: "⊙", text: "Click any node to inspect, double-click to dive in", color: "text-brand-ocean-ink" },
        ]
        : [
            { icon: "◈", text: "Hangi dosyaların aynı etiketi paylaştığını gör", color: "text-brand-dark dark:text-brand-lemon" },
            { icon: "#", text: "Ortak etiketler klasörler arasında parlar, bağlantıları kolayca görürsün", color: "text-amber-700 dark:text-amber-400" },
            { icon: "⟷", text: "Birbirine ait dosyaları fark et", color: "text-purple-700 dark:text-purple-400" },
            { icon: "⊙", text: "Tıkla incele, çift tıkla içine dal", color: "text-brand-ocean-ink" },
        ];

    /*
     * Scroll-synced build: nodes fly out of the root and edges connect in
     * step with the scroll position (reversible), then the finished graph
     * keeps a gentle ambient drift. The rAF loop only runs while the canvas is
     * on screen; reduced motion draws the finished graph once.
     */
    useEffect(() => {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!container || !canvas || !ctx) return;

        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const palette = isDark ? PALETTE.dark : PALETTE.light;
        const labelColors = isDark ? LABEL_COLORS_DARK : LABEL_COLORS_LIGHT;
        let nodes: MockNode[] = [];
        let links: MockLink[] = [];
        let w = 0;
        let h = 0;
        let dpr = 1;
        let frame = 0;
        const t0 = performance.now();

        // Document offset of the canvas, refreshed from IntersectionObserver
        // entries and on resize, so the per-frame scroll math never forces a
        // synchronous layout (getBoundingClientRect in rAF caused a 60-80 ms
        // long task on a 4x-throttled phone).
        let docTop = 0;
        // The page's own (already loaded) font: no fallback lookup on canvas.
        const fontFamily = getComputedStyle(container).fontFamily || "sans-serif";

        const layout = () => {
            const rect = container.getBoundingClientRect();
            docTop = rect.top + window.scrollY;
            w = rect.width;
            h = rect.height;
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            ({ nodes, links } = buildDemoGraph(w, h, locale));
        };

        const scrollProgress = () => {
            const top = docTop - window.scrollY;
            const vh = window.innerHeight;
            const start = vh * 0.92; // container top enters the lower viewport
            const end = vh * 0.55 - h / 2; // container centred slightly above middle
            return Math.min(1, Math.max(0, (start - top) / (start - end)));
        };

        const render = (now: number) => {
            const time = reduced ? 0 : (now - t0) / 1000;
            layoutAtProgress(nodes, reduced ? 1 : scrollProgress(), w, h, time, !reduced);
            drawGraph(ctx, nodes, links, palette, labelColors, isDark, time, dpr, fontFamily);
        };

        const loop = (now: number) => {
            render(now);
            frame = requestAnimationFrame(loop);
        };
        const start = () => {
            if (!frame && !reduced) frame = requestAnimationFrame(loop);
        };
        const stop = () => {
            if (frame) cancelAnimationFrame(frame);
            frame = 0;
        };

        layout();
        render(performance.now());

        const observer = new IntersectionObserver(([entry]) => {
            if (!entry) return;
            docTop = entry.boundingClientRect.top + window.scrollY;
            if (entry.isIntersecting) start();
            else stop();
        }, { rootMargin: "80px 0px" });
        observer.observe(container);

        const onResize = () => {
            layout();
            render(performance.now());
        };
        window.addEventListener("resize", onResize);

        return () => {
            stop();
            observer.disconnect();
            window.removeEventListener("resize", onResize);
        };
    }, [isDark, locale]);

    return (
        <section className="py-24 bg-background overflow-hidden" id="graph" data-ambient>
            <div className="container mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-16 max-w-3xl mx-auto">
                    <div className="reveal reveal-scale">
                        <Badge variant="secondary" className="mb-4">
                            {badgeText}
                        </Badge>
                    </div>
                    <h2 className="reveal reveal-soft text-3xl md:text-5xl font-bold mb-6 tracking-tight leading-[1.15]">
                        {isEn ? (
                            <>
                                Complexity in.{" "}
                                <span className="text-brand-ocean-ink font-[family-name:var(--font-coiny)]">
                                    Clarity
                                </span>{" "}
                                out.
                            </>
                        ) : (
                            <>
                                Karmaşıklık girsin.{" "}
                                <span className="text-brand-ocean-ink font-[family-name:var(--font-coiny)]">
                                    Netlik
                                </span>{" "}
                                çıksın.
                            </>
                        )}
                    </h2>
                    <p className="reveal text-muted-foreground text-lg leading-relaxed max-w-2xl mx-auto" style={{ "--reveal-i": 1 } as CSSProperties}>
                        {isEn
                            ? <>The <span className="text-foreground font-medium">Knowledge Graph</span> shows how the files you tagged connect: files, folders and tags in one interactive map.</>
                            : <>
                                <span className="text-foreground font-medium">Bilgi Grafiği</span>, etiketlediğin dosyaların birbiriyle nasıl bağlandığını gösterir: dosyalar, klasörler ve etiketler tek bir interaktif haritada.
                            </>
                        }
                    </p>
                </div>

                {/* Content grid */}
                <div className="grid md:grid-cols-5 gap-8 items-center max-w-6xl mx-auto">
                    {/* Graph canvas area: nodes connect as you scroll */}
                    <div className="reveal reveal-scale md:col-span-3 relative">
                        <div
                            ref={containerRef}
                            className="relative aspect-[16/10] rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden shadow-xl"
                        >
                            {/* Decorative blurs, drifting */}
                            <div className="ambient-float absolute -top-20 -left-20 w-56 h-56 bg-brand-lemon rounded-full blur-[100px] opacity-[0.12] dark:opacity-[0.08] pointer-events-none" aria-hidden="true" />
                            <div className="ambient-float absolute -bottom-20 -right-20 w-56 h-56 bg-brand-ocean rounded-full blur-[100px] opacity-[0.15] dark:opacity-[0.08] pointer-events-none" style={{ "--float-delay": "-3s", "--float-x": "-20px" } as CSSProperties} aria-hidden="true" />

                            <canvas
                                ref={canvasRef}
                                className="absolute inset-0 w-full h-full"
                                role="img"
                                aria-label={isEn ? "Example knowledge graph: folders, files and shared tags connected" : "Örnek bilgi grafiği: klasörler, dosyalar ve ortak etiketler bağlı"}
                            />

                            {/* Legend overlay */}
                            <div className="absolute bottom-3 left-3 flex flex-wrap gap-x-3 gap-y-1 rounded-md bg-background/70 px-2 py-1 text-[10px] text-muted-foreground pointer-events-none backdrop-blur-sm">
                                <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-[3px] bg-brand-lemon inline-block" />
                                    Root
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="w-2 h-1.5 rounded-[2px] border border-brand-ocean/50 inline-block" />
                                    {isEn ? "Folder" : "Klasör"}
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full border border-border inline-block" />
                                    {isEn ? "File" : "Dosya"}
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 rotate-45 inline-block" style={{ clipPath: "polygon(50% 0%,100% 50%,50% 100%,0% 50%)", background: "rgba(34,197,94,0.5)" }} />
                                    <span className="w-2 h-2 rotate-45 inline-block" style={{ clipPath: "polygon(50% 0%,100% 50%,50% 100%,0% 50%)", background: "rgba(139,92,246,0.5)" }} />
                                    <span className="w-2 h-2 rotate-45 inline-block" style={{ clipPath: "polygon(50% 0%,100% 50%,50% 100%,0% 50%)", background: "rgba(245,158,11,0.5)" }} />
                                    <span className="w-2 h-2 rotate-45 inline-block" style={{ clipPath: "polygon(50% 0%,100% 50%,50% 100%,0% 50%)", background: "rgba(244,63,94,0.5)" }} />
                                    <span className="w-2 h-2 rotate-45 inline-block" style={{ clipPath: "polygon(50% 0%,100% 50%,50% 100%,0% 50%)", background: "rgba(6,182,212,0.5)" }} />
                                    {isEn ? "Labels" : "Etiketler"}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Feature bullets */}
                    <ul className="md:col-span-2 space-y-5">
                        {bullets.map((b, i) => (
                            <li
                                key={b.text}
                                className="reveal reveal-right flex gap-4 items-start group"
                                style={{ "--reveal-i": i } as CSSProperties}
                            >
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-background shadow-sm transition-transform duration-[var(--motion-duration-base)] ease-motion-spring group-hover:scale-110 group-hover:-rotate-6">
                                    <span className={`text-lg ${b.color}`} aria-hidden="true">{b.icon}</span>
                                </div>
                                <p className="text-[15px] text-muted-foreground leading-relaxed pt-2">
                                    {b.text}
                                </p>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </section>
    );
}
