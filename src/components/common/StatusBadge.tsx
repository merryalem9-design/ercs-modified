import React from 'react';
import { getStatusBadge } from '../../utils/calculations';

interface Props {
  achievementPct: number;
  hasActuals?: boolean;
}

export const StatusBadge: React.FC<Props> = ({ achievementPct, hasActuals = true }) => {
  const badge = getStatusBadge(achievementPct, hasActuals);
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${badge.color}`}>
      {badge.label}
    </span>
  );
};
