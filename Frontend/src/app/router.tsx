import { Routes, Route } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardPage } from '@/pages/DashboardPage';
import { CreateCasePage } from '@/pages/CreateCasePage';
import { CaseInvestigationPage } from '@/pages/CaseInvestigationPage';
import { EvidenceVerificationPage } from '@/pages/EvidenceVerificationPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export function AppRouter() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/create" element={<CreateCasePage />} />
        <Route path="/cases/:caseId" element={<CaseInvestigationPage />} />
        <Route path="/cases/:caseId/graph" element={<CaseInvestigationPage />} />
        <Route path="/cases/:caseId/findings" element={<CaseInvestigationPage />} />
        <Route path="/evidence" element={<EvidenceVerificationPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppShell>
  );
}

