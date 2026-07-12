import type { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
}

export function PageContainer({ children }: PageContainerProps) {
  return (
    <div className="w-full max-w-7xl mx-auto px-8 py-10">
      {children}
    </div>
  );
}
