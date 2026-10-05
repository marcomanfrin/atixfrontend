import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, FileText, Plus, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useRapportini, useUsersByType } from '@/hooks/api';
import { formatDate } from '@/lib/date';
import { NewRapportinoDialog } from '@/components/rapportini/NewRapportinoDialog';
import { RapportinoStatusBadge } from '@/components/rapportini/shared';
import { formatHours, useRapportinoPermissions } from '@/components/rapportini/utils';
import type { User } from '@/types';
import type { RapportiniFilters, RapportinoListItem, RapportinoStatus } from '@/types/rapportino';

const PAGE_SIZE = 20;
const STATUSES: RapportinoStatus[] = ['DRAFT', 'AWAITING_SIGNATURE', 'SIGNED', 'VOID'];
const ALL = '__all__';

export default function RapportiniPage() {
  const { t } = useTranslation('reports');
  const navigate = useNavigate();
  const { canSeeAll } = useRapportinoPermissions();
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<Omit<RapportiniFilters, 'page' | 'size'>>({});

  // Non-privileged users only ever see their own reports (filtered server-side): no technician filter for them
  const { data: technicians } = useUsersByType('TECHNICIAN');
  const { data, isLoading, error, isFetching } = useRapportini({ ...filters, page, size: PAGE_SIZE });

  const updateFilter = (patch: Partial<RapportiniFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(0);
  };
  const hasFilters = Object.values(filters).some(Boolean);
  const rapportini: RapportinoListItem[] = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Button onClick={() => setIsNewOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('newButton')}
        </Button>
      </div>

      <Card>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-2">
            <Label>{t('filters.status')}</Label>
            <Select
              value={filters.status ?? ALL}
              onValueChange={(value) => updateFilter({ status: value === ALL ? undefined : (value as RapportinoStatus) })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('filters.allStatuses')}</SelectItem>
                {STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>{t(`status.${status}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {canSeeAll && (
            <div className="space-y-2">
              <Label>{t('filters.technician')}</Label>
              <Select
                value={filters.technicianId ?? ALL}
                onValueChange={(value) => updateFilter({ technicianId: value === ALL ? undefined : value })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t('filters.allTechnicians')}</SelectItem>
                  {(technicians ?? []).map((tech: User) => (
                    <SelectItem key={tech.id} value={String(tech.id)}>
                      {tech.firstName} {tech.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="dateFrom">{t('filters.dateFrom')}</Label>
            <Input id="dateFrom" type="date" value={filters.dateFrom ?? ''}
              onChange={(e) => updateFilter({ dateFrom: e.target.value || undefined })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dateTo">{t('filters.dateTo')}</Label>
            <Input id="dateTo" type="date" value={filters.dateTo ?? ''}
              onChange={(e) => updateFilter({ dateTo: e.target.value || undefined })} />
          </div>
          <div className="flex items-end">
            <Button variant="ghost" disabled={!hasFilters} onClick={() => { setFilters({}); setPage(0); }}>
              <X className="mr-2 h-4 w-4" />
              {t('filters.reset')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <LoadingSpinner message={t('messages.loading')} />
      ) : error ? (
        <Card className="border-destructive">
          <CardContent className="pt-6 text-destructive">
            {t('messages.error')}: {(error as Error).message}
          </CardContent>
        </Card>
      ) : rapportini.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
            <FileText className="h-10 w-10" />
            {t('list.empty')}
          </CardContent>
        </Card>
      ) : (
        <div className={isFetching ? 'opacity-70 transition-opacity' : undefined}>
          {/* Mobile: cards */}
          <div className="space-y-3 md:hidden">
            {rapportini.map((r) => (
              <Card key={r.id} className="cursor-pointer" onClick={() => navigate(`/reports/${r.id}`)}>
                <CardContent className="space-y-1 pt-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-semibold">{r.number}</span>
                    <RapportinoStatusBadge status={r.status} />
                  </div>
                  <div className="font-medium">{r.clientName ?? r.workName}</div>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(r.interventionDate)} · {r.technicianName} · {formatHours(r.totalHours)} h
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{r.workName}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop: table */}
          <Card className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('list.number')}</TableHead>
                  <TableHead>{t('list.date')}</TableHead>
                  <TableHead>{t('list.work')}</TableHead>
                  <TableHead>{t('list.client')}</TableHead>
                  <TableHead>{t('list.technician')}</TableHead>
                  <TableHead className="text-right">{t('list.hours')}</TableHead>
                  <TableHead>{t('list.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rapportini.map((r) => (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => navigate(`/reports/${r.id}`)}>
                    <TableCell className="font-mono text-sm">{r.number}</TableCell>
                    <TableCell>{formatDate(r.interventionDate)}</TableCell>
                    <TableCell className="max-w-56 truncate">{r.workName}</TableCell>
                    <TableCell className="max-w-56 truncate">{r.clientName ?? '-'}</TableCell>
                    <TableCell>{r.technicianName ?? '-'}</TableCell>
                    <TableCell className="text-right">{formatHours(r.totalHours)}</TableCell>
                    <TableCell><RapportinoStatusBadge status={r.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('list.count', { count: data?.totalElements ?? 0 })}</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">{page + 1} / {totalPages}</span>
                <Button variant="outline" size="icon" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <NewRapportinoDialog open={isNewOpen} onOpenChange={setIsNewOpen} />
    </div>
  );
}
