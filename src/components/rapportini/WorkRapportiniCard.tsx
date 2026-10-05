import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useCreateRapportino, useRapportini } from '@/hooks/api';
import { formatDate } from '@/lib/date';
import { RapportinoStatusBadge } from './shared';
import { formatHours } from './utils';

// Rapportini of one work order, with a shortcut that creates a draft prefilled from it
export function WorkRapportiniCard({ workId, className }: { workId: string; className?: string }) {
  const { t, i18n } = useTranslation('reports');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data } = useRapportini({ workId, size: 50 });
  const createRapportino = useCreateRapportino();
  const rapportini = data?.content ?? [];

  const create = () => createRapportino.mutate(
    { workId, locale: i18n.language === 'en' ? 'en' : 'it' },
    {
      onSuccess: (created) => navigate(`/reports/${created.id}/edit`),
      onError: (e: Error) => toast({ title: t('messages.createError'), description: e.message, variant: 'destructive' }),
    },
  );

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>{t('work.title')}</CardTitle>
        <Button size="sm" onClick={create} disabled={createRapportino.isPending}>
          <Plus className="mr-2 h-4 w-4" />
          {t('work.new')}
        </Button>
      </CardHeader>
      <CardContent>
        {rapportini.length === 0 ? (
          <p className="py-6 text-center text-muted-foreground">{t('work.empty')}</p>
        ) : (
          <ul className="divide-y">
            {rapportini.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => navigate(`/reports/${r.id}`)}
                  className="flex w-full items-center justify-between gap-3 py-2 text-left hover:bg-muted/50">
                  <span className="min-w-0">
                    <span className="block font-mono text-sm font-medium">{r.number}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {formatDate(r.interventionDate)} · {r.technicianName} · {formatHours(r.totalHours)} h
                    </span>
                  </span>
                  <RapportinoStatusBadge status={r.status} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
