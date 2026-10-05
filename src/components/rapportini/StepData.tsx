import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAllPlants, useClients, useUsersByType, useWorksiteReferences } from '@/hooks/api';
import type { Client, Plant, User, WorksiteReference } from '@/types';
import type { RapportinoForm } from './form';

interface StepProps {
  form: RapportinoForm;
  onChange: (patch: Partial<RapportinoForm>) => void;
  orderNumber: string | null;
  workName: string;
  canChangeTechnician: boolean;
}

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'it', { sensitivity: 'base' });

// Client, plant and contact are chosen among the entities that exist in the app (prefilled from the work order)
export function StepData({ form, onChange, orderNumber, workName, canChangeTechnician }: StepProps) {
  const { t } = useTranslation('reports');
  const { data: clientsData } = useClients(0, 500);
  const { data: plantsData } = useAllPlants();
  const { data: referencesData } = useWorksiteReferences();
  const { data: techniciansData } = useUsersByType('TECHNICIAN');

  const clients: Client[] = [...(clientsData?.content ?? [])].sort(byName);
  const plants: Plant[] = [...(plantsData ?? [])].sort(byName);
  const references: WorksiteReference[] = [...(referencesData ?? [])].sort(byName);
  const technicians: User[] = techniciansData ?? [];

  const types: { key: 'typeMaintenance' | 'typeCallOut' | 'typeQuote' | 'typeWarranty'; label: string }[] = [
    { key: 'typeMaintenance', label: t('interventionType.maintenance') },
    { key: 'typeCallOut', label: t('interventionType.callOut') },
    { key: 'typeQuote', label: t('interventionType.quote') },
    { key: 'typeWarranty', label: t('interventionType.warranty') },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-md bg-muted px-3 py-2 text-sm">
        <div className="font-medium">{workName}</div>
        {orderNumber && <div className="text-muted-foreground">{t('fields.orderNumber')}: {orderNumber}</div>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="interventionDate">{t('fields.interventionDate')}</Label>
          <Input id="interventionDate" type="date" value={form.interventionDate}
            onChange={(e) => onChange({ interventionDate: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>{t('fields.technician')}</Label>
          <Select value={form.technicianId} onValueChange={(technicianId) => onChange({ technicianId })} disabled={!canChangeTechnician}>
            <SelectTrigger><SelectValue placeholder={t('fields.selectPlaceholder')} /></SelectTrigger>
            <SelectContent>
              {technicians.map((tech) => (
                <SelectItem key={tech.id} value={String(tech.id)}>{tech.firstName} {tech.lastName}</SelectItem>
              ))}
              {/* the current technician may not be of type TECHNICIAN (e.g. an admin filling in) */}
              {form.technicianId && !technicians.some((tech) => String(tech.id) === form.technicianId) && (
                <SelectItem value={form.technicianId}>{t('fields.technician')}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t('fields.client')}</Label>
        <Select value={form.clientId} onValueChange={(clientId) => onChange({ clientId })}>
          <SelectTrigger><SelectValue placeholder={t('fields.selectPlaceholder')} /></SelectTrigger>
          <SelectContent>
            {clients.map((client) => (
              <SelectItem key={client.id} value={String(client.id)}>{client.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t('fields.clientReference')}</Label>
          <Select value={form.worksiteReferenceId} onValueChange={(worksiteReferenceId) => onChange({ worksiteReferenceId })}>
            <SelectTrigger><SelectValue placeholder={t('fields.selectPlaceholder')} /></SelectTrigger>
            <SelectContent>
              {references.map((ref) => (
                <SelectItem key={ref.id} value={String(ref.id)}>{ref.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t('fields.plant')}</Label>
          <Select value={form.plantId} onValueChange={(plantId) => onChange({ plantId })}>
            <SelectTrigger><SelectValue placeholder={t('fields.selectPlaceholder')} /></SelectTrigger>
            <SelectContent>
              {plants.map((plant) => (
                <SelectItem key={plant.id} value={String(plant.id)}>{plant.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t('fields.interventionType')}</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {types.map(({ key, label }) => (
            <label key={key} className="flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm has-[:checked]:border-primary">
              <Checkbox checked={form[key]} onCheckedChange={(checked) => onChange({ [key]: checked === true })} />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">{t('fields.description')}</Label>
        <Textarea id="description" rows={4} maxLength={4000} placeholder={t('fields.descriptionPlaceholder')}
          value={form.description} onChange={(e) => onChange({ description: e.target.value })} />
      </div>

      <div className="space-y-2 sm:w-1/2">
        <Label>{t('fields.language')}</Label>
        <Select value={form.locale} onValueChange={(locale) => onChange({ locale: locale as RapportinoForm['locale'] })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="it">Italiano</SelectItem>
            <SelectItem value="en">English</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
