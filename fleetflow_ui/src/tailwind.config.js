/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Barlow Condensed'", "sans-serif"],
        mono:    ["'Share Tech Mono'", "monospace"],
        body:    ["'Barlow'", "sans-serif"],
      },
      colors: {
        bg:       "#070c12",
        panel:    "#0b1520",
        border:   "#1a3050",
        accent:   "#00c8ff",
        accent2:  "#ff6b2b",
        accent3:  "#39ff8f",
        accent4:  "#ffd93d",
        muted:    "#4a6680",
        textBase: "#c8dff0",
      },
      animation: {
        "fade-up":   "fadeUp 0.5s ease both",
        "fade-down": "fadeDown 0.4s ease both",
        "pulse-slow": "pulse 3s ease-in-out infinite",
        "dash":      "dash 2s linear infinite",
      },
      keyframes: {
        fadeUp:   { from: { opacity: 0, transform: "translateY(16px)" }, to: { opacity: 1, transform: "none" } },
        fadeDown: { from: { opacity: 0, transform: "translateY(-12px)" }, to: { opacity: 1, transform: "none" } },
        dash:     { to: { strokeDashoffset: "-18" } },
      },
    },
  },
  plugins: [],
};
