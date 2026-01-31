/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/globals.css",
  ],
  theme: {
    extend: {
      colors: { brand: "#873746", ink: "#101828" },
      borderRadius: {
        DEFAULT: "14px",
        sm: "12px",
        md: "14px",
        lg: "18px",
        xl: "22px",
        "2xl": "24px",
        full: "9999px",
      },
      boxShadow: { soft: "0 10px 30px rgba(0,0,0,0.10)" },
    },
  },
  plugins: [],
};
