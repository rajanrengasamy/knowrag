
import type { Transition, Variants } from "motion/react";

// Transition presets
export const transitions = {
    spring: { type: "spring", stiffness: 300, damping: 25 } as Transition,
    springGentle: { type: "spring", stiffness: 200, damping: 30 } as Transition,
    springQuick: { type: "spring", stiffness: 500, damping: 30 } as Transition,
    fade: { duration: 0.2 } as Transition,
    fadeSlow: { duration: 0.4 } as Transition,
} as const;

// Common animation variants
export const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: transitions.spring
    },
    exit: { opacity: 0, y: 10 }
};

export const fadeInSlide: Variants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
        opacity: 1,
        x: 0,
        transition: transitions.spring
    },
    exit: { opacity: 0, x: -10 }
};

export const scaleIn: Variants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: transitions.spring
    },
    exit: { opacity: 0, scale: 0.95 }
};

export const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05,
            delayChildren: 0.1
        }
    }
};

// Hover states
export const hoverLift = {
    y: -2,
    transition: { duration: 0.2 }
};

export const hoverScale = {
    scale: 1.02,
    transition: transitions.springQuick
};

export const tapScale = {
    scale: 0.95,
    transition: transitions.springQuick
};
