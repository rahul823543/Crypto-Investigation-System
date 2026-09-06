import React from 'react';
import { HeroSection } from '@/components/dashboard/HeroSection';
import { MetricCards } from '@/components/dashboard/MetricCards';
import { CaseRosterTable } from '@/components/dashboard/CaseRosterTable';
import { SystemOverviewSection } from '@/components/dashboard/SystemOverviewSection';

export const DashboardPage: React.FC = () => {
  return (
    <div className="space-y-4">
      {/* Clean Hero Search & Telemetry Preview */}
      <HeroSection />

      {/* 4 Metric Benchmarks */}
      <MetricCards />

      {/* Filterable Active Case Roster Table */}
      <CaseRosterTable />

      {/* Lower System Overview & Pipeline Architecture */}
      <SystemOverviewSection />
    </div>
  );
};
