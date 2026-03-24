'use client';

/**
 * Reusable Framer Motion primitives for consistent, accessible animations
 * across the entire application.
 */

import {
  motion,
  AnimatePresence,
  type Variants,
  type HTMLMotionProps,
} from 'framer-motion';
import { type ReactNode, forwardRef } from 'react';

/* ── Shared easing ── */
const ease = [0.4, 0, 0.2, 1] as const; // material ease-in-out

/* ── Presets ── */

const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25, ease } },
  exit: { opacity: 0, transition: { duration: 0.18, ease } },
};

const slideUpVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease } },
  exit: { opacity: 0, y: 10, transition: { duration: 0.2, ease } },
};

const slideDownVariants: Variants = {
  hidden: { opacity: 0, y: -12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.18, ease } },
};

const scaleVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.22, ease } },
  exit: { opacity: 0, scale: 0.96, transition: { duration: 0.15, ease } },
};

// Mobile: slides up from bottom; desktop: scales in from center
const modalVariants: Variants = {
  hidden: { opacity: 0, y: '100%' },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, ease: [0.32, 0.72, 0, 1] },
  },
  exit: {
    opacity: 0,
    y: '100%',
    transition: { duration: 0.22, ease },
  },
};

const modalDesktopVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.24, ease },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 4,
    transition: { duration: 0.16, ease },
  },
};

const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.18 } },
};

const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

const staggerItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease } },
};

/* ── Page transition wrapper ── */

interface PageWrapperProps {
  children: ReactNode;
  className?: string;
}

export function PageWrapper({ children, className }: PageWrapperProps) {
  return (
    <motion.div
      variants={slideUpVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Fade in ── */

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

export function FadeIn({ children, delay = 0, className }: FadeInProps) {
  return (
    <motion.div
      variants={fadeVariants}
      initial="hidden"
      animate="visible"
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Slide up ── */

export function SlideUp({
  children,
  delay = 0,
  className,
}: FadeInProps) {
  return (
    <motion.div
      variants={slideUpVariants}
      initial="hidden"
      animate="visible"
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Stagger container + item ── */

interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function StaggerContainer({ children, className, delay = 0 }: StaggerContainerProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      transition={{ delayChildren: delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={staggerItem} className={className}>
      {children}
    </motion.div>
  );
}

/* ── Animated card (hover elevation) ── */

interface AnimatedCardProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  className?: string;
}



export function AnimatedCard({ children, className, ...props }: AnimatedCardProps) {
  return (
    <motion.div
      whileHover={{ y: -3, boxShadow: '0 12px 32px -8px rgba(79,70,229,0.18), 0 2px 8px -2px rgba(15,23,42,0.08)' }}
      transition={{ duration: 0.2, ease }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/* ── Motion button (scale feedback) ── */

interface MotionButtonProps extends HTMLMotionProps<'button'> {
  children: ReactNode;
  className?: string;
}

export const MotionButton = forwardRef<HTMLButtonElement, MotionButtonProps>(
  ({ children, className, ...props }, ref) => (
    <motion.button
      ref={ref}
      whileHover={{ scale: 1.025, y: -1 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.15, ease }}
      className={className}
      {...props}
    >
      {children}
    </motion.button>
  ),
);
MotionButton.displayName = 'MotionButton';

/* ── Modal overlay + content ── */

interface ModalWrapperProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  isMobile?: boolean;
}

export function ModalWrapper({ open, onClose, children, isMobile = false }: ModalWrapperProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-overlay"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={onClose}
        >
          <motion.div
            className="modal-content"
            variants={isMobile ? modalVariants : modalDesktopVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Toast notification ── */

interface ToastProps {
  show: boolean;
  children: ReactNode;
  className?: string;
}

export function AnimatedToast({ show, children, className }: ToastProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={className}
          variants={slideDownVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Slide down (for dropdowns, alerts) ── */

export function SlideDown({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={slideDownVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Scale in ── */

export function ScaleIn({
  children,
  delay = 0,
  className,
}: FadeInProps) {
  return (
    <motion.div
      variants={scaleVariants}
      initial="hidden"
      animate="visible"
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Re-export AnimatePresence for convenience ── */
export { AnimatePresence, motion };
