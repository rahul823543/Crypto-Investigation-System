import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Home } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="py-20 text-center max-w-md mx-auto space-y-4">
      <div className="w-16 h-16 rounded-3xl bg-purple-50 text-[#7E22CE] flex items-center justify-center mx-auto shadow-sm">
        <ShieldAlert className="h-8 w-8" />
      </div>
      <h2 className="font-display font-bold text-3xl text-[#0F172A] tracking-tight">
        404 - Page Not Found
      </h2>
      <p className="text-xs sm:text-sm text-[#526077]">
        The requested forensic triage resource, case, or route does not exist.
      </p>
      <div className="pt-4">
        <Button
          variant="primary"
          onClick={() => navigate('/')}
          leftIcon={<Home className="h-4 w-4" />}
        >
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
};
