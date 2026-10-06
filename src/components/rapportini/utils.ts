import { useAuth } from '@/contexts/AuthContext';
import { rapportiniApi } from '@/lib/api';

// Mirrors RapportinoService.seesEverything on the backend (the backend is the real check)
export function useRapportinoPermissions() {
  const { user } = useAuth();
  const isPrivileged = user?.role === 'ADMIN' || user?.role === 'OWNER' || user?.type === 'ADMINISTRATION';
  return {
    userId: user?.id,
    canSeeAll: isPrivileged,
    canVoid: isPrivileged,
  };
}

// Fetches the PDF with the JWT and opens it in a new tab (no storage URL ever reaches the browser)
export async function openRapportinoPdf(id: string) {
  // open synchronously to keep the user gesture (popup blockers), then point it at the blob
  const win = window.open('', '_blank');
  try {
    const blob = await rapportiniApi.getPdfBlob(id);
    const url = URL.createObjectURL(blob);
    if (win) {
      win.location.href = url;
    } else {
      window.location.href = url;
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    win?.close();
    throw error;
  }
}

export const formatHours = (value: number | null | undefined) =>
  value == null ? '0' : Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
