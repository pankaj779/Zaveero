import {
  Check,
  Globe,
  Mail,
  Menu,
  Share2,
  Video,
  X,
  type LucideIcon,
} from 'lucide-react';

/**
 * Central icon map — import icons from here instead of lucide-react in feature code.
 */
export const icons = {
  menu: Menu,
  close: X,
  check: Check,
  globe: Globe,
  mail: Mail,
  share: Share2,
  video: Video,
} as const satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof icons;

export function getIcon(name: IconName): LucideIcon {
  return icons[name];
}
