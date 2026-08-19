import { useEffect } from "react";

const Toaster = ({ message, type = "success", onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return ( 
    <div
      className={`fixed top-5 right-5 z-50 flex w-87.5 items-center justify-between rounded-lg border bg-white p-4 shadow-lg ${
        type === "success"
          ? "border-green-200"
          : type === "error"
            ? "border-red-200"
            : type === "warning"
              ? "border-yellow-200"
              : "border-blue-200"
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Status Icon */}
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full ${
            type === "success"
              ? "bg-green-100 text-green-600"
              : type === "error"
                ? "bg-red-100 text-red-600"
                : type === "warning"
                  ? "bg-yellow-100 text-yellow-600"
                  : "bg-blue-100 text-blue-600"
          }`}
        >
          {type === "success" && "✓"}
          {type === "error" && "✕"}
          {type === "warning" && "!"}
          {type === "info" && "i"}
        </div>

        <p className="text-sm font-medium text-gray-700">{message}</p>
      </div>

      {/* Close Button */}
      <button
        onClick={onClose}
        className="ml-4 text-xl text-gray-400 hover:text-gray-600"
      >
        ×
      </button>
    </div>
  );
};

export default Toaster;
