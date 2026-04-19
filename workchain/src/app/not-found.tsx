import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="max-w-7xl mx-auto px-8 py-32 flex-grow flex flex-col items-center justify-center min-h-[70vh]">
      <div className="bg-[#1A1A1A] p-12 border-4 border-[#DC143C] shadow-[12px_12px_0_#DC143C] rotate-[2deg] text-center w-full max-w-2xl relative">
        <h1 className="text-[8rem] font-sans font-black uppercase text-[#F0EAD6] tracking-tighter mb-2 text-distressed leading-none">
          404
        </h1>
        <p className="text-xl font-bold uppercase text-[#C5A945] tracking-widest mb-12">
          THIS CHAIN LEADS NOWHERE.
        </p>
        <Link 
          href="/" 
          className="bg-[#DC143C] text-[#F0EAD6] px-10 py-5 text-xl font-black uppercase border-4 border-[#1A1A1A] shadow-[8px_8px_0_#1A1A1A] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all inline-block"
        >
          RETURN TO DASHBOARD
        </Link>
      </div>
    </div>
  );
}
