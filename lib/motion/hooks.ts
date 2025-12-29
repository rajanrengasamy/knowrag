
import { useReducedMotion } from "motion/react";

/**
 * Hook to check if the user prefers reduced motion.
 * Returns true if the user has enabled "reduce motion" in their OS accessibility settings.
 */
export const useReducedMotionPreference = () => {
    const shouldReduceMotion = useReducedMotion();
    return shouldReduceMotion;
};
