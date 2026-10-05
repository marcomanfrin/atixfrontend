import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Ban,
  Briefcase,
  CheckSquare,
  FileDown,
  Hourglass,
  Loader2,
  Pencil,
  PenLine,
  RefreshCw,
  Trash2,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import {
  useCreateRapportino,
  useDeleteRapportino,
  useRapportino,
  useRevokeSignatureRequest,
  useVoidRapportino,
} from '@/hooks/api';
import { formatDate, formatDateTime } from '@/lib/date';
import { RapportinoStatusBadge } from '@/components/rapportini/shared';
import { formatHours, openRapportinoPdf, useRapportinoPermissions } from '@/components/rapportini/utils';

type Confirm = 'delete' | 'void' | null;

export default function RapportinoDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation('reports');
  const { toast } = useToast();
  const { canVoid } = useRapportinoPermissions();

  const { data: r, isLoading, error } = useRapportino(id);
  const deleteRapportino = useDeleteRapportino();
  const voidRapportino = useVoidRapportino();
  const revokeRequest = useRevokeSignatureRequest();
  const createRapportino = useCreateRapportino();
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [openingPdf, setOpeningPdf] = useState(false);

  if (isLoading) return <LoadingSpinner />;
  if (error || !r) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6 text-destructive">{t('messages.error')}: {(error as Error)?.message}</CardContent>
      </Card>
    );
  }

  const fail = (e: Error) => toast({ title: t('common:titles.error'), description: e.message, variant: 'destructive' });

  const openPdf = async () => {
    setOpeningPdf(true);
    try {
      await openRapportinoPdf(r.id);
    } catch (e) {
      fail(e as Error);
    } finally {
      setOpeningPdf(false);
    }
  };

  const doConfirm = () => {
    if (confirm === 'delete') {
      deleteRapportino.mutate(r.id, {
        onSuccess: () => {
          toast({ title: t('detail.deleted') });
          navigate('/reports');
        },
        onError: fail,
      });
    } else if (confirm === 'void') {
      voidRapportino.mutate(r.id, { onSuccess: () => toast({ title: t('detail.voided') }), onError: fail });
    }
    setConfirm(null);
  };

  const reissue = () => createRapportino.mutate(
    { workId: r.workId, replacesId: r.id, locale: r.locale },
    { onSuccess: (created) => navigate(`/reports/${created.id}/edit`), onError: fail },
  );

  const types = [
    r.typeMaintenance && t('interventionType.maintenance'),
    r.typeCallOut && t('interventionType.callOut'),
    r.typeQuote && t('interventionType.quote'),
    r.typeWarranty && t('interventionType.warranty'),
  ].filter(Boolean).join(', ');

  const checked = r.checklistAnswers.filter((a) => a.checked);

  const Row = ({ label, value }: { label: string; value?: string | null }) => (
    <div className="grid grid-cols-[9rem_1fr] gap-2 py-1 text-sm sm:grid-cols-[11rem_1fr]">
      <span className="text-muted-foreground">{label}</span>
      <span className="break-words">{value || '-'}</span>
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-3">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/reports"><ArrowLeft className="mr-1 h-4 w-4" />{t('detail.back')}</Link>
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-mono text-2xl font-bold tracking-tight">{r.number}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <RapportinoStatusBadge status={r.status} />
              <span>{formatDate(r.interventionDate)}</span>
              <span>·</span>
              <span>{r.technicianName}</span>
            </div>
          </div>

          {/* Actions gated by status and role (the backend enforces the same rules) */}
          <div className="flex flex-wrap gap-2">
            {r.status === 'DRAFT' && (
              <>
                <Button onClick={() => navigate(`/reports/${r.id}/edit?step=signature`)}>
                  <PenLine className="mr-2 h-4 w-4" />{t('detail.continue')}
                </Button>
                <Button variant="outline" onClick={() => navigate(`/reports/${r.id}/edit`)}>
                  <Pencil className="mr-2 h-4 w-4" />{t('detail.edit')}
                </Button>
                <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setConfirm('delete')}>
                  <Trash2 className="mr-2 h-4 w-4" />{t('detail.delete')}
                </Button>
              </>
            )}
            {r.status === 'AWAITING_SIGNATURE' && (
              <Button variant="outline" disabled={revokeRequest.isPending}
                onClick={() => revokeRequest.mutate(r.id, { onSuccess: () => toast({ title: t('remote.revoked') }), onError: fail })}>
                <XCircle className="mr-2 h-4 w-4" />{t('remote.revoke')}
              </Button>
            )}
            {r.pdfAvailable && (
              <Button onClick={openPdf} disabled={openingPdf}>
                {openingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                {t('detail.downloadPdf')}
              </Button>
            )}
            {r.status === 'SIGNED' && canVoid && (
              <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setConfirm('void')}>
                <Ban className="mr-2 h-4 w-4" />{t('detail.void')}
              </Button>
            )}
            {r.status === 'VOID' && (
              <Button variant="outline" onClick={reissue} disabled={createRapportino.isPending}>
                <RefreshCw className="mr-2 h-4 w-4" />{t('detail.reissue')}
              </Button>
            )}
          </div>
        </div>
      </div>

      {r.status === 'VOID' && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {t('detail.voidedBanner', { name: r.voidedByName ?? '-', date: formatDateTime(r.voidedAt ?? undefined) })}
        </div>
      )}
      {r.status === 'AWAITING_SIGNATURE' && (
        <div className="flex items-center gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          <Hourglass className="h-4 w-4 shrink-0" />
          {t('remote.waiting', { date: formatDateTime(r.signatureRequestExpiresAt ?? undefined) })}
        </div>
      )}
      {r.replacesNumber && r.replacesId && (
        <p className="text-sm text-muted-foreground">
          <Link className="underline" to={`/reports/${r.replacesId}`}>{t('detail.replaces', { number: r.replacesNumber })}</Link>
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">{t('fields.client')}</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/works/${r.workId}`}><Briefcase className="mr-1 h-4 w-4" />{t('detail.openWork')}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <Row label={t('fields.work')} value={r.workName} />
            <Row label={t('fields.client')} value={r.clientName} />
            <Row label={t('fields.clientReference')} value={r.clientReference} />
            <Row label={t('fields.plant')} value={r.plantLabel} />
            <Row label={t('fields.orderNumber')} value={r.orderNumber} />
            <Row label={t('fields.interventionType')} value={types} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">{t('fields.totalHours')}</CardTitle></CardHeader>
          <CardContent>
            <Row label={t('fields.workHours')} value={`${formatHours(r.workHours)} h`} />
            <Row label={t('fields.travelHours')} value={`${formatHours(r.travelHours)} h`} />
            <Row label={t('fields.totalHours')} value={`${formatHours(r.totalHours)} h`} />
            <Row label={t('fields.travelKm')} value={`${formatHours(r.travelKm)} km`} />
            <Row label={t('fields.meal')} value={r.meal ? t('yes') : '-'} />
            <Row label={t('fields.parking')} value={r.parking ? t('yes') : '-'} />
            <Row label={t('fields.workState')} value={t(`workState.${r.workState}`)} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">{t('fields.description')}</CardTitle></CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{r.description || '-'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">{t('fields.activities')}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {checked.length === 0 && <p className="text-sm text-muted-foreground">{t('checklist.empty')}</p>}
            {checked.map((a) => (
              <div key={a.id} className="flex gap-2 text-sm">
                <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <div>
                  <div>{a.label}</div>
                  {a.note && <div className="text-xs text-muted-foreground">{a.note}</div>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">{t('fields.materials')}</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {r.materials.length === 0 && <p className="text-sm text-muted-foreground">{t('materials.empty')}</p>}
            {r.materials.map((m) => (
              <div key={m.id} className="flex justify-between gap-2 text-sm">
                <span>{m.description}</span>
                <span className="shrink-0 text-muted-foreground">{t('materials.quantity')} {formatHours(m.quantity)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">{t('detail.signatureSection')}</CardTitle></CardHeader>
          <CardContent>
            {r.signature ? (
              <div className="space-y-2">
                {r.signature.imageData && (
                  <img src={r.signature.imageData} alt={t('signature.title')}
                    className="h-32 w-full max-w-sm rounded border bg-white object-contain" />
                )}
                <p className="text-sm">
                  {t('signature.signedBy', { name: r.signature.signerName, date: formatDateTime(r.signature.signedAt) })}
                  {r.signature.source === 'REMOTE' && ` (${t('signature.remoteSource')})`}
                </p>
                {r.pdfHash && (
                  <p className="break-all font-mono text-xs text-muted-foreground" title={t('detail.integrity')}>
                    SHA-256 {r.pdfHash}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('detail.noSignature')}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm === 'void' ? t('detail.voidTitle') : t('detail.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === 'void'
                ? t('detail.voidDescription', { number: r.number })
                : t('detail.deleteDescription', { number: r.number })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={doConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {confirm === 'void' ? t('detail.void') : t('detail.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
