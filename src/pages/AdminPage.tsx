import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Plus, Trash2, Save, Lock, ChevronRight, Calendar, LayoutGrid, History, Edit3, LogOut, ExternalLink, Settings2, Building2, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { GlobalData } from '../App';
import type { GlobalConfig, Bank, RateVersion } from '../utils/savingsUtils';

type AdminStep = 'banks' | 'versions' | 'editor' | 'branches' | 'configs' | 'bank_manager';
type EditableBank = Bank & { display_order?: number };
type MilitaryBranch = GlobalData['militaryBranches'][number];

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
  const [selectedBranchIntId, setSelectedBranchIntId] = useState<number | null>(null);
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
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

  const currentBank = (fullData.banks as EditableBank[]).find(b => b.id === selectedBankId);
  const selectedVersion = currentBank?.rateVersions.find(v => v.id === selectedVersionId);
  const selectedBranch = fullData.militaryBranches.find(b => b.id_int === selectedBranchIntId);
  const selectedConfig = fullData.globalConfigs.find(c => c.id === selectedConfigId);

  // --- Navigation ---
  const goToVersions = (bankId: string) => { 
    setSelectedBankId(bankId); 
    setSelectedVersionId(null); 
    setSelectedBranchIntId(null);
    setSelectedConfigId(null);
    setStep('versions'); 
  };
  const goToEditor = (versionId: string) => { setSelectedVersionId(versionId); setStep('editor'); };
  const goToBranches = () => { 
    setStep('branches'); 
    setSelectedBankId(null); 
    setSelectedVersionId(null);
    setSelectedConfigId(null);
    if (fullData.militaryBranches.length > 0 && !selectedBranchIntId) {
      setSelectedBranchIntId(fullData.militaryBranches[0].id_int);
    }
  };
  const goToConfigs = () => {
    setStep('configs');
    setSelectedBankId(null);
    setSelectedVersionId(null);
    setSelectedBranchIntId(null);
    if (fullData.globalConfigs.length > 0 && !selectedConfigId) {
      setSelectedConfigId(fullData.globalConfigs[0].id);
    }
  };
  const goToBankManager = () => {
    setStep('bank_manager');
    setSelectedVersionId(null);
    setSelectedBranchIntId(null);
    setSelectedConfigId(null);
    if (fullData.banks.length > 0 && !selectedBankId) {
      setSelectedBankId(fullData.banks[0].id);
    }
  };

  const goBackStep = () => {
    if (step === 'editor') setStep('versions');
    else if (step === 'versions' || step === 'branches' || step === 'configs' || step === 'bank_manager') setStep('banks');
    else onBack();
  };

  // --- DB Persistence ---
  const saveToDatabase = async () => {
    if (step === 'branches') {
      await saveMilitaryBranches();
      return;
    }
    if (step === 'configs') {
      await saveGlobalConfigs();
      return;
    }
    if (step === 'bank_manager') {
      await saveBanks();
      return;
    }
    if (!selectedVersion || !selectedBankId) return;
    setIsSaving(true);
    try {
      const maxPrimeRate = Number(selectedVersion.maxPrimeRate);
      const payload = {
        bank_id: selectedBankId,
        effective_date: selectedVersion.effectiveDate,
        max_prime_rate: Number.isFinite(maxPrimeRate) ? maxPrimeRate : 0,
        base_rates: selectedVersion.baseRates,
        prime_rates: selectedVersion.primeRates
      };

      const payloadWithoutActive = {
        bank_id: selectedBankId,
        effective_date: selectedVersion.effectiveDate,
        max_prime_rate: Number.isFinite(maxPrimeRate) ? maxPrimeRate : 0,
        base_rates: selectedVersion.baseRates,
        prime_rates: selectedVersion.primeRates
      };

      // 1. Save Rate Version (update existing row first, then insert for new row)
      let vError: unknown = null;
      const { data: existingVersion, error: findError } = await supabase
        .from('rate_versions')
        .select('id')
        .eq('id', selectedVersionId)
        .maybeSingle();

      if (findError) throw findError;

      if (existingVersion) {
        const { error } = await supabase
          .from('rate_versions')
          .update(payload)
          .eq('id', selectedVersionId);
        vError = error;

        // Some deployments do not have rate_versions.is_active yet.
        if (
          vError &&
          typeof vError === 'object' &&
          vError !== null &&
          'code' in vError &&
          (vError as { code: unknown }).code === 'PGRST204'
        ) {
          const { error: fallbackError } = await supabase
            .from('rate_versions')
            .update(payloadWithoutActive)
            .eq('id', selectedVersionId);
          vError = fallbackError;
        }
      } else {
        const { error } = await supabase
          .from('rate_versions')
          .insert({
            id: selectedVersionId,
            ...payload
          });
        vError = error;

        // Some deployments do not have rate_versions.is_active yet.
        if (
          vError &&
          typeof vError === 'object' &&
          vError !== null &&
          'code' in vError &&
          (vError as { code: unknown }).code === 'PGRST204'
        ) {
          const { error: fallbackError } = await supabase
            .from('rate_versions')
            .insert({
              id: selectedVersionId,
              ...payloadWithoutActive
            });
          vError = fallbackError;
        }
      }

      if (vError) throw vError;

      // 2. Update Global Config Version (Date) - for cache busting if needed
      await supabase
        .from('global_config')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', fullData.globalConfigs[0].id);

      alert('성공적으로 저장되었습니다! 앱에 즉시 반영됩니다.');
      onRefresh(); // Refresh global data
    } catch (error: unknown) {
      const msg =
        typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message: unknown }).message)
          : '알 수 없는 오류가 발생했습니다.';
      const details =
        typeof error === 'object' && error !== null && 'details' in error
          ? String((error as { details: unknown }).details)
          : '';
      const hint =
        typeof error === 'object' && error !== null && 'hint' in error
          ? String((error as { hint: unknown }).hint)
          : '';

      console.error('rate_versions save failed:', error);
      alert(`저장 실패: ${msg}${details ? `\n상세: ${details}` : ''}${hint ? `\n힌트: ${hint}` : ''}`);
    } finally {
      setIsSaving(false);
    }
  };

  const saveMilitaryBranches = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('military_branches')
        .upsert(fullData.militaryBranches.map(b => ({
          id_int: b.id_int > 0 ? b.id_int : undefined, 
          id: b.id,
          name: b.name,
          max_months: b.max_months,
          effective_day: b.effective_day,
          display_order: b.display_order
        })));

      if (error) throw error;

      alert('군 정보가 성공적으로 저장되었습니다!');
      onRefresh();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      alert('저장 실패: ' + msg);
    } finally {
      setIsSaving(false);
    }
  };

  const saveGlobalConfigs = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('global_config')
        .upsert(fullData.globalConfigs.map(c => ({
          id: c.id > 0 ? c.id : undefined,
          max_total_monthly_deposit: c.max_total_monthly_deposit,
          max_deposit_per_bank: c.max_deposit_per_bank,
          matching_support_rate: c.matching_support_rate,
          tax_rate: c.tax_rate,
          version: c.version,
          effective_day_config: c.effective_day_config
        })));

      if (error) throw error;

      alert('글로벌 설정이 성공적으로 저장되었습니다!');
      onRefresh();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      alert('저장 실패: ' + msg);
    } finally {
      setIsSaving(false);
    }
  };

  const saveBanks = async () => {
    setIsSaving(true);
    try {
      // Upsert banks
      const banksToUpsert = fullData.banks.map(b => ({
        id: b.id,
        name: b.name,
        link: b.link,
        display_order: (b as EditableBank).display_order ?? 0,
        is_active: b.isActive ?? true
      }));

      const { error } = await supabase
        .from('banks')
        .upsert(banksToUpsert);

      if (error) throw error;

      alert('은행 정보가 성공적으로 저장되었습니다!');
      onRefresh();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      alert('저장 실패: ' + msg);
    } finally {
      setIsSaving(false);
    }
  };

  // --- Bank Manager Handlers ---
  const handleAddBank = () => {
    const newData = { ...fullData };
    const newBankId = `bank_${Date.now()}`;
    const newBank: EditableBank = {
      id: newBankId,
      name: '새로운 은행',
      link: 'https://',
      rateVersions: [],
      isActive: true,
      display_order: fullData.banks.length + 1
    };
    newData.banks = [...newData.banks, newBank];
    setFullData(newData);
    setSelectedBankId(newBankId);
  };

  const handleDeleteBank = async (id: string) => {
    if (!window.confirm('이 은행을 정말 삭제할까요? 연결된 모든 금리 버전도 삭제됩니다.')) return;
    
    setIsSaving(true);
    try {
      // 1. Delete versions first due to FK constraints if any
      const { error: vError } = await supabase.from('rate_versions').delete().eq('bank_id', id);
      if (vError) throw vError;

      // 2. Delete bank
      const { error: bError } = await supabase.from('banks').delete().eq('id', id);
      if (bError) throw bError;

      const newData = { ...fullData };
      newData.banks = newData.banks.filter(b => b.id !== id);
      setFullData(newData);
      setSelectedBankId(newData.banks[0]?.id || null);
      alert('삭제되었습니다.');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      alert('삭제 실패: ' + msg);
    } finally {
      setIsSaving(false);
    }
  };

  const updateBankField = <K extends keyof EditableBank>(oldId: string, field: K, value: EditableBank[K]) => {
    const newData = { ...fullData };
    const idx = newData.banks.findIndex(b => b.id === oldId);
    if (idx !== -1) {
      const targetBank = newData.banks[idx] as EditableBank;
      newData.banks[idx] = { ...targetBank, [field]: value };
      setFullData(newData);
      // ID 필드가 변경되는 경우, 현재 선택된 ID 상태도 함께 업데이트해야 참조가 깨지지 않습니다.
      if (field === 'id') {
        setSelectedBankId(String(value));
      }
    }
  };

  // --- Military Branch Handlers ---
  const handleAddBranch = () => {
    const newData = { ...fullData };
    const tempId = -Date.now();
    const newBranch = {
      id_int: tempId,
      id: 'army',
      name: '새로운 군 종류',
      max_months: 18,
      effective_day: new Date().toISOString().split('T')[0],
      display_order: fullData.militaryBranches.length + 1
    };
    newData.militaryBranches = [newBranch, ...newData.militaryBranches];
    setFullData(newData);
    setSelectedBranchIntId(tempId);
  };

  const handleDeleteBranch = async (id_int: number) => {
    if (!window.confirm('이 군 정보를 정말 삭제할까요? DB에서도 즉시 삭제됩니다.')) return;
    if (id_int > 0) {
      const { error } = await supabase.from('military_branches').delete().eq('id_int', id_int);
      if (error) { alert('삭제 실패'); return; }
    }
    const newData = { ...fullData };
    newData.militaryBranches = newData.militaryBranches.filter(b => b.id_int !== id_int);
    setFullData(newData);
    setSelectedBranchIntId(newData.militaryBranches[0]?.id_int || null);
    alert('삭제되었습니다.');
  };

  const updateBranchField = <K extends keyof MilitaryBranch>(id_int: number, field: K, value: MilitaryBranch[K]) => {
    const newData = { ...fullData };
    const idx = newData.militaryBranches.findIndex(b => b.id_int === id_int);
    if (idx !== -1) {
      newData.militaryBranches[idx] = { ...newData.militaryBranches[idx], [field]: value };
      setFullData(newData);
    }
  };

  // --- Global Config Handlers ---
  const handleAddConfig = () => {
    const newData = { ...fullData };
    const tempId = -Date.now();
    const newConfig: GlobalConfig = {
      id: tempId,
      max_total_monthly_deposit: 550000,
      max_deposit_per_bank: 300000,
      matching_support_rate: 1.0,
      tax_rate: 0.0,
      version: 'New Version',
      effective_day_config: new Date().toISOString().split('T')[0]
    };
    newData.globalConfigs = [newConfig, ...newData.globalConfigs];
    setFullData(newData);
    setSelectedConfigId(tempId);
  };

  const handleDeleteConfig = async (id: number) => {
    if (!window.confirm('이 설정을 정말 삭제할까요? DB에서도 즉시 삭제됩니다.')) return;
    if (id > 0) {
      const { error } = await supabase.from('global_config').delete().eq('id', id);
      if (error) { alert('삭제 실패'); return; }
    }
    const newData = { ...fullData };
    newData.globalConfigs = newData.globalConfigs.filter(c => c.id !== id);
    setFullData(newData);
    setSelectedConfigId(newData.globalConfigs[0]?.id || null);
    alert('삭제되었습니다.');
  };

  const updateConfigField = <K extends keyof GlobalConfig>(id: number, field: K, value: GlobalConfig[K]) => {
    const newData = { ...fullData };
    const idx = newData.globalConfigs.findIndex(c => c.id === id);
    if (idx !== -1) {
      newData.globalConfigs[idx] = { ...newData.globalConfigs[idx], [field]: value };
      setFullData(newData);
    }
  };

  // --- Version Handlers ---
  const handleAddVersion = async () => {
    if (!selectedBankId || !currentBank) return;
    const latest = currentBank.rateVersions[0];
    const newEffectiveDate = new Date().toISOString().split('T')[0];
    const newVersionId = crypto.randomUUID();
    const newData = { ...fullData };
    const bank = newData.banks.find((b: Bank) => b.id === selectedBankId);
    if (bank) {
      const newVersion: RateVersion = latest 
        ? { ...latest, id: newVersionId, effectiveDate: newEffectiveDate }
        : { id: newVersionId, effectiveDate: newEffectiveDate, maxPrimeRate: 0.05, baseRates: [], primeRates: [] };
      bank.rateVersions = [newVersion, ...bank.rateVersions];
      setFullData(newData);
      setSelectedVersionId(newVersionId);
      setStep('editor');
      alert('새로운 금리 버전이 생성되었습니다.');
    }
  };

  const handleDeleteVersion = async (vId: string) => {
    if (!window.confirm('이 금리 버전을 정말 삭제할까요? DB에서도 즉시 삭제됩니다.')) return;
    try {
      const { error } = await supabase.from('rate_versions').delete().eq('id', vId);
      if (error) throw error;
      const newData = { ...fullData };
      const bank = newData.banks.find((b: Bank) => b.id === selectedBankId);
      if (bank) {
        bank.rateVersions = bank.rateVersions.filter(v => v.id !== vId);
        setFullData(newData);
        if (selectedVersionId === vId) { setSelectedVersionId(null); setStep('versions'); }
      }
      alert('삭제되었습니다.');
    } catch { alert('삭제 실패'); }
  };

  const updateVersionField = <T extends keyof RateVersion>(field: T, value: RateVersion[T]) => {
    const newData = { ...fullData };
    const bank = newData.banks.find((b: Bank) => b.id === selectedBankId);
    const version = bank?.rateVersions.find((v: RateVersion) => v.id === selectedVersionId);
    if (version) { version[field] = value; setFullData(newData); }
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
    newData.push({ id: `prime_${new Date().getTime()}`, group: 'other', label: '새 우대조건', rate: 0.001, footnotes: [] });
    updateVersionField('primeRates', newData);
  };

  const deletePrimeRate = (id: string) => {
    if (!selectedVersion) return;
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
            {step === 'banks' ? '은행 선택' : step === 'configs' ? '한도 및 세율' : step === 'branches' ? '군 정보' : step === 'bank_manager' ? '은행 관리' : currentBank?.name}
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-black text-slate-900">데이터 센터</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{user.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500"><LogOut size={20} /></button>
          <button onClick={saveToDatabase} disabled={isSaving || (step === 'editor' && !selectedVersion) || (step === 'branches' && !selectedBranch) || (step === 'configs' && !selectedConfig) || (step === 'bank_manager' && !currentBank)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-black text-sm shadow-lg disabled:opacity-30 transition-all">
            {isSaving ? '저장 중...' : <><Save size={16} /> <span>DB 저장</span></>}
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        <aside className={`w-full md:w-64 bg-white border-r border-slate-100 p-4 md:p-6 space-y-2 overflow-y-auto ${step !== 'banks' ? 'hidden md:block' : 'block'}`}>
          <div className="flex items-center gap-2 mb-4 px-2">
            <LayoutGrid size={14} className="text-blue-500" />
            <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Global</p>
          </div>
          <button onClick={goToConfigs} className={`w-full flex items-center justify-between px-4 py-4 rounded-2xl font-black text-sm transition-all mb-2 ${step === 'configs' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
            한도 및 세율 관리 <ChevronRight size={16} opacity={0.3} />
          </button>
          <button onClick={goToBranches} className={`w-full flex items-center justify-between px-4 py-4 rounded-2xl font-black text-sm transition-all mb-4 ${step === 'branches' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
            군 종류 관리 <ChevronRight size={16} opacity={0.3} />
          </button>
          <button onClick={goToBankManager} className={`w-full flex items-center justify-between px-4 py-4 rounded-2xl font-black text-sm transition-all mb-4 ${step === 'bank_manager' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
            은행 목록 관리 <ChevronRight size={16} opacity={0.3} />
          </button>

          <div className="flex items-center gap-2 mb-4 px-2">
            <LayoutGrid size={14} className="text-blue-500" />
            <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Banks Rates</p>
          </div>
          {fullData.banks.map((bank: Bank) => (
            <button key={bank.id} onClick={() => goToVersions(bank.id)} className={`w-full flex items-center justify-between px-4 py-4 rounded-2xl font-black text-sm transition-all ${selectedBankId === bank.id && (step === 'banks' || step === 'versions' || step === 'editor') ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
              <div className="flex items-center gap-2">
                {bank.name}
                {bank.isActive === false && <EyeOff size={12} className="opacity-50" />}
              </div>
              <ChevronRight size={16} opacity={0.3} />
            </button>
          ))}
        </aside>

        <aside className={`w-full md:w-80 bg-[#FBFCFF] border-r border-slate-100 p-4 md:p-6 space-y-4 overflow-y-auto ${step !== 'versions' && step !== 'branches' && step !== 'configs' && step !== 'bank_manager' ? 'hidden md:block' : 'block'}`}>
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="flex items-center gap-2">
              <History size={14} className="text-blue-500" />
              <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">
                {step === 'configs' ? 'Config Records' : step === 'branches' ? 'Branch Records' : step === 'bank_manager' ? 'Bank Records' : 'Versions'}
              </p>
            </div>
            <button 
              onClick={step === 'configs' ? handleAddConfig : step === 'branches' ? handleAddBranch : step === 'bank_manager' ? handleAddBank : handleAddVersion} 
              className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
            >
              <Plus size={18} />
            </button>
          </div>
          <div className="space-y-3">
            {step === 'configs' ? (
              fullData.globalConfigs.map((c) => (
                <div key={c.id} onClick={() => setSelectedConfigId(c.id)} className={`group relative p-5 rounded-2xl border-2 cursor-pointer transition-all ${selectedConfigId === c.id ? 'bg-white border-blue-500 shadow-xl ring-4 ring-blue-50' : 'bg-white border-transparent shadow-sm hover:border-slate-200'}`}>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Calendar size={12} className={selectedConfigId === c.id ? 'text-blue-500' : 'text-slate-400'} />
                      <span className={`text-[11px] font-bold ${selectedConfigId === c.id ? 'text-blue-600' : 'text-slate-400'}`}>{c.effective_day_config}</span>
                    </div>
                    <span className={`text-[15px] font-black ${selectedConfigId === c.id ? 'text-slate-900' : 'text-slate-600'}`}>{c.version}</span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteConfig(c.id); }} className="absolute top-4 right-2 p-3 text-slate-300 hover:text-red-500 transition-all active:scale-90"><Trash2 size={16} /></button>
                </div>
              ))
            ) : step === 'branches' ? (
              fullData.militaryBranches.map((branch) => (
                <div key={branch.id_int} onClick={() => setSelectedBranchIntId(branch.id_int)} className={`group relative p-5 rounded-2xl border-2 cursor-pointer transition-all ${selectedBranchIntId === branch.id_int ? 'bg-white border-blue-500 shadow-xl ring-4 ring-blue-50' : 'bg-white border-transparent shadow-sm hover:border-slate-200'}`}>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Calendar size={12} className={selectedBranchIntId === branch.id_int ? 'text-blue-500' : 'text-slate-400'} />
                      <span className={`text-[11px] font-bold ${selectedBranchIntId === branch.id_int ? 'text-blue-600' : 'text-slate-400'}`}>{branch.effective_day}</span>
                    </div>
                    <span className={`text-[15px] font-black ${selectedBranchIntId === branch.id_int ? 'text-slate-900' : 'text-slate-600'}`}>{branch.name}</span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteBranch(branch.id_int); }} className="absolute top-4 right-2 p-3 text-slate-300 hover:text-red-500 transition-all active:scale-90"><Trash2 size={16} /></button>
                </div>
              ))
            ) : step === 'bank_manager' ? (
              fullData.banks.map((bank) => (
                <div key={bank.id} onClick={() => setSelectedBankId(bank.id)} className={`group relative p-5 rounded-2xl border-2 cursor-pointer transition-all ${selectedBankId === bank.id ? 'bg-white border-blue-500 shadow-xl ring-4 ring-blue-50' : 'bg-white border-transparent shadow-sm hover:border-slate-200'}`}>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[15px] font-black ${selectedBankId === bank.id ? 'text-slate-900' : 'text-slate-600'}`}>{bank.name}</span>
                      {bank.isActive === false && <EyeOff size={12} className="text-red-400" />}
                    </div>
                    <span className="text-[11px] font-bold text-slate-400">{bank.id}</span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteBank(bank.id); }} className="absolute top-4 right-2 p-3 text-slate-300 hover:text-red-500 transition-all active:scale-90"><Trash2 size={16} /></button>
                </div>
              ))
            ) : (
              currentBank?.rateVersions.map((v) => (
                <div key={v.id} onClick={() => goToEditor(v.id)} className={`group relative p-5 rounded-2xl border-2 cursor-pointer transition-all ${selectedVersionId === v.id ? 'bg-white border-blue-500 shadow-xl ring-4 ring-blue-50' : 'bg-white border-transparent shadow-sm hover:border-slate-200'}`}>
                  <div className="flex items-center gap-3 mb-1">
                    <Calendar size={14} className={selectedVersionId === v.id ? 'text-blue-500' : 'text-slate-400'} />
                    <span className={`text-[15px] font-black ${selectedVersionId === v.id ? 'text-slate-900' : 'text-slate-600'}`}>{v.effectiveDate}</span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteVersion(v.id); }} className="absolute top-4 right-4 p-3 text-slate-300 hover:text-red-500 transition-all active:scale-90"><Trash2 size={18} /></button>
                </div>
              ))
            )}
          </div>
        </aside>

        <section className={`flex-1 bg-white p-4 md:p-10 overflow-y-auto ${step !== 'editor' && step !== 'branches' && step !== 'configs' && step !== 'bank_manager' ? 'hidden md:block' : 'block'}`}>
          {step === 'configs' ? (
            selectedConfig ? (
              <div className="max-w-3xl mx-auto space-y-10 pb-20">
                <header><div className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-widest mb-1"><Settings2 size={12} /> Editing Global Config</div><h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{selectedConfig.version}</h2></header>
                <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">버전 이름</label><input type="text" value={selectedConfig.version} onChange={(e) => updateConfigField(selectedConfig.id, 'version', e.target.value)} className="w-full h-12 bg-white rounded-xl px-4 font-black text-slate-900 border-2 border-transparent focus:border-blue-500 outline-none shadow-sm" /></div>
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">적용 시작일</label><input type="date" value={selectedConfig.effective_day_config} onChange={(e) => updateConfigField(selectedConfig.id, 'effective_day_config', e.target.value)} className="w-full h-12 bg-white rounded-xl px-4 font-black text-slate-900 border-2 border-transparent focus:border-blue-500 outline-none shadow-sm" /></div>
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">월 총 납입 한도 (원)</label><input type="number" value={selectedConfig.max_total_monthly_deposit} onChange={(e) => updateConfigField(selectedConfig.id, 'max_total_monthly_deposit', parseInt(e.target.value))} className="w-full h-12 bg-white rounded-xl px-4 font-black text-slate-900 border-2 border-transparent focus:border-blue-500 outline-none shadow-sm" /></div>
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">은행별 한도 (원)</label><input type="number" value={selectedConfig.max_deposit_per_bank} onChange={(e) => updateConfigField(selectedConfig.id, 'max_deposit_per_bank', parseInt(e.target.value))} className="w-full h-12 bg-white rounded-xl px-4 font-black text-slate-900 border-2 border-transparent focus:border-blue-500 outline-none shadow-sm" /></div>
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">매칭 지원율 (예: 1.0 = 100%)</label><input type="number" step="0.1" value={selectedConfig.matching_support_rate} onChange={(e) => updateConfigField(selectedConfig.id, 'matching_support_rate', parseFloat(e.target.value))} className="w-full h-12 bg-white rounded-xl px-4 font-black text-slate-900 border-2 border-transparent focus:border-blue-500 outline-none shadow-sm" /></div>
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">이자 소득 세율 (예: 0.0 = 비과세)</label><input type="number" step="0.001" value={selectedConfig.tax_rate} onChange={(e) => updateConfigField(selectedConfig.id, 'tax_rate', parseFloat(e.target.value))} className="w-full h-12 bg-white rounded-xl px-4 font-black text-slate-900 border-2 border-transparent focus:border-blue-500 outline-none shadow-sm" /></div>
                  </div>
                </div>
              </div>
            ) : <div className="h-[60vh] flex flex-col items-center justify-center text-center px-6"><History size={48} className="text-slate-100 mb-4" /><h3 className="text-lg font-black text-slate-300">설정을 선택해 주세요.</h3></div>
          ) : step === 'branches' ? (
            selectedBranch ? (
              <div className="max-w-3xl mx-auto space-y-10 pb-20">
                <header><div className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-widest mb-1"><LayoutGrid size={12} /> Editing Branch Rule</div><h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{selectedBranch.name}</h2></header>
                <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 relative group">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">ID (식별자)</label><input type="text" value={selectedBranch.id} onChange={(e) => updateBranchField(selectedBranch.id_int, 'id', e.target.value)} className="w-full h-12 bg-white rounded-xl px-4 font-black text-slate-900 border-2 border-transparent focus:border-blue-500 outline-none shadow-sm" /></div>
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">이름 (표시용)</label><input type="text" value={selectedBranch.name} onChange={(e) => updateBranchField(selectedBranch.id_int, 'name', e.target.value)} className="w-full h-12 bg-white rounded-xl px-4 font-black text-slate-900 border-2 border-transparent focus:border-blue-500 outline-none shadow-sm" /></div>
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">최대 복무 기간 (개월)</label><input type="number" value={selectedBranch.max_months} onChange={(e) => updateBranchField(selectedBranch.id_int, 'max_months', parseInt(e.target.value))} className="w-full h-12 bg-white rounded-xl px-4 font-black text-slate-900 border-2 border-transparent focus:border-blue-500 outline-none shadow-sm" /></div>
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">적용 시작일</label><input type="date" value={selectedBranch.effective_day} onChange={(e) => updateBranchField(selectedBranch.id_int, 'effective_day', e.target.value)} className="w-full h-12 bg-white rounded-xl px-4 font-black text-slate-900 border-2 border-transparent focus:border-blue-500 outline-none shadow-sm" /></div>
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">정렬 순서</label><input type="number" value={selectedBranch.display_order} onChange={(e) => updateBranchField(selectedBranch.id_int, 'display_order', parseInt(e.target.value))} className="w-full h-12 bg-white rounded-xl px-4 font-black text-slate-900 border-2 border-transparent focus:border-blue-500 outline-none shadow-sm" /></div>
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">내부 번호</label><input type="text" value={selectedBranch.id_int > 0 ? selectedBranch.id_int : 'New'} readOnly className="w-full h-12 bg-slate-100 rounded-xl px-4 font-bold text-slate-400 outline-none shadow-sm cursor-not-allowed" /></div>
                  </div>
                </div>
              </div>
            ) : <div className="h-[60vh] flex flex-col items-center justify-center text-center px-6"><History size={48} className="text-slate-100 mb-4" /><h3 className="text-lg font-black text-slate-300">목록에서 군 정보를 선택해 주세요.</h3></div>
          ) : step === 'bank_manager' ? (
            currentBank ? (
              <div className="max-w-3xl mx-auto space-y-10 pb-20">
                <header><div className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-widest mb-1"><Building2 size={12} /> Editing Bank Info</div><h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{currentBank.name}</h2></header>
                <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">은행 ID (영문/식별자)</label><input type="text" value={currentBank.id} onChange={(e) => updateBankField(currentBank.id, 'id', e.target.value)} className="w-full h-12 bg-white rounded-xl px-4 font-black text-slate-900 border-2 border-transparent focus:border-blue-500 outline-none shadow-sm" /></div>
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">은행 이름</label><input type="text" value={currentBank.name} onChange={(e) => updateBankField(currentBank.id, 'name', e.target.value)} className="w-full h-12 bg-white rounded-xl px-4 font-black text-slate-900 border-2 border-transparent focus:border-blue-500 outline-none shadow-sm" /></div>
                    <div className="space-y-1.5 sm:col-span-2"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">공식 홈페이지/안내 링크</label><input type="text" value={currentBank.link} onChange={(e) => updateBankField(currentBank.id, 'link', e.target.value)} className="w-full h-12 bg-white rounded-xl px-4 font-black text-slate-900 border-2 border-transparent focus:border-blue-500 outline-none shadow-sm" /></div>
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">정렬 순서</label><input type="number" value={currentBank.display_order ?? 0} onChange={(e) => updateBankField(currentBank.id, 'display_order', parseInt(e.target.value))} className="w-full h-12 bg-white rounded-xl px-4 font-black text-slate-900 border-2 border-transparent focus:border-blue-500 outline-none shadow-sm" /></div>
                    <div className="space-y-4 pt-4 sm:col-span-2 border-t border-slate-200/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-black text-slate-800">앱 내 표시 여부</p>
                          <p className="text-[11px] font-bold text-slate-400">꺼두면 사용자에게 이 은행이 보이지 않아요.</p>
                        </div>
                        <button 
                          onClick={() => updateBankField(currentBank.id, 'isActive', !(currentBank.isActive ?? true))}
                          className={`w-14 h-8 rounded-full transition-all relative ${currentBank.isActive !== false ? 'bg-blue-600' : 'bg-slate-300'}`}
                        >
                          <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${currentBank.isActive !== false ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : <div className="h-[60vh] flex flex-col items-center justify-center text-center px-6"><History size={48} className="text-slate-100 mb-4" /><h3 className="text-lg font-black text-slate-300">목록에서 은행을 선택해 주세요.</h3></div>
          ) : selectedVersion ? (
            <div className="max-w-3xl mx-auto space-y-10 pb-20">
              <header>
                <div className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-widest mb-1"><Edit3 size={12} /> Editing Mode</div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{currentBank?.name}</h2>
                    <a href={currentBank?.link} target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-lg transition-colors"><ExternalLink size={18} /></a>
                  </div>

                </div>
              </header>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">시행 시작일</label>
                  <div className="relative group">
                    <input 
                      type="date" 
                      value={selectedVersion.effectiveDate} 
                      onChange={(e) => updateVersionField('effectiveDate', e.target.value)} 
                      className="w-full h-12 bg-white rounded-xl px-4 font-black text-slate-900 border-2 border-transparent focus:border-blue-500 outline-none shadow-sm" 
                    />
                  </div>
                </div>
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
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">ID</label><input value={pr.id} onChange={(e) => { const nd = [...selectedVersion.primeRates]; nd[pIdx].id = e.target.value; updateVersionField('primeRates', nd); }} className="w-full h-10 bg-slate-50 rounded-lg px-3 text-[11px] font-bold" /></div>
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">그룹</label><input value={pr.group} onChange={(e) => { const nd = [...selectedVersion.primeRates]; nd[pIdx].group = e.target.value; updateVersionField('primeRates', nd); }} className="w-full h-10 bg-slate-50 rounded-lg px-3 text-[11px] font-bold" /></div>
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">이름</label><input value={pr.label} onChange={(e) => { const nd = [...selectedVersion.primeRates]; nd[pIdx].label = e.target.value; updateVersionField('primeRates', nd); }} className="w-full h-10 bg-slate-50 rounded-lg px-3 text-[11px] font-bold" /></div>
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">금리</label><input type="number" step="0.001" value={pr.rate} onChange={(e) => { const nd = [...selectedVersion.primeRates]; nd[pIdx].rate = parseFloat(e.target.value); updateVersionField('primeRates', nd); }} className="w-full h-10 bg-purple-50 text-purple-600 rounded-lg px-3 text-[11px] font-black" /></div>
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">최소 개월수</label><input type="number" value={pr.min_months || ''} onChange={(e) => { const nd = [...selectedVersion.primeRates]; nd[pIdx].min_months = e.target.value ? parseInt(e.target.value) : undefined; updateVersionField('primeRates', nd); }} className="w-full h-10 bg-slate-50 rounded-lg px-3 text-[11px] font-bold" placeholder="없음" /></div>
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">시작일</label><input type="date" value={pr.start_date || ''} onChange={(e) => { const nd = [...selectedVersion.primeRates]; nd[pIdx].start_date = e.target.value || undefined; updateVersionField('primeRates', nd); }} className="w-full h-10 bg-slate-50 rounded-lg px-3 text-[11px] font-bold" /></div>
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">종료일</label><input type="date" value={pr.end_date || ''} onChange={(e) => { const nd = [...selectedVersion.primeRates]; nd[pIdx].end_date = e.target.value || undefined; updateVersionField('primeRates', nd); }} className="w-full h-10 bg-slate-50 rounded-lg px-3 text-[11px] font-bold" /></div>
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
          ) : <div className="h-[60vh] flex flex-col items-center justify-center text-center px-6"><History size={48} className="text-slate-100 mb-4" /><h3 className="text-lg font-black text-slate-300">목록에서 항목을 선택해 주세요.</h3></div>}
        </section>
      </main>
    </div>
  );
};

export default AdminPage;
