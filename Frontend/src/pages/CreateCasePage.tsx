import { PageFrame } from '@/components/layout/PageFrame';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Construction } from 'lucide-react';

export function CreateCasePage() {
  const navigate = useNavigate();

  return (
    <PageFrame>
      <Button variant="ghost" onClick={() => navigate('/')} className="gap-2 mb-6 -ml-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Button>

      <Card className="max-w-2xl mx-auto border-cyber-cyan/10">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyber-cyan/10 border border-cyber-cyan/20 mb-4">
            <Construction className="h-8 w-8 text-cyber-cyan" />
          </div>
          <h2 className="text-xl font-bold text-cyber-text mb-2">Create Investigation</h2>
          <p className="text-sm text-cyber-text-dim max-w-md mb-1">
            Enter an EVM wallet address, select a chain, and choose between demo or live mode.
          </p>
          <p className="text-xs text-cyber-amber mt-4 font-medium">
            🚧 Coming in Phase 2 — Case Creation & Investigation Flow
          </p>
        </CardContent>
      </Card>
    </PageFrame>
  );
}
