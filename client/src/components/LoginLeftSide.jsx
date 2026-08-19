const LoginLeftSide = ({title, subtitle}) => {
  return (
    <div className="hidden md:flex w-1/2 bg-[#1E3A8A]  relative overflow-hidden border-r border-[#E2E8F0] shadow-2xl">
     

      <div className="relative z-10 flex flex-col items-start justify-center p-12 lg:p-20 w-full h-full">
        <h1 className="text-white text-4xl lg:text-5xl font-bold leading-tight mb-4">
          Eyenit {title && <span className="text-[#F97316]">{title}</span>}
          <br />
          <span className="text-[#EFF6FF]">Management</span> System
        </h1>

        <div className="w-16 h-0.5 bg-linear-to-r from-[#F97316] to-[#EA580C] rounded-full mb-5"></div>

        <p className="text-[#EFF6FF] text-base lg:text-lg max-w-md leading-relaxed">
          {subtitle || "Welcome to the Eyenit Management System. Please log in to continue."}
        </p>
      </div>
    </div>
  );
};

export default LoginLeftSide;
