import { motion, useReducedMotion } from "framer-motion";
import {
  pageVariants,
  reducedPageVariants,
} from "../../utils/motion";

/**
 * PageTransition wrapper component
 * Provides subtle page fade and slight vertical lift on entry
 */
export const PageTransition = ({
  children,
  className = "w-full",
  layoutId,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const variants = shouldReduceMotion ? reducedPageVariants : pageVariants;

  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      layoutId={layoutId}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
