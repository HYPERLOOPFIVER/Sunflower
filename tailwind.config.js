/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],  // Ensure Tailwind scans your files
  theme: {
    extend: {
      colors: {
        dark: "#121212",
        primary: "#1E1E1E",
        accent: "#BB86FC",
        sent: "#00c896",
        received: "#333",
      },
    },
  },
  plugins: [],
};
