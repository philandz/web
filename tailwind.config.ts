import type { Config } from "tailwindcss";
import animatePlugin from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./modules/**/*.{ts,tsx}",
    "./providers/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    container: {
      center: true,
      padding: "1.25rem",
      screens: {
        "2xl": "1280px"
      }
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))"
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))"
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))"
        },
        highlight: "hsl(var(--highlight))",
        income: "hsl(var(--income))",
        expense: "hsl(var(--expense))",
        info: "hsl(var(--info))"
      },
      boxShadow: {
        soft: "0 2px 8px rgba(15, 23, 42, 0.06)",
        float: "0 10px 30px rgba(15, 23, 42, 0.08)"
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))"
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.22, 1, 0.36, 1)"
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem"
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "line-reveal": {
          "0%": { strokeDashoffset: "320" },
          "100%": { strokeDashoffset: "0" }
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "0.75" },
          "50%": { opacity: "1" }
        },
        "loading-bar": {
          "0%": { transform: "translateX(-100%)" },
          "50%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(100%)" }
        }
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)"
      },
      animation: {
        "fade-in-up": "fade-in-up 420ms ease-out",
        "line-reveal": "line-reveal 900ms ease-out forwards",
        "pulse-soft": "pulse-soft 1.8s ease-in-out infinite",
        "loading-bar": "loading-bar 1.4s ease-in-out infinite"
      }
    }
  },
  plugins: [animatePlugin]
};

export default config;
