'use client';

import type { Player } from '@/types';

interface PlayerCardProps {
  player: Pick<Player, 'id' | 'name' | 'photoUrl'>;
  subtitle?: React.ReactNode;
  trailing?: React.ReactNode;
  compact?: boolean;
}

export function PlayerAvatar({
  name,
  photoUrl,
  size = 40,
}: {
  name: string;
  photoUrl?: string | null;
  size?: number;
}) {
  const initial = name?.charAt(0)?.toUpperCase() ?? '?';
  if (photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={photoUrl}
        alt={name}
        style={{ width: size, height: size }}
        className="rounded-full object-cover ring-2 ring-white/10"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className="flex items-center justify-center rounded-full bg-gradient-to-br from-ocean-500 to-ocean-700 font-semibold text-white ring-2 ring-white/10"
    >
      {initial}
    </div>
  );
}

export function PlayerCard({
  player,
  subtitle,
  trailing,
  compact,
}: PlayerCardProps) {
  return (
    <div className={`flex items-center gap-3 ${compact ? '' : 'p-1'}`}>
      <PlayerAvatar
        name={player.name}
        photoUrl={player.photoUrl}
        size={compact ? 32 : 44}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-slate-100">{player.name}</div>
        {subtitle ? (
          <div className="truncate text-xs text-slate-400">{subtitle}</div>
        ) : null}
      </div>
      {trailing}
    </div>
  );
}
