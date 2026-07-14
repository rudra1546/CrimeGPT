/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        police: {
          dark: "#0b132b",      // Deep navy background
          card: "#1c2541",      // Card navy background
          border: "#3a506b",    // Steel blue border
          accent: "#5bc0be",    // Teal primary accent
          glow: "#6fffe9",      // Ice green highlight
          light: "#e2e8f0"      // Light gray text
        }
      }
    },
  },
  plugins: [],
}
