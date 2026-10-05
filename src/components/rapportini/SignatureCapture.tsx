import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SignaturePad, type SignaturePadHandle } from './SignaturePad';
import type { RapportinoSignRequest } from '@/types/rapportino';

interface SignatureCaptureProps {
  onSubmit: (data: RapportinoSignRequest) => void;
  submitting?: boolean;
  defaultSignerName?: string;
}

// Signer name + GDPR notice + signature pad. Used on site (wizard) and remotely (public page).
export function SignatureCapture({ onSubmit, submitting = false, defaultSignerName = '' }: SignatureCaptureProps) {
  const { t } = useTranslation('reports');
  const padRef = useRef<SignaturePadHandle>(null);
  const [signerName, setSignerName] = useState(defaultSignerName);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [padEmpty, setPadEmpty] = useState(true);
  const [showErrors, setShowErrors] = useState(false);

  const nameMissing = signerName.trim() === '';

  const submit = () => {
    const image = padRef.current?.toDataUrl() ?? null;
    if (nameMissing || !privacyAccepted || !image) {
      setShowErrors(true);
      return;
    }
    onSubmit({ signerName: signerName.trim(), signatureImage: image, privacyAccepted: true });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signerName">{t('signature.signerName')}</Label>
        <Input id="signerName" autoComplete="name" maxLength={255} value={signerName}
          placeholder={t('signature.signerNamePlaceholder')}
          className={showErrors && nameMissing ? 'border-destructive' : undefined}
          onChange={(e) => setSignerName(e.target.value)} />
        {showErrors && nameMissing && <p className="text-sm text-destructive">{t('signature.nameRequired')}</p>}
      </div>

      <div className="space-y-2">
        <SignaturePad ref={padRef} onChange={setPadEmpty} invalid={showErrors && padEmpty} disabled={submitting} />
        {showErrors && padEmpty && <p className="text-sm text-destructive">{t('signature.required')}</p>}
      </div>

      <div className="space-y-3 rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground">{t('signature.privacyTitle')}</p>
        <p>{t('signature.privacyText')}</p>
        <label className="flex cursor-pointer items-start gap-3 text-sm text-foreground">
          <Checkbox className="mt-0.5" checked={privacyAccepted} onCheckedChange={(c) => setPrivacyAccepted(c === true)} />
          {t('signature.privacyAccept')}
        </label>
        {showErrors && !privacyAccepted && <p className="text-sm text-destructive">{t('signature.privacyRequired')}</p>}
      </div>

      <Button type="button" className="w-full" size="lg" onClick={submit} disabled={submitting}>
        {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PenLine className="mr-2 h-4 w-4" />}
        {submitting ? t('signature.submitting') : t('signature.submit')}
      </Button>
    </div>
  );
}
