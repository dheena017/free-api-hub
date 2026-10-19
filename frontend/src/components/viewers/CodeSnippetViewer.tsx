import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CodeSnippetViewerProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  maxHeight?: string;
  className?: string;
  showCopyButton?: boolean;
}

export const CodeSnippetViewer: React.FC<CodeSnippetViewerProps> = ({
  code,
  language = 'text',
  showLineNumbers = true,
  maxHeight = '100%',
  className = '',
  showCopyButton = false
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.split('\n');

  // Token highlighters for common code snippets without heavyweight dependencies
  const highlightLine = (line: string): React.ReactNode => {
    if (!line.trim()) return <span>&nbsp;</span>;

    // Comments
    if (line.trim().startsWith('//') || line.trim().startsWith('#')) {
      return <span className="text-slate-500 italic">{line}</span>;
    }

    // cURL command styling
    if (language === 'curl' || language === 'sh' || language === 'bash') {
      const parts = line.split(/(".*?"|'.*?'|\s+)/g);
      return parts.map((part, i) => {
        if (part.startsWith('"') || part.startsWith("'")) {
          return <span key={i} className="text-emerald-400">{part}</span>;
        }
        if (part.startsWith('-')) {
          return <span key={i} className="text-amber-300 font-semibold">{part}</span>;
        }
        if (part === 'curl' || part === 'GET' || part === 'POST' || part === 'PUT' || part === 'DELETE') {
          return <span key={i} className="text-sky-400 font-bold">{part}</span>;
        }
        return <span key={i} className="text-slate-200">{part}</span>;
      });
    }

    // JSON styling
    if (language === 'json') {
      const parts = line.split(/(".*?"|true|false|null|\b\d+\b)/g);
      return parts.map((part, i) => {
        if (part.startsWith('"')) {
          const isKey = line.indexOf(part) < line.indexOf(':');
          if (isKey) {
            return <span key={i} className="text-sky-400 font-medium">{part}</span>;
          }
          return <span key={i} className="text-emerald-400">{part}</span>;
        }
        if (part === 'true' || part === 'false') {
          return <span key={i} className="text-amber-300 font-semibold">{part}</span>;
        }
        if (part === 'null') {
          return <span key={i} className="text-rose-400 font-semibold">{part}</span>;
        }
        if (/^\d+$/.test(part)) {
          return <span key={i} className="text-purple-300">{part}</span>;
        }
        return <span key={i} className="text-slate-300">{part}</span>;
      });
    }

    // JavaScript / TypeScript styling
    if (['javascript', 'js', 'typescript', 'ts'].includes(language)) {
      const parts = line.split(/(".*?"|'.*?'|`.*?`|\b(?:const|let|var|function|return|import|export|from|async|await|interface|type)\b)/g);
      return parts.map((part, i) => {
        if (part.startsWith('"') || part.startsWith("'") || part.startsWith('`')) {
          return <span key={i} className="text-emerald-400">{part}</span>;
        }
        if (/^(?:const|let|var|function|return|import|export|from|async|await|interface|type)$/.test(part)) {
          return <span key={i} className="text-purple-400 font-semibold">{part}</span>;
        }
        return <span key={i} className="text-slate-200">{part}</span>;
      });
    }

    // Python styling
    if (['python', 'py'].includes(language)) {
      const parts = line.split(/(".*?"|'.*?'|\b(?:import|from|def|return|async|await|if|else|elif|try|except|as)\b)/g);
      return parts.map((part, i) => {
        if (part.startsWith('"') || part.startsWith("'")) {
          return <span key={i} className="text-emerald-400">{part}</span>;
        }
        if (/^(?:import|from|def|return|async|await|if|else|elif|try|except|as)$/.test(part)) {
          return <span key={i} className="text-purple-400 font-semibold">{part}</span>;
        }
        return <span key={i} className="text-slate-200">{part}</span>;
      });
    }

    // Default fallback
    return <span className="text-slate-200">{line}</span>;
  };

  return (
    <div
      className={`relative flex font-mono text-xs leading-relaxed select-text bg-[#16181D] text-slate-200 h-full w-full ${className}`}
      style={{ maxHeight }}
    >
      {showCopyButton && (
        <button
          type="button"
          onClick={handleCopy}
          className="absolute top-2.5 right-2.5 z-10 p-1.5 rounded-lg bg-surface-elevated/80 hover:bg-surface-hover border border-border text-text-muted hover:text-text-base backdrop-blur-md transition-all cursor-pointer shadow-sm"
          title="Copy code"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      )}

      {showLineNumbers && (
        <div
          className="py-3 pl-3 pr-2.5 text-right select-none text-slate-500/60 border-r border-slate-700/50 font-mono text-[11px] bg-[#121317] shrink-0"
          aria-hidden="true"
        >
          {lines.map((_, i) => (
            <div key={i} className="h-5 flex items-center justify-end leading-5">
              {i + 1}
            </div>
          ))}
        </div>
      )}

      <div className="py-3 px-4 overflow-auto flex-1 scrollbar-none font-mono">
        {lines.map((line, i) => (
          <div key={i} className="h-5 flex items-center whitespace-pre leading-5">
            {highlightLine(line)}
          </div>
        ))}
      </div>
    </div>
  );
};
