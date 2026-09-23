/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#0f172a',    // Slate 900 sidebar background
          sidebar: '#0b132b', // Deep dark navy
          emerald: '#059669', // Primary green
          lightGreen: '#10b981',
          accent: '#10b981',
          card: '#ffffff',
          surface: '#f8fafc', // Soft light gray background
        }
      }
    },
  },
  plugins: [],
}

