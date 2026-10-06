import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { formatHours } from './utils';
import type { RapportinoForm } from './form';
import type { RapportinoWorkState } from '@/types/rapportino';

interface StepProps {
  form: RapportinoForm;
  onChange: (patch: Partial<RapportinoForm>) => void;
}

const num = (value: string) => {
  const n = Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

export function StepHours({ form, onChange }: StepProps) {
  const { t } = useTranslation('reports');
  const total = num(form.workHours) + num(form.travelHours);

  const field = (id: 'workHours' | 'travelHours' | 'travelKm', label: string, step: string) => (
    <div className="space-y-2 rounded-md border p-3">
      <Label htmlFor={id} className="text-xs text-muted-foreground">{label}</Label>
      <Input id={id} type="number" inputMode="decimal" min="0" step={step} className="text-lg font-semibold"
        value={form[id]} onChange={(e) => onChange({ [id]: e.target.value })} />
    </div>
  );

  const states: RapportinoWorkState[] = ['IN_PROGRESS', 'COMPLETED'];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {field('workHours', t('fields.workHours'), '0.5')}
        {field('travelHours', t('fields.travelHours'), '0.5')}
        {field('travelKm', t('fields.travelKm'), '1')}
      </div>
      <p className="text-sm text-muted-foreground">
        {t('fields.totalHours')}: <span className="font-semibold text-foreground">{formatHours(total)} h</span>
      </p>

      <div className="grid grid-cols-2 gap-3">
        {(['meal', 'parking'] as const).map((key) => (
          <label key={key} className="flex cursor-pointer items-center justify-between rounded-md border p-3 text-sm">
            {t(`fields.${key}`)}
            <Switch checked={form[key]} onCheckedChange={(checked) => onChange({ [key]: checked })} />
          </label>
        ))}
      </div>

      <div className="space-y-2">
        <Label>{t('fields.workState')}</Label>
        <div className="grid grid-cols-2 gap-3">
          {states.map((state) => (
            <button key={state} type="button"
              className={cn('rounded-md border p-3 text-sm transition-colors',
                form.workState === state ? 'border-primary bg-primary/10 font-medium' : 'hover:bg-muted')}
              onClick={() => onChange({ workState: state })}>
              {t(`workState.${state}`)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
