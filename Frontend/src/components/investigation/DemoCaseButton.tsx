import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';

export function DemoCaseButton() {
  const navigate = useNavigate();

  return (
    <Button
      variant="default"
      onClick={() => navigate('/cases/case_demo_001')}
      className="gap-2"
    >
      <Zap className="h-4 w-4" />
      Open Demo Case
    </Button>
  );
}
