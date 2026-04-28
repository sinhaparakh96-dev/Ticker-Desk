/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Terminal, 
  Zap, 
  FileText, 
  RefreshCw, 
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  CheckCircle2,
  XCircle,
  Copy,
  Upload,
  FileUp,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateNewsflashes, NewsflashResponse, CalculationData } from './services/geminiService';

type Exchange = 'NSE' | 'BSE';

export default function App() {
  const [inputText, setInputText] = useState('');
  const [exchange, setExchange] = useState<Exchange>('NSE');
  const [isLoading, setIsLoading] = useState(false);
  const [output, setOutput] = useState<string>('');
  const [calculations, setCalculations] = useState<CalculationData | null>(null);
  const [bseTop500, setBseTop500] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    fetch('/public/Exchange Notifications/BSE_Top500.csv')
      .then(res => res.text())
      .then(text => {
        const lines = text.split('\n');
        const symbols = lines.slice(1).map(line => line.split(',')[0].trim()).filter(Boolean);
        setBseTop500(symbols);
      })
      .catch(err => console.error('Failed to load BSE list', err));
  }, []);

  const handleProcess = async () => {
    if (!inputText.trim() && !file) {
      setError('Please provide notification text or upload a PDF');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      let fileData: { data: string, mimeType: string } | undefined;
      
      if (file) {
        const base64 = await fileToBase64(file);
        fileData = {
          data: base64.split(',')[1],
          mimeType: file.type
        };
      }

      const timeoutPromise = new Promise<{ newsflashes: string, calculations: any }>((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out. The notification may be too large or the server is busy.')), 45000);
      });

      const result = await Promise.race([
        generateNewsflashes(inputText, fileData),
        timeoutPromise
      ]);
      setOutput(result.newsflashes);
      setCalculations(result.calculations);
    } catch (err: any) {
      setError(err.message || 'Failed to generate newsflashes');
    } finally {
      setIsLoading(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(output);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0F1117] text-white overflow-hidden">
      {/* Header */}
      <header className="h-[60px] bg-[#1A1D24] border-b border-[#3F4451] flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#00D1FF] rounded-md flex items-center justify-center font-bold text-[#0F1117]">
            E
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight leading-none uppercase">Equity Research Assistant</h1>
            <p className="text-[10px] text-[#94A3B8] font-semibold tracking-wider">INDIA MARKETS • BROADCAST DESK</p>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-[13px] text-[#94A3B8] flex items-center">
            <span className="w-2 h-2 bg-[#00C853] rounded-full mr-2 shadow-[0_0_8px_#00C853] animate-pulse" />
            LIVE FEED: {exchange === 'BSE' ? 'BSE_TOP500' : 'NSE_ALL'}
          </div>
          <div className="bg-[#00D1FF1A] border border-[#00D1FF] text-[#00D1FF] px-2.5 py-1 rounded text-[11px] uppercase tracking-wider font-bold">
            Ready for Flash
          </div>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-[240px_1fr_320px] h-[calc(100vh-60px)] overflow-hidden">
        {/* Left Sidebar */}
        <aside className="bg-[#1A1D24] border-r border-[#3F4451] p-5 overflow-y-auto">
          <span className="section-label">Exchange Source</span>
          <div className="space-y-1 mb-10">
            {(['NSE', 'BSE'] as Exchange[]).map((e) => (
              <div 
                key={e}
                onClick={() => setExchange(e)}
                className={`p-2.5 px-3 rounded-lg text-[13px] flex justify-between items-center cursor-pointer transition-colors ${
                  exchange === e 
                  ? 'bg-[#252A34] text-white border border-[#3F4451]' 
                  : 'text-[#94A3B8] hover:bg-[#252A34]/50'
                }`}
              >
                <span>{e} {e === 'NSE' ? '(All)' : 'Top 500'}</span>
                {exchange === e && <CheckCircle2 className="w-3 h-3 text-[#00D1FF]" />}
              </div>
            ))}
          </div>

          <span className="section-label">Materiality Filters</span>
          <ul className="space-y-2 text-[12px] text-[#94A3B8] font-medium">
            <li className="flex items-center gap-2 text-[#00D1FF]">
              <span className="text-lg leading-none">•</span> Financial Results
            </li>
            <li className="flex items-center gap-2">
              <span className="text-lg leading-none">•</span> M&A / Demergers
            </li>
            <li className="flex items-center gap-2">
              <span className="text-lg leading-none">•</span> Board Changes
            </li>
            <li className="flex items-center gap-2">
              <span className="text-lg leading-none">•</span> Fundraising / QIP
            </li>
            <li className="flex items-center gap-2">
              <span className="text-lg leading-none">•</span> Stake Sales {'>'}5%
            </li>
            <li className="flex items-center gap-2">
              <span className="text-lg leading-none">•</span> Regulatory Actions
            </li>
          </ul>
        </aside>

        {/* Center Container - Input/Feed */}
        <section className="p-6 flex flex-col gap-4 overflow-y-auto bg-[#0F1117]">
          <span className="section-label">Broadcast Desk</span>
          
          <div className="bg-[#252A34] border border-[#3F4451] rounded-lg p-5 space-y-4">
            <div>
                 <button 
                  onClick={handleProcess}
                  disabled={isLoading}
                  className="w-full h-[38px] bg-[#00D1FF] hover:bg-[#33DAFF] disabled:bg-[#3F4451] text-[#0F1117] font-bold text-xs uppercase rounded transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Process Notification'}
                </button>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] uppercase text-[#94A3B8] font-bold">PDF Attachment (Optional)</label>
                {file && (
                  <button 
                    onClick={() => setFile(null)}
                    className="text-[10px] text-rose-500 hover:text-rose-400 flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> REMOVE
                  </button>
                )}
              </div>
              <div 
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]);
                }}
                className={`relative border-2 border-dashed rounded-lg p-4 transition-all flex items-center justify-center gap-3 cursor-pointer ${
                  file 
                  ? 'border-[#00C853] bg-[#00C853]/5' 
                  : isDragging 
                  ? 'border-[#00D1FF] bg-[#00D1FF]/5' 
                  : 'border-[#3F4451] hover:border-[#94A3B8] bg-black/10'
                }`}
              >
                <input 
                  type="file" 
                  accept=".pdf" 
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                {file ? (
                  <>
                    <FileUp className="w-5 h-5 text-[#00C853]" />
                    <span className="text-xs font-mono text-[#EEE] truncate max-w-[200px]">{file.name}</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-[#94A3B8]" />
                    <span className="text-[11px] text-[#94A3B8] font-mono">DRAG & DROP OR CLICK TO UPLOAD PDF</span>
                  </>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase text-[#94A3B8] mb-1 font-bold">Raw Notification Data / Summary</label>
              <textarea 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste notification text here..."
                className="w-full bg-[#1A1D24] border border-[#3F4451] rounded p-3 h-48 font-mono text-xs text-[#EEE] focus:outline-none focus:border-[#00D1FF] resize-none"
              />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {output && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#252A34] border border-[#3F4451] rounded-lg p-5 relative"
              >
                <div className="flex justify-between items-center mb-4">
                  <span className="section-label !mb-0">Live Generation</span>
                  <button 
                    onClick={copyToClipboard}
                    className="text-[10px] font-mono text-[#00D1FF] hover:underline flex items-center gap-1"
                  >
                    {isCopied ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {isCopied ? 'COPIED' : 'COPY FLASH'}
                  </button>
                </div>
                
                <div className="space-y-3">
                  {output.split('\n').map((line, idx) => {
                    if (line.startsWith('CONTEXT:')) {
                      return (
                        <div key={idx} className="text-[12px] text-[#94A3B8] leading-relaxed pt-3 border-t border-[#FFFFFF0D] mt-3 italic">
                          {line}
                        </div>
                      );
                    }
                    if (line.trim() === '') return null;
                    
                    // Basic colorizing for arrows in preview
                    const formattedLine = line
                      .replace(/\(GU\)/g, '<span class="gu">(GU)</span>')
                      .replace(/\(RD\)/g, '<span class="rd">(RD)</span>')
                      .replace(/\(GD\)/g, '<span class="gu">(GD)</span>');

                    return (
                      <div 
                        key={idx} 
                        className="newsflash-text"
                        dangerouslySetInnerHTML={{ __html: formattedLine }}
                      />
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <div className="bg-[#FF3D001A] border border-[#FF3D00] text-[#FF3D00] p-4 rounded text-xs font-mono">
              [SYSTEM_ERROR]: {error}
            </div>
          )}
        </section>

        {/* Right Panel - Calc Engine */}
        <aside className="bg-[#1A1D24] border-l border-[#3F4451] p-5 flex flex-col gap-6 overflow-y-auto">
          <div>
            <span className="section-label">Calculation Engine</span>
            <div className="text-[12px] font-semibold mb-2">
              Engine Ready
            </div>
            <div className="bg-black/20 border border-[#3F4451] rounded-md p-3">
              {calculations?.isBanking ? (
                <div className="space-y-2 mb-3">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#94A3B8]">Net Interest Inc (NII)</span>
                    <span className="font-mono text-[#00D1FF]">{calculations.nii || '--'}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#94A3B8]">GNPA %</span>
                    <span className="font-mono text-[#00D1FF]">{calculations.gnpa || '--'}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#94A3B8]">NNPA %</span>
                    <span className="font-mono text-[#00D1FF]">{calculations.nnpa || '--'}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#94A3B8]">Provisions</span>
                    <span className="font-mono text-[#00D1FF]">{calculations.provisions || '--'}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 mb-3">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#94A3B8]">Revenue (Ops)</span>
                    <span className="font-mono text-[#00D1FF]">{calculations?.revenue || '--'}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#94A3B8]">Operating Exp</span>
                    <span className="font-mono text-[#00D1FF]">{calculations?.expenses || '--'}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#94A3B8]">Finance Cost</span>
                    <span className="font-mono text-[#00D1FF]">{calculations?.financeCost || '--'}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#94A3B8]">Depreciation</span>
                    <span className="font-mono text-[#00D1FF]">{calculations?.depreciation || '--'}</span>
                  </div>
                </div>
              )}
              
              {!calculations?.isBanking && (
                <div className="border-t border-[#3F4451] border-dashed pt-2 space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span>EBITDA</span>
                    <span className="text-[#00C853] font-mono">{calculations?.ebitda || (isLoading ? 'CALCULATING...' : '--')}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold">
                    <span>Margin</span>
                    <span className="text-[#00C853] font-mono">{calculations?.margin || '--'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <span className="section-label">Engine Logic</span>
            <div className="bg-[#111] p-2 rounded text-[10px] font-mono text-[#64748B] mb-2 leading-relaxed">
              EBITDA = {"{(Rev - Exp) + FinCost + Depr}"}
            </div>
            <div className="bg-[#111] p-2 rounded text-[10px] font-mono text-[#64748B]">
              Margin = EBITDA / Revenue
            </div>
          </div>

          <div className="mt-auto">
             <div className="bg-[#111] border border-[#222] p-3 rounded-md">
                <div className="text-[10px] text-[#94A3B8] font-bold mb-2 uppercase">Quick Actions</div>
                <button 
                  onClick={() => window.location.reload()}
                  className="w-full bg-[#00D1FF] text-[#0F1117] font-bold py-2 rounded text-xs uppercase hover:bg-[#33DAFF] transition-colors"
                >
                  Reset Terminal
                </button>
             </div>
          </div>
        </aside>
      </main>

      {/* Marquee Footer */}
      <footer className="h-8 bg-[#1A1D24] border-t border-[#3F4451] flex items-center overflow-hidden">
        <div className="flex items-center gap-10 whitespace-nowrap animate-marquee px-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-10 text-[10px] font-mono tracking-wider text-[#94A3B8]">
              <span>TICKER LIST: {bseTop500.length} BSE SYMBOLS MONITORED</span>
              <span className="text-[#3F4451]">|</span>
              <span>NUMBER FORMAT: INR CR (LAKH)</span>
              <span className="text-[#3F4451]">|</span>
              <span>MANDATORY: PROFIT ATTRIBUTABLE TO OWNERS</span>
              <span className="text-[#3F4451]">|</span>
              <span>TONE: NEUTRAL FACTUAL BROADCAST</span>
            </div>
          ))}
        </div>
      </footer>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-20%); }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
      `}</style>
    </div>
  );
}
