import React, { useState } from 'react';
import {
  History,
  Search,
  Filter,
  Eye,
  FileText,
  ArrowRight,
  X,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
  Calendar,
  Layers,
  Download
} from 'lucide-react';
import { SAMPLE_INVESTIGATIONS } from '../../data/sampleInvestigations';
import { InvestigationRecord, RiskLevel, InvestigationType } from '../../types';
import { RiskBadge } from '../../components/common/RiskBadge';
import { ThreatEvidencePanel } from '../../components/common/ThreatEvidencePanel';
import { DemoBanner } from '../../components/common/DemoBanner';
import { DashboardViewId } from '../../components/layout/Sidebar';

interface InvestigationHistoryViewProps {
  onNavigate: (view: DashboardViewId, target?: string) => void;
}

export const InvestigationHistoryView: React.FC<InvestigationHistoryViewProps> = ({ onNavigate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [selectedRecord, setSelectedRecord] = useState<InvestigationRecord | null>(null);

  const filteredRecords = SAMPLE_INVESTIGATIONS.filter((rec) => {
    const matchesSearch =
      rec.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.target.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.category.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'ALL' || rec.type === typeFilter;
    const matchesRisk = riskFilter === 'ALL' || rec.riskLevel === riskFilter;

    return matchesSearch && matchesType && matchesRisk;
  });

  return (
    <div className="space-y-6 text-left font-mono">
      {/* Top Banner Notice */}
      <DemoBanner />

      {/* Header Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <History className="w-5 h-5 text-[#FF9933]" />
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">
              Forensic Investigation Audit Log
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-sans max-w-2xl">
            Immutable log of previously analyzed targets, lexical indicators, forensic certificates, and evidence vectors.
          </p>
        </div>

        <div className="text-xs text-slate-400">
          Total Archived Records: <span className="font-bold text-white">{SAMPLE_INVESTIGATIONS.length}</span>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="p-4 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by ID, target URL/domain, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF9933]"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-black/80 border border-white/15 text-xs text-white focus:outline-none focus:border-[#FF9933]"
          >
            <option value="ALL">All Modalities</option>
            <option value="URL">URL</option>
            <option value="MESSAGE">MESSAGE</option>
            <option value="DOMAIN">DOMAIN</option>
            <option value="TLS">TLS</option>
          </select>

          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-black/80 border border-white/15 text-xs text-white focus:outline-none focus:border-[#FF9933]"
          >
            <option value="ALL">All Risk Levels</option>
            <option value="CONFIRMED_MALICIOUS">Confirmed Malicious</option>
            <option value="HIGH_RISK">High Risk</option>
            <option value="SUSPICIOUS">Suspicious</option>
            <option value="LOW_RISK">Low Risk</option>
          </select>
        </div>
      </div>

      {/* Main Records Table */}
      <div className="p-5 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 text-[10px] text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-3">Investigation ID</th>
                <th className="py-2.5 px-3">Target Asset</th>
                <th className="py-2.5 px-3">Modality</th>
                <th className="py-2.5 px-3">Threat Category</th>
                <th className="py-2.5 px-3">Risk Assessment</th>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 text-[11px]">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No investigation records match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-3 font-bold text-white whitespace-nowrap">
                      {rec.id}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300 max-w-xs truncate">
                      {rec.target}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-white/10 border border-white/10 text-slate-300 text-[10px] font-bold">
                        {rec.type}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-sans max-w-xs truncate">
                      {rec.category}
                    </td>
                    <td className="py-3 px-3">
                      <RiskBadge level={rec.riskLevel} score={rec.riskScore} size="sm" />
                    </td>
                    <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                      {rec.timestamp}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedRecord(rec)}
                          className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold text-[10px] uppercase flex items-center gap-1 cursor-pointer transition-colors"
                          title="Quick Inspect"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Inspect</span>
                        </button>
                        <button
                          onClick={() => {
                            if (rec.type === 'URL') {
                              onNavigate('url', rec.target);
                            } else if (rec.type === 'MESSAGE') {
                              onNavigate('message', rec.target);
                            } else {
                              onNavigate('domain', rec.targetDomain || rec.target);
                            }
                          }}
                          className="p-1 rounded bg-white/10 hover:bg-[#FF9933]/20 hover:text-[#FF9933] border border-white/10 text-slate-400 cursor-pointer transition-colors"
                          title="Open in Workspace"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Inspection Modal / Drawer */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-3xl max-h-[90vh] bg-black/90 border border-white/15 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col font-mono text-left animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 px-6 border-b border-white/10 flex items-center justify-between bg-black/60">
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest block">
                  INVESTIGATION DOSSIER
                </span>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>{selectedRecord.id}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-white/10 border border-white/10 text-slate-300 font-normal">
                    {selectedRecord.type}
                  </span>
                </h3>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Target & Risk Level */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Target Asset</span>
                  <p className="text-sm font-bold text-white font-mono break-all">{selectedRecord.target}</p>
                  <p className="text-xs text-slate-400 font-sans">{selectedRecord.category}</p>
                </div>
                <div className="self-start sm:self-auto">
                  <RiskBadge level={selectedRecord.riskLevel} score={selectedRecord.riskScore} size="lg" />
                </div>
              </div>

              {/* Evidence Summary */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Forensic Summary
                </span>
                <p className="text-xs text-slate-300 font-sans leading-relaxed p-3 rounded-lg bg-black/40 border border-white/10">
                  {selectedRecord.evidenceSummary}
                </p>
              </div>

              {/* Corroborated Indicators */}
              <div className="space-y-2">
                <ThreatEvidencePanel evidenceList={selectedRecord.indicators} />
              </div>

              {/* Timestamp & Provenance */}
              <div className="pt-3 border-t border-white/10 text-[11px] text-slate-400 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500 block">Logged Timestamp:</span>
                  <span className="text-white">{selectedRecord.timestamp}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Status:</span>
                  <span className="text-emerald-400 font-bold">{selectedRecord.status}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 px-6 border-t border-white/10 bg-black/60 flex items-center justify-between gap-3">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-bold text-slate-300 cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const target = selectedRecord.target;
                    const type = selectedRecord.type;
                    setSelectedRecord(null);
                    if (type === 'URL') {
                      onNavigate('url', target);
                    } else if (type === 'MESSAGE') {
                      onNavigate('message', target);
                    } else {
                      onNavigate('domain', selectedRecord.targetDomain || target);
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-[#FF9933] hover:bg-[#e68a2e] text-black font-bold text-xs uppercase flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <span>Open in Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
