import type {
  ChecklistTemplateItem,
  RapportinoDetail,
  RapportinoLocale,
  RapportinoUpdateRequest,
  RapportinoWorkState,
} from '@/types/rapportino';

// Wizard state: everything the technician can edit on a DRAFT
export interface ChecklistRow {
  templateItemId: string | null;
  label: string;
  checked: boolean;
  note: string;
}

export interface MaterialRow {
  key: string;
  description: string;
  quantity: string;
}

export interface RapportinoForm {
  interventionDate: string;
  technicianId: string;
  clientId: string;
  plantId: string;
  worksiteReferenceId: string;
  typeMaintenance: boolean;
  typeCallOut: boolean;
  typeQuote: boolean;
  typeWarranty: boolean;
  description: string;
  workHours: string;
  travelHours: string;
  travelKm: string;
  meal: boolean;
  parking: boolean;
  workState: RapportinoWorkState;
  locale: RapportinoLocale;
  checklist: ChecklistRow[];
  materials: MaterialRow[];
}

let materialKey = 0;
export const newMaterialRow = (description = '', quantity = '1'): MaterialRow => ({
  key: `m${++materialKey}`,
  description,
  quantity,
});

// Saved answers first (keeping their snapshot labels), then template items not answered yet
export function formFromDetail(detail: RapportinoDetail, template: ChecklistTemplateItem[]): RapportinoForm {
  const answered = new Set(detail.checklistAnswers.map((a) => a.templateItemId).filter(Boolean));
  const checklist: ChecklistRow[] = [
    ...detail.checklistAnswers.map((a) => ({
      templateItemId: a.templateItemId,
      label: a.label,
      checked: a.checked,
      note: a.note ?? '',
    })),
    ...template
      .filter((item) => !answered.has(item.id))
      .map((item) => ({
        templateItemId: item.id,
        label: detail.locale === 'en' ? item.labelEn : item.labelIt,
        checked: false,
        note: '',
      })),
  ];

  return {
    interventionDate: detail.interventionDate,
    technicianId: detail.technicianId ?? '',
    clientId: detail.clientId ?? '',
    plantId: detail.plantId ?? '',
    worksiteReferenceId: detail.worksiteReferenceId ?? '',
    typeMaintenance: detail.typeMaintenance,
    typeCallOut: detail.typeCallOut,
    typeQuote: detail.typeQuote,
    typeWarranty: detail.typeWarranty,
    description: detail.description ?? '',
    workHours: String(detail.workHours ?? 0),
    travelHours: String(detail.travelHours ?? 0),
    travelKm: String(detail.travelKm ?? 0),
    meal: detail.meal,
    parking: detail.parking,
    workState: detail.workState,
    locale: detail.locale,
    checklist,
    materials: detail.materials.map((m) => newMaterialRow(m.description, String(m.quantity))),
  };
}

const toNumber = (value: string) => {
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : NaN;
};

export type FormError = 'hours' | 'materials';

export function validateForm(form: RapportinoForm): FormError | null {
  const numbers = [form.workHours, form.travelHours, form.travelKm].map(toNumber);
  if (numbers.some((n) => Number.isNaN(n) || n < 0)) return 'hours';
  const badMaterial = form.materials.some(
    (m) => m.description.trim() === '' || !(toNumber(m.quantity) > 0),
  );
  if (badMaterial) return 'materials';
  return null;
}

// Full payload: the wizard always sends the whole state, so the PATCH acts as a replace
export function formToRequest(form: RapportinoForm): RapportinoUpdateRequest {
  return {
    interventionDate: form.interventionDate || undefined,
    technicianId: form.technicianId || undefined,
    clientId: form.clientId || undefined,
    plantId: form.plantId || undefined,
    worksiteReferenceId: form.worksiteReferenceId || undefined,
    typeMaintenance: form.typeMaintenance,
    typeCallOut: form.typeCallOut,
    typeQuote: form.typeQuote,
    typeWarranty: form.typeWarranty,
    description: form.description,
    workHours: toNumber(form.workHours),
    travelHours: toNumber(form.travelHours),
    travelKm: toNumber(form.travelKm),
    meal: form.meal,
    parking: form.parking,
    workState: form.workState,
    locale: form.locale,
    // Unchecked template items are not stored: the template re-offers them next time
    checklistAnswers: form.checklist
      .filter((row) => row.checked || row.templateItemId === null)
      .filter((row) => row.templateItemId !== null || row.label.trim() !== '')
      .map((row) => ({
        templateItemId: row.templateItemId,
        label: row.templateItemId ? undefined : row.label.trim(),
        checked: row.checked,
        note: row.note.trim() || null,
      })),
    materials: form.materials.map((m) => ({
      description: m.description.trim(),
      quantity: toNumber(m.quantity),
    })),
  };
}
