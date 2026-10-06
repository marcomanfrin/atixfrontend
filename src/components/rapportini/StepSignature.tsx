import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Hourglass, Link2, Loader2, Share2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useRequestSignature, useRevokeSignatureRequest, useSignRapportino } from '@/hooks/api';
import { formatDateTime } from '@/lib/date';
import { SignatureCapture } from './SignatureCapture';
import type { RapportinoDetail, RapportinoSignRequest } from '@/types/rapportino';

interface StepSignatureProps {
  rapportino: RapportinoDetail;
  defaultSignerName?: string;
  // saves the wizard state before any signature transition (the content freezes afterwards)
  beforeSignature: () => Promise<boolean>;
  onSigned: () => void;
}

const EXPIRY_OPTIONS = [15, 60, 1440] as const;

export function StepSignature({ rapportino, defaultSignerName, beforeSignature, onSigned }: StepSignatureProps) {
  const { t } = useTranslation('reports');
  const { toast } = useToast();
  const signRapportino = useSignRapportino();
  const requestSignature = useRequestSignature();
  const revokeRequest = useRevokeSignatureRequest();
  const [expiry, setExpiry] = useState<string>('60');
  const [link, setLink] = useState<{ url: string; expiresAt: string } | null>(null);

  const fail = (error: Error) => toast({ title: t('common:titles.error'), description: error.message, variant: 'destructive' });

  const signHere = async (data: RapportinoSignRequest) => {
    if (!(await beforeSignature())) return;
    signRapportino.mutate({ id: rapportino.id, data }, {
      onSuccess: () => {
        toast({ title: t('signature.signed'), description: t('signature.signedDescription') });
        onSigned();
      },
      onError: fail,
    });
  };

  const createLink = async () => {
    if (!(await beforeSignature())) return;
    requestSignature.mutate({ id: rapportino.id, expiresInMinutes: Number(expiry) }, {
      onSuccess: (created) => setLink({
        url: `${window.location.origin}/sign/${created.token}`,
        expiresAt: created.expiresAt,
      }),
      onError: fail,
    });
  };

  const copyLink = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link.url);
    toast({ title: t('remote.copied') });
  };

  const shareLink = async () => {
    if (!link || !navigator.share) return;
    await navigator.share({ title: rapportino.number, url: link.url }).catch(() => undefined);
  };

  const revoke = () => revokeRequest.mutate(rapportino.id, {
    onSuccess: () => {
      setLink(null);
      toast({ title: t('remote.revoked') });
    },
    onError: fail,
  });

  // Waiting for the customer: the token is shown only right after creation, then only revoke remains
  if (rapportino.status === 'AWAITING_SIGNATURE') {
    const expiresAt = link?.expiresAt ?? rapportino.signatureRequestExpiresAt;
    return (
      <div className="space-y-4">
        {link && (
          <div className="space-y-3 rounded-md border border-primary/40 bg-primary/5 p-4">
            <div className="flex items-center gap-2 font-medium"><Link2 className="h-4 w-4" />{t('remote.linkTitle')}</div>
            <p className="text-sm text-muted-foreground">{t('remote.linkDescription', { date: formatDateTime(link.expiresAt) })}</p>
            <Input readOnly value={link.url} onFocus={(e) => e.target.select()} className="font-mono text-xs" />
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={copyLink}><Copy className="mr-2 h-4 w-4" />{t('remote.copy')}</Button>
              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <Button type="button" variant="outline" onClick={shareLink}><Share2 className="mr-2 h-4 w-4" />{t('remote.share')}</Button>
              )}
            </div>
          </div>
        )}
        <div className="flex items-center gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          <Hourglass className="h-4 w-4 shrink-0" />
          {t('remote.waiting', { date: formatDateTime(expiresAt ?? undefined) })}
        </div>
        <Button type="button" variant="outline" onClick={revoke} disabled={revokeRequest.isPending}>
          <XCircle className="mr-2 h-4 w-4" />
          {t('remote.revoke')}
        </Button>
      </div>
    );
  }

  return (
    <Tabs defaultValue="here">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="here">{t('signature.modeHere')}</TabsTrigger>
        <TabsTrigger value="remote">{t('signature.modeRemote')}</TabsTrigger>
      </TabsList>
      <TabsContent value="here" className="pt-4">
        <SignatureCapture onSubmit={signHere} submitting={signRapportino.isPending} defaultSignerName={defaultSignerName} />
      </TabsContent>
      <TabsContent value="remote" className="space-y-4 pt-4">
        <div className="space-y-2">
          <Label>{t('remote.expiry')}</Label>
          <Select value={expiry} onValueChange={setExpiry}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {EXPIRY_OPTIONS.map((minutes) => (
                <SelectItem key={minutes} value={String(minutes)}>{t(`remote.minutes${minutes}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="button" className="w-full" onClick={createLink} disabled={requestSignature.isPending}>
          {requestSignature.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
          {t('remote.create')}
        </Button>
      </TabsContent>
    </Tabs>
  );
}
