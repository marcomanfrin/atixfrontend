import { Badge } from '@/components/ui/badge';
import { Ban, CheckCircle2, FilePen, Hourglass, LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { RapportinoStatus } from '@/types/rapportino';

const statusConfig: Record<RapportinoStatus, { icon: LucideIcon; className: string }> = {
  DRAFT: {
    icon: FilePen,
    className: 'border-slate-400 bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-600',
  },
  AWAITING_SIGNATURE: {
    icon: Hourglass,
    className: 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-700',
  },
  SIGNED: {
    icon: CheckCircle2,
    className: 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-700',
  },
  VOID: {
    icon: Ban,
    className: 'border-red-500 bg-red-50 text-red-700 line-through decoration-1 dark:bg-red-950 dark:text-red-400 dark:border-red-700',
  },
};

export function RapportinoStatusBadge({ status, className }: { status: RapportinoStatus; className?: string }) {
  const { t } = useTranslation('reports');
  const config = statusConfig[status];
  if (!config) return null;
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      <Icon className="mr-1 h-3 w-3" />
      {t(`status.${status}`)}
    </Badge>
  );
}
