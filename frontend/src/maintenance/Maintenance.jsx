import { useEffect, useMemo, useRef, useState, useCallback } from "react";

/**
 * Under Maintenance — cinematic landing page.
 *
 * A single, self-contained React component. All markup, Tailwind styling,
 * inline SVG art (isometric server room), keyframe animations, and logic
 * live here. Render <Maintenance /> from your app entry.
 *
 * Design language: premium product-launch hero (Vercel / Stripe / Framer).
 * - Full-bleed layout (no centered card).
 * - Custom isometric SVG server room (~50% of screen).
 * - Aurora gradient, radial spotlight, grid, noise, light beams, particles.
 * - Rotating gears, pulsing LEDs, animated data packets in cables.
 * - Mouse parallax + magnetic buttons.
 * - Accessible: landmark, aria-live clock/status, focus-visible rings, AA contrast.
 *
 * Palette: #ffffff #f8fafc #e2e8f0 #3b82f6 #2563eb #8b5cf6
 */

/* ================================================================== */
/*  Icons (inline SVG, no icon library)                               */
/* ================================================================== */

const Icon = {
    Refresh: (p) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
            <path d="M3 21v-5h5" />
        </svg>
    ),
    Bolt: (p) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
            <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
    ),
    LifeBuoy: (p) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="4" />
            <path d="M4.9 4.9 9.2 9.2" /><path d="m14.8 9.2 4.3-4.3" />
            <path d="m14.8 14.8 4.3 4.3" /><path d="m9.2 14.8-4.3 4.3" />
        </svg>
    ),
    Arrow: (p) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
            <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
        </svg>
    ),
};

/* ================================================================== */
/*  Magnetic button                                                    */
/* ================================================================== */

function MagneticButton({ as: Tag = "button", variant = "primary", icon: I, children, onClick, disabled, ariaLabel }) {
    const ref = useRef(null);
    const [offset, setOffset] = useState({ x: 0, y: 0 });

    const onMove = (e) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const mx = e.clientX - (r.left + r.width / 2);
        const my = e.clientY - (r.top + r.height / 2);
        setOffset({ x: mx * 0.25, y: my * 0.35 });
    };
    const onLeave = () => setOffset({ x: 0, y: 0 });

    const base =
        "group relative inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold tracking-tight transition-[transform,background,box-shadow,border-color] duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60 will-change-transform";
    const variants = {
        primary:
            "text-white shadow-[0_8px_30px_-8px_rgba(59,130,246,0.6)] bg-gradient-to-r from-blue-600 via-blue-500 to-violet-500 hover:shadow-[0_12px_40px_-8px_rgba(139,92,246,0.7)] hover:brightness-110",
        secondary:
            "text-slate-700 bg-white/70 backdrop-blur-md border border-slate-200/80 hover:border-blue-300 hover:text-blue-600 hover:bg-white shadow-[0_4px_20px_-10px_rgba(15,23,42,0.25)] dark:text-slate-200 dark:bg-white/5 dark:border-white/10 dark:hover:border-blue-400/50 dark:hover:text-white dark:hover:bg-white/10",
        ghost:
            "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white",
    };

    return (
        <Tag
            ref={ref}
            onClick={onClick}
            disabled={disabled}
            aria-label={ariaLabel}
            onMouseMove={onMove}
            onMouseLeave={onLeave}
            style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
            className={`${base} ${variants[variant]}`}
        >
            {I && <I className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5 group-hover:scale-110" />}
            <span>{children}</span>
            {variant === "primary" && (
                <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
                    <span className="absolute -inset-y-4 -left-1/3 w-1/3 rotate-12 bg-white/30 blur-md opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-hover:animate-[sheen_1.2s_ease-in-out]" />
                </span>
            )}
        </Tag>
    );
}

/* ================================================================== */
/*  Isometric server-room illustration (pure SVG)                      */
/* ================================================================== */

/**
 * Isometric scene: floor, two server racks with glowing LEDs, a robotic arm
 * repairing a module, rotating gears, a progress hologram, animated cables
 * with traveling data packets, a toolbox, and floating particles.
 *
 * Parallax: the wrapper translates slightly with the mouse (see main comp).
 */
function ServerRoomArt({ parallax }) {
    return (
        <div
            className="relative mx-auto aspect-square w-full max-w-[640px]"
            style={{ transform: `translate(${parallax.x}px, ${parallax.y}px)`, transition: "transform 0.18s ease-out" }}
            aria-hidden="true"
        >
            {/* Ambient glow behind the scene */}
            <div className="absolute inset-0 -z-10">
                <div className="absolute left-1/2 top-1/2 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-blue-500/30 via-violet-500/20 to-transparent blur-3xl" />
            </div>

            <svg viewBox="0 0 600 600" className="h-full w-full" style={{ animation: "float-illu 7s ease-in-out infinite" }}>
                <defs>
                    {/* Isometric floor grid */}
                    <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#e2e8f0" />
                        <stop offset="1" stopColor="#f8fafc" />
                    </linearGradient>
                    <linearGradient id="rackBody" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stopColor="#ffffff" />
                        <stop offset="1" stopColor="#e2e8f0" />
                    </linearGradient>
                    <linearGradient id="rackDark" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#1e293b" />
                        <stop offset="1" stopColor="#0f172a" />
                    </linearGradient>
                    <linearGradient id="armMetal" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stopColor="#cbd5e1" />
                        <stop offset="1" stopColor="#94a3b8" />
                    </linearGradient>
                    <radialGradient id="ledBlue" cx="0.5" cy="0.5" r="0.5">
                        <stop offset="0" stopColor="#3b82f6" />
                        <stop offset="0.5" stopColor="#2563eb" />
                        <stop offset="1" stopColor="#2563eb" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="ledViolet" cx="0.5" cy="0.5" r="0.5">
                        <stop offset="0" stopColor="#8b5cf6" />
                        <stop offset="1" stopColor="#8b5cf6" stopOpacity="0" />
                    </radialGradient>
                    <linearGradient id="cable" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0" stopColor="#2563eb" />
                        <stop offset="1" stopColor="#8b5cf6" />
                    </linearGradient>
                    <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="6" />
                    </filter>
                    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="b" />
                        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>

                {/* ---- Isometric floor ---- */}
                <g>
                    <polygon points="300,150 540,290 300,430 60,290" fill="url(#floor)" opacity="0.9" />
                    <g stroke="#cbd5e1" strokeWidth="1" opacity="0.6">
                        {[0, 1, 2, 3, 4, 5].map((i) => {
                            const t = i / 5;
                            // vertical-ish iso lines
                            const x1 = 60 + (540 - 60) * t, y1 = 290;
                            const x2 = 300 + (300 - 300) * 0, y2 = 430 - (430 - 150) * t;
                            return <line key={`a${i}`} x1={60 + (540 - 60) * t} y1={290 + (430 - 290) * t} x2={300 - (300 - 60) * t} y2={150 + (290 - 150) * t} />;
                        })}
                        {[0, 1, 2, 3, 4, 5].map((i) => {
                            const t = i / 5;
                            return <line key={`b${i}`} x1={300 + (540 - 300) * t} y1={150 + (290 - 150) * t} x2={60 + (300 - 60) * t} y2={290 + (430 - 290) * t} />;
                        })}
                    </g>
                </g>

                {/* ---- Server rack A (left) ---- */}
                <g transform="translate(150,250)">
                    {/* base shadow */}
                    <ellipse cx="0" cy="120" rx="90" ry="20" fill="#0f172a" opacity="0.12" />
                    {/* body */}
                    <polygon points="-70,0 70,0 70,110 -70,110" fill="url(#rackDark)" />
                    <polygon points="-70,0 -56,-12 84,-12 70,0" fill="#334155" />
                    <polygon points="70,0 84,-12 84,98 70,110" fill="#0f172a" />
                    {/* server units with pulsing LEDs */}
                    {[0, 1, 2, 3, 4].map((i) => (
                        <g key={i} transform={`translate(${-58},${10 + i * 18})`}>
                            <rect width="116" height="12" rx="2" fill="#1e293b" stroke="#334155" />
                            <circle cx="10" cy="6" r="3" fill="url(#ledBlue)" filter="url(#glow)">
                                <animate attributeName="opacity" values="1;0.25;1" dur={`${1.6 + i * 0.3}s`} repeatCount="indefinite" />
                            </circle>
                            <circle cx="22" cy="6" r="3" fill="url(#ledViolet)" filter="url(#glow)">
                                <animate attributeName="opacity" values="0.3;1;0.3" dur={`${2 + i * 0.25}s`} repeatCount="indefinite" />
                            </circle>
                            <rect x="34" y="4" width="70" height="4" rx="2" fill="#334155" />
                        </g>
                    ))}
                </g>

                {/* ---- Server rack B (right, smaller) ---- */}
                <g transform="translate(390,265)">
                    <ellipse cx="0" cy="100" rx="70" ry="16" fill="#0f172a" opacity="0.12" />
                    <polygon points="-55,0 55,0 55,92 -55,92" fill="url(#rackDark)" />
                    <polygon points="-55,0 -44,-10 66,-10 55,0" fill="#334155" />
                    <polygon points="55,0 66,-10 66,82 55,92" fill="#0f172a" />
                    {[0, 1, 2, 3].map((i) => (
                        <g key={i} transform={`translate(${-46},${8 + i * 18})`}>
                            <rect width="92" height="12" rx="2" fill="#1e293b" stroke="#334155" />
                            <circle cx="8" cy="6" r="2.5" fill="url(#ledBlue)" filter="url(#glow)">
                                <animate attributeName="opacity" values="0.25;1;0.25" dur={`${1.8 + i * 0.4}s`} repeatCount="indefinite" />
                            </circle>
                            <rect x="18" y="4" width="58" height="4" rx="2" fill="#334155" />
                        </g>
                    ))}
                </g>

                {/* ---- Rotating gears (top center) ---- */}
                <g transform="translate(300,180)">
                    <g style={{ transformOrigin: "center", animation: "spin-slow 16s linear infinite" }}>
                        <g fill="#94a3b8">
                            {Array.from({ length: 10 }).map((_, i) => {
                                const a = (i * 360) / 10;
                                return <rect key={i} x="-5" y="-44" width="10" height="16" rx="2" transform={`rotate(${a})`} />;
                            })}
                        </g>
                        <circle r="28" fill="none" stroke="#cbd5e1" strokeWidth="6" />
                        <circle r="8" fill="#64748b" />
                    </g>
                </g>
                <g transform="translate(355,150)">
                    <g style={{ transformOrigin: "center", animation: "spin-rev 11s linear infinite" }}>
                        <g fill="#8b5cf6">
                            {Array.from({ length: 8 }).map((_, i) => {
                                const a = (i * 360) / 8;
                                return <rect key={i} x="-3.5" y="-30" width="7" height="12" rx="2" transform={`rotate(${a})`} />;
                            })}
                        </g>
                        <circle r="18" fill="none" stroke="#a78bfa" strokeWidth="4" />
                        <circle r="5" fill="#7c3aed" />
                    </g>
                </g>

                {/* ---- Robotic arm repairing a module (center front) ---- */}
                <g transform="translate(300,360)">
                    {/* base */}
                    <ellipse cx="0" cy="48" rx="46" ry="12" fill="#0f172a" opacity="0.15" />
                    <rect x="-30" y="36" width="60" height="14" rx="4" fill="url(#armMetal)" />
                    {/* shoulder */}
                    <circle cx="0" cy="32" r="9" fill="#64748b" />
                    {/* upper arm */}
                    <g style={{ transformOrigin: "0px 32px", animation: "arm-sway 5s ease-in-out infinite" }}>
                        <rect x="-6" y="-6" width="12" height="40" rx="6" fill="url(#armMetal)" />
                        {/* elbow */}
                        <circle cx="0" cy="-6" r="7" fill="#64748b" />
                        {/* forearm */}
                        <g transform="translate(0,-6)">
                            <g style={{ transformOrigin: "0px 0px", animation: "arm-sway2 4s ease-in-out infinite" }}>
                                <rect x="-5" y="-34" width="10" height="34" rx="5" fill="url(#armMetal)" />
                                {/* tool head with spark */}
                                <circle cx="0" cy="-36" r="6" fill="#2563eb" filter="url(#glow)" />
                                <g fill="#fbbf24" filter="url(#glow)">
                                    <circle cx="0" cy="-44" r="2">
                                        <animate attributeName="opacity" values="1;0;1" dur="0.4s" repeatCount="indefinite" />
                                    </circle>
                                    <circle cx="-6" cy="-42" r="1.4">
                                        <animate attributeName="opacity" values="0;1;0" dur="0.5s" repeatCount="indefinite" />
                                    </circle>
                                    <circle cx="6" cy="-42" r="1.4">
                                        <animate attributeName="opacity" values="1;0;1" dur="0.45s" repeatCount="indefinite" />
                                    </circle>
                                </g>
                            </g>
                        </g>
                    </g>
                    {/* module being repaired */}
                    <rect x="-22" y="44" width="44" height="10" rx="3" fill="#1e293b" stroke="#334155" />
                    <rect x="-18" y="47" width="36" height="4" rx="2" fill="url(#cable)" />
                </g>

                {/* ---- Toolbox (front left) ---- */}
                <g transform="translate(120,400)">
                    <ellipse cx="0" cy="26" rx="40" ry="9" fill="#0f172a" opacity="0.12" />
                    <rect x="-34" y="-6" width="68" height="30" rx="4" fill="#ea580c" />
                    <rect x="-34" y="-6" width="68" height="8" rx="4" fill="#c2410c" />
                    <rect x="-10" y="-16" width="20" height="12" rx="3" fill="none" stroke="#c2410c" strokeWidth="3" />
                    <rect x="-26" y="4" width="14" height="14" rx="2" fill="#fb923c" />
                    <rect x="12" y="4" width="14" height="14" rx="2" fill="#fb923c" />
                </g>

                {/* ---- Cables with animated data packets ---- */}
                {/* Cable 1: rack A -> rack B */}
                <path id="cable1" d="M220,300 C280,320 320,320 390,310" fill="none" stroke="url(#cable)" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
                <circle r="4" fill="#3b82f6" filter="url(#glow)">
                    <animateMotion dur="2.4s" repeatCount="indefinite" path="M220,300 C280,320 320,320 390,310" />
                </circle>
                <circle r="3" fill="#8b5cf6" filter="url(#glow)">
                    <animateMotion dur="2.4s" begin="1.2s" repeatCount="indefinite" path="M220,300 C280,320 320,320 390,310" />
                </circle>

                {/* Cable 2: rack A -> floor (down) */}
                <path id="cable2" d="M150,360 C150,400 150,430 150,460" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
                <circle r="3" fill="#60a5fa" filter="url(#glow)">
                    <animateMotion dur="2s" repeatCount="indefinite" path="M150,360 C150,400 150,430 150,460" />
                </circle>

                {/* Cable 3: rack B -> arm module */}
                <path id="cable3" d="M390,357 C360,370 330,372 300,372" fill="none" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
                <circle r="3" fill="#a78bfa" filter="url(#glow)">
                    <animateMotion dur="1.8s" repeatCount="indefinite" path="M390,357 C360,370 330,372 300,372" />
                </circle>

                {/* ---- Hologram progress display (above arm) ---- */}
                <g transform="translate(300,250)" opacity="0.95">
                    <ellipse cx="0" cy="2" rx="26" ry="7" fill="#3b82f6" opacity="0.18" filter="url(#soft)" />
                    <g style={{ transformOrigin: "center", animation: "holo 4s ease-in-out infinite" }}>
                        <rect x="-30" y="-30" width="60" height="40" rx="6" fill="#ffffff" opacity="0.12" stroke="#60a5fa" strokeWidth="1" />
                        <rect x="-22" y="-22" width="44" height="5" rx="2.5" fill="#1e293b" opacity="0.5" />
                        <rect x="-22" y="-22" width="32" height="5" rx="2.5" fill="url(#cable)" />
                        <text x="0" y="-2" textAnchor="middle" fontSize="11" fontFamily="ui-monospace,monospace" fill="#3b82f6" fontWeight="700">72%</text>
                        <rect x="-22" y="4" width="44" height="3" rx="1.5" fill="#334155" />
                        <rect x="-22" y="4" width="26" height="3" rx="1.5" fill="#8b5cf6" />
                    </g>
                </g>

                {/* ---- Warning beacon (top of rack B) ---- */}
                <g transform="translate(390,250)">
                    <circle r="6" fill="#fbbf24" filter="url(#glow)">
                        <animate attributeName="opacity" values="1;0.2;1" dur="1.1s" repeatCount="indefinite" />
                    </circle>
                    <circle r="14" fill="#fbbf24" opacity="0.25" filter="url(#soft)">
                        <animate attributeName="r" values="10;18;10" dur="1.1s" repeatCount="indefinite" />
                    </circle>
                </g>

                {/* ---- Floating particles ---- */}
                {[
                    [120, 120, 2.4], [470, 140, 3.1], [250, 110, 2.8], [430, 230, 3.6],
                    [180, 200, 2.2], [360, 320, 3.3], [520, 200, 2.9], [90, 320, 3.5],
                ].map(([cx, cy, d], i) => (
                    <circle key={i} cx={cx} cy={cy} r={2} fill={i % 2 ? "#8b5cf6" : "#3b82f6"} opacity="0.7" filter="url(#glow)">
                        <animate attributeName="cy" values={`${cy};${cy - 18};${cy}`} dur={`${d}s`} repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.2;0.9;0.2" dur={`${d}s`} repeatCount="indefinite" />
                    </circle>
                ))}
            </svg>
        </div>
    );
}

/* ================================================================== */
/*  Background layers (grid, aurora, beams, spotlight, noise, particles) */
/* ================================================================== */

function Background() {
    // Pre-compute floating particle positions (stable across renders)
    const particles = useMemo(
        () =>
            Array.from({ length: 26 }).map((_, i) => ({
                left: `${(i * 37) % 100}%`,
                top: `${(i * 53) % 100}%`,
                size: 1 + ((i * 7) % 3),
                delay: `${(i % 10) * 0.6}s`,
                dur: `${8 + (i % 7)}s`,
                violet: i % 3 === 0,
            })),
        []
    );

    return (
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-white dark:bg-slate-950" aria-hidden="true">
            {/* Aurora gradient */}
            <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(59,130,246,0.16),transparent_60%),radial-gradient(50%_40%_at_80%_20%,rgba(139,92,246,0.14),transparent_60%),radial-gradient(50%_40%_at_15%_30%,rgba(59,130,246,0.12),transparent_60%)] dark:bg-[radial-gradient(60%_50%_at_50%_0%,rgba(59,130,246,0.22),transparent_60%),radial-gradient(50%_40%_at_80%_20%,rgba(139,92,246,0.2),transparent_60%),radial-gradient(50%_40%_at_15%_30%,rgba(59,130,246,0.16),transparent_60%)]" />

            {/* Radial spotlight from center */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(255,255,255,0.6),transparent_55%)] dark:bg-[radial-gradient(circle_at_50%_45%,rgba(15,23,42,0.4),transparent_55%)]" />

            {/* Subtle grid */}
            <div
                className="absolute inset-0 opacity-[0.05] dark:opacity-[0.08]"
                style={{
                    backgroundImage:
                        "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
                    backgroundSize: "48px 48px",
                    maskImage: "radial-gradient(ellipse 70% 60% at 50% 45%, #000 40%, transparent 100%)",
                    WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 45%, #000 40%, transparent 100%)",
                    color: "#2563eb",
                }}
            />

            {/* Animated light beams */}
            <div className="absolute -top-1/3 left-1/2 h-[140%] w-[40%] -translate-x-1/2 rotate-12 bg-gradient-to-b from-blue-400/10 via-violet-400/10 to-transparent blur-2xl" style={{ animation: "beam 9s ease-in-out infinite" }} />
            <div className="absolute -top-1/3 left-1/3 h-[140%] w-[28%] -translate-x-1/2 -rotate-6 bg-gradient-to-b from-violet-400/10 to-transparent blur-2xl" style={{ animation: "beam 11s ease-in-out infinite 1s" }} />

            {/* Floating particles */}
            {particles.map((p, i) => (
                <span
                    key={i}
                    className="absolute rounded-full"
                    style={{
                        left: p.left,
                        top: p.top,
                        width: p.size,
                        height: p.size,
                        background: p.violet ? "#8b5cf6" : "#3b82f6",
                        boxShadow: `0 0 8px ${p.violet ? "#8b5cf6" : "#3b82f6"}`,
                        animation: `particle ${p.dur} ease-in-out ${p.delay} infinite`,
                    }}
                />
            ))}

            {/* Noise texture */}
            <div
                className="absolute inset-0 opacity-[0.035] dark:opacity-[0.05] mix-blend-overlay"
                style={{
                    backgroundImage:
                        "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
                }}
            />
        </div>
    );
}

/* ================================================================== */
/*  Main component                                                     */
/* ================================================================== */

export default function Maintenance() {
    const [now, setNow] = useState(() => new Date());
    const [progress, setProgress] = useState(72);
    const [checking, setChecking] = useState(false);
    const [toast, setToast] = useState(null);
    const [parallax, setParallax] = useState({ x: 0, y: 0 });

    /* Live clock */
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, []);

    /* Lively progress easing toward target */
    useEffect(() => {
        const id = setInterval(() => {
            setProgress((p) => {
                const target = 72;
                if (Math.abs(p - target) < 0.4) return target;
                return p + (target - p) * 0.08;
            });
        }, 1400);
        return () => clearInterval(id);
    }, []);

    /* Auto-dismiss toast */
    useEffect(() => {
        if (!toast) return;
        const id = setTimeout(() => setToast(null), 3400);
        return () => clearTimeout(id);
    }, [toast]);

    /* Mouse parallax for the illustration */
    useEffect(() => {
        const onMove = (e) => {
            const cx = window.innerWidth / 2;
            const cy = window.innerHeight / 2;
            setParallax({ x: ((e.clientX - cx) / cx) * 14, y: ((e.clientY - cy) / cy) * 10 });
        };
        window.addEventListener("mousemove", onMove);
        return () => window.removeEventListener("mousemove", onMove);
    }, []);

    const timeString = useMemo(
        () =>
            now.toLocaleTimeString(undefined, {
                hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
            }),
        [now]
    );
    const dateString = useMemo(
        () =>
            now.toLocaleDateString(undefined, {
                weekday: "long", year: "numeric", month: "long", day: "numeric",
            }),
        [now]
    );

    const handleRefresh = useCallback(() => {
        if (typeof window !== "undefined") window.location.reload();
    }, []);

    const handleTryAgain = useCallback(async () => {
        setChecking(true);
        try {
            await new Promise((r) => setTimeout(r, 950)); // simulate health check
            if (typeof window !== "undefined") window.location.href = "/";
        } catch {
            setToast("Server is still unavailable. Please try again shortly.");
        } finally {
            setChecking(false);
        }
    }, []);

    const handleContact = useCallback(() => {
        setToast("Support request noted. Our team will reach out via email.");
    }, []);

    const progressRounded = Math.round(progress);

    return (
        <main
            className="relative min-h-screen w-full text-slate-900 dark:text-slate-100"
            style={{ animation: "fade-in 0.8s ease-out both" }}
        >
            <Background />

            {/* Top nav strip */}
            <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 sm:px-8" style={{ animation: "fade-in 0.9s ease-out 0.15s both" }}>
                <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-violet-500 shadow-lg shadow-blue-500/30">
                        <Icon.Bolt className="h-4 w-4 text-white" />
                    </span>
                    <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">CrimeGPT</span>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-amber-200/70 bg-amber-50/70 px-3 py-1.5 text-xs font-semibold text-amber-700 backdrop-blur dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                    <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                    </span>
                    Scheduled Maintenance
                </span>
            </header>

            {/* Hero */}
            <section className="mx-auto flex w-full max-w-6xl flex-col items-center px-6 pb-20 pt-4 sm:px-8 sm:pt-8">
                {/* Illustration — ~50% of screen */}
                <div className="w-full" style={{ animation: "rise-in 1s cubic-bezier(0.16,1,0.3,1) 0.2s both" }}>
                    <ServerRoomArt parallax={parallax} />
                </div>

                {/* Title */}
                <h1
                    className="mt-2 text-center text-5xl font-bold leading-[1.05] tracking-tight text-slate-900 sm:text-6xl md:text-7xl dark:text-white"
                    style={{ animation: "rise-in 1s cubic-bezier(0.16,1,0.3,1) 0.35s both" }}
                >
                    We&rsquo;ll Be Back Soon
                </h1>

                {/* Description */}
                <p
                    className="mt-5 max-w-xl text-center text-base leading-relaxed text-slate-500 sm:text-lg dark:text-slate-400"
                    style={{ animation: "rise-in 1s cubic-bezier(0.16,1,0.3,1) 0.5s both" }}
                >
                    We&rsquo;re performing scheduled maintenance to make things faster,
                    safer, and more reliable. Thanks for your patience — we&rsquo;ll be
                    back shortly.
                </p>

                {/* Estimated completion + live clock */}
                <div
                    className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:gap-3"
                    style={{ animation: "rise-in 1s cubic-bezier(0.16,1,0.3,1) 0.6s both" }}
                >
                    <div className="inline-flex items-center gap-2.5 rounded-full border border-slate-200/80 bg-white/60 px-4 py-2 text-sm text-slate-600 backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                        Expected back in approximately 2 hours
                    </div>
                    <div className="hidden h-4 w-px bg-slate-300 sm:block dark:bg-slate-700" />
                    <div className="text-sm text-slate-500 dark:text-slate-400" aria-hidden="true">
                        <span className="font-medium text-slate-700 dark:text-slate-200">{dateString}</span>
                        <span className="mx-2 text-slate-300 dark:text-slate-600">·</span>
                        <span
                            className="font-mono tabular-nums text-blue-600 dark:text-blue-400"
                            aria-live="polite"
                            aria-label={`Current time ${timeString}`}
                        >
                            {timeString}
                        </span>
                    </div>
                </div>

                {/* Progress */}
                <div
                    className="mt-9 w-full max-w-md"
                    style={{ animation: "rise-in 1s cubic-bezier(0.16,1,0.3,1) 0.7s both" }}
                >
                    <div className="mb-2.5 flex items-center justify-between text-sm">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">Maintenance Progress</span>
                        <span className="font-mono font-semibold text-blue-600 dark:text-blue-400" aria-live="polite">{progressRounded}%</span>
                    </div>
                    <div
                        className="h-2 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800"
                        role="progressbar"
                        aria-label="Maintenance progress"
                        aria-valuenow={progressRounded}
                        aria-valuemin={0}
                        aria-valuemax={100}
                    >
                        <div
                            className="relative h-full rounded-full bg-gradient-to-r from-blue-600 via-blue-500 to-violet-500 transition-[width] duration-700 ease-out"
                            style={{ width: `${progress}%` }}
                        >
                            <span className="absolute inset-0 rounded-full opacity-60 blur-[6px] bg-gradient-to-r from-blue-500 to-violet-500" />
                        </div>
                    </div>
                </div>

                {/* Buttons */}
                <div
                    className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:gap-4"
                    style={{ animation: "rise-in 1s cubic-bezier(0.16,1,0.3,1) 0.8s both" }}
                >
                    <MagneticButton onClick={handleTryAgain} icon={Icon.Bolt} disabled={checking} ariaLabel="Check server status and try again">
                        {checking ? "Checking server…" : "Try Again"}
                    </MagneticButton>
                    <MagneticButton variant="secondary" onClick={handleRefresh} icon={Icon.Refresh} ariaLabel="Refresh the page">
                        Refresh Page
                    </MagneticButton>
                    <MagneticButton variant="ghost" onClick={handleContact} icon={Icon.LifeBuoy} ariaLabel="Contact support">
                        Contact Support
                    </MagneticButton>
                </div>
            </section>

            {/* Footer */}
            <footer className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-xs text-slate-500 sm:flex-row sm:px-8 dark:text-slate-400" style={{ animation: "fade-in 1s ease-out 0.9s both" }}>
                <p>&copy; 2026 CrimeGPT. All rights reserved.</p>
                <p className="inline-flex items-center gap-2" aria-live="polite">
                    <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                    </span>
                    Status: Maintenance in Progress
                </p>
            </footer>

            {/* Toast */}
            {toast && (
                <div
                    className="fixed bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-full border border-slate-200/80 bg-white/90 px-5 py-3 text-sm font-medium text-slate-700 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/90 dark:text-slate-200"
                    role="status"
                    style={{ animation: "rise-in 0.35s ease-out both" }}
                >
                    {toast}
                </div>
            )}

            {/* Keyframes */}
            <style>{`
        @keyframes spin-slow { to { transform: rotate(360deg); } }
        @keyframes spin-rev  { to { transform: rotate(-360deg); } }
        @keyframes float-illu { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        @keyframes arm-sway   { 0%,100% { transform: rotate(-8deg); } 50% { transform: rotate(6deg); } }
        @keyframes arm-sway2  { 0%,100% { transform: rotate(10deg); } 50% { transform: rotate(-6deg); } }
        @keyframes holo       { 0%,100% { transform: translateY(0) scale(1); opacity: .95; } 50% { transform: translateY(-4px) scale(1.03); opacity: .8; } }
        @keyframes beam       { 0%,100% { opacity: .5; transform: translateX(-50%) rotate(12deg) scaleY(1); } 50% { opacity: .9; transform: translateX(-50%) rotate(12deg) scaleY(1.15); } }
        @keyframes particle   { 0%,100% { transform: translateY(0); opacity: .2; } 50% { transform: translateY(-22px); opacity: .9; } }
        @keyframes fade-in    { from { opacity: 0; } to { opacity: 1; } }
        @keyframes rise-in    { from { opacity: 0; transform: translateY(18px); filter: blur(6px); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
        @keyframes sheen      { 0% { transform: translateX(-120%); } 100% { transform: translateX(320%); } }
      `}</style>
        </main>
    );
}
