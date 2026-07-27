/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif'
        ],
      },
      colors: {
        police: {
          background: "#f8fafc",
          surface: "#ffffff",
          border: "#e2e8f0",
          primary: "#1e3a8a",
          secondary: "#2563eb",
          accent: "#b45309",
          text: "#1e293b",
          muted: "#64748b",
          light: "#eff6ff"
        },
        gov: {
          bg: "#f8fafc",
          card: "#ffffff",
          primary: "#1e3a8a",
          secondary: "#2563eb",
          accent: "#b45309",
          text: "#1e293b",
          muted: "#64748b",
          border: "#e2e8f0",
          light: "#eff6ff"
        }
      }
    },
  },
  plugins: [],
}
