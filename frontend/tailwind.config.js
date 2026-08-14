/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Crest green (from the "MS" monogram/book) — Metropolitan School's primary color.
        // (Token still named "brand" so every existing bg-brand-*/text-brand-* usage recolors for free.)
        brand: {
          50: "#EAF7EF",
          100: "#CFEEDA",
          200: "#9FDCB8",
          300: "#6BC690",
          400: "#3FAD6E",
          500: "#1B7A3E",
          600: "#156633",
          700: "#0F5028",
          800: "#0C3F20",
          900: "#0A2E18",
        },
        // Near-neutral charcoal, only a whisper of green — chrome, dark surfaces, headline ink.
        // Deliberately desaturated so it stays out of the way of brand/teal/coral/amber status
        // colors instead of competing with them (a fully-saturated dark green here made every
        // status color look green too, since they're all overlaid on this base at low opacity).
        navy: {
          50: "#F1F2F0",
          100: "#DFE2DC",
          400: "#66716A",
          500: "#4A544D",
          600: "#363F38",
          700: "#262D27",
          800: "#1A1F1B",
          900: "#101410",
        },
        // Crest blue (the shield's ring color) — secondary accent, "good / on-track" semantic.
        // A genuinely different hue from brand green so the two never blur together.
        teal: {
          50: "#E7F3FB",
          100: "#C7E4F6",
          400: "#4FA8DE",
          500: "#2E86C1",
          600: "#216FA3",
          700: "#17567F",
        },
        // Crest red (crest border) — tertiary accent, reserved for "attention / critical" semantic
        // (errors, destructive actions, absences) rather than general UI, so it stays a clear signal.
        coral: {
          50: "#FDECEC",
          100: "#FAD2D1",
          400: "#E1544D",
          500: "#D6332B",
          600: "#B8261F",
          700: "#931D18",
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
        "glow-brand": "0 8px 24px -6px rgba(21, 102, 51, 0.45)",
        "glow-teal": "0 8px 24px -6px rgba(46, 134, 193, 0.4)",
        "glow-coral": "0 8px 24px -6px rgba(214, 51, 43, 0.4)",
        "glow-amber": "0 8px 24px -6px rgba(245, 158, 11, 0.4)",
        glass: "0 20px 45px -18px rgba(10, 46, 24, 0.28), 0 6px 16px -8px rgba(10, 46, 24, 0.12)",
      },
      backgroundImage: {
        "mesh-hero":
          "radial-gradient(120% 140% at 8% 0%, rgba(63,173,110,0.55), transparent 55%), radial-gradient(90% 120% at 100% 10%, rgba(46,134,193,0.4), transparent 60%), linear-gradient(155deg, #0A2E18 0%, #0F5028 55%, #156633 100%)",
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
