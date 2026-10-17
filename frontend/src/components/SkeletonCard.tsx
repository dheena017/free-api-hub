import React from 'react';

interface SkeletonCardProps {
  viewMode?: 'grid' | 'compact';
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ viewMode = 'grid' }) => {
  if (viewMode === 'compact') {
    return (
      <div className="bg-[#28292A] border border-[#3C4043] rounded-xl px-4 py-3 flex items-center justify-between gap-4 animate-pulse">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="h-4 w-4 rounded bg-[#3C4043]" />
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <div className="h-4 w-32 rounded bg-[#3C4043]" />
              <div className="h-3 w-16 rounded bg-[#3C4043]" />
              <div className="h-3 w-12 rounded bg-[#3C4043]" />
            </div>
            <div className="h-3 w-3/4 rounded bg-[#3C4043]/60" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-20 rounded bg-[#3C4043]" />
          <div className="h-7 w-16 rounded-lg bg-[#3C4043]" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#28292A] border border-[#3C4043] rounded-2xl p-5 flex flex-col justify-between space-y-4 animate-pulse">
      <div className="space-y-3">
        {/* Top Badges */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-4 w-20 rounded bg-[#3C4043]" />
            <div className="h-4 w-14 rounded bg-[#3C4043]" />
          </div>
          <div className="h-5 w-5 rounded bg-[#3C4043]" />
        </div>

        {/* Title */}
        <div className="h-5 w-44 rounded bg-[#3C4043]" />

        {/* Description */}
        <div className="space-y-1.5 pt-1">
          <div className="h-3 w-full rounded bg-[#3C4043]/70" />
          <div className="h-3 w-4/5 rounded bg-[#3C4043]/50" />
        </div>

        {/* Tags */}
        <div className="flex items-center gap-1.5 pt-2">
          <div className="h-3.5 w-12 rounded bg-[#3C4043]/60" />
          <div className="h-3.5 w-14 rounded bg-[#3C4043]/60" />
          <div className="h-3.5 w-10 rounded bg-[#3C4043]/60" />
        </div>
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-[#3C4043] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-4 w-16 rounded bg-[#3C4043]" />
          <div className="h-4 w-12 rounded bg-[#3C4043]" />
        </div>
        <div className="h-6 w-16 rounded-lg bg-[#3C4043]" />
      </div>
    </div>
  );
};

export const SkeletonGrid: React.FC<{ count?: number; viewMode?: 'grid' | 'compact' }> = ({
  count = 6,
  viewMode = 'grid'
}) => {
  return viewMode === 'grid' ? (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} viewMode="grid" />
      ))}
    </div>
  ) : (
    <div className="space-y-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} viewMode="compact" />
      ))}
    </div>
  );
};
