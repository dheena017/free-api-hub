import React, { useState } from 'react';
import { parseCurlCommand, ParsedCurl } from '../../utils/curlParser';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-surface-elevated/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-accent/10 text-accent border border-accent/20">
              <Terminal className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-base">Import from cURL</h3>
              <p className="text-[11px] text-text-muted">
                Paste any cURL command to automatically extract Method, URL, Headers, and Body
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-base p-1.5 rounded-lg hover:bg-surface-hover transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span className="font-medium">Paste cURL command:</span>
            <button
              onClick={handleLoadSample}
              className="inline-flex items-center gap-1.5 text-xs text-accent hover:text-accent-hover font-medium hover:underline cursor-pointer"
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
            spellCheck={false}
            className="w-full bg-surface-elevated border border-border rounded-xl p-3.5 text-xs font-mono text-text-base placeholder:text-text-muted/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none transition-all"
            autoFocus
          />

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-400">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-surface-elevated/40 border-t border-border flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-text-muted hover:text-text-base hover:bg-surface-hover transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-background font-bold text-xs shadow-md shadow-accent/20 transition-all cursor-pointer"
          >
            <span>Parse & Populate</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
