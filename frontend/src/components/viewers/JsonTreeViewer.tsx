import React, { useState, useMemo } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Code2,
  ExternalLink
} from 'lucide-react';

export interface JsonTreeViewerProps {
  data: unknown;
  searchQuery?: string;
  onCopyPath?: (path: string) => void;
  onCopyValue?: (value: string) => void;
  hideHeader?: boolean;
  expandAllTrigger?: number;
  collapseAllTrigger?: number;
}

interface TreeNodeProps {
  name?: string;
  value: unknown;
  path: string;
  depth: number;
  initialExpanded?: boolean;
  searchQuery?: string;
  onCopy: (text: string, type: 'path' | 'val') => void;
  copiedKey: string | null;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  name,
  value,
  path,
  depth,
  initialExpanded = true,
  searchQuery,
  onCopy,
  copiedKey
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(depth < 2 ? initialExpanded : false);

  const isArray = Array.isArray(value);
  const isObject = value !== null && typeof value === 'object';
  const isPrimitive = !isObject;

  const entries = useMemo(() => {
    if (!isObject || value === null) return [];
    if (isArray) {
      return (value as unknown[]).map((v, i) => [`[${i}]`, v, `${path}[${i}]`] as const);
    }
    return Object.entries(value as Record<string, unknown>).map(
      ([k, v]) => [k, v, path ? `${path}.${k}` : k] as const
    );
  }, [value, isObject, isArray, path]);

  // Highlight search matches
  const highlight = (text: string) => {
    if (!searchQuery?.trim()) return text;
    const q = searchQuery.toLowerCase();
    const str = String(text);
    const idx = str.toLowerCase().indexOf(q);
    if (idx === -1) return text;
    return (
      <span>
        {str.slice(0, idx)}
        <mark className="bg-amber-400/30 text-amber-300 font-bold rounded px-0.5">{str.slice(idx, idx + q.length)}</mark>
        {str.slice(idx + q.length)}
      </span>
    );
  };

  const renderPrimitiveValue = (val: unknown) => {
    if (val === null) {
      return <span className="text-rose-400/70 italic font-mono font-medium">null</span>;
    }
    if (val === undefined) {
      return <span className="text-text-muted/60 italic font-mono font-medium">undefined</span>;
    }
    if (typeof val === 'string') {
      const isUrl = val.startsWith('http://') || val.startsWith('https://');
      return (
        <span className="text-emerald-400 dark:text-emerald-300 break-all font-mono">
          &quot;{highlight(val)}&quot;
          {isUrl && (
            <a
              href={val}
              target="_blank"
              rel="noreferrer"
              className="ml-1.5 inline-flex items-center text-[10px] text-accent hover:underline opacity-80 hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
              title="Open link in new tab"
            >
              <ExternalLink className="h-2.5 w-2.5 inline" />
            </a>
          )}
        </span>
      );
    }
    if (typeof val === 'number') {
      return (
        <span className="text-amber-400 dark:text-amber-300 font-mono font-medium">
          {highlight(String(val))}
        </span>
      );
    }
    if (typeof val === 'boolean') {
      return (
        <span className="text-purple-400 font-mono font-bold">
          {highlight(String(val))}
        </span>
      );
    }
    return <span className="text-text-base font-mono">{highlight(String(val))}</span>;
  };

  const currentPathKey = `path-${path}`;
  const currentValKey = `val-${path}`;

  if (isPrimitive) {
    return (
      <div className="group flex items-center hover:bg-surface-elevated/50 py-0.5 px-2 rounded-md text-xs font-mono transition-colors">
        {name !== undefined && (
          <span className="text-sky-400 dark:text-sky-300 mr-1.5 font-medium select-none shrink-0">
            {highlight(name)}:
          </span>
        )}
        <div className="flex-1 min-w-0">{renderPrimitiveValue(value)}</div>

        {/* Action icons on hover */}
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 ml-2 transition-opacity shrink-0">
          <button
            type="button"
            onClick={() => onCopy(path, 'path')}
            title={`Copy JSON path: ${path}`}
            className="text-[10px] text-text-muted hover:text-text-base px-1.5 py-0.5 rounded bg-surface-elevated hover:bg-surface flex items-center gap-1 transition-colors cursor-pointer"
          >
            {copiedKey === currentPathKey ? (
              <Check className="h-2.5 w-2.5 text-emerald-400" />
            ) : (
              <Code2 className="h-2.5 w-2.5 text-sky-400" />
            )}
            <span>Path</span>
          </button>

          <button
            type="button"
            onClick={() => onCopy(typeof value === 'string' ? value : String(value), 'val')}
            title="Copy value"
            className="text-[10px] text-text-muted hover:text-text-base px-1.5 py-0.5 rounded bg-surface-elevated hover:bg-surface flex items-center gap-1 transition-colors cursor-pointer"
          >
            {copiedKey === currentValKey ? (
              <Check className="h-2.5 w-2.5 text-emerald-400" />
            ) : (
              <Copy className="h-2.5 w-2.5" />
            )}
            <span>Val</span>
          </button>
        </div>
      </div>
    );
  }

  const childCount = entries.length;
  const isSelfEmpty = childCount === 0;

  return (
    <div className="font-mono text-xs select-text">
      {/* Container Header */}
      <div
        onClick={() => !isSelfEmpty && setIsExpanded(!isExpanded)}
        className={`group flex items-center py-0.5 px-2 rounded-md transition-colors ${
          isSelfEmpty ? 'cursor-default' : 'cursor-pointer hover:bg-surface-elevated/50'
        }`}
      >
        {/* Toggle Chevron */}
        <div className="w-4 h-4 flex items-center justify-center mr-1 text-text-muted shrink-0">
          {!isSelfEmpty && (
            <span className="transition-transform duration-150">
              {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-accent" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </span>
          )}
        </div>

        {/* Key Name if any */}
        {name !== undefined && (
          <span className="text-sky-400 dark:text-sky-300 font-medium mr-1.5 select-none">
            {highlight(name)}:
          </span>
        )}

        {/* Opening Bracket */}
        <span className="text-text-muted font-bold font-mono">
          {isArray ? '[' : '{'}
        </span>

        {/* Collapsed Items Badge */}
        {!isExpanded && !isSelfEmpty && (
          <span className="text-[10px] font-mono text-text-muted mx-2 px-1.5 py-0.2 rounded bg-surface-elevated">
            {isArray ? `${childCount} items` : `${childCount} keys`}
          </span>
        )}

        {/* Closing Bracket if collapsed or empty */}
        {(!isExpanded || isSelfEmpty) && (
          <span className="text-text-muted font-bold font-mono">
            {isArray ? ']' : '}'}
          </span>
        )}

        {/* Hover action bar for object/array */}
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 ml-auto transition-opacity shrink-0">
          {path && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCopy(path, 'path');
              }}
              title={`Copy JSON path: ${path}`}
              className="text-[10px] text-text-muted hover:text-text-base px-1.5 py-0.5 rounded bg-surface-elevated hover:bg-surface flex items-center gap-1 transition-colors cursor-pointer"
            >
              {copiedKey === currentPathKey ? (
                <Check className="h-2.5 w-2.5 text-emerald-400" />
              ) : (
                <Code2 className="h-2.5 w-2.5 text-sky-400" />
              )}
              <span>Path</span>
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCopy(JSON.stringify(value, null, 2), 'val');
            }}
            title="Copy subtree JSON"
            className="text-[10px] text-text-muted hover:text-text-base px-1.5 py-0.5 rounded bg-surface-elevated hover:bg-surface flex items-center gap-1 transition-colors cursor-pointer"
          >
            {copiedKey === currentValKey ? (
              <Check className="h-2.5 w-2.5 text-emerald-400" />
            ) : (
              <Copy className="h-2.5 w-2.5" />
            )}
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* Children list with vertical indentation guide */}
      {isExpanded && !isSelfEmpty && (
        <div className="relative ml-2 pl-3 border-l border-white/10 dark:border-white/5 hover:border-accent/30 transition-colors my-0.5">
          {entries.map(([k, v, childPath]) => (
            <TreeNode
              key={k}
              name={k}
              value={v}
              path={childPath}
              depth={depth + 1}
              initialExpanded={initialExpanded}
              searchQuery={searchQuery}
              onCopy={onCopy}
              copiedKey={copiedKey}
            />
          ))}

          {/* Closing Bracket */}
          <div className="text-text-muted font-bold font-mono py-0.5 px-2">
            {isArray ? ']' : '}'}
          </div>
        </div>
      )}
    </div>
  );
};

export const JsonTreeViewer: React.FC<JsonTreeViewerProps> = ({
  data,
  searchQuery,
  onCopyPath,
  onCopyValue,
  hideHeader = false,
  expandAllTrigger,
  collapseAllTrigger
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [expandAllKey, setExpandAllKey] = useState<number>(1);
  const [forceExpand, setForceExpand] = useState<boolean>(true);

  // Sync external expand/collapse triggers if provided
  React.useEffect(() => {
    if (expandAllTrigger !== undefined && expandAllTrigger > 0) {
      setForceExpand(true);
      setExpandAllKey((prev) => prev + 1);
    }
  }, [expandAllTrigger]);

  React.useEffect(() => {
    if (collapseAllTrigger !== undefined && collapseAllTrigger > 0) {
      setForceExpand(false);
      setExpandAllKey((prev) => prev + 1);
    }
  }, [collapseAllTrigger]);

  const handleCopy = (text: string, type: 'path' | 'val') => {
    navigator.clipboard.writeText(text);
    const key = `${type}-${text}`;
    setCopiedKey(key);
    if (type === 'path' && onCopyPath) onCopyPath(text);
    if (type === 'val' && onCopyValue) onCopyValue(text);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleToggleAll = (expand: boolean) => {
    setForceExpand(expand);
    setExpandAllKey((prev) => prev + 1);
  };

  if (data === null || data === undefined) {
    return <div className="text-text-muted/60 italic p-4 text-xs font-mono">null</div>;
  }

  const rootSummary = Array.isArray(data)
    ? `Array (${data.length} items)`
    : typeof data === 'object'
    ? `Object (${Object.keys(data as object).length} root keys)`
    : typeof data;

  return (
    <div className="w-full h-full flex flex-col font-mono text-xs">
      {/* Optional Integrated Minimal Sub-bar */}
      {!hideHeader && (
        <div className="flex items-center justify-between py-1.5 px-2 mb-2 bg-surface-elevated/30 rounded-lg text-xs">
          <span className="text-[11px] text-text-muted font-mono tracking-tight">
            {rootSummary}
          </span>

          <div className="flex items-center gap-1 font-mono">
            <button
              type="button"
              onClick={() => handleToggleAll(true)}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-text-muted hover:text-text-base bg-surface-elevated hover:bg-surface transition-colors cursor-pointer"
              title="Expand all nodes"
            >
              <Maximize2 className="h-3 w-3 text-accent" />
              <span>Expand All</span>
            </button>

            <button
              type="button"
              onClick={() => handleToggleAll(false)}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-text-muted hover:text-text-base bg-surface-elevated hover:bg-surface transition-colors cursor-pointer"
              title="Collapse all nodes"
            >
              <Minimize2 className="h-3 w-3 text-text-muted" />
              <span>Collapse</span>
            </button>
          </div>
        </div>
      )}

      {/* Interactive Tree View with Syntax Highlighting */}
      <div className="flex-1 overflow-auto py-1">
        <TreeNode
          key={expandAllKey}
          value={data}
          path=""
          depth={0}
          initialExpanded={forceExpand}
          searchQuery={searchQuery}
          onCopy={handleCopy}
          copiedKey={copiedKey}
        />
      </div>
    </div>
  );
};
