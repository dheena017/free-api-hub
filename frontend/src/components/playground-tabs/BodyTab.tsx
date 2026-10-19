import React from 'react';

export interface BodyTabProps {
  requestBody: string;
  onSetRequestBody: (val: string) => void;
}

export const BodyTab: React.FC<BodyTabProps> = ({ requestBody, onSetRequestBody }) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-text-muted">
        <span>Request Payload Body (JSON for POST/PUT/PATCH):</span>
        <div className="flex items-center gap-1.5 text-[11px]">
          <span>Templates:</span>
          <button
            type="button"
            onClick={() => onSetRequestBody(JSON.stringify({ query: 'search', limit: 10 }, null, 2))}
            className="text-accent hover:underline cursor-pointer"
          >
            Query
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => onSetRequestBody(JSON.stringify({ name: 'Test Item', status: 'active' }, null, 2))}
            className="text-accent hover:underline cursor-pointer"
          >
            Object
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => onSetRequestBody('{\n  \n}')}
            className="text-accent hover:underline cursor-pointer"
          >
            Empty
          </button>
        </div>
      </div>
      <textarea
        value={requestBody}
        onChange={(e) => onSetRequestBody(e.target.value)}
        placeholder={'{\n  "key": "value"\n}'}
        rows={4}
        spellCheck={false}
        className="w-full bg-surface-elevated border border-border rounded-xl p-3 text-xs font-mono text-text-base placeholder:text-text-muted/40 focus:outline-none focus:border-accent resize-none transition-all"
      />
    </div>
  );
};
