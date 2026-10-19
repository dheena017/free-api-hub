import React from 'react';
import {
  SlidersHorizontal,
  FileText,
  Braces,
  KeyRound,
  Settings2,
  Database,
  Terminal,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Check,
  Copy,
  Download,
  LayoutTemplate,
  Columns
} from 'lucide-react';
import { ProxyResponse } from '../../types/api';
import { SnippetLanguage, SUPPORTED_LANGUAGES } from './CodeSnippetsTab';
import { RequestAuthMode } from './AuthTab';

export type RequestTab = 'params' | 'headers' | 'body' | 'response' | 'snippets' | 'auth' | 'settings';
export type WorkbenchLayout = 'tabs' | 'split';

export interface PlaygroundTabsNavProps {
  activeTab: RequestTab;
  onSelectTab: (tab: RequestTab) => void;
  workbenchLayout: WorkbenchLayout;
  onSetWorkbenchLayout: (mode: WorkbenchLayout) => void;
  paramsCount: number;
  headersCount: number;
  hasBody: boolean;
  authType: RequestAuthMode;
  bypassCache: boolean;
  isLoading: boolean;
  response: ProxyResponse | null;
  activeSnippetLang: SnippetLanguage;
  // Contextual actions
  onAddParam: () => void;
  onAddHeader: () => void;
  onFormatBody: () => void;
  onClearBody: () => void;
  onClearAuth: () => void;
  onResetSettings: () => void;
  onCopyJson?: () => void;
  copiedJson?: boolean;
  onDownloadJson?: () => void;
  onCopySnippet?: () => void;
  copiedSnippet?: boolean;
}

export const PlaygroundTabsNav: React.FC<PlaygroundTabsNavProps> = ({
  activeTab,
  onSelectTab,
  workbenchLayout,
  onSetWorkbenchLayout,
  paramsCount,
  headersCount,
  hasBody,
  authType,
  bypassCache,
  isLoading,
  response,
  activeSnippetLang,
  onAddParam,
  onAddHeader,
  onFormatBody,
  onClearBody,
  onClearAuth,
  onResetSettings,
  onCopyJson,
  copiedJson,
  onDownloadJson,
  onCopySnippet,
  copiedSnippet,
}) => {
  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
      {/* The Request & Response Tabs */}
      <div className="flex items-center gap-1 bg-surface-elevated p-1 rounded-xl border border-border overflow-x-auto scrollbar-none flex-nowrap shrink max-w-full">
        {/* Tab 1: Params */}
        <button
          type="button"
          onClick={() => onSelectTab('params')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'params'
              ? 'bg-accent text-background font-bold shadow-sm shadow-accent/20'
              : 'text-text-muted hover:text-text-base'
          }`}
        >
          <SlidersHorizontal className="h-3 w-3" />
          <span>Params</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              activeTab === 'params'
                ? 'bg-black/20 text-background'
                : 'bg-surface text-text-muted border border-border'
            }`}
          >
            {paramsCount}
          </span>
        </button>

        {/* Tab 2: Headers */}
        <button
          type="button"
          onClick={() => onSelectTab('headers')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'headers'
              ? 'bg-accent text-background font-bold shadow-sm shadow-accent/20'
              : 'text-text-muted hover:text-text-base'
          }`}
        >
          <FileText className="h-3 w-3" />
          <span>Headers</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              activeTab === 'headers'
                ? 'bg-black/20 text-background'
                : 'bg-surface text-text-muted border border-border'
            }`}
          >
            {headersCount}
          </span>
        </button>

        {/* Tab 3: Body */}
        <button
          type="button"
          onClick={() => onSelectTab('body')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'body'
              ? 'bg-accent text-background font-bold shadow-sm shadow-accent/20'
              : 'text-text-muted hover:text-text-base'
          }`}
        >
          <Braces className="h-3 w-3" />
          <span>Body</span>
          {hasBody && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
        </button>

        {/* Tab 4: Auth */}
        <button
          type="button"
          onClick={() => onSelectTab('auth')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'auth'
              ? 'bg-accent text-background font-bold shadow-sm shadow-accent/20'
              : 'text-text-muted hover:text-text-base'
          }`}
        >
          <KeyRound className="h-3 w-3" />
          <span>Auth</span>
          {authType !== 'none' && (
            <span
              className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                activeTab === 'auth'
                  ? 'bg-black/20 text-background'
                  : 'bg-emerald-500/20 text-emerald-400'
              }`}
            >
              ✓
            </span>
          )}
        </button>

        {/* Tab 5: Settings */}
        <button
          type="button"
          onClick={() => onSelectTab('settings')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'settings'
              ? 'bg-accent text-background font-bold shadow-sm shadow-accent/20'
              : 'text-text-muted hover:text-text-base'
          }`}
        >
          <Settings2 className="h-3 w-3" />
          <span>Settings</span>
          {bypassCache && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
        </button>

        {/* Divider and Result Tabs (Only shown in Tabs mode) */}
        {workbenchLayout === 'tabs' && (
          <>
            <div className="h-4 w-px bg-border mx-1 self-center shrink-0" />

            {/* Tab 6: Response */}
            <button
              type="button"
              onClick={() => onSelectTab('response')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'response'
                  ? 'bg-accent text-background font-bold shadow-sm shadow-accent/20'
                  : 'text-text-muted hover:text-text-base'
              }`}
            >
              <Database className="h-3 w-3" />
              <span>Response</span>
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin text-current" />
              ) : response ? (
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full font-mono ${
                    activeTab === 'response'
                      ? 'bg-black/20 text-background'
                      : response.status_code >= 200 && response.status_code < 300
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : response.status_code >= 400
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {response.status_code}
                </span>
              ) : null}
            </button>

            {/* Tab 7: Client Code */}
            <button
              type="button"
              onClick={() => onSelectTab('snippets')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'snippets'
                  ? 'bg-accent text-background font-bold shadow-sm shadow-accent/20'
                  : 'text-text-muted hover:text-text-base'
              }`}
            >
              <Terminal className="h-3 w-3" />
              <span>Client Code</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeTab === 'snippets'
                    ? 'bg-black/20 text-background'
                    : 'bg-surface text-text-muted border border-border'
                }`}
              >
                {SUPPORTED_LANGUAGES.find((l) => l.id === activeSnippetLang)?.label || 'cURL'}
              </span>
            </button>
          </>
        )}
      </div>

      {/* Contextual Action Buttons & Mode Switcher */}
      <div className="flex items-center gap-2 flex-wrap justify-end shrink-0">
        {activeTab === 'params' && (
          <button
            type="button"
            onClick={onAddParam}
            className="text-xs text-accent hover:text-accent-hover font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-hover border border-border transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Query Param</span>
          </button>
        )}

        {activeTab === 'headers' && (
          <button
            type="button"
            onClick={onAddHeader}
            className="text-xs text-accent hover:text-accent-hover font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-hover border border-border transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Header</span>
          </button>
        )}

        {activeTab === 'body' && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onFormatBody}
              className="text-xs text-text-base hover:text-accent flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-hover border border-border transition-colors cursor-pointer"
              title="Pretty-format JSON syntax"
            >
              <Sparkles className="h-3 w-3 text-accent" />
              <span>Format JSON</span>
            </button>
            <button
              type="button"
              onClick={onClearBody}
              className="text-xs text-text-muted hover:text-rose-400 flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-hover border border-border transition-colors cursor-pointer"
              title="Clear body"
            >
              <Trash2 className="h-3 w-3" />
              <span>Clear</span>
            </button>
          </div>
        )}

        {activeTab === 'response' && Boolean(response?.data) && onCopyJson && onDownloadJson && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onCopyJson}
              className="text-xs text-text-base hover:text-accent flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-hover border border-border transition-colors cursor-pointer"
              title="Copy full JSON"
            >
              {copiedJson ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-text-muted" />
              )}
              <span>{copiedJson ? 'Copied' : 'Copy JSON'}</span>
            </button>
            <button
              type="button"
              onClick={onDownloadJson}
              className="text-xs text-text-base hover:text-accent flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-hover border border-border transition-colors cursor-pointer"
              title="Download JSON file"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export</span>
            </button>
          </div>
        )}

        {activeTab === 'snippets' && onCopySnippet && (
          <button
            type="button"
            onClick={onCopySnippet}
            className="text-xs text-text-base hover:text-accent flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-hover border border-border transition-colors cursor-pointer"
            title="Copy integration code"
          >
            {copiedSnippet ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-text-muted" />
            )}
            <span>{copiedSnippet ? 'Copied' : 'Copy Code'}</span>
          </button>
        )}

        {activeTab === 'auth' && authType !== 'none' && (
          <button
            type="button"
            onClick={onClearAuth}
            className="text-xs text-text-muted hover:text-rose-400 font-medium flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-hover border border-border transition-colors cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear Auth</span>
          </button>
        )}

        {activeTab === 'settings' && (
          <button
            type="button"
            onClick={onResetSettings}
            className="text-xs text-text-muted hover:text-text-base flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-hover border border-border transition-colors cursor-pointer"
          >
            <span>Reset Defaults</span>
          </button>
        )}

        {/* Workbench Mode Toggle: Tabs vs Split */}
        <div className="flex items-center bg-surface-elevated p-0.5 rounded-xl border border-border ml-1 shrink-0">
          <button
            type="button"
            onClick={() => onSetWorkbenchLayout('tabs')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
              workbenchLayout === 'tabs'
                ? 'bg-accent text-background font-bold shadow-sm shadow-accent/20'
                : 'text-text-muted hover:text-text-base'
            }`}
            title="Single Tabbed Workbench"
          >
            <LayoutTemplate className="h-3 w-3" />
            <span className="hidden sm:inline">Tabs</span>
          </button>
          <button
            type="button"
            onClick={() => onSetWorkbenchLayout('split')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
              workbenchLayout === 'split'
                ? 'bg-accent text-background font-bold shadow-sm shadow-accent/20'
                : 'text-text-muted hover:text-text-base'
            }`}
            title="Split Multi-Pane Layout"
          >
            <Columns className="h-3 w-3" />
            <span className="hidden sm:inline">Split</span>
          </button>
        </div>
      </div>
    </div>
  );
};
