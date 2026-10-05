import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, CheckSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { SignatureCapture } from '@/components/rapportini/SignatureCapture';
import { formatHours } from '@/components/rapportini/utils';
import { PublicSigningError, publicSigningApi } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/date';
import type { PublicRapportinoPreview, RapportinoSignRequest } from '@/types/rapportino';

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; preview: PublicRapportinoPreview }
  | { kind: 'invalid' }
  | { kind: 'rateLimited' }
  | { kind: 'error' }
  | { kind: 'signed' };

// Customer-facing page opened from the signing link. Lives outside ProtectedRoute and AuthContext logic:
// it uses publicSigningApi, which never attaches the technician's JWT and never redirects to /login.
export default function PublicSignPage() {
  const { token = '' } = useParams();
  const { t, i18n } = useTranslation('reports');
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    publicSigningApi.getPreview(token)
      .then((preview) => {
        if (cancelled) return;
        // show the page in the document's language
        if (preview.locale && preview.locale !== i18n.language) i18n.changeLanguage(preview.locale);
        setState({ kind: 'ready', preview });
      })
      .catch((e) => {
        if (cancelled) return;
        const kind = e instanceof PublicSigningError ? e.kind : 'server';
        setState(kind === 'invalid' ? { kind: 'invalid' } : kind === 'rateLimited' ? { kind: 'rateLimited' } : { kind: 'error' });
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const sign = async (data: RapportinoSignRequest) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await publicSigningApi.sign(token, data);
      setState({ kind: 'signed' });
    } catch (e) {
      const kind = e instanceof PublicSigningError ? e.kind : 'server';
      if (kind === 'invalid') setState({ kind: 'invalid' });
      else setSubmitError(t(kind === 'rateLimited' ? 'public.rateLimited' : 'public.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-6">
      <div className="mx-auto max-w-xl space-y-4">
        <div className="flex items-center gap-3">
          <img src="/favicon.svg" alt="ATIX" className="h-10 w-10" />
          <h1 className="text-xl font-bold">{t('public.title')}</h1>
        </div>

        {state.kind === 'loading' && <LoadingSpinner />}

        {(state.kind === 'invalid' || state.kind === 'rateLimited' || state.kind === 'error') && (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <AlertTriangle className="h-10 w-10 text-amber-500" />
              <p className="font-semibold">{state.kind === 'invalid' ? t('public.invalidTitle') : t('public.error')}</p>
              <p className="text-sm text-muted-foreground">
                {state.kind === 'invalid' ? t('public.invalidText') : state.kind === 'rateLimited' ? t('public.rateLimited') : ''}
              </p>
            </CardContent>
          </Card>
        )}

        {state.kind === 'signed' && (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              <p className="text-lg font-semibold">{t('public.successTitle')}</p>
              <p className="text-sm text-muted-foreground">{t('public.successText')}</p>
            </CardContent>
          </Card>
        )}

        {state.kind === 'ready' && (
          <>
            <p className="text-sm text-muted-foreground">{t('public.intro')}</p>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-baseline justify-between gap-2 text-base">
                  <span className="font-mono">{state.preview.number}</span>
                  <span className="text-sm font-normal text-muted-foreground">{formatDate(state.preview.interventionDate)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <div className="font-medium">{state.preview.clientName ?? '-'}</div>
                  <div className="text-muted-foreground">{state.preview.plantLabel}</div>
                </div>
                {state.preview.description && (
                  <div>
                    <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{t('fields.description')}</div>
                    <p className="whitespace-pre-wrap">{state.preview.description}</p>
                  </div>
                )}
                <div>
                  <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{t('fields.activities')}</div>
                  {state.preview.checklist.filter((i) => i.checked).length === 0
                    ? <p className="text-muted-foreground">{t('checklist.empty')}</p>
                    : state.preview.checklist.filter((i) => i.checked).map((item, index) => (
                      <div key={index} className="flex gap-2">
                        <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        <span>{item.label}{item.note ? ` — ${item.note}` : ''}</span>
                      </div>
                    ))}
                </div>
                <div>
                  <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{t('fields.materials')}</div>
                  {state.preview.materials.length === 0
                    ? <p className="text-muted-foreground">{t('materials.empty')}</p>
                    : state.preview.materials.map((m, index) => (
                      <div key={index} className="flex justify-between gap-2">
                        <span>{m.description}</span>
                        <span className="text-muted-foreground">{t('materials.quantity')} {formatHours(m.quantity)}</span>
                      </div>
                    ))}
                </div>
                <div className="grid grid-cols-3 gap-2 rounded-md bg-muted p-3 text-center">
                  <div><div className="text-xs text-muted-foreground">{t('fields.workHours')}</div><div className="font-semibold">{formatHours(state.preview.workHours)} h</div></div>
                  <div><div className="text-xs text-muted-foreground">{t('fields.travelHours')}</div><div className="font-semibold">{formatHours(state.preview.travelHours)} h</div></div>
                  <div><div className="text-xs text-muted-foreground">{t('fields.totalHours')}</div><div className="font-semibold">{formatHours(state.preview.totalHours)} h</div></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t('signature.title')}</CardTitle>
                <p className="text-xs text-muted-foreground">{t('public.expiresAt', { date: formatDateTime(state.preview.expiresAt) })}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <SignatureCapture onSubmit={sign} submitting={submitting} />
                {submitError && <p className="text-sm text-destructive">{submitError}</p>}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
