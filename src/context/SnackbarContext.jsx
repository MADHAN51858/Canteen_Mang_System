import React, { createContext, useContext, useState, useCallback } from "react";
import { Snackbar, Alert, Stack, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

export const SnackbarContext = createContext(null);

export function SnackbarProvider({ children }) {
  const [snackbars, setSnackbars] = useState([]);

  const closeSnackbar = useCallback((id) => {
    setSnackbars((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const enqueueSnackbar = useCallback((message, options = {}) => {
    const id = Date.now() + Math.random().toString(36).slice(2, 7);

    // Support options as string ('success') or object ({ variant: 'success', autoHideDuration: 4000 })
    let variant = "info";
    let autoHideDuration = 3000;

    if (typeof options === "string") {
      variant = options;
    } else if (typeof options === "object" && options !== null) {
      if (options.variant) variant = options.variant;
      if (options.autoHideDuration !== undefined) autoHideDuration = options.autoHideDuration;
    }

    // Normalize variant (e.g., 'danger' -> 'error')
    if (variant === "danger") variant = "error";
    if (!["success", "error", "warning", "info"].includes(variant)) {
      variant = "info";
    }

    const newSnack = { id, message, variant, autoHideDuration };
    setSnackbars((prev) => [...prev, newSnack]);

    if (autoHideDuration > 0) {
      setTimeout(() => {
        closeSnackbar(id);
      }, autoHideDuration);
    }

    return id;
  }, [closeSnackbar]);

  // Backward compatibility alias for showToast
  const showToast = useCallback((msg, type = "error", duration = 4000) => {
    return enqueueSnackbar(msg, { variant: type, autoHideDuration: duration });
  }, [enqueueSnackbar]);

  return (
    <SnackbarContext.Provider value={{ enqueueSnackbar, closeSnackbar, showToast }}>
      {children}
      {/* Floating Snackbars Stack */}
      <Stack
        spacing={1.5}
        sx={{
          position: "fixed",
          top: { xs: 16, sm: 24 },
          right: { xs: 16, sm: 24 },
          zIndex: 99999,
          maxWidth: { xs: "calc(100vw - 32px)", sm: 420 },
          pointerEvents: "none",
        }}
      >
        {snackbars.map((snack) => (
          <Alert
            key={snack.id}
            severity={snack.variant}
            variant="filled"
            sx={{
              pointerEvents: "auto",
              borderRadius: "12px",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.18)",
              fontWeight: 600,
              fontSize: "0.9rem",
              alignItems: "center",
              py: 1,
              px: 2,
              animation: "slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
              "@keyframes slideInRight": {
                from: { transform: "translateX(100%)", opacity: 0 },
                to: { transform: "translateX(0)", opacity: 1 },
              },
            }}
            action={
              <IconButton
                size="small"
                aria-label="close"
                color="inherit"
                onClick={() => closeSnackbar(snack.id)}
                sx={{ p: 0.5, ml: 1, opacity: 0.85, "&:hover": { opacity: 1 } }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            }
          >
            {snack.message}
          </Alert>
        ))}
      </Stack>
    </SnackbarContext.Provider>
  );
}

export function useSnackbar() {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error("useSnackbar must be used within a SnackbarProvider");
  }
  return context;
}
