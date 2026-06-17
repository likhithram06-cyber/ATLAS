// tailwind.config.js — full replacement
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        bebas:   ["Bebas Neue", "sans-serif"],
        grotesk: ["Space Grotesk", "sans-serif"],
        inter:   ["Inter", "sans-serif"],
      },
      colors: {
        void:      "#04060A",
        deep:      "#080C12",
        steel:     "#0E1520",
        iron:      "#1A2535",
        slate:     "#2E3D52",
        fog:       "#4A5A6E",
        hazegold:  "#C8963C",
        hazelight: "#E0B060",
      },
    },
  },
  plugins: [],
}
