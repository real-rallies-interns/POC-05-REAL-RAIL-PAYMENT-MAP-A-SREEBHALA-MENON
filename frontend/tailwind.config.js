/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        "rr-black":   "#030712",
        "rr-surface": "#0B1117",
        "rr-border":  "#1F2937",
        "rr-cyan":    "#38BDF8",
        "rr-indigo":  "#818CF8",
        "rr-muted":   "#6B7280",
        "rr-text":    "#E2E8F0",
        "rr-dim":     "#94A3B8",
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "monospace"],
        sans: ["'Inter'", "sans-serif"],
      },
      boxShadow: {
        "cyan-glow": "0 0 0 0.5px #38BDF8, 0 0 12px rgba(56,189,248,0.2)",
        "indigo-glow": "0 0 0 0.5px #818CF8, 0 0 12px rgba(129,140,248,0.2)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.4s ease forwards",
        "slide-in": "slideIn 0.35s ease forwards",
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideIn: { from: { opacity: 0, transform: "translateX(12px)" }, to: { opacity: 1, transform: "translateX(0)" } },
      },
    },
  },
  plugins: [],
};
