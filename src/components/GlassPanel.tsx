import type { ComponentPropsWithRef } from 'react';

export function GlassPanel({ className = '', children, ...props }: ComponentPropsWithRef<'div'>) {
  return <div className={`glass ${className}`} {...props}>{children}</div>;
}
