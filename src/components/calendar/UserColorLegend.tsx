import { useTranslation } from 'react-i18next';
import { colorOrFallback } from '@/lib/color';
import type { User } from '@/types';

interface UserColorLegendProps {
  users: User[];
}

export function UserColorLegend({ users }: UserColorLegendProps) {
  const { t } = useTranslation('calendar');

  if (users.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      <span className="text-muted-foreground">{t('legend.title')}:</span>
      {users.map((user) => (
        <span key={user.id} className="flex items-center gap-1.5">
          <span
            className="h-3 w-3 shrink-0 rounded-full border border-black/10"
            style={{ backgroundColor: colorOrFallback(user.calendarColor) }}
          />
          <span>{user.firstName} {user.lastName}</span>
        </span>
      ))}
    </div>
  );
}
