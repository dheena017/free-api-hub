import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="py-24 max-w-xl mx-auto px-4 text-center space-y-6">
      <div className="h-16 w-16 rounded-2xl bg-[#28292A] border border-[#3C4043] flex items-center justify-center mx-auto text-[#8AB4F8]">
        <Compass className="h-8 w-8" />
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-white tracking-tight">404 — Page Not Found</h1>
        <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
          The requested route does not exist in our directory. Let's get you back to the active catalog.
        </p>
      </div>

      <div className="flex items-center justify-center gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#28292A] border border-[#3C4043] text-xs text-slate-200 hover:text-white hover:bg-[#303134] font-medium transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Go to Home</span>
        </Link>

        <Link
          to="/explore"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#8AB4F8] text-[#1F1F1F] text-xs hover:bg-[#A8C7FA] font-semibold transition-colors"
        >
          <span>Explore Catalog</span>
        </Link>
      </div>
    </div>
  );
};
