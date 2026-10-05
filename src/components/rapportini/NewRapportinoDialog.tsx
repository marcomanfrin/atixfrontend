import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Briefcase, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useCreateRapportino, useWorks } from '@/hooks/api';
import { Work } from '@/types';
import { cn } from '@/lib/utils';

interface NewRapportinoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Pick a work order, create the DRAFT and jump straight into the wizard
export function NewRapportinoDialog({ open, onOpenChange }: NewRapportinoDialogProps) {
  const { t, i18n } = useTranslation('reports');
  const navigate = useNavigate();
  const { toast } = useToast();
  const createRapportino = useCreateRapportino();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isFetching } = useWorks(open
    ? { page: 0, size: 20, statuses: ['SCHEDULED', 'IN_PROGRESS'], ...(debounced ? { search: debounced } : {}) }
    : null);
  const works: Work[] = data?.content ?? [];

  const create = (workId: string) => {
    createRapportino.mutate(
      { workId, locale: i18n.language === 'en' ? 'en' : 'it' },
      {
        onSuccess: (rapportino) => {
          onOpenChange(false);
          navigate(`/reports/${rapportino.id}/edit`);
        },
        onError: (error: Error) => {
          toast({ title: t('messages.createError'), description: error.message, variant: 'destructive' });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('newDialog.title')}</DialogTitle>
          <DialogDescription>{t('newDialog.description')}</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            className="pl-8"
            placeholder={t('newDialog.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className={cn('max-h-80 space-y-1 overflow-y-auto', isFetching && 'opacity-60')}>
          {works.length === 0 && !isFetching && (
            <p className="py-6 text-center text-sm text-muted-foreground">{t('list.empty')}</p>
          )}
          {works.map((work) => (
            <Button
              key={work.id}
              variant="ghost"
              className="h-auto w-full justify-start py-2 text-left"
              disabled={createRapportino.isPending}
              onClick={() => create(String(work.id))}
            >
              <Briefcase className="mr-3 h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0">
                <span className="block truncate font-medium">{work.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {[work.orderNumber, work.finalClient?.name ?? work.atixClient?.name, work.plant?.name]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
