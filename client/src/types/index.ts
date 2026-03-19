// Re-export shared types for use in client
export * from '../../../shared/types';

// Reports
export interface KpiReport {
  jobsCompleted: number;
  avgCycleTimeDays: number;
  onTimeRate: number;
  scrapRate: number;
  totalLaborHours: number;
  laborByStage: Record<string, number>;
}

export interface ReportFilters {
  from?: string;
  to?: string;
}
