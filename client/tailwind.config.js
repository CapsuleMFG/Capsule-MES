/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'rivian': {
          black: '#1C2422',
          'soft-black': '#2A3230',
          hover: '#353D3B',
          accent: '#2D9CFF',
        },
        'priority': {
          critical: '#EF4444',
          high: '#F97316',
          medium: '#EAB308',
          low: '#9CA3AF',
        },
        'stage': {
          engineering: '#3B82F6',
          'wo-release': '#8B5CF6',
          materials: '#F59E0B',
          production: '#10B981',
        },
        'status': {
          'not-started': '#6B7280',
          'in-progress': '#EAB308',
          completed: '#10B981',
          blocked: '#EF4444',
        }
      },
    },
  },
  plugins: [],
}
