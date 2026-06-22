/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        primary: {
          50: "#FFF3ED",
          100: "#FFE2D4",
          200: "#FFC5A8",
          300: "#FFA77D",
          400: "#FF8A51",
          500: "#FF6B35",
          600: "#E8501A",
          700: "#BC3F14",
          800: "#8F2F0E",
          900: "#631F09",
        },
        secondary: {
          50: "#E9FAF8",
          100: "#CEF4EF",
          200: "#9CE9DF",
          300: "#6BDFCF",
          400: "#39D4BF",
          500: "#2EC4B6",
          600: "#249C91",
          700: "#1A746C",
          800: "#114C47",
          900: "#072422",
        },
        neutral: {
          50: "#FAFAF7",
          100: "#F0EFE9",
          200: "#E0DFD4",
          300: "#CFCFBE",
          400: "#BFBFA9",
          500: "#8F8F7A",
          600: "#5F5F50",
          700: "#3F3F35",
          800: "#2B2B2B",
          900: "#1A1A1A",
        },
      },
      fontFamily: {
        display: ["Poppins", "system-ui", "sans-serif"],
        body: ["'Noto Sans SC'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 4px 20px rgba(43, 43, 43, 0.06)",
        cardHover: "0 8px 30px rgba(255, 107, 53, 0.12)",
        glow: "0 0 20px rgba(46, 196, 182, 0.4)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-up": "slideUp 0.4s ease-out",
        "bounce-in": "bounceIn 0.5s ease-out",
        shimmer: "shimmer 2s infinite",
        float: "float 3s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        bounceIn: {
          "0%": { transform: "scale(0.8)", opacity: "0" },
          "50%": { transform: "scale(1.05)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
    },
  },
  plugins: [],
};
