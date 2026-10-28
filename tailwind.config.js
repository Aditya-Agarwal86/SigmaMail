/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          hover: "#1B382C",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        
        // Brand palette named tokens
        ivory: {
          DEFAULT: "#F7F8F4",
          subtle: "#F9FAF7",
        },
        forest: {
          DEFAULT: "#244A3A",
          hover: "#1B382C",
          dark: "#142820",
          light: "#33614E",
        },
        sage: {
          DEFAULT: "#E5EBE1",
          subtle: "#F0F2EB",
          light: "#EDF2EA",
          border: "#D3DCD0",
        },
        charcoal: {
          DEFAULT: "#252923",
          muted: "#697168",
          light: "#8C948B",
        },
        divider: "#E1E5DC",
      },
      borderRadius: {
        xl: "12px",
        lg: "10px",
        md: "8px",
        sm: "6px",
      },
      boxShadow: {
        subtle: "0 1px 2px 0 rgba(36, 74, 58, 0.04)",
        card: "0 1px 3px 0 rgba(36, 74, 58, 0.05), 0 1px 2px -1px rgba(36, 74, 58, 0.04)",
        dropdown: "0 4px 12px -2px rgba(36, 74, 58, 0.08), 0 2px 6px -1px rgba(36, 74, 58, 0.04)",
      },
    },
  },
  plugins: [],
};
