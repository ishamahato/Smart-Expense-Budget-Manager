import {
  Car,
  Clapperboard,
  Coffee,
  Dumbbell,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  PawPrint,
  Plane,
  ReceiptText,
  ShoppingBag,
  Smartphone,
  Tag,
  UtensilsCrossed,
} from 'lucide-react';
import cn from '../../utils/cn';

/**
 * Explicit map rather than `import * as Icons` — a namespace import defeats
 * tree-shaking and drags the entire lucide set (~750 kB) into the bundle.
 * Keep this in sync with CATEGORY_ICON_CHOICES in utils/constants.js.
 */
const ICONS = {
  UtensilsCrossed,
  Car,
  ShoppingBag,
  ReceiptText,
  Home,
  Clapperboard,
  HeartPulse,
  GraduationCap,
  Plane,
  Gift,
  Dumbbell,
  Coffee,
  Smartphone,
  PawPrint,
  Tag,
};

const SIZES = {
  sm: 'h-7 w-7 rounded-md',
  md: 'h-9 w-9 rounded-lg',
  lg: 'h-11 w-11 rounded-xl',
};
const GLYPH = { sm: 'h-3.5 w-3.5', md: 'h-4 w-4', lg: 'h-5 w-5' };

/** Renders a category's icon tinted with its colour, falling back to Tag. */
export default function CategoryIcon({ name = 'Tag', color = '#64748b', size = 'md', className }) {
  const Icon = ICONS[name] || Tag;

  return (
    <span
      className={cn('grid shrink-0 place-items-center', SIZES[size], className)}
      style={{ backgroundColor: `${color}1f`, color }}
      aria-hidden
    >
      <Icon className={GLYPH[size]} strokeWidth={2} />
    </span>
  );
}
