import React, { useMemo } from 'react';
import { Terminal, Copy, Check } from 'lucide-react';
import { CodeSnippetViewer } from '../../viewers/CodeSnippetViewer';
import { SnippetLanguage, SUPPORTED_LANGUAGES, POPULAR_LANG_LIST } from '../../../utils/codeSnippets';

export type { SnippetLanguage };
export { SUPPORTED_LANGUAGES, POPULAR_LANG_LIST };

export interface CodeSnippetsTabProps {
  activeSnippetLang: SnippetLanguage;
  onSetActiveSnippetLang: (lang: SnippetLanguage) => void;
  snippetCode: string;
  copiedSnippet: boolean;
  onCopySnippet: () => void;
  isUnified?: boolean;
}

export const CodeSnippetsTab: React.FC<CodeSnippetsTabProps> = ({
  activeSnippetLang,
  onSetActiveSnippetLang,
  snippetCode,
  copiedSnippet,
  onCopySnippet,
  isUnified = false,
}) => {
  const isPopularLang = POPULAR_LANG_LIST.some((l) => l.id === activeSnippetLang);
  const additionalLanguages = useMemo(() => {
    return SUPPORTED_LANGUAGES.filter((l) => !POPULAR_LANG_LIST.some((p) => p.id === l.id));
  }, []);

  const languageViewerType =
    activeSnippetLang === 'curl'
      ? 'curl'
      : ['js', 'axios', 'ts'].includes(activeSnippetLang)
        ? 'javascript'
        : activeSnippetLang.includes('python')
          ? 'python'
          : 'text';

  return (
    <div
      className={`${
        isUnified
          ? 'flex-1 flex flex-col h-full overflow-hidden'
          : 'bg-surface rounded-2xl border border-border flex flex-col min-h-[480px] h-[540px] overflow-hidden shadow-sm transition-colors'
      }`}
    >
      {/* Header with Language Tabs */}
      <div className="px-4 py-3 border-b border-border bg-surface-elevated/60 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1 rounded-lg bg-accent/10 text-accent">
              <Terminal className="h-4 w-4" />
            </div>
            <span className="text-xs font-bold text-text-base tracking-tight">
              Integration Client Code
            </span>
          </div>

          {/* Copy Code Button */}
          <button
            type="button"
            onClick={onCopySnippet}
            className="text-xs text-text-base hover:text-accent flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface hover:bg-surface-elevated border border-border transition-colors cursor-pointer"
          >
            {copiedSnippet ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-text-muted" />
            )}
            <span>{copiedSnippet ? 'Copied' : 'Copy Code'}</span>
          </button>
        </div>

        {/* Language Pill Selector with Quick Tabs + Clean Dropdown */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-0.5 scrollbar-none">
          <div className="flex items-center gap-1.5 flex-wrap">
            {POPULAR_LANG_LIST.map((lang) => {
              const isActive = activeSnippetLang === lang.id;
              return (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => onSetActiveSnippetLang(lang.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-medium whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-accent text-background font-bold shadow-sm shadow-accent/20'
                      : 'text-text-muted hover:text-text-base hover:bg-surface-elevated'
                  }`}
                >
                  {lang.label}
                </button>
              );
            })}

            {/* Clean Secondary Dropdown */}
            <div className="relative">
              <select
                value={isPopularLang ? '' : activeSnippetLang}
                onChange={(e) => {
                  if (e.target.value) {
                    onSetActiveSnippetLang(e.target.value as SnippetLanguage);
                  }
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all outline-none cursor-pointer border ${
                  !isPopularLang
                    ? 'bg-accent text-background font-bold border-accent shadow-sm shadow-accent/20'
                    : 'bg-surface text-text-muted hover:text-text-base border-border hover:border-border-light'
                }`}
                title="Choose from additional languages"
              >
                <option value="" disabled>
                  {isPopularLang
                    ? 'More...'
                    : SUPPORTED_LANGUAGES.find((l) => l.id === activeSnippetLang)?.label || 'More...'}
                </option>
                {additionalLanguages.map((lang) => (
                  <option key={lang.id} value={lang.id}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Snippet Code Box with Line Numbers & Syntax Highlighting */}
      <div className="flex-1 overflow-auto font-mono text-xs bg-[#16181D] text-slate-200 relative group">
        <CodeSnippetViewer
          code={snippetCode}
          language={languageViewerType}
          showLineNumbers={true}
        />
      </div>

      {/* Snippet Footer Info */}
      <div className="px-4 py-2 bg-surface-elevated/40 border-t border-border flex items-center justify-between text-[11px] text-text-muted font-sans">
        <div className="flex items-center gap-1.5 font-mono text-accent">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          <span>
            {SUPPORTED_LANGUAGES.find((l) => l.id === activeSnippetLang)?.label} snippet
          </span>
        </div>
        <span className="hidden sm:inline">Production ready • Timeout: 10s • Auto-serialized</span>
      </div>
    </div>
  );
};
