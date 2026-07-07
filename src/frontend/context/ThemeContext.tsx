"use client";

import { createContext, useContext } from "react";

type ThemeContextValue = {
  theme: "light";
};

const ThemeContext = createContext<ThemeContextValue>({ theme: "light" });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeContext.Provider value={{ theme: "light" }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  return useContext(ThemeContext);
}
