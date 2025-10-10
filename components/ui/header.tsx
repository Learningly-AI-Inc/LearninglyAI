import React from 'react';
import { cn } from '@/lib/utils';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  className?: string;
}

export function Header({ title, subtitle, children, className }: HeaderProps) {
  return (
    <div className={cn(
      "flex items-center justify-between border-b border-border pb-4 mb-6",
      className
    )}>
      <div className="space-y-1">
        {title && (
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
        )}
        {subtitle && (
          <p className="text-sm text-muted-foreground">
            {subtitle}
          </p>
        )}
      </div>
      {children && (
        <div className="flex items-center space-x-2">
          {children}
        </div>
      )}
    </div>
  );
}

