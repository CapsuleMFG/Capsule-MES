import type { JobPriority, WorkflowStageStatus } from '../../types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'priority' | 'status' | 'stage' | 'default';
  priority?: JobPriority;
  status?: WorkflowStageStatus;
  className?: string;
}

export default function Badge({ children, variant = 'default', priority, status, className = '' }: BadgeProps) {
  let badgeClasses = 'badge';

  if (variant === 'priority' && priority) {
    switch (priority) {
      case 'Critical':
        badgeClasses += ' badge-critical';
        break;
      case 'High':
        badgeClasses += ' badge-high';
        break;
      case 'Medium':
        badgeClasses += ' badge-medium';
        break;
      case 'Low':
        badgeClasses += ' badge-low';
        break;
    }
  } else if (variant === 'status' && status) {
    switch (status) {
      case 'Not Started':
        badgeClasses += ' badge-not-started';
        break;
      case 'In Progress':
        badgeClasses += ' badge-in-progress';
        break;
      case 'Completed':
        badgeClasses += ' badge-completed';
        break;
      case 'Blocked':
        badgeClasses += ' badge-blocked';
        break;
    }
  } else if (variant === 'stage') {
    badgeClasses += ' badge-stage';
  }

  return (
    <span className={`${badgeClasses} ${className}`}>
      {children}
    </span>
  );
}
