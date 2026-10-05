// Rapportini (service reports) - mirrors AtixBackEnd DTO/rapportini

export type RapportinoStatus = 'DRAFT' | 'AWAITING_SIGNATURE' | 'SIGNED' | 'VOID';
export type RapportinoWorkState = 'IN_PROGRESS' | 'COMPLETED';
export type SignatureSource = 'LOCAL' | 'REMOTE';
export type RapportinoLocale = 'it' | 'en';

export interface ChecklistTemplateItem {
  id: string;
  code: string;
  labelIt: string;
  labelEn: string;
  position: number;
}

export interface ChecklistAnswer {
  id: string;
  templateItemId: string | null;
  label: string;
  checked: boolean;
  note: string | null;
  position: number;
}

export interface RapportinoMaterial {
  id: string;
  description: string;
  quantity: number;
  position: number;
}

export interface RapportinoSignature {
  imageData: string | null;
  signerName: string;
  signedAt: string;
  privacyAcceptedAt: string | null;
  source: SignatureSource;
}

export interface RapportinoListItem {
  id: string;
  number: string;
  status: RapportinoStatus;
  interventionDate: string;
  workId: string;
  workName: string;
  orderNumber: string | null;
  clientName: string | null;
  plantLabel: string | null;
  technicianId: string | null;
  technicianName: string | null;
  totalHours: number;
  signedAt: string | null;
  pdfAvailable: boolean;
}

export interface RapportinoDetail {
  id: string;
  number: string;
  status: RapportinoStatus;
  interventionDate: string;
  locale: RapportinoLocale;

  workId: string;
  workName: string;

  technicianId: string | null;
  technicianName: string | null;

  clientId: string | null;
  plantId: string | null;
  worksiteReferenceId: string | null;
  clientName: string | null;
  clientReference: string | null;
  plantLabel: string | null;
  orderNumber: string | null;

  typeMaintenance: boolean;
  typeCallOut: boolean;
  typeQuote: boolean;
  typeWarranty: boolean;
  description: string | null;

  workHours: number;
  travelHours: number;
  totalHours: number;
  travelKm: number;
  meal: boolean;
  parking: boolean;
  workState: RapportinoWorkState;

  checklistAnswers: ChecklistAnswer[];
  materials: RapportinoMaterial[];

  signature: RapportinoSignature | null;
  pdfAvailable: boolean;
  pdfHash: string | null;

  signatureRequestExpiresAt: string | null;

  voidedAt: string | null;
  voidedByName: string | null;
  replacesId: string | null;
  replacesNumber: string | null;

  createdById: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface RapportinoCreateRequest {
  workId: string;
  interventionDate?: string;
  technicianId?: string;
  replacesId?: string;
  locale?: RapportinoLocale;
}

export interface ChecklistAnswerRequest {
  templateItemId?: string | null;
  label?: string;
  checked: boolean;
  note?: string | null;
}

export interface MaterialRequest {
  description: string;
  quantity: number;
}

// PATCH: only provided fields are changed; lists, when provided, replace the existing ones
export interface RapportinoUpdateRequest {
  interventionDate?: string;
  technicianId?: string;
  clientId?: string;
  plantId?: string;
  worksiteReferenceId?: string;
  typeMaintenance?: boolean;
  typeCallOut?: boolean;
  typeQuote?: boolean;
  typeWarranty?: boolean;
  description?: string;
  workHours?: number;
  travelHours?: number;
  travelKm?: number;
  meal?: boolean;
  parking?: boolean;
  workState?: RapportinoWorkState;
  locale?: RapportinoLocale;
  checklistAnswers?: ChecklistAnswerRequest[];
  materials?: MaterialRequest[];
}

export interface RapportinoSignRequest {
  signerName: string;
  signatureImage: string;
  privacyAccepted: boolean;
}

export interface SignatureRequestCreated {
  token: string;
  expiresAt: string;
}

export interface RapportiniFilters {
  workId?: string;
  technicianId?: string;
  status?: RapportinoStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  size?: number;
}

// Public signing page: no internal identifiers
export interface PublicRapportinoPreview {
  number: string;
  interventionDate: string;
  locale: RapportinoLocale;
  clientName: string | null;
  plantLabel: string | null;
  description: string | null;
  checklist: { label: string; checked: boolean; note: string | null }[];
  materials: { description: string; quantity: number }[];
  workHours: number;
  travelHours: number;
  totalHours: number;
  expiresAt: string;
}
