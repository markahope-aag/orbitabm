// OrbitABM — Tailwind Color & Font Configuration
// Merge into your tailwind.config.ts under theme.extend

export const orbitTheme = {
  fontFamily: {
    sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
    mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
  },
  colors: {
    navy: {
      50: '#f0f3f9',
      100: '#dfe5f2',
      200: '#bcc8e2',
      300: '#94a8cd',
      400: '#6b82b0',
      500: '#475b8a',
      600: '#334570',
      700: '#253256',
      800: '#1a2340',
      900: '#0f172a',
      950: '#0a0f1e',
    },
    // Cyan, Orange, Emerald, Amber, Red, Slate — use Tailwind defaults
    // Key tokens for reference:
    //
    // BRAND ACCENT:    cyan-400 (#22d3ee), cyan-500 (#06b6d4)
    // URGENCY/CTA:     orange-400 (#fb923c), orange-500 (#f97316)
    // SUCCESS:         emerald-100/400/500/900
    // WARNING:         amber-100/400/500/900
    // DANGER:          red-100/400/500/900
    // NEUTRAL:         slate-50 through slate-950
    //
    // SIDEBAR BG:      navy-950 (#0a0f1e)
    // PRIMARY BUTTON:  navy-800 (#1a2340)
    // PAGE BG:         slate-50 (#f8fafc)
    // CARD BG:         white
    // CARD BORDER:     slate-200 (#e2e8f0)
    // BODY TEXT:       navy-900 (#0f172a)
    // SECONDARY TEXT:  slate-500 (#64748b)
    // MUTED TEXT:      slate-400 (#94a3b8)
  },
};
