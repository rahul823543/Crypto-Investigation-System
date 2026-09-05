import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Sparkles, Zap } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TelemetryCard } from './TelemetryCard';
import { useCreateCase } from '@/hooks/useCreateCase';
import { isValidEvmAddress } from '@/utils/address';

export const HeroSection: React.FC = () => {
  const [addressInput, setAddressInput] = useState('0x8d2a5789bc10398f42ef937a01d5ce68369f1');
  const [validationError, setValidationError] = useState<string | null>(null);
  const navigate = useNavigate();
  const createCase = useCreateCase();

  const presets = [
    {
      label: 'Tornado Router',
      address: '0x8d2a5789bc10398f42ef937a01d5ce68369f1',
      dotColor: 'bg-[#EF4444]',
    },
    {
      label: 'DEX Wash Loop',
      address: '0x3f1ce4b08c90281fa0e18193a201cba23e4199b2',
      dotColor: 'bg-[#FBBF24]',
    },
    {
      label: 'Hop Relay Bridge',
      address: '0x9812ba3c11e74a899014cfab94821a003f4e014c',
      dotColor: 'bg-[#A855F7]',
    },
  ];

  const handleLaunch = () => {
    const trimmed = addressInput.trim();
    if (!trimmed) {
      setValidationError('Please enter an EVM wallet address.');
      return;
    }
    if (!isValidEvmAddress(trimmed)) {
      setValidationError('Must be a valid 42-character hex address (0x...).');
      return;
    }
    setValidationError(null);

    // If it matches the seeded case address, route directly to the rich seeded case
    if (trimmed.toLowerCase() === '0x8d2a5789bc10398f42ef937a01d5ce68369f1'.toLowerCase()) {
      navigate('/cases/case_001');
      return;
    }

    createCase.mutate({
      rootAddress: trimmed,
      chainId: 80002,
      mode: 'demo',
    });
  };

  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center pt-4 pb-12 lg:py-16">
      {/* Left Column: Bold, Clean & Airy Typography + Search Pill */}
      <div className="lg:col-span-6 flex flex-col justify-center">
        {/* Top Eyebrow Tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-50/80 border border-purple-100/90 text-[#7E22CE] font-semibold text-xs w-fit mb-6 shadow-xs">
          <Sparkles className="h-3.5 w-3.5 text-purple-600" />
          <span>EVM Autonomous Forensic Intelligence</span>
          <span className="text-slate-300">•</span>
          <span className="font-mono text-purple-800 font-bold">v3.4 Production</span>
        </div>

        {/* Main Headline */}
        <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl tracking-[-0.035em] text-[#0F172A] leading-[1.08] mb-6">
          The Smarter,<br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#0F172A] via-[#4F46E5] to-[#7E22CE]">
            Autonomous
          </span><br />
          On-Chain Triage.
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-[#526077] font-normal leading-relaxed max-w-[530px] mb-8">
          Ingest EVM transactions instantaneously, trace multi-hop obfuscation topologies, and anchor tamper-proof cryptographic evidence directly to consensus ledgers.
        </p>

        {/* Search Input Pill */}
        <div className="max-w-[560px] w-full">
          <div className="p-1.5 bg-white rounded-full border border-slate-200/90 shadow-[0_12px_36px_rgba(147,51,234,0.08)] flex items-center gap-2 hover:border-purple-300 transition-all focus-within:border-[#4F46E5] focus-within:ring-4 focus-within:ring-purple-100">
            <div className="pl-3.5 text-[#94A3B8] flex items-center pointer-events-none">
              <Search className="h-5 w-5" />
            </div>
            <input
              className="w-full bg-transparent border-none text-sm font-mono text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-0 py-2"
              placeholder="Paste EVM Wallet (0x...) or ENS Domain..."
              type="text"
              value={addressInput}
              onChange={(e) => {
                setAddressInput(e.target.value);
                if (validationError) setValidationError(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleLaunch()}
            />
            <Button
              variant="primary"
              onClick={handleLaunch}
              isLoading={createCase.isPending}
              rightIcon={<Zap className="h-4 w-4" />}
              className="shrink-0 shadow-sm"
            >
              Analyze
            </Button>
          </div>

          {validationError && (
            <p className="text-xs text-red-500 font-medium pl-4 mt-2">
              {validationError}
            </p>
          )}

          {/* Quick Preset Chips */}
          <div className="flex flex-wrap items-center gap-2 mt-4 pl-2">
            <span className="text-xs font-semibold text-[#94A3B8]">
              Quick Presets:
            </span>
            {presets.map((preset) => (
              <button
                key={preset.label}
                onClick={() => {
                  setAddressInput(preset.address);
                  setValidationError(null);
                }}
                className="px-3 py-1 bg-white hover:bg-slate-50 border border-slate-200/80 text-[#526077] hover:text-[#0F172A] rounded-full font-mono text-xs transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${preset.dotColor}`} />
                <span>{preset.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column: 3D Sculptural Telemetry Preview */}
      <div className="lg:col-span-6 relative flex items-center justify-center">
        <TelemetryCard />
      </div>
    </section>
  );
};
