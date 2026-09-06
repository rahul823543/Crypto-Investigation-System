import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Zap,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useCreateCase } from '@/hooks/useCreateCase';
import { isValidEvmAddress } from '@/utils/address';

export const CreateCasePage: React.FC = () => {
  const [address, setAddress] = useState('');
  const [chainId, setChainId] = useState<number>(80002);
  const [mode, setMode] = useState<'demo' | 'live'>('demo');
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const createCase = useCreateCase();

  const supportedChains = [
    { id: 80002, name: 'Polygon Amoy Testnet', native: 'MATIC / POL', badge: 'Recommended' },
    { id: 137, name: 'Polygon PoS Mainnet', native: 'POL' },
    { id: 1, name: 'Ethereum Mainnet', native: 'ETH' },
    { id: 42161, name: 'Arbitrum One', native: 'ETH' },
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

    // If it matches the seeded case address, route directly to the rich seeded case
    if (trimmed.toLowerCase() === '0x8d2a5789bc10398f42ef937a01d5ce68369f1'.toLowerCase()) {
      navigate('/cases/case_001');
      return;
    }

    createCase.mutate({
      rootAddress: trimmed,
      chainId,
      mode,
    });
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
                  onClick={() => setChainId(chain.id)}
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
                  Real-time RPC provider ingestion & Python analysis
                </div>
              </button>
            </div>
          </div>

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
