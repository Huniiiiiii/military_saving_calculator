import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Plus, Trash2, Save, Lock, ChevronRight, Calendar, Info, CheckCircle2, LayoutGrid, History, Edit3 } from 'lucide-react';
import { data as initialData } from '../data/data';
import type { Bank, RateVersion } from '../utils/savingsUtils';

type AdminStep = 'banks' | 'versions' | 'editor';

const AdminPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [fullData, setFullData] = useState(initialData);
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [isJsonView, setIsJsonView] = useState(false);
  
  // For mobile navigation
  const [step, setStep] = useState<AdminStep>('banks');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin1234') {
      setIsAuthenticated(true);
    } else {
      alert('비밀번호가 틀렸습니다.');
    }
  };

  const currentBank = (fullData.banks as unknown as Bank[]).find(b => b.id === selectedBankId);
  const selectedVersion = currentBank?.rateVersions.find(v => v.id === selectedVersionId);

  // --- Navigation Handlers ---
  const goToVersions = (bankId: string) => {
    setSelectedBankId(bankId);
    setSelectedVersionId(null);
    setStep('versions');
  };

  const goToEditor = (versionId: string) => {
    setSelectedVersionId(versionId);
    setStep('editor');
  };

  const goBackStep = () => {
    if (step === 'editor') setStep('versions');
    else if (step === 'versions') setStep('banks');
    else onBack();
  };

  // --- Version Handlers ---
  const handleAddVersion = () => {
    if (!selectedBankId || !currentBank) return;
    const newData = { ...fullData };
    const bank = (newData.banks as unknown as Bank[]).find(b => b.id === selectedBankId);
    if (bank) {
      const latest = bank.rateVersions[0];
      const newVersion: RateVersion = {
        ...latest,
        id: `v${new Date().toISOString().split('T')[0].replace(/-/g, '')}_${Math.floor(Math.random() * 1000)}`,
        effectiveDate: new Date().toISOString().split('T')[0],
      };
      bank.rateVersions = [newVersion, ...bank.rateVersions];
      setFullData(newData);
      setSelectedVersionId(newVersion.id);
      setStep('editor');
    }
  };

  const handleDeleteVersion = (vId: string) => {
    if (!window.confirm('이 금리 버전을 정말 삭제할까요?')) return;
    const newData = { ...fullData };
    const bank = (newData.banks as unknown as Bank[]).find(b => b.id === selectedBankId);
    if (bank) {
      bank.rateVersions = bank.rateVersions.filter(v => v.id !== vId);
      setFullData(newData);
      if (selectedVersionId === vId) {
        setSelectedVersionId(null);
        setStep('versions');
      }
    }
  };

  // --- Item Handlers ---
  const updateVersionField = <T extends keyof RateVersion>(field: T, value: RateVersion[T]) => {
    const newData = { ...fullData };
    const bank = (newData.banks as unknown as Bank[]).find(b => b.id === selectedBankId);
    const version = bank?.rateVersions.find(v => v.id === selectedVersionId);
    if (version) {
      version[field] = value;
      setFullData(newData);
    }
  };

  const addBaseRate = () => {
    if (!selectedVersion) return;
    const newData = [...selectedVersion.baseRates];
    newData.push({ range: [1, 11], rate: 0.04 });
    updateVersionField('baseRates', newData);
  };

  const deleteBaseRate = (index: number) => {
    if (!selectedVersion) return;
    const newData = [...selectedVersion.baseRates];
    newData.splice(index, 1);
    updateVersionField('baseRates', newData);
  };

  const addPrimeRate = () => {
    if (!selectedVersion) return;
    const newData = [...selectedVersion.primeRates];
    const newId = `new_prime_${Date.now()}`;
    newData.push({ id: newId, group: 'other', label: '새 우대조건', rate: 0.001, footnotes: [] });
    updateVersionField('primeRates', newData);
  };

  const deletePrimeRate = (id: string) => {
    if (!selectedVersion) return;
    const newData = selectedVersion.primeRates.filter(p => p.id !== id);
    updateVersionField('primeRates', newData);
  };

  const handleSaveAndCopy = () => {
    const finalData = {
      ...fullData,
      version: new Date().toISOString().split('T')[0]
    };
    const code = `export const data = ${JSON.stringify(finalData, null, 2)};`;
    navigator.clipboard.writeText(code);
    alert(`데이터가 복사되었습니다! (버전: ${finalData.version})\nsrc/data/data.ts 파일에 덮어쓰기 하세요.`);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 text-center">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mb-6 mx-auto">
            <Lock size={40} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Admin Login</h1>
          <p className="text-slate-400 text-sm mb-8 font-medium">관리자 비밀번호를 입력하세요</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              className="w-full h-14 bg-slate-50 border-2 border-transparent rounded-2xl px-5 text-lg font-bold focus:bg-white focus:border-blue-500 transition-all outline-none"
              autoFocus
            />
            <button type="submit" className="w-full h-14 bg-blue-600 text-white rounded-2xl font-black text-lg shadow-lg hover:bg-blue-700 active:scale-95 transition-all">
              로그인
            </button>
            <button type="button" onClick={onBack} className="w-full text-slate-400 text-sm font-bold pt-2">
              나가기
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFF] flex flex-col font-sans">
      {/* Header */}
      <header className="h-16 md:h-20 px-4 md:px-8 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2 md:gap-6">
          <button onClick={goBackStep} className="p-2 md:p-3 hover:bg-slate-50 rounded-xl md:rounded-2xl transition-colors"><ChevronLeft size={24} md:size={28} /></button>
          <div className="hidden sm:block">
            <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">데이터 관리</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ver: {fullData.version}</p>
          </div>
          <div className="sm:hidden font-black text-slate-900 text-sm">
            {step === 'banks' ? '은행 선택' : step === 'versions' ? currentBank?.name : '금리 편집'}
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleSaveAndCopy}
            className="flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 bg-blue-600 text-white rounded-xl md:rounded-2xl font-black text-xs md:text-sm shadow-lg shadow-blue-100 active:scale-95 transition-all"
          >
            <Save size={16} /> <span className="hidden xs:inline">저장 및 복사</span><span className="xs:hidden">저장</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Step 1: Banks (Visible on Desktop always, or on Mobile step 'banks') */}
        <aside className={`w-full md:w-64 bg-white border-r border-slate-100 p-4 md:p-6 space-y-2 overflow-y-auto ${step !== 'banks' ? 'hidden md:block' : 'block'}`}>
          <div className="flex items-center gap-2 mb-4 px-2">
            <LayoutGrid size={14} className="text-blue-500" />
            <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Select Bank</p>
          </div>
          {fullData.banks.map(bank => (
            <button
              key={bank.id}
              onClick={() => goToVersions(bank.id)}
              className={`w-full flex items-center justify-between px-4 py-4 rounded-2xl font-black text-sm transition-all ${selectedBankId === bank.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              {bank.name}
              <ChevronRight size={16} opacity={0.3} />
            </button>
          ))}
        </aside>

        {/* Step 2: Versions (Visible on Desktop always, or on Mobile step 'versions') */}
        <aside className={`w-full md:w-80 bg-[#FBFCFF] border-r border-slate-100 p-4 md:p-6 space-y-4 overflow-y-auto ${step !== 'versions' ? 'hidden md:block' : 'block'}`}>
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="flex items-center gap-2">
              <History size={14} className="text-blue-500" />
              <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Versions</p>
            </div>
            <button onClick={handleAddVersion} className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"><Plus size={18} /></button>
          </div>
          
          <div className="space-y-3">
            {currentBank?.rateVersions.map((version) => (
              <div
                key={version.id}
                onClick={() => goToEditor(version.id)}
                className={`group relative p-5 rounded-2xl border-2 cursor-pointer transition-all ${selectedVersionId === version.id ? 'bg-white border-blue-500 shadow-xl ring-4 ring-blue-50' : 'bg-white border-transparent shadow-sm hover:border-slate-200'}`}
              >
                <div className="flex items-center gap-3 mb-1">
                  <Calendar size={14} className={selectedVersionId === version.id ? 'text-blue-500' : 'text-slate-400'} />
                  <span className={`text-[15px] font-black ${selectedVersionId === version.id ? 'text-slate-900' : 'text-slate-600'}`}>
                    {version.effectiveDate}
                  </span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDeleteVersion(version.id); }}
                  className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all md:opacity-100"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </aside>

        {/* Step 3: Editor (Visible on Desktop always, or on Mobile step 'editor') */}
        <section className={`flex-1 bg-white p-4 md:p-10 overflow-y-auto ${step !== 'editor' ? 'hidden md:block' : 'block'}`}>
          {selectedVersion ? (
            <div className="max-w-3xl mx-auto space-y-10 pb-20">
              <header className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-widest mb-1">
                    <Edit3 size={12} /> Editing Mode
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{currentBank?.name}</h2>
                </div>
              </header>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">시행 시작일</label>
                  <input type="date" value={selectedVersion.effectiveDate} onChange={(e) => updateVersionField('effectiveDate', e.target.value)} className="w-full h-12 bg-white rounded-xl px-4 font-black text-slate-900 border-2 border-transparent focus:border-blue-500 outline-none shadow-sm transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">최대 우대금리 (예: 0.055)</label>
                  <input type="number" step="0.001" value={selectedVersion.maxPrimeRate} onChange={(e) => updateVersionField('maxPrimeRate', parseFloat(e.target.value))} className="w-full h-12 bg-white rounded-xl px-4 font-black text-slate-900 border-2 border-transparent focus:border-blue-500 outline-none shadow-sm transition-all" />
                </div>
              </div>

              {/* Base Rates */}
              <section className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="font-black text-slate-900 flex items-center gap-2 uppercase text-sm tracking-widest">기본 금리</h3>
                  <button onClick={addBaseRate} className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg font-black text-[10px] hover:bg-blue-100">추가</button>
                </div>
                <div className="space-y-2">
                  {selectedVersion.baseRates.map((br, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <div className="flex-1 grid grid-cols-3 gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <input type="number" value={br.range[0]} onChange={(e) => { const nd = [...selectedVersion.baseRates]; nd[idx].range[0] = parseInt(e.target.value); updateVersionField('baseRates', nd); }} className="h-9 bg-white rounded-lg text-center font-bold text-xs" />
                        <input type="number" value={br.range[1]} onChange={(e) => { const nd = [...selectedVersion.baseRates]; nd[idx].range[1] = parseInt(e.target.value); updateVersionField('baseRates', nd); }} className="h-9 bg-white rounded-lg text-center font-bold text-xs" />
                        <input type="number" step="0.001" value={br.rate} onChange={(e) => { const nd = [...selectedVersion.baseRates]; nd[idx].rate = parseFloat(e.target.value); updateVersionField('baseRates', nd); }} className="h-9 bg-blue-50 text-blue-600 rounded-lg text-center font-black text-xs" />
                      </div>
                      <button onClick={() => deleteBaseRate(idx)} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>
              </section>

              {/* Prime Rates */}
              <section className="space-y-6">
                <div className="flex items-center justify-between px-1">
                  <h3 className="font-black text-slate-900 flex items-center gap-2 uppercase text-sm tracking-widest">우대 금리 조건</h3>
                  <button onClick={addPrimeRate} className="px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg font-black text-[10px] hover:bg-purple-100">추가</button>
                </div>
                <div className="space-y-4">
                  {selectedVersion.primeRates.map((pr, pIdx) => (
                    <div key={pr.id} className="p-5 bg-white rounded-3xl border-2 border-slate-50 shadow-sm relative group">
                      <button onClick={() => deletePrimeRate(pr.id)} className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">ID</label><input value={pr.id} onChange={(e) => { const nd = [...selectedVersion.primeRates]; nd[pIdx].id = e.target.value; updateVersionField('primeRates', nd); }} className="w-full h-10 bg-slate-50 rounded-lg px-3 text-[11px] font-bold" /></div>
                        <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">그룹</label><input value={pr.group} onChange={(e) => { const nd = [...selectedVersion.primeRates]; nd[pIdx].group = e.target.value; updateVersionField('primeRates', nd); }} className="w-full h-10 bg-slate-50 rounded-lg px-3 text-[11px] font-bold" /></div>
                        <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">이름</label><input value={pr.label} onChange={(e) => { const nd = [...selectedVersion.primeRates]; nd[pIdx].label = e.target.value; updateVersionField('primeRates', nd); }} className="w-full h-10 bg-slate-50 rounded-lg px-3 text-[11px] font-bold" /></div>
                        <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">금리</label><input type="number" step="0.001" value={pr.rate} onChange={(e) => { const nd = [...selectedVersion.primeRates]; nd[pIdx].rate = parseFloat(e.target.value); updateVersionField('primeRates', nd); }} className="w-full h-10 bg-purple-50 text-purple-600 rounded-lg px-3 text-[11px] font-black" /></div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between"><label className="text-[9px] font-black text-slate-400 uppercase">설명</label><button onClick={() => { const nd = [...selectedVersion.primeRates]; if(!nd[pIdx].footnotes) nd[pIdx].footnotes = []; nd[pIdx].footnotes!.push('새 설명'); updateVersionField('primeRates', nd); }} className="text-[9px] font-black text-blue-600">추가</button></div>
                        {pr.footnotes?.map((note, fIdx) => (
                          <div key={fIdx} className="flex gap-2">
                            <textarea value={note} onChange={(e) => { const nd = [...selectedVersion.primeRates]; nd[pIdx].footnotes![fIdx] = e.target.value; updateVersionField('primeRates', nd); }} className="flex-1 bg-slate-50 rounded-xl p-2 text-[10px] font-medium min-h-[50px] outline-none" />
                            <button onClick={() => { const nd = [...selectedVersion.primeRates]; nd[pIdx].footnotes!.splice(fIdx, 1); updateVersionField('primeRates', nd); }} className="p-1 self-start text-slate-300"><Trash2 size={12} /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : (
            <div className="h-[60vh] flex flex-col items-center justify-center text-center px-6">
              <History size={48} className="text-slate-100 mb-4" />
              <h3 className="text-lg font-black text-slate-300">버전을 선택하여<br/>금리를 편집해 주세요.</h3>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default AdminPage;
