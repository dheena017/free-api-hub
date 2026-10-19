import React, { useState } from 'react';
import { parseCurlCommand, ParsedCurl } from '../utils/curlParser';
import { Terminal, X, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';

interface CurlImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (parsed: ParsedCurl) => void;
  sampleCurl?: string;
}

export const CurlImportModal: React.FC<CurlImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  sampleCurl
}) => {
  const [curlText, setCurlText] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleImport = () => {
    setError(null);
    if (!curlText.trim()) {
      setError('Please paste a cURL command before importing.');
      return;
    }

    const result = parseCurlCommand(curlText);
    if (result.error || !result.url) {
      setError(result.error || 'Could not parse a valid target URL from this cURL command.');
      return;
    }

    onImport(result);
    onClose();
  };

  const handleLoadSample = () => {
    setCurlText(
      sampleCurl ||
      `curl -X GET "https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current_weather=true" \\\n  -H "Accept: application/json"`
    );
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl bg-[#28292A] border border-[#3C4043] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#3C4043] flex items-center justify-between bg-[#232425]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#8AB4F8]/10 text-[#8AB4F8] border border-[#8AB4F8]/20">
              <Terminal className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Import from cURL</h3>
              <p className="text-[11px] text-slate-400">
                Paste any cURL command to automatically extract Method, URL, Headers, and Body
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#303134] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Paste cURL command:</span>
            <button
              onClick={handleLoadSample}
              className="inline-flex items-center gap-1 text-[11px] text-[#8AB4F8] hover:underline"
            >
              <Sparkles className="h-3 w-3" />
              <span>Load sample cURL</span>
            </button>
          </div>

          <textarea
            value={curlText}
            onChange={(e) => {
              setCurlText(e.target.value);
              if (error) setError(null);
            }}
            placeholder={
              sampleCurl ||
              'curl -X GET "https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current_weather=true" -H "Accept: application/json"'
            }
            rows={6}
            className="w-full bg-[#1F1F1F] border border-[#3C4043] rounded-xl p-3 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[#8AB4F8] resize-none"
            autoFocus
          />

          {error && (
            <div className="p-3 rounded-lg bg-[#F28B82]/10 border border-[#F28B82]/30 flex items-center gap-2 text-xs text-[#F28B82]">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-[#232425] border-t border-[#3C4043] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-[#303134] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#8AB4F8] hover:bg-[#A8C7FA] text-[#1F1F1F] font-bold text-xs transition-colors"
          >
            <span>Parse & Populate</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
