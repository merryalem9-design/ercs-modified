import React from 'react';
import { ApprovalStatus } from '../../types';

const STYLES: Record<ApprovalStatus, string> = {
  'Draft': 'bg-slate-100 text-slate-700 border-slate-300',
  'Pending Approval': 'bg-amber-100 text-amber-800 border-amber-300',
  'Approved': 'bg-emerald-100 text-emerald-800 border-emerald-300',
  'Rejected': 'bg-rose-100 text-rose-800 border-rose-300',
};

interface Props {
  status: ApprovalStatus;
  className?: string;
}

export const ApprovalStatusBadge: React.FC<Props> = ({ status, className = '' }) => (
  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${STYLES[status]} ${className}`}>
    {status}
  </span>
);
