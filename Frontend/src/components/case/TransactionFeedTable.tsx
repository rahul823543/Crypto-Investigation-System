import React, { useState } from 'react';
import {
  ArrowRight,
  Copy,
  Check,
  Layers,
} from 'lucide-react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import { RiskBadge } from '@/components/ui/Badge';
import { shortenAddress } from '@/utils/address';

export interface IngestedTransaction {
  txHash: string;
  from: string;
  to: string;
  toLabel?: string;
  asset: string;
  amount: string;
  amountUsd: number;
  timestamp: string;
  hopDepth: number;
  transferType: 'native' | 'erc20' | 'contract_call';
  riskLevel: 'low' | 'medium' | 'high';
}

export const TransactionFeedTable: React.FC<{ className?: string }> = ({ className }) => {
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const transactions: IngestedTransaction[] = [
    {
      txHash: '0x1a8f9c2d3e4b5a6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c',
      from: '0x8d2a5789bc10398f42ef937a01d5ce68369f1',
      to: '0x3f1ce4b08c90281fa0e18193a201cba23e4199b2',
      toLabel: 'Wallet A',
      asset: 'USDC',
      amount: '3,000.00',
      amountUsd: 3000,
      timestamp: '10:00:15 UTC',
      hopDepth: 1,
      transferType: 'erc20',
      riskLevel: 'high',
    },
    {
      txHash: '0x2b9a0d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c',
      from: '0x8d2a5789bc10398f42ef937a01d5ce68369f1',
      to: '0x9812ba3c11e74a899014cfab94821a003f4e014c',
      toLabel: 'Wallet B',
      asset: 'USDC',
      amount: '3,000.00',
      amountUsd: 3000,
      timestamp: '10:03:22 UTC',
      hopDepth: 1,
      transferType: 'erc20',
      riskLevel: 'high',
    },
    {
      txHash: '0x3c0b1e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d',
      from: '0x8d2a5789bc10398f42ef937a01d5ce68369f1',
      to: '0x5a1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e',
      toLabel: 'Wallet C',
      asset: 'USDC',
      amount: '4,000.00',
      amountUsd: 4000,
      timestamp: '10:05:40 UTC',
      hopDepth: 1,
      transferType: 'erc20',
      riskLevel: 'high',
    },
    {
      txHash: '0x4d1c2f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e',
      from: '0x8d2a5789bc10398f42ef937a01d5ce68369f1',
      to: '0xa5e0829caced8ffdd4de3c43696c57f7d7a678ff',
      toLabel: 'QuickSwap V2 Router',
      asset: 'USDC',
      amount: '5,000.00',
      amountUsd: 5000,
      timestamp: '10:07:05 UTC',
      hopDepth: 1,
      transferType: 'contract_call',
      riskLevel: 'medium',
    },
    {
      txHash: '0x5e2d3a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f',
      from: '0x3f1ce4b08c90281fa0e18193a201cba23e4199b2',
      to: '0x7b2f81aa90c8d1e2f3a4b5c6d7e8f9a0b1c2d3e4',
      toLabel: 'Wallet D (2nd Hop)',
      asset: 'USDC',
      amount: '2,800.00',
      amountUsd: 2800,
      timestamp: '10:25:30 UTC',
      hopDepth: 2,
      transferType: 'erc20',
      riskLevel: 'medium',
    },
  ];

  const copyHash = (hash: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  return (
    <div
      className={`p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/80 shadow-[0_10px_35px_rgba(0,0,0,0.03)] ${className}`}
    >
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-[#4F46E5]" />
          <h3 className="font-display font-bold text-base text-slate-900 tracking-tight">
            Ingested Multi-Hop Transaction Ledger
          </h3>
        </div>
        <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full font-semibold">
          {transactions.length} Transfers Extracted
        </span>
      </div>

      <Table>
        <TableHeader>
          <tr>
            <TableHead>Tx Hash</TableHead>
            <TableHead>Flow Route</TableHead>
            <TableHead>Asset & Volume</TableHead>
            <TableHead>Hop Level</TableHead>
            <TableHead>Risk Signal</TableHead>
            <TableHead className="text-right">Timestamp</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => (
            <TableRow key={tx.txHash}>
              {/* Tx Hash */}
              <TableCell>
                <div className="flex items-center gap-1.5 font-mono text-xs text-slate-800">
                  <span className="font-semibold">{shortenAddress(tx.txHash, 4)}</span>
                  <button
                    onClick={(e) => copyHash(tx.txHash, e)}
                    className="p-1 hover:bg-slate-200/70 rounded text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    title="Copy tx hash"
                  >
                    {copiedHash === tx.txHash ? (
                      <Check className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </div>
              </TableCell>

              {/* Route */}
              <TableCell>
                <div className="flex items-center gap-1.5 text-xs font-mono">
                  <span className="text-slate-500">{shortenAddress(tx.from, 3)}</span>
                  <ArrowRight className="h-3 w-3 text-slate-400" />
                  <span className="font-bold text-slate-900">
                    {tx.toLabel || shortenAddress(tx.to, 3)}
                  </span>
                </div>
              </TableCell>

              {/* Asset & Amount */}
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-mono font-bold text-xs text-slate-900">
                    {tx.amount} {tx.asset}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ≈ ${tx.amountUsd.toLocaleString()} USD
                  </span>
                </div>
              </TableCell>

              {/* Hop Level */}
              <TableCell>
                <span className="px-2 py-0.5 rounded-md bg-purple-50 text-[#7E22CE] font-mono text-[11px] font-semibold border border-purple-100">
                  Hop #{tx.hopDepth}
                </span>
              </TableCell>

              {/* Risk Signal */}
              <TableCell>
                <RiskBadge riskLevel={tx.riskLevel} size="sm" />
              </TableCell>

              {/* Timestamp */}
              <TableCell className="text-right font-mono text-xs text-slate-500">
                {tx.timestamp}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
