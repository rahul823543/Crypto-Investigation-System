import { Routes, Route } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardPage } from '@/pages/DashboardPage';
import { CreateCasePage } from '@/pages/CreateCasePage';
import { CaseInvestigationPage } from '@/pages/CaseInvestigationPage';
import { ReportPage } from '@/pages/ReportPage';
import { EvidenceVerificationPage } from '@/pages/EvidenceVerificationPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/cases/new" element={<CreateCasePage />} />
        <Route path="/cases/:caseId" element={<CaseInvestigationPage />} />
        <Route path="/cases/:caseId/report" element={<ReportPage />} />
        <Route path="/evidence/verify" element={<EvidenceVerificationPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
