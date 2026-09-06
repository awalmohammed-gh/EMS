const Loading = () => {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 min-h-100">
      <div className="relative">
        {/* Outer spinner ring */}
        <div className="w-16 h-16 rounded-full border-4 border-slate-200 dark:border-slate-800 border-t-[#002185] animate-spin">
        </div>

        {/* Inner icon/pulse */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="w-5 h-5 bg-[#ff5500] rounded-full animate-ping opacity-75"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-[#002185] rounded-full"></div>
        </div>
      </div>

      <div className="mt-6 text-center">
        <p className="text-[#0F172A] text-lg font-bold tracking-wider">
          <span className="text-[#002185]">Eye</span>
          <span className="text-[#ff5500]">nit</span>
        </p>
        <div className="flex justify-center gap-1 mt-3">
          <span
            className="w-2 h-2 bg-[#002185] rounded-full animate-bounce"
            style={{ animationDelay: "0s" }}
          ></span>
          <span
            className="w-2 h-2 bg-[#ff5500] rounded-full animate-bounce"
            style={{ animationDelay: "0.2s" }}
          ></span>
          <span
            className="w-2 h-2 bg-[#002185] rounded-full animate-bounce"
            style={{ animationDelay: "0.4s" }}
          ></span>
        </div>
      </div>
    </div>
  );
};

export default Loading;
