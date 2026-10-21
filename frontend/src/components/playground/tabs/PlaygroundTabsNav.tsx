import React from 'react';
import {
  SlidersHorizontal,
  FileText,
  Braces,
  Database,
  Terminal,
  Loader2,
  LayoutTemplate,
  Columns,
  Code2,
  AlignLeft,
  Table as TableIcon,
  FileCode
} from 'lucide-react';
import { ProxyResponse } from '../../../types/api';
import { SnippetLanguage, SUPPORTED_LANGUAGES } from './CodeSnippetsTab';
import { RequestAuthMode } from './AuthTab';

export type RequestTab =
  | 'params'
  | 'headers'
  | 'body'
  | 'snippets'
  | 'response'
  | 'request'
  | 'json'
  | 'raw'
  | 'resp-headers'
  | 'schema'
  | 'types';

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
  onAddParam?: () => void;
  onAddHeader?: () => void;
  onFormatBody?: () => void;
  onClearBody?: () => void;
  onClearAuth?: () => void;
  onResetSettings?: () => void;
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
  isLoading,
  response,
  activeSnippetLang
}) => {
  const isResponseActive = [
    'response',
    'json',
    'raw',
    'resp-headers',
    'schema',
    'types'
  ].includes(activeTab);

  const activeSection: 'request' | 'response' = isResponseActive ? 'response' : 'request';
  const responseHeadersCount = response?.headers ? Object.keys(response.headers).length : 0;

  const isHtml = React.useMemo(() => {
    if (!response) return false;
    const ct = response.headers?.['content-type'] || response.headers?.['Content-Type'] || '';
    if (typeof ct === 'string' && (ct.toLowerCase().includes('text/html') || ct.toLowerCase().includes('application/xhtml+xml'))) {
      return true;
    }
    if (typeof response.data === 'string') {
      const trimmed = response.data.trim().toLowerCase();
      if (/<(!doctype|html|head|body)[^>]*>/i.test(trimmed)) return true;
    }
    return false;
  }, [response]);

  const isTreeable = React.useMemo(() => {
    if (!response?.data) return true;
    if (typeof response.data === 'object' && response.data !== null) return true;
    if (typeof response.data === 'string') {
      const trimmed = response.data.trim();
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
          const parsed = JSON.parse(trimmed);
          return typeof parsed === 'object' && parsed !== null;
        } catch {
          return false;
        }
      }
      return false;
    }
    return false;
  }, [response?.data]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5">
      {/* Left: Primary Section Switch + Contextual Sub-Tabs in One Single Row */}
      <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
        {/* Primary Switch: [REQUEST] vs [RESPONSE] */}
        <div className="flex items-center bg-surface-elevated/70 p-1 rounded-xl shadow-none shrink-0">
          <button
            type="button"
            id="switch-to-request"
            onClick={() => onSelectTab('params')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer select-none ${
              activeSection === 'request'
                ? 'bg-surface text-text-base shadow-sm'
                : 'text-text-muted hover:text-text-base hover:bg-surface/40'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>REQUEST</span>
          </button>

          <button
            type="button"
            id="switch-to-response"
            onClick={() => onSelectTab('json')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer select-none ${
              activeSection === 'response'
                ? 'bg-surface text-text-base shadow-sm'
                : 'text-text-muted hover:text-text-base hover:bg-surface/40'
            }`}
          >
            <Database className="h-3.5 w-3.5" />
            <span>RESPONSE</span>
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin text-accent" />
            ) : response ? (
              <span
                className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                  response.status_code >= 200 && response.status_code < 300
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-rose-500/15 text-rose-400'
                }`}
              >
                {response.status_code}
              </span>
            ) : (
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-surface-elevated text-text-muted/60">
                Idle
              </span>
            )}
          </button>
        </div>

        {/* Contextual Sub-Tabs Strip (No white borders) */}
        <div className="flex items-center gap-1 p-1 bg-surface-elevated/50 rounded-xl overflow-x-auto scrollbar-none flex-nowrap">
          {activeSection === 'request' ? (
            /* === REQUEST SUB-TABS === */
            <>
              {/* Params */}
              <button
                type="button"
                id="playground-tab-params"
                onClick={() => onSelectTab('params')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'params'
                    ? 'bg-accent text-background font-bold shadow-sm shadow-accent/25'
                    : 'text-text-muted hover:text-text-base hover:bg-surface/50'
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Params</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    activeTab === 'params'
                      ? 'bg-black/25 text-background'
                      : 'bg-surface/80 text-text-muted'
                  }`}
                >
                  {paramsCount}
                </span>
              </button>

              {/* Headers */}
              <button
                type="button"
                id="playground-tab-headers"
                onClick={() => onSelectTab('headers')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'headers'
                    ? 'bg-accent text-background font-bold shadow-sm shadow-accent/25'
                    : 'text-text-muted hover:text-text-base hover:bg-surface/50'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Headers</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    activeTab === 'headers'
                      ? 'bg-black/25 text-background'
                      : 'bg-surface/80 text-text-muted'
                  }`}
                >
                  {headersCount}
                </span>
              </button>

              {/* Body */}
              <button
                type="button"
                id="playground-tab-body"
                onClick={() => onSelectTab('body')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'body'
                    ? 'bg-accent text-background font-bold shadow-sm shadow-accent/25'
                    : 'text-text-muted hover:text-text-base hover:bg-surface/50'
                }`}
              >
                <Braces className="h-3.5 w-3.5" />
                <span>Body</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    activeTab === 'body'
                      ? 'bg-black/25 text-background'
                      : hasBody
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-surface/80 text-text-muted'
                  }`}
                >
                  {hasBody ? 'JSON' : '0'}
                </span>
              </button>

              {/* Client Code */}
              <button
                type="button"
                id="playground-tab-snippets"
                onClick={() => onSelectTab('snippets')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'snippets'
                    ? 'bg-accent text-background font-bold shadow-sm shadow-accent/25'
                    : 'text-text-muted hover:text-text-base hover:bg-surface/50'
                }`}
              >
                <Terminal className="h-3.5 w-3.5" />
                <span>Client Code</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    activeTab === 'snippets'
                      ? 'bg-black/25 text-background'
                      : 'bg-surface/80 text-text-muted'
                  }`}
                >
                  {SUPPORTED_LANGUAGES.find((l) => l.id === activeSnippetLang)?.label || 'cURL'}
                </span>
              </button>
            </>
          ) : (
            /* === RESPONSE SUB-TABS === */
            <>
              {/* JSON */}
              <button
                type="button"
                id="playground-tab-json"
                onClick={() => onSelectTab('json')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'json' || activeTab === 'response'
                    ? 'bg-accent text-background font-bold shadow-sm shadow-accent/25'
                    : 'text-text-muted hover:text-text-base hover:bg-surface/50'
                }`}
              >
                <Code2 className="h-3.5 w-3.5" />
                <span>{isHtml ? 'HTML' : isTreeable ? 'JSON' : 'Body'}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    activeTab === 'json' || activeTab === 'response'
                      ? 'bg-black/25 text-background'
                      : 'bg-surface/80 text-text-muted'
                  }`}
                >
                  {isTreeable ? 'Tree' : isHtml ? 'Markup' : 'Plain'}
                </span>
              </button>

              {/* Raw */}
              <button
                type="button"
                id="playground-tab-raw"
                onClick={() => onSelectTab('raw')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'raw'
                    ? 'bg-accent text-background font-bold shadow-sm shadow-accent/25'
                    : 'text-text-muted hover:text-text-base hover:bg-surface/50'
                }`}
              >
                <AlignLeft className="h-3.5 w-3.5" />
                <span>Raw</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    activeTab === 'raw'
                      ? 'bg-black/25 text-background'
                      : 'bg-surface/80 text-text-muted'
                  }`}
                >
                  Text
                </span>
              </button>

              {/* Response Headers */}
              <button
                type="button"
                id="playground-tab-resp-headers"
                onClick={() => onSelectTab('resp-headers')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'resp-headers'
                    ? 'bg-accent text-background font-bold shadow-sm shadow-accent/25'
                    : 'text-text-muted hover:text-text-base hover:bg-surface/50'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Headers</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    activeTab === 'resp-headers'
                      ? 'bg-black/25 text-background'
                      : 'bg-surface/80 text-text-muted'
                  }`}
                >
                  {responseHeadersCount}
                </span>
              </button>

              {/* Schema */}
              <button
                type="button"
                id="playground-tab-schema"
                onClick={() => onSelectTab('schema')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'schema'
                    ? 'bg-accent text-background font-bold shadow-sm shadow-accent/25'
                    : 'text-text-muted hover:text-text-base hover:bg-surface/50'
                }`}
              >
                <TableIcon className="h-3.5 w-3.5" />
                <span>Schema</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    activeTab === 'schema'
                      ? 'bg-black/25 text-background'
                      : 'bg-surface/80 text-text-muted'
                  }`}
                >
                  Table
                </span>
              </button>

              {/* Types */}
              <button
                type="button"
                id="playground-tab-types"
                onClick={() => onSelectTab('types')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'types'
                    ? 'bg-accent text-background font-bold shadow-sm shadow-accent/25'
                    : 'text-text-muted hover:text-text-base hover:bg-surface/50'
                }`}
              >
                <FileCode className="h-3.5 w-3.5" />
                <span>Types</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    activeTab === 'types'
                      ? 'bg-black/25 text-background'
                      : 'bg-surface/80 text-text-muted'
                  }`}
                >
                  TS
                </span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Right: Workbench Mode Toggle (Tabs vs Split) (No white borders) */}
      <div className="flex items-center bg-surface-elevated/80 p-1 rounded-xl shadow-none shrink-0 self-end sm:self-center">
        <button
          type="button"
          onClick={() => onSetWorkbenchLayout('tabs')}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
            workbenchLayout === 'tabs'
              ? 'bg-accent text-background font-bold shadow-sm shadow-accent/25'
              : 'text-text-muted hover:text-text-base'
          }`}
          title="Single Tabbed Workbench View"
        >
          <LayoutTemplate className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Tabs</span>
        </button>
        <button
          type="button"
          onClick={() => onSetWorkbenchLayout('split')}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
            workbenchLayout === 'split'
              ? 'bg-accent text-background font-bold shadow-sm shadow-accent/25'
              : 'text-text-muted hover:text-text-base'
          }`}
          title="Split Multi-Pane Layout"
        >
          <Columns className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Split</span>
        </button>
      </div>
    </div>
  );
};
