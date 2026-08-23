import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ShieldCheckIcon, UserIcon } from "lucide-react";
import eyenitLogo from "../assets/eyenit_logo.png";

const WelcomePage = () => {
  const portalOptions = [
    {
      to: "/login/admin",
      role: "admin",
      title: "Admin Portal",
      subtitle: "Please enter your credentials to access the admin panel",
      icon: ShieldCheckIcon,
    },
    {
      to: "/login/employee",
      role: "employee",
      title: "Employee Portal",
      subtitle: "Please enter your credentials to access the employee portal",
      icon: UserIcon,
    },
  ];

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.96 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
    },
  };

  const floatVariants = {
    animate: {
      y: [0, -12, 0],
      transition: {
        duration: 6,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  const logoPulse = {
    animate: {
      scale: [1, 1.03, 1],
      opacity: [0.05, 0.08, 0.05],
      transition: {
        duration: 8,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Soft Blue and White Gradient Background */}
      <div className="absolute inset-0 bg-linear-to-br from-[#eef2f7] via-[#f8f9fc] to-[#e3e9f2]" />

      {/* Subtle blue accents with motion */}
      <motion.div
        variants={floatVariants}
        animate="animate"
        className="absolute top-0 right-0 w-96 h-96 rounded-full bg-[#002185]/3 blur-3xl"
      />
      <motion.div
        variants={floatVariants}
        animate="animate"
        style={{ animationDelay: "2s" }}
        className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-[#002185]/3 blur-3xl"
      />

      {/* Background Logo - Blurred with subtle motion */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-full h-full flex items-center justify-center">
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-8 p-8 opacity-5">
            {[...Array(9)].map((_, index) => (
              <div key={index} className="flex items-center justify-center">
                <img
                  src={eyenitLogo}
                  alt=""
                  className="w-48 h-auto object-contain blur-[2px]"
                />
              </div>
            ))}
          </div>
          <motion.div
            variants={logoPulse}
            animate="animate"
            className="absolute inset-0 flex items-center justify-center"
          >
            <img
              src={eyenitLogo}
              alt=""
              className="w-96 h-auto object-contain opacity-5 blur-xs"
            />
          </motion.div>
        </div>
      </div>

      {/* Content - on top of background */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-md flex flex-col items-center"
      >
        {/* Logo/Brand */}
        <motion.div variants={itemVariants} className="mb-4 text-center">
          <div className="flex items-center justify-center">
            <img
              className="w-30 h-auto object-contain"
              src={eyenitLogo}
              alt="Eyenit"
            />
          </div>
          <p className="text-[#002185] text-sm font-medium">
            Employee Management System
          </p>
        </motion.div>

        {/* Welcome Section */}
        <motion.div variants={itemVariants} className="text-center mb-10">
          <h2 className="text-3xl font-bold text-[#002185] mb-3 tracking-tight">
            Welcome Back
          </h2>
          <p className="text-[#64748B] max-w-md mx-auto">
            Select your portal to securely access the system
          </p>
        </motion.div>

        {/* Portal Options */}
        <div className="w-full space-y-4">
          {portalOptions.map((option) => (
            <motion.div
              key={option.role}
              variants={cardVariants}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <Link
                to={option.to}
                className="block bg-[#FFFFFF] border border-[#E2E8F0] shadow-md hover:border-[#002185] hover:shadow-lg transition-all duration-300 rounded-xl p-6 group"
              >
                <div className="flex items-center">
                  <motion.div
                    whileHover={{ rotate: [0, -8, 8, 0] }}
                    transition={{ duration: 0.4 }}
                    className="w-12 h-12 rounded-lg bg-[#002185] flex items-center justify-center mr-4 group-hover:bg-[#ff5500] transition-colors duration-300"
                  >
                    <option.icon className="w-6 h-6 text-white" />
                  </motion.div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-[#002185] group-hover:text-[#ff5500] transition-colors duration-300">
                      {option.title}
                    </h3>
                    <p className="text-sm text-[#64748B]">{option.subtitle}</p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Quick link to create admin account */}
        <motion.div variants={itemVariants} className="mt-6 text-center text-xs text-[#64748B]">
          First time setting up?{" "}
          <Link
            to="/admin/register"
            className="text-[#002185] font-bold hover:text-[#ff5500] hover:underline"
          >
            Create an Administrator Account
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default WelcomePage;
