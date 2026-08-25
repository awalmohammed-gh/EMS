import { useManagement } from "./ManagementContextProvider";

export const useToast = () => {
  const { triggerToast, toast, showToast, setShowToast } = useManagement();
  return {
    showToast: triggerToast,
    setShowToast,
    toast,
    toastState: showToast,
    success: (msg) => triggerToast(msg, "success"),
    error: (msg) => triggerToast(msg, "error"),
    warning: (msg) => triggerToast(msg, "warning"),
    info: (msg) => triggerToast(msg, "info"),
  };
};

export default useToast;

