"use client";

import React, { useState } from 'react';
import Link from 'next/link';

export default function HirePage() {
  const [step, setStep] = useState(1);
  
  // Step 1 State
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Step 2 State
  const [milestones, setMilestones] = useState([
    { id: 1, name: '', description: '', eth: '', deadline: '' }
  ]);
  
  const totalEth = milestones.reduce((sum, m) => sum + (parseFloat(m.eth.toString()) || 0), 0);
  
  // Step 3 State
  const [loadingStage, setLoadingStage] = useState(0); // 0 = not loading, 1 = preparing, 2 = waiting, 3 = broadcasting, 4 = success
  
  const addMilestone = () => {
    if (milestones.length < 8) {
      setMilestones([...milestones, { id: Date.now(), name: '', description: '', eth: '', deadline: '' }]);
    }
  };
  
  const removeMilestone = (index: number) => {
    if (milestones.length > 1) {
      const newM = [...milestones];
      newM.splice(index, 1);
      setMilestones(newM);
    }
  };
  
  const updateMilestone = (index: number, field: string, value: string | number) => {
    const newM = [...milestones];
    newM[index] = { ...newM[index], [field]: value };
    setMilestones(newM);
  };

  const handleDeploy = () => {
    setLoadingStage(1);
    setTimeout(() => {
      setLoadingStage(2);
      setTimeout(() => {
        setLoadingStage(3);
        setTimeout(() => {
          setLoadingStage(4);
        }, 1500);
      }, 1500);
    }, 1500);
  };

  if (loadingStage === 4) {
    return (
      <div className="min-h-screen bg-[#F0EAD6] font-sans relative pt-32 px-4 pb-20 overflow-hidden">
        <div className="absolute inset-0 halftone opacity-10 pointer-events-none z-0"></div>
        <div className="fixed inset-0 grunge-bg z-50"></div>
        
        <div className="max-w-3xl mx-auto relative z-10">
          <div className="bg-[#F0EAD6] border-4 border-[#C5A945] shadow-[12px_12px_0_#DC143C] rotate-[-1deg] p-12 text-center">
            <div className="text-8xl font-black text-[#DC143C] mb-6 animate-jitter">✓</div>
            <h2 className="text-5xl font-black uppercase text-distressed mb-6 text-[#1A1A1A]">CONTRACT_DEPLOYED.</h2>
            <div className="font-mono text-2xl font-black text-[#C5A945] mb-4">PROJECT ID: WC-0047</div>
            <div className="font-mono text-sm font-bold text-[#1A1A1A] mb-12 flex justify-center items-center gap-2">
              TX HASH: <span className="text-xs">0x1a2b...9z0a</span> <a href="https://sepolia.etherscan.io" target="_blank" rel="noopener noreferrer" className="text-[#DC143C] hover:underline ml-2">VIEW ON ETHERSCAN ↗</a>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/projects/WC-0047" className="bg-[#DC143C] text-[#F0EAD6] border-4 border-[#1A1A1A] shadow-[8px_8px_0_#1A1A1A] text-xl font-black uppercase px-8 py-4 hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
                VIEW PROJECT →
              </Link>
              <Link href="/dashboard" className="bg-[#F0EAD6] text-[#1A1A1A] border-4 border-[#1A1A1A] shadow-[8px_8px_0_#1A1A1A] text-xl font-black uppercase px-8 py-4 hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
                BACK TO DASHBOARD
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0EAD6] font-sans relative pt-32 px-4 pb-20 overflow-hidden">
      <div className="absolute inset-0 halftone opacity-10 pointer-events-none z-0"></div>
      <div className="fixed inset-0 grunge-bg z-50"></div>
      
      <div className="max-w-3xl mx-auto relative z-10">
        
        {/* FREELANCER SUMMARY CARD */}
        <div className="bg-[#1A1A1A] border-4 border-[#C5A945] shadow-[8px_8px_0_#DC143C] rotate-[-1deg] p-8 flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div>
            <div className="font-mono text-[10px] font-black uppercase text-[#C5A945] tracking-[0.3em] mb-1">HIRING:</div>
            <h1 className="text-4xl font-black text-[#F0EAD6] uppercase leading-none mb-2 font-sans tracking-tighter">ANVAY.ETH</h1>
            <div className="font-mono text-xs font-bold text-[#F0EAD6] opacity-60">0x8f9a3C42B1d71ef2Ca90001aa42b000000000000</div>
          </div>
          <div className="bg-[#C5A945] text-[#1A1A1A] border-2 border-[#1A1A1A] px-4 py-2 font-black uppercase rotate-[1deg] font-mono text-sm whitespace-nowrap shadow-[4px_4px_0_#1A1A1A]">
            GOLD TIER // 92/100
          </div>
        </div>

        {/* STEP INDICATOR */}
        <div className="flex items-center mb-12 w-full">
          <div className={`flex-1 text-center font-black uppercase text-[10px] sm:text-xs tracking-widest py-4 border-4 transition-all ${step === 1 ? 'bg-[#DC143C] text-white border-[#1A1A1A] shadow-[4px_4px_0_#1A1A1A] z-20' : step > 1 ? 'bg-[#1A1A1A] text-[#F0EAD6] border-[#1A1A1A] z-10' : 'bg-[#F0EAD6] text-[#1A1A1A] border-[#1A1A1A] opacity-50 z-10'}`}>
            01 PROJECT DETAILS
          </div>
          <div className="h-2 bg-[#1A1A1A] w-4 sm:w-8 -mx-1 z-0"></div>
          <div className={`flex-1 text-center font-black uppercase text-[10px] sm:text-xs tracking-widest py-4 border-4 transition-all ${step === 2 ? 'bg-[#DC143C] text-white border-[#1A1A1A] shadow-[4px_4px_0_#1A1A1A] z-20' : step > 2 ? 'bg-[#1A1A1A] text-[#F0EAD6] border-[#1A1A1A] z-10' : 'bg-[#F0EAD6] text-[#1A1A1A] border-[#1A1A1A] opacity-50 z-10'}`}>
            02 MILESTONES
          </div>
          <div className="h-2 bg-[#1A1A1A] w-4 sm:w-8 -mx-1 z-0"></div>
          <div className={`flex-1 text-center font-black uppercase text-[10px] sm:text-xs tracking-widest py-4 border-4 transition-all ${step === 3 ? 'bg-[#DC143C] text-white border-[#1A1A1A] shadow-[4px_4px_0_#1A1A1A] z-20' : 'bg-[#F0EAD6] text-[#1A1A1A] border-[#1A1A1A] opacity-50 z-10'}`}>
            03 CONFIRM & LOCK
          </div>
        </div>

        {/* STEP 1: PROJECT DETAILS */}
        {step === 1 && (
          <div className="bg-[#F0EAD6] border-4 border-[#1A1A1A] shadow-[12px_12px_0_#C5A945] rotate-[-0.5deg] p-6 sm:p-10 mt-8">
            <div className="font-mono text-[10px] font-black uppercase text-[#DC143C] tracking-widest mb-4 animate-flicker">PROJECT_DETAILS</div>
            <h2 className="text-4xl sm:text-5xl font-black uppercase text-distressed mb-8 tracking-tighter text-[#1A1A1A]">DEFINE THE CONTRACT.</h2>
            
            <div className="space-y-6">
              <div className="mb-6">
                <label className="block font-mono text-xs font-black uppercase text-[#1A1A1A] mb-2">PROJECT_NAME</label>
                <input 
                  type="text" 
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full border-4 border-[#1A1A1A] p-4 bg-[#F0EAD6] font-bold uppercase shadow-[4px_4px_0_#1A1A1A] focus:outline-none focus:border-[#DC143C] focus:shadow-[4px_4px_0_#DC143C] transition-colors placeholder:text-[#1A1A1A]/30 text-[#1A1A1A]"
                  placeholder="e.g. DEFI ANALYTICS DASHBOARD"
                />
              </div>
              
              <div className="mb-6">
                <label className="block font-mono text-xs font-black uppercase text-[#1A1A1A] mb-2">PROJECT_DESCRIPTION</label>
                <textarea 
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border-4 border-[#1A1A1A] p-4 bg-[#F0EAD6] font-bold uppercase shadow-[4px_4px_0_#1A1A1A] focus:outline-none focus:border-[#DC143C] focus:shadow-[4px_4px_0_#DC143C] transition-colors placeholder:text-[#1A1A1A]/30 text-[#1A1A1A]"
                  placeholder="DESCRIBE DELIVERABLES, SCOPE AND EXPECTATIONS..."
                />
              </div>
              
              <div className="mb-6">
                <label className="block font-mono text-xs font-black uppercase text-[#1A1A1A] mb-2">CATEGORY</label>
                <div className="relative">
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full border-4 border-[#1A1A1A] p-4 bg-[#F0EAD6] font-bold uppercase shadow-[4px_4px_0_#1A1A1A] focus:outline-none focus:border-[#DC143C] focus:shadow-[4px_4px_0_#DC143C] transition-colors appearance-none text-[#1A1A1A] rounded-none"
                  >
                    <option value="" disabled>SELECT CATEGORY</option>
                    <option value="DEVELOPMENT">DEVELOPMENT</option>
                    <option value="DESIGN">DESIGN</option>
                    <option value="AUDIT">AUDIT</option>
                    <option value="CONSULTING">CONSULTING</option>
                    <option value="SMART_CONTRACTS">SMART_CONTRACTS</option>
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-[#1A1A1A] font-black text-xs">
                    ▼
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block font-mono text-xs font-black uppercase text-[#1A1A1A] mb-2">START_DATE</label>
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full border-4 border-[#1A1A1A] p-4 bg-[#F0EAD6] font-bold uppercase shadow-[4px_4px_0_#1A1A1A] focus:outline-none focus:border-[#DC143C] focus:shadow-[4px_4px_0_#DC143C] transition-colors text-[#1A1A1A]"
                  />
                </div>
                <div>
                  <label className="block font-mono text-xs font-black uppercase text-[#1A1A1A] mb-2">END_DATE</label>
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full border-4 border-[#1A1A1A] p-4 bg-[#F0EAD6] font-bold uppercase shadow-[4px_4px_0_#1A1A1A] focus:outline-none focus:border-[#DC143C] focus:shadow-[4px_4px_0_#DC143C] transition-colors text-[#1A1A1A]"
                  />
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => setStep(2)}
              className="w-full mt-8 bg-[#DC143C] text-[#F0EAD6] border-4 border-[#1A1A1A] shadow-[8px_8px_0_#1A1A1A] text-2xl font-black uppercase p-5 hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
            >
              NEXT: DEFINE MILESTONES →
            </button>
          </div>
        )}

        {/* STEP 2: MILESTONES */}
        {step === 2 && (
          <div className="bg-[#F0EAD6] border-4 border-[#1A1A1A] shadow-[12px_12px_0_#DC143C] rotate-[0.5deg] p-6 sm:p-10 mt-8 relative">
            <div className="font-mono text-[10px] font-black uppercase text-[#DC143C] tracking-widest mb-4 animate-flicker">MILESTONE_CHAIN</div>
            <h2 className="text-4xl sm:text-5xl font-black uppercase mb-8 tracking-tighter text-[#1A1A1A]">BREAK IT DOWN.</h2>
            
            <div className="bg-[#1A1A1A] text-[#F0EAD6] p-4 border-2 border-white rotate-[-0.3deg] font-mono text-xs font-black uppercase tracking-wider mb-8 shadow-[4px_4px_0_#1A1A1A] leading-relaxed">
              EACH MILESTONE LOCKS A PORTION OF FUNDS. CLIENT APPROVES EACH BEFORE NEXT RELEASES.
            </div>
            
            <div className="space-y-6 mb-8">
              {milestones.map((m, i) => (
                <div key={m.id} className="bg-white border-4 border-[#1A1A1A] shadow-[6px_6px_0_#C5A945] p-6 rotate-[0.2deg] relative">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-mono text-[10px] font-black uppercase text-[#DC143C] tracking-widest">MILESTONE_0{i+1}</span>
                    <button 
                      onClick={() => removeMilestone(i)}
                      className="border-2 border-[#DC143C] text-[#DC143C] hover:bg-[#DC143C] hover:text-white font-black px-3 py-1 text-xs transition-colors"
                      title="Remove Milestone"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <input 
                    type="text"
                    value={m.name}
                    onChange={(e) => updateMilestone(i, 'name', e.target.value)}
                    placeholder="MILESTONE NAME..."
                    className="w-full border-4 border-[#1A1A1A] font-bold uppercase p-3 mb-3 bg-[#F0EAD6] focus:outline-none focus:border-[#DC143C] text-[#1A1A1A] placeholder:text-[#1A1A1A]/30"
                  />
                  
                  <textarea 
                    rows={2}
                    value={m.description}
                    onChange={(e) => updateMilestone(i, 'description', e.target.value)}
                    placeholder="DELIVERABLES..."
                    className="w-full border-4 border-[#1A1A1A] font-bold uppercase p-3 mb-4 bg-[#F0EAD6] focus:outline-none focus:border-[#DC143C] text-[#1A1A1A] placeholder:text-[#1A1A1A]/30"
                  />
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-mono text-[10px] font-black uppercase text-[#1A1A1A] mb-1">ETH AMOUNT</label>
                      <input 
                        type="number"
                        step="0.01"
                        min="0"
                        value={m.eth}
                        onChange={(e) => updateMilestone(i, 'eth', e.target.value)}
                        placeholder="0.00"
                        className="w-full border-4 border-[#1A1A1A] font-black text-xl p-3 bg-white focus:outline-none focus:border-[#DC143C] text-[#1A1A1A]"
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[10px] font-black uppercase text-[#1A1A1A] mb-1">DEADLINE</label>
                      <input 
                        type="date"
                        value={m.deadline}
                        onChange={(e) => updateMilestone(i, 'deadline', e.target.value)}
                        className="w-full border-4 border-[#1A1A1A] font-bold uppercase p-3 bg-white focus:outline-none focus:border-[#DC143C] text-[#1A1A1A]"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <button 
              onClick={addMilestone}
              disabled={milestones.length >= 8}
              className="border-4 border-[#1A1A1A] bg-[#F0EAD6] text-[#1A1A1A] shadow-[4px_4px_0_#C5A945] font-black uppercase px-6 py-3 hover:bg-[#1A1A1A] hover:text-[#F0EAD6] transition-all mb-8 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ADD MILESTONE +
            </button>
            
            {/* LIVE TOTAL */}
            <div className="bg-[#1A1A1A] text-[#F0EAD6] p-6 border-t-4 border-white mt-4 flex justify-between items-center rotate-[-0.5deg] shadow-[8px_8px_0_#1A1A1A] mb-8">
              <span className="font-mono text-xs sm:text-sm font-black uppercase tracking-widest">TOTAL_PROJECT_VALUE:</span>
              <span className="text-2xl sm:text-3xl font-black text-[#DC143C] font-sans tracking-tight">{totalEth.toFixed(2)} ETH</span>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => setStep(1)}
                className="border-4 border-[#1A1A1A] bg-[#F0EAD6] text-[#1A1A1A] font-black uppercase px-8 py-4 flex-1 hover:bg-[#1A1A1A] hover:text-[#F0EAD6] transition-all"
              >
                ← BACK
              </button>
              <button 
                onClick={() => setStep(3)}
                className="bg-[#DC143C] text-[#F0EAD6] border-4 border-[#1A1A1A] shadow-[8px_8px_0_#1A1A1A] font-black uppercase px-8 py-4 flex-[2] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
              >
                NEXT: REVIEW →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: CONFIRM & LOCK */}
        {step === 3 && (
          <div className="bg-[#F0EAD6] border-4 border-[#1A1A1A] shadow-[12px_12px_0_#C5A945] rotate-[-0.5deg] p-6 sm:p-10 mt-8 relative">
            <div className="font-mono text-[10px] font-black uppercase text-[#DC143C] tracking-widest mb-4 animate-flicker">FINAL_REVIEW</div>
            <h2 className="text-4xl sm:text-5xl font-black uppercase mb-8 tracking-tighter text-[#1A1A1A]">LOCK THE CONTRACT.</h2>
            
            <div className="bg-[#1A1A1A] text-[#F0EAD6] border-4 border-[#C5A945] shadow-[8px_8px_0_#C5A945] rotate-[0.5deg] p-6 sm:p-8 mb-8 space-y-4">
              <div className="flex flex-col sm:flex-row sm:justify-between border-b-2 border-white/20 pb-4">
                <span className="font-mono text-[10px] font-black text-[#C5A945] uppercase tracking-widest mb-1 sm:mb-0">PROJECT NAME</span>
                <span className="font-black text-lg text-white font-sans uppercase text-right tracking-tight">{projectName || 'UNTITLED PROJECT'}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between border-b-2 border-white/20 pb-4">
                <span className="font-mono text-[10px] font-black text-[#C5A945] uppercase tracking-widest mb-1 sm:mb-0">FREELANCER</span>
                <span className="font-black text-lg text-white font-sans uppercase text-right tracking-tight">0x8f9a3C42B1d71ef2Ca90001aa42b000000000000</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between border-b-2 border-white/20 pb-4">
                <span className="font-mono text-[10px] font-black text-[#C5A945] uppercase tracking-widest mb-1 sm:mb-0">CATEGORY</span>
                <span className="font-black text-lg text-white font-sans uppercase text-right tracking-tight">{category || 'UNSPECIFIED'}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between">
                <span className="font-mono text-[10px] font-black text-[#C5A945] uppercase tracking-widest mb-1 sm:mb-0">TIMELINE</span>
                <span className="font-black text-lg text-white font-sans uppercase text-right tracking-tight">
                  {startDate || 'TBD'} TO {endDate || 'TBD'}
                </span>
              </div>
            </div>
            
            <div className="border-4 border-[#1A1A1A] shadow-[6px_6px_0_#1A1A1A] mb-8 overflow-x-auto bg-white">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="bg-[#1A1A1A] text-[#F0EAD6]">
                    <th className="font-mono text-[10px] font-black uppercase p-3 border-r-2 border-white/20 tracking-widest">#</th>
                    <th className="font-mono text-[10px] font-black uppercase p-3 border-r-2 border-white/20 tracking-widest">MILESTONE</th>
                    <th className="font-mono text-[10px] font-black uppercase p-3 border-r-2 border-white/20 tracking-widest">DEADLINE</th>
                    <th className="font-mono text-[10px] font-black uppercase p-3 text-right tracking-widest">ETH</th>
                  </tr>
                </thead>
                <tbody>
                  {milestones.map((m, i) => (
                    <tr key={i} className="border-b-2 border-[#1A1A1A]/10 bg-[#F0EAD6]">
                      <td className="font-mono text-xs font-black p-3 border-r-2 border-[#1A1A1A]/10 text-[#1A1A1A]">{i + 1}</td>
                      <td className="font-mono text-xs font-bold uppercase p-3 border-r-2 border-[#1A1A1A]/10 text-[#1A1A1A]">{m.name || `MILESTONE ${i + 1}`}</td>
                      <td className="font-mono text-xs font-bold uppercase p-3 border-r-2 border-[#1A1A1A]/10 text-[#1A1A1A]">{m.deadline || 'TBD'}</td>
                      <td className="font-mono text-xs font-black p-3 text-right text-[#1A1A1A]">{parseFloat(m.eth.toString() || '0').toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="bg-[#C5A945] border-4 border-[#1A1A1A] shadow-[6px_6px_0_#1A1A1A] rotate-[-0.5deg] p-6 mb-8 text-[#1A1A1A]">
              <div className="flex justify-between items-center mb-4">
                <span className="font-black text-xl font-sans uppercase tracking-tight">TOTAL TO LOCK IN ESCROW</span>
                <span className="text-3xl font-black font-sans tracking-tighter">{totalEth.toFixed(2)} ETH</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-mono text-[10px] font-black uppercase tracking-widest opacity-80">ESTIMATED GAS FEE</span>
                <span className="font-mono text-[10px] font-black uppercase tracking-widest">~0.004 ETH</span>
              </div>
              <div className="flex justify-between items-center pt-4 border-t-2 border-[#1A1A1A]/20 mt-4">
                <span className="font-mono text-[10px] font-black uppercase tracking-widest opacity-80">SMART CONTRACT</span>
                <span className="font-mono text-[10px] font-black uppercase tracking-widest text-[#DC143C]">0xABC...123</span>
              </div>
            </div>
            
            <div className="border-4 border-[#DC143C] bg-[#DC143C]/10 p-4 rotate-[-0.3deg] font-mono text-[10px] leading-relaxed tracking-widest font-black text-[#DC143C] mb-8 shadow-[4px_4px_0_#DC143C]">
              ⚠ ONCE SIGNED, FUNDS ARE LOCKED IN THE SMART CONTRACT. THIS CANNOT BE UNDONE WITHOUT DISPUTE RESOLUTION.
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => setStep(2)}
                disabled={loadingStage > 0}
                className="border-4 border-[#1A1A1A] bg-[#F0EAD6] text-[#1A1A1A] font-black uppercase px-8 py-4 flex-1 hover:bg-[#1A1A1A] hover:text-[#F0EAD6] transition-all disabled:opacity-50"
              >
                ← BACK
              </button>
              
              {loadingStage === 0 ? (
                <button 
                  onClick={handleDeploy}
                  className="bg-[#DC143C] text-[#F0EAD6] border-4 border-[#1A1A1A] shadow-[12px_12px_0_#1A1A1A] font-black uppercase px-8 py-4 flex-[2] text-xl tracking-tight hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all animate-jitter-slow"
                >
                  LOCK FUNDS & DEPLOY CONTRACT
                </button>
              ) : (
                <button 
                  disabled
                  className="bg-[#1A1A1A] text-[#C5A945] border-4 border-[#1A1A1A] shadow-[8px_8px_0_#1A1A1A] font-black uppercase px-8 py-4 flex-[2] flex items-center justify-center gap-3 transition-all"
                >
                  {loadingStage === 1 && (
                    <>
                      <div className="w-5 h-5 border-4 border-[#C5A945] border-t-transparent rounded-full animate-spin"></div>
                      <span className="font-mono text-sm tracking-widest">PREPARING_TRANSACTION...</span>
                    </>
                  )}
                  {loadingStage === 2 && (
                    <>
                      <div className="w-4 h-4 bg-[#DC143C] rounded-full animate-flicker"></div>
                      <span className="font-mono text-sm tracking-widest">WAITING_FOR_SIGNATURE...</span>
                    </>
                  )}
                  {loadingStage === 3 && (
                    <>
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-[#C5A945] rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-[#C5A945] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-[#C5A945] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="font-mono text-sm tracking-widest">BROADCASTING_TO_SEPOLIA...</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
