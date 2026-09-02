import { useParams, useNavigate } from 'react-router-dom';
import { PageFrame } from '@/components/layout/PageFrame';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText } from 'lucide-react';

export function ReportPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();

  return (
    <PageFrame>
      <Button variant="ghost" onClick={() => navigate(`/cases/${caseId}`)} className="gap-2 mb-6 -ml-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Investigation
      </Button>

      <Card className="max-w-2xl mx-auto border-cyber-cyan/10">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyber-cyan/10 border border-cyber-cyan/20 mb-4">
            <FileText className="h-8 w-8 text-cyber-cyan" />
          </div>
          <h2 className="text-xl font-bold text-cyber-text mb-2">Investigation Report</h2>
          <p className="text-sm text-cyber-text-dim max-w-md">
            Generate a forensic report with risk score, findings summary, and evidence hash for on-chain storage.
          </p>
          <p className="text-xs text-cyber-amber mt-4 font-medium">
            🚧 Coming in Phase 4 — Advanced Analysis & Evidence UI
          </p>
        </CardContent>
      </Card>
    </PageFrame>
  );
}
