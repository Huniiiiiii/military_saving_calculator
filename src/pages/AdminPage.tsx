import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Plus, Trash2, Save, Lock, ChevronRight, Calendar, LayoutGrid, History, Edit3, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { GlobalData } from '../App';
import type { Bank, RateVersion } from '../utils/savingsUtils';

type AdminStep = 'banks' | 'versions' | 'editor';

interface AdminPageProps {
  initialData: GlobalData;
  onBack: () => void;
  onRefresh: () => void;
}

const AdminPage: React.FC<AdminPageProps> = ({ initialData, onBack, onRefresh }) => {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullData, setFullData] = useState(initialData);
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [step, setStep] = useState<AdminStep>('banks');

  // Check current session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert('로그인 실패: ' + error.message);
    else {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const currentBank = (fullData.banks as Bank[]).find(b => b.id === selectedBankId);
  const selectedVersion = currentBank?.rateVersions.find(v => v.id === selectedVersionId);

  // --- Navigation ---
  const goToVersions = (bankId: string) => { setSelectedBankId(bankId); setSelectedVersionId(null); setStep('versions'); };
  const goToEditor = (versionId: string) => { setSelectedVersionId(versionId); setStep('editor'); };
  const goBackStep = () => {
    if (step === 'editor') setStep('versions');
    else if (step === 'versions') setStep('banks');
    else onBack();
  };

  // --- DB Persistence ---
  const saveToDatabase = async () => {
    if (!selectedVersion || !selectedBankId) return;
    setIsSaving(true);
    try {
      // 1. Update Rate Version
      const { error: vError } = await supabase
        .from('rate_versions')
        .upsert({
          id: selectedVersionId,
          bank_id: selectedBankId,
          effective_date: selectedVersion.effectiveDate,
          max_prime_rate: selectedVersion.maxPrimeRate,
          base_rates: selectedVersion.baseRates,
          prime_rates: selectedVersion.primeRates
        });

      if (vError) throw vError;

      // 2. Update Global Config Version (Date)
      await supabase
        .from('global_config')
        .update({ version: new Date().toISOString().split('T')[0] })
        .eq('id', 1);

      alert('성공적으로 저장되었습니다! 앱에 즉시 반영됩니다.');
      onRefresh(); // Refresh global data
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      alert('저장 실패: ' + msg);
    } finally {
      setIsSaving(false);
    }
  };

  // --- Version Handlers ---
  const handleAddVersion = async () => {
    if (!selectedBankId || !currentBank) return;
    
    const latest = currentBank.rateVersions[0]; // 최신 버전 가져오기
    const newEffectiveDate = new Date().toISOString().split('T')[0];
    const newVersionId = crypto.randomUUID(); // 새 UUID 생성

    const newData = { ...fullData };
    const bank = newData.banks.find((b: Bank) => b.id === selectedBankId);
    
    if (bank) {
      const newVersion: RateVersion = {
        ...latest,
        id: newVersionId,
        effectiveDate: newEffectiveDate,
      };
      
      bank.rateVersions = [newVersion, ...bank.rateVersions];
      setFullData(newData);
      setSelectedVersionId(newVersionId);
      setStep('editor');
      
      alert('새로운 금리 버전이 생성되었습니다. 수정 후 [DB 저장]을 눌러주세요.');
    }
  };

  const handleDeleteVersion = async (vId: string) => {
    if (!window.confirm('이 금리 버전을 정말 삭제할까요? DB에서도 즉시 삭제됩니다.')) return;
    if (!window.confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
    
    try {
      const { error } = await supabase.from('rate_versions').delete().eq('id', vId);
      if (error) throw error;

      const newData = { ...fullData };
      const bank = newData.banks.find((b: Bank) => b.id === selectedBankId);
      if (bank) {
        bank.rateVersions = bank.rateVersions.filter(v => v.id !== vId);
        setFullData(newData);
        if (selectedVersionId === vId) {
          setSelectedVersionId(null);
          setStep('versions');
        }
      }
      alert('삭제되었습니다.');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      alert('삭제 실패: ' + msg);
    }
  };

  // --- Item Handlers ---
  const updateVersionField = <T extends keyof RateVersion>(field: T, value: RateVersion[T]) => {
    const newData = { ...fullData };
    const bank = newData.banks.find((b: Bank) => b.id === selectedBankId);
    const version = bank?.rateVersions.find((v: RateVersion) => v.id === selectedVersionId);
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
    if (!window.confirm('이 기본 금리 행을 삭제할까요?')) return;
    if (!window.confirm('한 번 더 확인합니다. 정말 삭제하시겠습니까?')) return;
    
    const newData = [...selectedVersion.baseRates];
    newData.splice(index, 1);
    updateVersionField('baseRates', newData);
  };

  const addPrimeRate = () => {
    if (!selectedVersion) return;
    const newData = [...selectedVersion.primeRates];
    newData.push({ id: `prime_${new Date().getTime()}`, group: 'other', label: '새 우대조건', rate: 0.001, footnotes: [] });
    updateVersionField('primeRates', newData);
  };

  const deletePrimeRate = (id: string) => {
    if (!selectedVersion) return;
    if (!window.confirm('이 우대 금리 항목을 삭제할까요?')) return;
    if (!window.confirm('항목을 삭제하시겠습니까? 저장 버튼을 눌러야 최종 반영됩니다.')) return;
    
    const newData = selectedVersion.primeRates.filter(p => p.id !== id);
    updateVersionField('primeRates', newData);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl border border-slate-100">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mb-6 mx-auto"><Lock size={40} /></div>
          <h1 className="text-2xl font-black text-slate-900 mb-2 text-center">관리자 로그인</h1>
          <p className="text-slate-400 text-sm mb-8 text-center">Supabase 계정으로 로그인하세요</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="이메일" className="w-full h-14 bg-slate-50 border-2 border-transparent rounded-2xl px-5 font-bold focus:bg-white focus:border-blue-500 transition-all outline-none" required />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="비밀번호" className="w-full h-14 bg-slate-50 border-2 border-transparent rounded-2xl px-5 font-bold focus:bg-white focus:border-blue-500 transition-all outline-none" required />
            <button type="submit" className="w-full h-14 bg-blue-600 text-white rounded-2xl font-black text-lg shadow-lg hover:bg-blue-700 active:scale-95 transition-all">로그인</button>
            <button type="button" onClick={onBack} className="w-full text-slate-400 text-sm font-bold pt-2">나가기</button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFF] flex flex-col font-sans">
      <header className="h-16 md:h-20 px-4 md:px-8 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <button onClick={goBackStep} className="p-2 hover:bg-slate-50 rounded-xl transition-colors"><ChevronLeft size={24} /></button>
          <div className="sm:hidden font-black text-slate-900 text-sm">
            {step === 'banks' ? '은행 선택' : step === 'versions' ? currentBank?.name : '금리 편집'}
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-black text-slate-900">데이터 센터</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{user.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500"><LogOut size={20} /></button>
          <button onClick={saveToDatabase} disabled={isSaving || !selectedVersion} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-black text-sm shadow-lg disabled:opacity-30 transition-all">
            {isSaving ? '저장 중...' : <><Save size={16} /> <span>DB 저장</span></>}
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        <aside className={`w-full md:w-64 bg-white border-r border-slate-100 p-4 md:p-6 space-y-2 overflow-y-auto ${step !== 'banks' ? 'hidden md:block' : 'block'}`}>
          <div className="flex items-center gap-2 mb-4 px-2">
            <LayoutGrid size={14} className="text-blue-500" />
            <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Banks</p>
          </div>
          {fullData.banks.map((bank: Bank) => (
            <button key={bank.id} onClick={() => goToVersions(bank.id)} className={`w-full flex items-center justify-between px-4 py-4 rounded-2xl font-black text-sm transition-all ${selectedBankId === bank.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
              {bank.name} <ChevronRight size={16} opacity={0.3} />
            </button>
          ))}
        </aside>

        <aside className={`w-full md:w-80 bg-[#FBFCFF] border-r border-slate-100 p-4 md:p-6 space-y-4 overflow-y-auto ${step !== 'versions' ? 'hidden md:block' : 'block'}`}>
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="flex items-center gap-2"><History size={14} className="text-blue-500" /><p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Versions</p></div>
            <button onClick={handleAddVersion} className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"><Plus size={18} /></button>
          </div>
          <div className="space-y-3">
            {currentBank?.rateVersions.map((v) => (
              <div key={v.id} onClick={() => goToEditor(v.id)} className={`group relative p-5 rounded-2xl border-2 cursor-pointer transition-all ${selectedVersionId === v.id ? 'bg-white border-blue-500 shadow-xl ring-4 ring-blue-50' : 'bg-white border-transparent shadow-sm hover:border-slate-200'}`}>
                <div className="flex items-center gap-3 mb-1">
                  <Calendar size={14} className={selectedVersionId === v.id ? 'text-blue-500' : 'text-slate-400'} />
                  <span className={`text-[15px] font-black ${selectedVersionId === v.id ? 'text-slate-900' : 'text-slate-600'}`}>{v.effectiveDate}</span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDeleteVersion(v.id); }}
                  className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all md:opacity-100"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </aside>

        <section className={`flex-1 bg-white p-4 md:p-10 overflow-y-auto ${step !== 'editor' ? 'hidden md:block' : 'block'}`}>
          {selectedVersion ? (
            <div className="max-w-3xl mx-auto space-y-10 pb-20">
              <header><div className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-widest mb-1"><Edit3 size={12} /> Editing Mode</div><h2 className="text-2xl font-black text-slate-900">{currentBank?.name}</h2></header>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">시행 시작일</label><input type="date" value={selectedVersion.effectiveDate} onChange={(e) => updateVersionField('effectiveDate', e.target.value)} className="w-full h-12 bg-white rounded-xl px-4 font-black text-slate-900 border-2 border-transparent focus:border-blue-500 outline-none shadow-sm" /></div>
                <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">최대 우대금리 (예: 0.055)</label><input type="number" step="0.001" value={selectedVersion.maxPrimeRate} onChange={(e) => updateVersionField('maxPrimeRate', parseFloat(e.target.value))} className="w-full h-12 bg-white rounded-xl px-4 font-black text-slate-900 border-2 border-transparent focus:border-blue-500 outline-none shadow-sm" /></div>
              </div>
              <section className="space-y-4">
                <div className="flex items-center justify-between px-1"><h3 className="font-black text-slate-900 uppercase text-sm tracking-widest">기본 금리</h3><button onClick={addBaseRate} className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg font-black text-[10px]">추가</button></div>
                <div className="space-y-2">{selectedVersion.baseRates.map((br, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <div className="flex-1 grid grid-cols-3 gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <input type="number" value={br.range[0]} onChange={(e) => { const nd = [...selectedVersion.baseRates]; nd[idx].range[0] = parseInt(e.target.value); updateVersionField('baseRates', nd); }} className="h-9 bg-white rounded-lg text-center font-bold text-xs" />
                      <input type="number" value={br.range[1]} onChange={(e) => { const nd = [...selectedVersion.baseRates]; nd[idx].range[1] = parseInt(e.target.value); updateVersionField('baseRates', nd); }} className="h-9 bg-white rounded-lg text-center font-bold text-xs" />
                      <input type="number" step="0.001" value={br.rate} onChange={(e) => { const nd = [...selectedVersion.baseRates]; nd[idx].rate = parseFloat(e.target.value); updateVersionField('baseRates', nd); }} className="h-9 bg-blue-50 text-blue-600 rounded-lg text-center font-black text-xs" />
                    </div>
                    <button onClick={() => deleteBaseRate(idx)} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
                  </div>
                ))}</div>
              </section>
              <section className="space-y-6">
                <div className="flex items-center justify-between px-1"><h3 className="font-black text-slate-900 uppercase text-sm tracking-widest">우대 금리 조건</h3><button onClick={addPrimeRate} className="px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg font-black text-[10px]">추가</button></div>
                <div className="space-y-4">{selectedVersion.primeRates.map((pr, pIdx) => (
                  <div key={pr.id} className="p-5 bg-white rounded-3xl border-2 border-slate-50 shadow-sm relative">
                    <button onClick={() => deletePrimeRate(pr.id)} className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">ID</label><input value={pr.id} readOnly className="w-full h-10 bg-slate-100 rounded-lg px-3 text-[11px] font-bold text-slate-400" /></div>
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
                ))}</div>
              </section>
            </div>
          ) : <div className="h-[60vh] flex flex-col items-center justify-center text-center px-6"><History size={48} className="text-slate-100 mb-4" /><h3 className="text-lg font-black text-slate-300">버전을 선택하여<br/>금리를 편집해 주세요.</h3></div>}
        </section>
      </main>
    </div>
  );
};

export default AdminPage;
