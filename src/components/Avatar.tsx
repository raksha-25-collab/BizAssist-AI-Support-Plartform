import { useState } from 'react';
import { AVATAR_PATHS } from '../types/bizassist';

interface AvatarProps {
  person: 'elena' | 'sarah' | 'marcus';
  name: string;
  size?: 'sm' | 'md' | 'lg';
  online?: boolean;
}

export function Avatar({ person, name, size = 'md', online = false }: AvatarProps) {
  const [failed, setFailed] = useState(false);

  const dims =
    size === 'sm'
      ? 'w-8 h-8 text-xs'
      : size === 'lg'
        ? 'w-14 h-14 text-base'
        : 'w-10 h-10 text-sm';

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="relative inline-flex shrink-0">
      {!failed ? (
        <img
          src={AVATAR_PATHS[person]}
          alt={`${name} portrait`}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className={`${dims} rounded-full object-cover border border-[#E5DDD5] bg-[#F3ECE6]`}
        />
      ) : (
        <div
          className={`${dims} rounded-full bg-[#C23B0A]/12 text-[#C23B0A] font-bold flex items-center justify-center border border-[#C23B0A]/25`}
        >
          {initials}
        </div>
      )}
      {online && (
        <span
          aria-label="Online"
          className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-600 ring-2 ring-white"
        />
      )}
    </div>
  );
}
