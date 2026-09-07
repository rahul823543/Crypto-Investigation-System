import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Zap,
  ArrowLeft,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useCreateCase } from '@/hooks/useCreateCase';
import { useUiStore } from '@/store/uiStore';
import { isValidEvmAddress } from '@/utils/address';
import type { CaseMode } from '@/types';

// ── Seeded wallet fixture (imported directly so it stays in sync) ──────────────
import seededCaseData from '@/data/seeded-case.json';

interface SeededCase {
  caseId: string;
  rootAddress: string;
  chainId: number;
  mode: string;
  status: string;
  riskScore: number;
  riskLevel: string;
}

const SEEDED_CASES = seededCaseData.cases as SeededCase[];

/** Truncate an address for display: 0x1234...abcd */
function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 8)}...${addr.slice(-4)}`;
}

/** Map riskLevel string to a colour badge class */
function riskBadgeClass(riskLevel: string): string {
  switch (riskLevel) {
    case 'critical':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'medium':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200';
  }
}

function humanStatus(status: string): string {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Seeded Address Hint Panel ──────────────────────────────────────────────────
interface SeededHintPanelProps {
  visible: boolean;
}

const SeededHintPanel: React.FC<SeededHintPanelProps> = ({ visible }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  if (!visible) return null;

  const handleCopy = (caseItem: SeededCase) => {
    navigator.clipboard.writeText(caseItem.rootAddress).then(() => {
      setCopiedId(caseItem.caseId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <div className="mt-3 rounded-2xl border border-purple-200 bg-purple-50/60 overflow-hidden transition-all duration-200">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-purple-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-purple-600" />
          <span className="text-xs font-bold text-purple-800 uppercase tracking-wider font-mono">
            Demo Wallet Addresses (Seeded Fixtures)
          </span>
          <span className="text-[10px] font-mono text-purple-500 bg-purple-100 px-1.5 py-0.5 rounded-full">
            {SEEDED_CASES.length} available
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-purple-500" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-purple-500" />
        )}
      </button>

      {/* Address Rows */}
      {expanded && (
        <div className="border-t border-purple-200/70 divide-y divide-purple-100">
          {SEEDED_CASES.map((c, index) => {
            const isCopied = copiedId === c.caseId;
            return (
              <div
                key={c.caseId}
                className="flex items-center gap-3 px-4 py-2.5 group hover:bg-purple-50/80 transition-colors"
              >
                {/* Risk badge */}
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border shrink-0 ${riskBadgeClass(c.riskLevel)}`}
                >
                  {c.riskScore > 0 ? `${c.riskScore}` : '—'}
                </span>

                {/* Address + label */}
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-800 font-medium select-all truncate">
                      {truncateAddress(c.rootAddress)}
                    </span>
                    {index === 0 && (
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-purple-200 text-purple-800 shrink-0">
                        Primary Backend Seed
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono truncate">
                    {humanStatus(c.status)}
                  </span>
                </div>

                {/* Copy button */}
                <button
                  type="button"
                  onClick={() => handleCopy(c)}
                  title={`Copy ${c.rootAddress}`}
                  className={`flex items-center gap-1.5 text-[11px] font-semibold font-mono px-2.5 py-1 rounded-xl border transition-all shrink-0 cursor-pointer ${
                    isCopied
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-purple-300 hover:text-purple-700'
                  }`}
                >
                  {isCopied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}

          <div className="px-4 py-2 bg-purple-50/40">
            <p className="text-[10px] text-purple-500 font-mono">
              Copy the primary backend seed (0x1234...5678) → paste above → run through Fastify or offline demo
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// ── CreateCasePage ─────────────────────────────────────────────────────────────
export const CreateCasePage: React.FC = () => {
  const { activeChainId, setActiveChainId } = useUiStore();
  const [address, setAddress] = useState('');
  const [chainId, setChainId] = useState<number>(activeChainId);
  const [mode, setMode] = useState<CaseMode>('demo');
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const createCase = useCreateCase();

  const supportedChains = [
    { id: 80002, name: 'Polygon Amoy Testnet', native: 'MATIC / POL', badge: 'Recommended' },
    { id: 1, name: 'Ethereum Mainnet', native: 'ETH', badge: 'L1' },
    { id: 42161, name: 'Arbitrum One', native: 'ETH', badge: 'L2 Rollup' },
    { id: 11155111, name: 'Sepolia Testnet', native: 'SepoliaETH', badge: 'Testnet' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = address.trim();
    if (!trimmed) {
      setError('EVM wallet address is required.');
      return;
    }
    if (!isValidEvmAddress(trimmed)) {
      setError('Must be a valid 42-character hex address (0x...).');
      return;
    }
    setError(null);

    // In demo mode, if the address matches a seeded case → navigate directly
    if (mode === 'demo') {
      const seededMatch = SEEDED_CASES.find(
        (c) => c.rootAddress.toLowerCase() === trimmed.toLowerCase()
      );
      if (seededMatch) {
        navigate(`/cases/${seededMatch.caseId}`);
        return;
      }
    }

    createCase.mutate({ rootAddress: trimmed, chainId, mode });
  };

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-8">
      {/* Back button */}
      <button
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-2 text-xs font-semibold text-[#526077] hover:text-[#0F172A] transition-colors cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Dashboard</span>
      </button>

      {/* Main Creation Card */}
      <Card variant="elevated" className="p-8">
        <div className="flex items-center gap-3 mb-6 pb-5 border-b border-slate-100">
          <div className="p-3 rounded-2xl bg-purple-50 text-[#7E22CE]">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-display font-bold text-2xl text-[#0F172A] tracking-tight">
              Initiate On-Chain Forensic Triage
            </h2>
            <p className="text-xs sm:text-sm text-[#526077] mt-0.5">
              Launch autonomous multi-hop transaction tracing and behavioral risk scoring.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Target Address */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#0F172A] mb-2 font-mono">
              Root EVM Wallet or Contract Address *
            </label>
            <Input
              placeholder="0x..."
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                if (error) setError(null);
              }}
              error={error || undefined}
              className="py-3 font-mono text-sm"
            />
            <p className="text-xs text-[#94A3B8] mt-1.5 pl-1">
              Supports any standard EVM address (e.g. suspect wallet, DEX router, bridge endpoint).
            </p>

            {/* Seeded hint panel — only in demo mode */}
            <SeededHintPanel visible={mode === 'demo'} />
          </div>

          {/* Target Chain */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#0F172A] mb-2 font-mono">
              Target EVM Consensus Ledger
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {supportedChains.map((chain) => (
                <div
                  key={chain.id}
                  onClick={() => {
                    setChainId(chain.id);
                    setActiveChainId(chain.id);
                  }}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    chainId === chain.id
                      ? 'bg-purple-50/70 border-[#4F46E5] ring-2 ring-purple-100 shadow-xs'
                      : 'bg-white border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[#0F172A]">
                      {chain.name}
                    </span>
                    {chain.badge && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100">
                        {chain.badge}
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-mono text-[#94A3B8] mt-1">
                    Chain ID: #{chain.id} • {chain.native}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Execution Mode */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#0F172A] mb-2 font-mono">
              Data Pipeline Source
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode('demo')}
                className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                  mode === 'demo'
                    ? 'bg-purple-50/70 border-[#4F46E5] text-purple-900 font-semibold'
                    : 'bg-white border-slate-200/80 text-slate-600'
                }`}
              >
                <div className="text-sm font-bold">Seeded Demo Fixture</div>
                <div className="text-[11px] text-slate-400 font-normal">
                  Instant offline testing with pre-baked laundering cases
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode('live')}
                className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                  mode === 'live'
                    ? 'bg-emerald-50/70 border-emerald-600 text-emerald-900 font-semibold'
                    : 'bg-white border-slate-200/80 text-slate-600'
                }`}
              >
                <div className="text-sm font-bold">Live Fastify Backend</div>
                <div className="text-[11px] text-slate-400 font-normal">
                  Real-time RPC provider ingestion &amp; Python analysis
                </div>
              </button>
            </div>
          </div>

          {/* API Error Banner */}
          {createCase.isError && (
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-200">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800">Failed to create case</p>
                <p className="text-xs text-red-600 mt-0.5">
                  {createCase.error?.message || 'Unable to reach the Fastify backend. Check that the server is running.'}
                </p>
              </div>
            </div>
          )}

          {/* Submit CTA */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/')}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={createCase.isPending}
              rightIcon={<Zap className="h-4 w-4" />}
            >
              Launch Case Triage
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
