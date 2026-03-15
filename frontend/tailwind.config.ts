import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Royal blue palette
        royal: {
          50: "#eef2ff",
          100: "#dbe4ff",
          200: "#bfcfff",
          300: "#93adff",
          400: "#6684ff",
          500: "#4361ee",
          600: "#2d42d4",
          700: "#2534ab",
          800: "#232e8b",
          900: "#222b72",
          950: "#151a44",
        },
        // Soft dark text alternatives (not pure black)
        ink: {
          900: "#1a1a2e",  // Primary text
          800: "#2d2d3f",  // Headings
          700: "#3d3d50",  // Secondary
          600: "#52526b",  // Muted
          500: "#6b6b85",  // Subtle
          400: "#8888a0",  // Disabled
          300: "#aaaabe",  // Placeholder
        },
        // Surface colors for light theme
        surface: {
          50: "#ffffff",
          100: "#f8f9fc",
          150: "#f1f3f8",
          200: "#e8ebf2",
          300: "#d1d5e0",
          400: "#b0b5c4",
          500: "#8b91a5",
          600: "#6b7185",
          700: "#4a4f62",
          800: "#2d3142",
          900: "#1a1d2e",
          950: "#0d0f1a",
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 10px 25px -5px rgba(67, 97, 238, 0.1), 0 8px 10px -6px rgba(67, 97, 238, 0.05)',
        'nav': '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        'hero': '0 20px 60px -15px rgba(67, 97, 238, 0.15)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 2s infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'gradient': 'gradient 8s ease infinite',
        'slide-up': 'slideUp 0.5s ease-out',
        'fade-in': 'fadeIn 0.6s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
