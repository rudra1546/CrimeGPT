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
          background: "#ffffff",
          surface: "#ffffff",
          border: "#e5e7eb",
          primary: "#111827",
          secondary: "#6b7280",
          muted: "#9ca3af"
        }
      }
    },
  },
  plugins: [],
}
