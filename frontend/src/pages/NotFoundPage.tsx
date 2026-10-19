import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="py-24 max-w-xl mx-auto px-4 text-center space-y-6">
      <div className="h-16 w-16 rounded-2xl bg-surface border border-border flex items-center justify-center mx-auto text-accent">
        <Compass className="h-8 w-8" />
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-text-base tracking-tight">404 — Page Not Found</h1>
        <p className="text-xs text-text-muted max-w-sm mx-auto leading-relaxed">
          The requested route does not exist in our directory. Let's get you back to the active catalog.
        </p>
      </div>

      <div className="flex items-center justify-center gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface border border-border text-xs text-text-base hover:bg-surface-hover font-medium transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Go to Home</span>
        </Link>

        <Link
          to="/explore"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-background text-xs hover:opacity-90 font-semibold transition-colors"
        >
          <span>Explore Catalog</span>
        </Link>
      </div>
    </div>
  );
};
