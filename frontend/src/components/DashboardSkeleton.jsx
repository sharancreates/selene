import React from 'react';

export default function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-12 animate-pulse my-10">
      <div className="h-48 bg-black/5 rounded-[3rem] w-full" />
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-5 h-80 bg-black/5 rounded-[3rem]" />
        <div className="md:col-span-7 h-80 bg-black/5 rounded-[3rem]" />
      </div>
      <div className="h-64 bg-black/5 rounded-[3rem] w-full" />
    </div>
  );
}
