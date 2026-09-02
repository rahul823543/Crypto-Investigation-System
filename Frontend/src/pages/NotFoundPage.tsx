import { useNavigate } from 'react-router-dom';
import { PageFrame } from '@/components/layout/PageFrame';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Ghost } from 'lucide-react';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <PageFrame className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-cyber-surface-2 border border-cyber-border mb-6">
        <Ghost className="h-10 w-10 text-cyber-text-muted" />
      </div>
      <h1 className="text-4xl font-bold text-cyber-text mb-2 font-mono">404</h1>
      <p className="text-lg text-cyber-text-dim mb-1">Page Not Found</p>
      <p className="text-sm text-cyber-text-muted max-w-sm mb-8">
        The investigation trail ends here. This page doesn't exist or has been moved.
      </p>
      <Button variant="default" onClick={() => navigate('/')} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Return to Dashboard
      </Button>
    </PageFrame>
  );
}
