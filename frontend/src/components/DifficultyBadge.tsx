import React from 'react';
import type { Difficulty } from '../api/types';

interface DifficultyBadgeProps {
  difficulty: Difficulty | string;
  className?: string;
}

export const DifficultyBadge: React.FC<DifficultyBadgeProps> = ({ difficulty, className = '' }) => {
  const normalized = (difficulty || 'EASY').toUpperCase();

  let colorClasses = 'bg-emerald-950/50 text-emerald-400 border-emerald-800/80 shadow-[0_0_8px_rgba(16,185,129,0.2)]';

  if (normalized === 'MEDIUM') {
    colorClasses = 'bg-amber-950/50 text-amber-400 border-amber-800/80 shadow-[0_0_8px_rgba(245,158,11,0.2)]';
  } else if (normalized === 'HARD') {
    colorClasses = 'bg-rose-950/50 text-rose-400 border-rose-800/80 shadow-[0_0_8px_rgba(244,63,94,0.2)]';
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-mono font-medium border tracking-wider uppercase ${colorClasses} ${className}`}
    >
      {normalized}
    </span>
  );
};

export default DifficultyBadge;
