import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { newMaterialRow, type RapportinoForm } from './form';

interface StepProps {
  form: RapportinoForm;
  onChange: (patch: Partial<RapportinoForm>) => void;
}

export function StepActivities({ form, onChange }: StepProps) {
  const { t } = useTranslation('reports');

  const updateRow = (index: number, patch: Partial<RapportinoForm['checklist'][number]>) =>
    onChange({ checklist: form.checklist.map((row, i) => (i === index ? { ...row, ...patch } : row)) });

  const updateMaterial = (key: string, patch: Partial<RapportinoForm['materials'][number]>) =>
    onChange({ materials: form.materials.map((m) => (m.key === key ? { ...m, ...patch } : m)) });

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <Label className="text-base">{t('fields.activities')}</Label>
        {form.checklist.map((row, index) => (
          <div key={`${row.templateItemId ?? 'custom'}-${index}`} className="space-y-2 rounded-md border p-3">
            <label className="flex cursor-pointer items-center gap-3">
              <Checkbox checked={row.checked} onCheckedChange={(checked) => updateRow(index, { checked: checked === true })} />
              {row.templateItemId ? (
                <span className="text-sm font-medium">{row.label}</span>
              ) : (
                <Input value={row.label} placeholder={t('checklist.customPlaceholder')} className="h-8"
                  onChange={(e) => updateRow(index, { label: e.target.value })} />
              )}
              {!row.templateItemId && (
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                  aria-label={t('materials.remove')}
                  onClick={() => onChange({ checklist: form.checklist.filter((_, i) => i !== index) })}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </label>
            {row.checked && (
              <Input value={row.note} placeholder={t('checklist.notePlaceholder')} className="h-8 text-sm"
                maxLength={1000} onChange={(e) => updateRow(index, { note: e.target.value })} />
            )}
          </div>
        ))}
        <Button type="button" variant="outline" size="sm"
          onClick={() => onChange({ checklist: [...form.checklist, { templateItemId: null, label: '', checked: true, note: '' }] })}>
          <Plus className="mr-2 h-4 w-4" />
          {t('checklist.addCustom')}
        </Button>
      </section>

      <section className="space-y-3">
        <Label className="text-base">{t('fields.materials')}</Label>
        {form.materials.length === 0 && (
          <p className="text-sm text-muted-foreground">{t('materials.empty')}</p>
        )}
        {form.materials.map((material) => (
          <div key={material.key} className="flex items-center gap-2">
            <Input className="flex-1" value={material.description} maxLength={500}
              placeholder={t('materials.descriptionPlaceholder')}
              onChange={(e) => updateMaterial(material.key, { description: e.target.value })} />
            <Input className="w-20" type="number" inputMode="decimal" min="0" step="any"
              aria-label={t('materials.quantity')} value={material.quantity}
              onChange={(e) => updateMaterial(material.key, { quantity: e.target.value })} />
            <Button type="button" variant="ghost" size="icon" aria-label={t('materials.remove')}
              onClick={() => onChange({ materials: form.materials.filter((m) => m.key !== material.key) })}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm"
          onClick={() => onChange({ materials: [...form.materials, newMaterialRow()] })}>
          <Plus className="mr-2 h-4 w-4" />
          {t('materials.add')}
        </Button>
      </section>
    </div>
  );
}
