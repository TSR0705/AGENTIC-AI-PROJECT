/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  mode: "jit",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Outfit", "sans-serif"],
        mono: ["Fira Code", "monospace"],
      },
      colors: {
        // Elite Obsidian Slate Palette
        obsidian: {
          950: "#030303",
          900: "#0a0a0c",
          850: "#101014",
          800: "#16161c",
          700: "#22222a",
          600: "#2d2d38",
          500: "#3d3d4b",
          400: "#5d5d70",
          300: "#8e8e9f",
          200: "#c3c3ce",
          100: "#e4e4e9",
        },
        accent: {
          violet: "#6366f1", // indigo-500
          glow: "rgba(99, 102, 241, 0.15)",
        },
      },
      boxShadow: {
        "premium-glow": "0 0 25px -5px rgba(99, 102, 241, 0.15)",
        "card-glow": "0 10px 40px -15px rgba(0, 0, 0, 0.8)",
      },
      screens: {
        xs: "450px",
      },
    },
  },
  plugins: [],
};
