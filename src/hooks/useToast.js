import { useSnackbar } from "./useSnackbar";

export function useToast() {
  const { enqueueSnackbar, closeSnackbar, showToast } = useSnackbar();

  return {
    showToast,
    removeToast: closeSnackbar,
    enqueueSnackbar,
    closeSnackbar,
  };
}

export default useToast;
