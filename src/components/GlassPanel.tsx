import type { ComponentPropsWithoutRef } from 'react';

export function GlassPanel({ className = '', children, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div className={`glass ${className}`} {...props}>{children}</div>;
}
