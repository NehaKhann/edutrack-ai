/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Electric indigo — replaces the old flat indigo scale as the app's primary accent.
        brand: {
          50: "#EEF0FF",
          100: "#E1E4FF",
          200: "#C7CBFF",
          300: "#A6ABFF",
          400: "#8B7FFF",
          500: "#6B5CF6",
          600: "#5B4FEF",
          700: "#4A3FD1",
          800: "#3B32A8",
          900: "#0F1B4C",
        },
        // Deep navy — chrome, dark surfaces, headline ink.
        navy: {
          50: "#EEF0F8",
          100: "#D7DCEF",
          400: "#3D4B8C",
          500: "#243070",
          600: "#1B2B6B",
          700: "#14205A",
          800: "#101A47",
          900: "#0F1B4C",
        },
        // Soft teal — secondary accent, "good / on-track" semantic.
        teal: {
          50: "#E1FAF5",
          100: "#C3F3E9",
          400: "#3FCBB8",
          500: "#1FB3A1",
          600: "#199A8A",
          700: "#0E7A6C",
        },
        // Warm coral — tertiary accent, "attention / critical" semantic.
        coral: {
          50: "#FFEFEB",
          100: "#FFE0D8",
          400: "#FF8A73",
          500: "#FF6B55",
          600: "#F0523C",
          700: "#C7402C",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        display: [
          "Avenir Next",
          "Century Gothic",
          "Segoe UI Semibold",
          "Inter",
          "ui-sans-serif",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(16, 24, 40, 0.05), 0 1px 3px 0 rgba(16, 24, 40, 0.06)",
        "glow-brand": "0 8px 24px -6px rgba(91, 79, 239, 0.45)",
        "glow-teal": "0 8px 24px -6px rgba(31, 179, 161, 0.4)",
        "glow-coral": "0 8px 24px -6px rgba(255, 107, 85, 0.4)",
        glass: "0 20px 45px -18px rgba(15, 27, 76, 0.28), 0 6px 16px -8px rgba(15, 27, 76, 0.12)",
      },
      backgroundImage: {
        "mesh-hero":
          "radial-gradient(120% 140% at 8% 0%, rgba(139,127,255,0.55), transparent 55%), radial-gradient(90% 120% at 100% 10%, rgba(31,179,161,0.4), transparent 60%), linear-gradient(155deg, #0F1B4C 0%, #1B2B6B 55%, #22267A 100%)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: 0, transform: "translateY(14px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.55s cubic-bezier(0.16,1,0.3,1) both",
        shimmer: "shimmer 1.6s linear infinite",
        float: "float 5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
