import React, { useState, useMemo } from 'react';
import { ProxyResponse } from '../../../types/api';
import { generateTypeScriptTypes, generateJsonSchema } from '../../../utils/typeGenerator';
import { CodeSnippetViewer } from '../../viewers/CodeSnippetViewer';
import { Copy, Check, Download, Zap, Code2 } from 'lucide-react';

export interface TypesResponseTabProps {
  response: ProxyResponse | null;
  isLoading: boolean;
  onRunTest: () => void;
  apiName?: string;
  apiSlug?: string;
  isUnified?: boolean;
}

export const TypesResponseTab: React.FC<TypesResponseTabProps> = ({
  response,
  isLoading,
  onRunTest,
  apiName = 'ApiResponse',
  apiSlug = 'api-types',
  isUnified = true
}) => {
  const [typesDisplayMode, setTypesDisplayMode] = useState<'typescript' | 'schema'>('typescript');
  const [copiedTypes, setCopiedTypes] = useState(false);

  const generatedCode = useMemo(() => {
    if (!response?.data) return '';
    return typesDisplayMode === 'typescript'
      ? generateTypeScriptTypes(response.data, apiName)
      : generateJsonSchema(response.data);
  }, [response?.data, typesDisplayMode, apiName]);

  const handleCopyTypes = () => {
    if (!generatedCode) return;
    navigator.clipboard.writeText(generatedCode);
    setCopiedTypes(true);
    setTimeout(() => setCopiedTypes(false), 2000);
  };

  const handleDownloadTypes = () => {
    if (!generatedCode) return;
    const isTs = typesDisplayMode === 'typescript';
    const blob = new Blob([generatedCode], {
      type: isTs ? 'text/typescript' : 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${apiSlug}.${isTs ? 'd.ts' : 'schema.json'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={`${
        isUnified
          ? 'flex-1 flex flex-col h-full overflow-hidden'
          : 'bg-surface rounded-2xl flex flex-col min-h-[480px] h-[540px] overflow-hidden shadow-sm transition-colors'
      }`}
    >
      {/* Sleek Action Toolbar */}
      <div className="px-3 sm:px-4 py-2 border-b border-border bg-surface-elevated/30 flex flex-wrap items-center justify-between gap-2 shrink-0">
        {/* Left: Mode Switcher */}
        <div className="flex items-center gap-2">
          {Boolean(response?.data) && (
            <div className="flex items-center bg-surface-elevated/80 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => setTypesDisplayMode('typescript')}
                className={`px-3 py-1 rounded-md text-[11px] font-mono transition-all cursor-pointer ${
                  typesDisplayMode === 'typescript'
                    ? 'bg-accent text-background font-bold shadow-sm'
                    : 'text-text-muted hover:text-text-base'
                }`}
              >
                TypeScript Interface
              </button>
              <button
                type="button"
                onClick={() => setTypesDisplayMode('schema')}
                className={`px-3 py-1 rounded-md text-[11px] font-mono transition-all cursor-pointer ${
                  typesDisplayMode === 'schema'
                    ? 'bg-accent text-background font-bold shadow-sm'
                    : 'text-text-muted hover:text-text-base'
                }`}
              >
                JSON Schema
              </button>
            </div>
          )}
        </div>

        {/* Right Tools: Copy & Download */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {Boolean(response?.data) && (
            <>
              <button
                type="button"
                onClick={handleCopyTypes}
                className="text-xs text-text-muted hover:text-text-base flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-elevated/80 hover:bg-surface-elevated transition-colors cursor-pointer"
                title="Copy generated code"
              >
                {copiedTypes ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                <span className="font-mono text-[11px]">{copiedTypes ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadTypes}
                className="text-xs text-text-muted hover:text-text-base flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-elevated/80 hover:bg-surface-elevated transition-colors cursor-pointer"
                title="Download file"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="font-mono text-[11px]">Export</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Content Area - Full Bleed */}
      <div className="flex-1 overflow-auto font-mono text-xs bg-[#16181D] text-text-base transition-colors">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-text-muted">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
            <p className="text-xs font-medium font-sans">Inferring TypeScript interfaces and AST...</p>
          </div>
        ) : response?.data ? (
          <div className="h-full">
            <CodeSnippetViewer
              code={generatedCode}
              language={typesDisplayMode === 'typescript' ? 'typescript' : 'json'}
              showLineNumbers={true}
              showCopyButton={false}
            />
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-4 font-sans py-8">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Code2 className="h-6 w-6" />
            </div>

            <div className="space-y-1 max-w-sm">
              <p className="font-bold text-text-base text-sm">No Type Definitions</p>
              <p className="text-xs text-text-muted">
                Run an API request to automatically infer TypeScript interfaces, nested types, and strict JSON Schema.
              </p>
            </div>

            <button
              type="button"
              onClick={onRunTest}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-background font-bold text-xs transition-all shadow-md shadow-accent/20 cursor-pointer"
            >
              <Zap className="h-3.5 w-3.5 fill-current" />
              <span>Send Request</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
