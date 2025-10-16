// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  // NativeWind v4 preset adds the RN-safe defaults
  presets: [require("nativewind/preset")],

  // Only watch RN source files to avoid perf issues & web-only paths
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],

  theme: {
    extend: {
      // keep it minimal; RN doesn't use CSS vars
      borderRadius: {
        "2xl": "1rem",
      },
    },
  },

  // RN doesn't support most Tailwind web plugins (e.g., tailwindcss-animate)
  plugins: [],
};
