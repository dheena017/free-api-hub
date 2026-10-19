import React, { useState, useMemo } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Code2
} from 'lucide-react';

interface JsonTreeViewerProps {
  data: unknown;
  searchQuery?: string;
  onCopyPath?: (path: string) => void;
  onCopyValue?: (value: string) => void;
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

  // Highlight helper
  const highlight = (text: string) => {
    if (!searchQuery?.trim()) return text;
    const q = searchQuery.toLowerCase();
    const str = String(text);
    const idx = str.toLowerCase().indexOf(q);
    if (idx === -1) return text;
    return (
      <span>
        {str.slice(0, idx)}
        <mark className="bg-[#FDD663] text-black font-bold rounded px-0.5">{str.slice(idx, idx + q.length)}</mark>
        {str.slice(idx + q.length)}
      </span>
    );
  };

  const renderPrimitiveValue = (val: unknown) => {
    if (val === null) return <span className="text-text-muted italic font-semibold">null</span>;
    if (val === undefined) return <span className="text-text-muted italic font-semibold">undefined</span>;
    if (typeof val === 'string') {
      const isUrl = val.startsWith('http://') || val.startsWith('https://');
      return (
        <span className="text-healthy break-all">
          "{highlight(val)}"
          {isUrl && (
            <a
              href={val}
              target="_blank"
              rel="noreferrer"
              className="ml-1 text-[10px] text-accent hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              ↗
            </a>
          )}
        </span>
      );
    }
    if (typeof val === 'number') {
      return <span className="text-degraded font-semibold">{highlight(String(val))}</span>;
    }
    if (typeof val === 'boolean') {
      return <span className="text-purple-500 dark:text-purple-400 font-bold">{highlight(String(val))}</span>;
    }
    return <span className="text-text-base">{highlight(String(val))}</span>;
  };

  const currentPathKey = `path-${path}`;
  const currentValKey = `val-${path}`;

  if (isPrimitive) {
    return (
      <div
        className="group flex items-baseline hover:bg-surface-hover/60 py-0.5 px-1.5 rounded text-xs font-mono transition-colors"
        style={{ paddingLeft: `${depth * 18 + 6}px` }}
      >
        {name !== undefined && (
          <span className="text-accent mr-1.5 font-medium select-none">
            {highlight(name)}:
          </span>
        )}
        <div className="flex-1 min-w-0">{renderPrimitiveValue(value)}</div>

        {/* Quick action buttons on hover */}
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 ml-2 transition-opacity flex-shrink-0">
          <button
            onClick={() => onCopy(path, 'path')}
            title={`Copy JSON Path: ${path}`}
            className="text-[10px] text-text-muted hover:text-text-base px-1.5 py-0.2 rounded bg-surface border border-border flex items-center gap-1 transition-colors"
          >
            {copiedKey === currentPathKey ? (
              <Check className="h-2.5 w-2.5 text-healthy" />
            ) : (
              <Code2 className="h-2.5 w-2.5" />
            )}
            <span>Path</span>
          </button>

          <button
            onClick={() => onCopy(typeof value === 'string' ? value : String(value), 'val')}
            title="Copy value"
            className="text-[10px] text-text-muted hover:text-text-base px-1.5 py-0.2 rounded bg-surface border border-border flex items-center gap-1 transition-colors"
          >
            {copiedKey === currentValKey ? (
              <Check className="h-2.5 w-2.5 text-healthy" />
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
        className={`group flex items-center py-0.5 px-1.5 rounded transition-colors ${
          isSelfEmpty ? 'cursor-default' : 'cursor-pointer hover:bg-surface-hover'
        }`}
        style={{ paddingLeft: `${depth * 18 + 6}px` }}
      >
        {/* Toggle Chevron */}
        <div className="w-4 h-4 flex items-center justify-center mr-1 text-text-muted flex-shrink-0">
          {!isSelfEmpty && (
            isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />
          )}
        </div>

        {/* Key Name if any */}
        {name !== undefined && (
          <span className="text-accent font-medium mr-1.5">
            {highlight(name)}:
          </span>
        )}

        {/* Brackets & Count badge */}
        <span className="text-text-muted">
          {isArray ? '[' : '{'}
        </span>

        {!isExpanded && !isSelfEmpty && (
          <span className="text-[11px] text-text-muted mx-1.5 px-1.5 py-0.2 rounded bg-surface border border-border group-hover:border-border-light">
            {isArray ? `${childCount} items` : `${childCount} keys`}
          </span>
        )}

        {(!isExpanded || isSelfEmpty) && (
          <span className="text-text-muted">
            {isArray ? ']' : '}'}
          </span>
        )}

        {/* Hover action bar for object/array */}
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 ml-auto transition-opacity flex-shrink-0">
          {path && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCopy(path, 'path');
              }}
              title={`Copy JSON path: ${path}`}
              className="text-[10px] text-text-muted hover:text-text-base px-1.5 py-0.2 rounded bg-surface border border-border flex items-center gap-1 transition-colors"
            >
              {copiedKey === currentPathKey ? (
                <Check className="h-2.5 w-2.5 text-healthy" />
              ) : (
                <Code2 className="h-2.5 w-2.5" />
              )}
              <span>Path</span>
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onCopy(JSON.stringify(value, null, 2), 'val');
            }}
            title="Copy entire subtree JSON"
            className="text-[10px] text-text-muted hover:text-text-base px-1.5 py-0.2 rounded bg-surface border border-border flex items-center gap-1 transition-colors"
          >
            {copiedKey === currentValKey ? (
              <Check className="h-2.5 w-2.5 text-healthy" />
            ) : (
              <Copy className="h-2.5 w-2.5" />
            )}
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* Children list when expanded */}
      {isExpanded && !isSelfEmpty && (
        <div>
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
          <div
            className="text-text-muted py-0.5 px-1.5"
            style={{ paddingLeft: `${depth * 18 + 26}px` }}
          >
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
  onCopyValue
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [expandAllKey, setExpandAllKey] = useState<number>(1);
  const [forceExpand, setForceExpand] = useState<boolean>(true);

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
    return <div className="text-text-muted italic p-4 text-xs font-mono">null</div>;
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-text-muted font-mono">
            {Array.isArray(data)
              ? `Array (${data.length} items)`
              : typeof data === 'object'
              ? `Object (${Object.keys(data as object).length} root keys)`
              : typeof data}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleToggleAll(true)}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-text-muted hover:text-text-base bg-surface hover:bg-surface-hover border border-border transition-colors"
            title="Expand all nodes"
          >
            <Maximize2 className="h-3 w-3 text-accent" />
            <span>Expand All</span>
          </button>

          <button
            onClick={() => handleToggleAll(false)}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-text-muted hover:text-text-base bg-surface hover:bg-surface-hover border border-border transition-colors"
            title="Collapse all nodes"
          >
            <Minimize2 className="h-3 w-3 text-text-muted" />
            <span>Collapse</span>
          </button>
        </div>
      </div>

      {/* Interactive Tree */}
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
