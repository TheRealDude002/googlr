'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'cta';

interface SkeuButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  block?: boolean;
  small?: boolean;
  children: ReactNode;
}

/**
 * Every Googlr button: gradient body (lit from above), solid bottom edge
 * shadow for 3D weight, ambient glow, inset top highlight, gloss overlay,
 * and a physical press on :active.
 */
export default function SkeuButton({
  variant = 'secondary',
  block = false,
  small = false,
  className = '',
  children,
  ...rest
}: SkeuButtonProps) {
  const classes = [
    'btn',
    `btn-${variant}`,
    block ? 'btn-block' : '',
    small ? 'btn-sm' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type="button" className={classes} {...rest}>
      {children}
    </button>
  );
}
