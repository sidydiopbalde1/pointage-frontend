/* ─────────────────────────────────────────────────────
   UI component library — single import point
   Usage:
     import { Button, Toast, useToast, Avatar, ... } from '@/components/ui'
   ───────────────────────────────────────────────────── */

export { default as Button }           from './Button';
export type { ButtonVariant, ButtonSize } from './Button';

export { Input, Textarea, Select, FieldWrapper } from './Input';

export { default as Badge }            from './Badge';
export type { BadgeColor }             from './Badge';

export { default as Avatar, AvatarGroup } from './Avatar';

export {
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonRow,
  SkeletonStatCard,
} from './Skeleton';

export { Toast, useToast }             from './Toast';
export type { ToastType }              from './Toast';

export { default as EmptyState }       from './EmptyState';

export { default as PageHeader }       from './PageHeader';

export { default as SearchInput }      from './SearchInput';

export { default as StatCard }         from './StatCard';

export { default as ConfirmModal }     from './ConfirmModal';

export {
  default as Card,
  CardHeader,
  CardTitle,
  CardBody,
  CardFooter,
} from './Card';

/* Framer Motion primitives */
export {
  PageWrapper,
  FadeIn,
  SlideUp,
  ScaleIn,
  SlideDown,
  StaggerContainer,
  StaggerItem,
  AnimatedCard,
  MotionButton,
  ModalWrapper,
  AnimatedToast,
  AnimatePresence,
  motion,
} from './Motion';
