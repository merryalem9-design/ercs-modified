import React from 'react';
import { getBudgetStatusBadge } from '../../utils/calculations';

interface Props {
  utilizationPct: number;
  hasSpend?: boolean;
}

export const BudgetStatusBadge: React.FC<Props> = ({ utilizationPct, hasSpend = true }) => {
  const badge = getBudgetStatusBadge(utilizationPct, hasSpend);
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${badge.color}`}>
      {badge.label}
    </span>
  );
};
