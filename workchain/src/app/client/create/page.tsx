import React from 'react';

export default function Page() {
  return (
    <div className="max-w-7xl mx-auto px-8 py-32 flex-grow flex flex-col items-center justify-center min-h-[70vh]">
      <div className="bg-[#1A1A1A] p-12 border-4 border-[#DC143C] shadow-[12px_12px_0_#C5A945] rotate-[-1deg] text-center w-full max-w-4xl relative">
        <div className="absolute top-4 left-4 bg-white text-[#1A1A1A] text-[10px] font-black px-2 py-0.5 border-2 border-[#1A1A1A]">
          SYSTEM_ROUTE
        </div>
        <h1 className="text-5xl md:text-7xl font-sans font-black uppercase text-[#F0EAD6] tracking-tighter mb-6 text-distressed">
          CREATE PROJECT
        </h1>
        <p className="text-xl font-bold uppercase text-[#C5A945] tracking-widest mb-12">
          Lock Funds in Escrow.
        </p>
        <div className="bg-[#F0EAD6] p-6 border-2 border-[#1A1A1A] text-left">
          <p className="text-sm font-mono opacity-80 text-[#1A1A1A]">
            &gt; INITIATING MODULE: /client/create <br/>
            &gt; STATUS: PENDING IMPLEMENTATION <br/>
            &gt; DESIGN_SYSTEM: REFINED_GRUNGE
          </p>
        </div>
      </div>
    </div>
  );
}
