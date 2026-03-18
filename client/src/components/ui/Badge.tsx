import type { JobPriority, WorkflowStageStatus } from '../../types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'priority' | 'status' | 'stage' | 'default';
  priority?: JobPriority;
  status?: WorkflowStageStatus;
  stage?: string;
  className?: string;
}

function getColorClasses(
  variant: string,
  priority?: JobPriority,
  status?: WorkflowStageStatus,
  stage?: string
): string {
  if (variant === 'priority' && priority) {
    switch (priority) {
      case 'Critical': return 'bg-red-50 text-red-700';
      case 'High':     return 'bg-amber-50 text-amber-700';
      case 'Medium':   return 'bg-gray-100 text-gray-500';
      case 'Low':      return 'bg-gray-100 text-gray-400';
    }
  }
  if (variant === 'status' && status) {
    switch (status) {
      case 'Completed':   return 'bg-emerald-50 text-emerald-700';
      case 'In Progress': return 'bg-amber-50 text-amber-700';
      case 'Blocked':     return 'bg-red-50 text-red-700';
      case 'Not Started': return 'bg-gray-100 text-gray-500';
    }
  }
  if (variant === 'stage' && stage) {
    switch (stage) {
      case 'Engineering': return 'bg-blue-50 text-blue-700';
      case 'WO Release':  return 'bg-violet-50 text-violet-700';
      case 'Materials':   return 'bg-amber-50 text-amber-700';
      case 'Production':  return 'bg-emerald-50 text-emerald-700';
    }
  }
  return 'bg-gray-100 text-gray-600';
}

export default function Badge({
  children,
  variant = 'default',
  priority,
  status,
  stage,
  className = '',
}: BadgeProps) {
  const colorClasses = getColorClasses(variant, priority, status, stage);

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${colorClasses} ${className}`}>
      {children}
    </span>
  );
}
