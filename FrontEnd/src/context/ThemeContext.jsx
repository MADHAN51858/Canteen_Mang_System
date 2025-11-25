import { createContext, useState, useMemo, useContext } from "react";
import { ThemeProvider as MuiThemeProvider, createTheme } from "@mui/material/styles";

export const ThemeContext = createContext();

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

export function ThemeProvider({ children, isDark, toggleTheme }) {
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: isDark ? "dark" : "light",
          primary: {
            main: isDark ? "#42a5f5" : "#1565c0",
            light: isDark ? "#64b5f6" : "#42a5f5",
            dark: isDark ? "#1e88e5" : "#0d47a1",
          },
          secondary: {
            main: isDark ? "#4db8b3" : "#2fb6b3",
          },
          background: {
            default: isDark ? "#0f172a" : "#f5f7fa",
            paper: isDark ? "#1a1f3a" : "#ffffff",
          },
          text: {
            primary: isDark ? "#f1f5f9" : "#0f172a",
            secondary: isDark ? "#cbd5e1" : "#64748b",
          },
          divider: isDark ? "#334155" : "#e2e8f0",
          success: {
            main: isDark ? "#4caf50" : "#4caf50",
          },
          error: {
            main: isDark ? "#ef5350" : "#f44336",
          },
          warning: {
            main: isDark ? "#ffb74d" : "#ff9800",
          },
          info: {
            main: isDark ? "#64b5f6" : "#2196f3",
          },
        },
        typography: {
          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
          h1: { fontWeight: 800 },
          h2: { fontWeight: 800 },
          h3: { fontWeight: 800 },
          h4: { fontWeight: 700 },
          h5: { fontWeight: 700 },
          h6: { fontWeight: 600 },
        },
        components: {
          MuiAppBar: {
            styleOverrides: {
              root: {
                backdropFilter: "blur(12px)",
                backgroundColor: isDark
                  ? "rgba(26, 31, 58, 0.95)"
                  : "rgba(255, 255, 255, 0.95)",
                borderBottom: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: "none",
                fontWeight: 600,
                borderRadius: "8px",
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                borderRadius: "12px",
                transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
                backgroundColor: isDark ? "#1a1f3a" : undefined,
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundColor: isDark ? "#1a1f3a" : undefined,
              },
            },
          },
        },
      }),
    [isDark]
  );

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>
    </ThemeContext.Provider>
  );
}

