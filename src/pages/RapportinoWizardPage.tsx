import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, ChevronLeft, ChevronRight, Loader2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { useChecklistTemplate, useRapportino, useUpdateRapportino } from '@/hooks/api';
import { cn } from '@/lib/utils';
import { RapportinoStatusBadge } from '@/components/rapportini/shared';
import { useRapportinoPermissions } from '@/components/rapportini/utils';
import { formFromDetail, formToRequest, validateForm, type RapportinoForm } from '@/components/rapportini/form';
import { StepData } from '@/components/rapportini/StepData';
import { StepActivities } from '@/components/rapportini/StepActivities';
import { StepHours } from '@/components/rapportini/StepHours';
import { StepSignature } from '@/components/rapportini/StepSignature';

const STEPS = ['data', 'activities', 'hours', 'signature'] as const;
type Step = (typeof STEPS)[number];

// Mobile-first, four steps. The draft is saved (PATCH) every time the technician moves forward.
export default function RapportinoWizardPage() {
  const { id = '' } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation('reports');
  const { toast } = useToast();
  const { canSeeAll } = useRapportinoPermissions();

  const { data: rapportino, isLoading, error } = useRapportino(id);
  const { data: template, isLoading: templateLoading } = useChecklistTemplate();
  const updateRapportino = useUpdateRapportino();

  const initialStep = searchParams.get('step') === 'signature' ? 3 : 0;
  const [stepIndex, setStepIndex] = useState(initialStep);
  const [form, setForm] = useState<RapportinoForm | null>(null);
  const savedSnapshot = useRef<string>('');

  // Build the form once, when both the draft and the checklist template are available
  useEffect(() => {
    if (rapportino && template && !form) {
      const initial = formFromDetail(rapportino, template);
      setForm(initial);
      savedSnapshot.current = JSON.stringify(formToRequest(initial));
    }
  }, [rapportino, template, form]);

  const dirty = useMemo(() => form !== null && JSON.stringify(formToRequest(form)) !== savedSnapshot.current, [form]);

  if (isLoading || templateLoading) return <LoadingSpinner />;
  if (error || !rapportino) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6 text-destructive">{t('messages.error')}</CardContent>
      </Card>
    );
  }
  // Only drafts are editable; a pending remote signature still shows the signature step (to revoke)
  if (rapportino.status === 'SIGNED' || rapportino.status === 'VOID') {
    return <Navigate to={`/reports/${rapportino.id}`} replace />;
  }
  if (!form) return <LoadingSpinner />;

  const awaiting = rapportino.status === 'AWAITING_SIGNATURE';
  const currentIndex = awaiting ? 3 : stepIndex;
  const step: Step = STEPS[currentIndex];

  const patch = (changes: Partial<RapportinoForm>) => setForm((current) => (current ? { ...current, ...changes } : current));

  const save = async (): Promise<boolean> => {
    const problem = validateForm(form);
    if (problem) {
      toast({
        title: t('common:titles.error'),
        description: t(problem === 'hours' ? 'messages.validationHours' : 'messages.validationMaterials'),
        variant: 'destructive',
      });
      return false;
    }
    if (!dirty) return true;
    try {
      const request = formToRequest(form);
      await updateRapportino.mutateAsync({ id: rapportino.id, data: request });
      savedSnapshot.current = JSON.stringify(request);
      return true;
    } catch (e) {
      toast({ title: t('messages.saveError'), description: (e as Error).message, variant: 'destructive' });
      return false;
    }
  };

  const goTo = async (index: number) => {
    if (index > currentIndex && !(await save())) return;
    setStepIndex(index);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveAndClose = async () => {
    if (await save()) {
      toast({ title: t('wizard.saved') });
      navigate(`/reports/${rapportino.id}`);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-24">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('wizard.titleNew')}</h1>
          <div className="mt-1 flex items-center gap-2">
            <span className="font-mono text-sm text-muted-foreground">{rapportino.number}</span>
            <RapportinoStatusBadge status={rapportino.status} />
          </div>
        </div>
        <Button variant="ghost" size="icon" aria-label={t('wizard.close')} onClick={() => navigate(`/reports/${rapportino.id}`)}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Step indicator */}
      <ol className="grid grid-cols-4 gap-1">
        {STEPS.map((s, index) => (
          <li key={s}>
            <button
              type="button"
              disabled={awaiting || index === currentIndex}
              onClick={() => goTo(index)}
              className={cn(
                'flex w-full flex-col items-center gap-1 rounded-md py-2 text-xs transition-colors',
                index === currentIndex ? 'font-semibold text-primary' : 'text-muted-foreground hover:bg-muted',
              )}
            >
              <span className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs',
                index < currentIndex && 'border-emerald-500 bg-emerald-500 text-white',
                index === currentIndex && 'border-primary',
              )}>
                {index < currentIndex ? <Check className="h-4 w-4" /> : index + 1}
              </span>
              {t(`wizard.steps.${s}`)}
            </button>
          </li>
        ))}
      </ol>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t(`wizard.steps.${step}`)}</CardTitle>
        </CardHeader>
        <CardContent>
          {step === 'data' && (
            <StepData form={form} onChange={patch} orderNumber={rapportino.orderNumber}
              workName={rapportino.workName} canChangeTechnician={canSeeAll} />
          )}
          {step === 'activities' && <StepActivities form={form} onChange={patch} />}
          {step === 'hours' && <StepHours form={form} onChange={patch} />}
          {step === 'signature' && (
            <StepSignature
              rapportino={rapportino}
              defaultSignerName={rapportino.clientReference ?? ''}
              beforeSignature={save}
              onSigned={() => navigate(`/reports/${rapportino.id}`)}
            />
          )}
        </CardContent>
      </Card>

      {/* Sticky navigation, thumb-reachable on phones */}
      {!awaiting && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t bg-background/95 p-3 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-2">
            <Button variant="outline" disabled={currentIndex === 0} onClick={() => goTo(currentIndex - 1)}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              {t('wizard.back')}
            </Button>
            <Button variant="ghost" onClick={saveAndClose} disabled={updateRapportino.isPending}>
              {updateRapportino.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
              <span className="hidden sm:inline">{t('wizard.save')}</span>
            </Button>
            {currentIndex < STEPS.length - 1 ? (
              <Button onClick={() => goTo(currentIndex + 1)} disabled={updateRapportino.isPending}>
                {t('wizard.next')}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <span className="w-24" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
