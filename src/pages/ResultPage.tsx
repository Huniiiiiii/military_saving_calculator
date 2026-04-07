import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Info, TrendingUp, ShieldCheck, Wallet, PieChart, Landmark, ChevronDown, ChevronUp, CheckCircle2, Sparkles } from 'lucide-react';
import ReactGA from 'react-ga4';
import data from '../data/data.json';
import { calculateResult } from '../utils/savingsUtils';
import type { BoxState } from '../utils/savingsUtils';

interface ResultPageProps {
  selectedBranchId: string;
  months: number;
  box1: BoxState;
  box2: BoxState;
  isRecommended?: boolean;
  recommendationInfo?: {
    preference: 'profit' | 'convenience';
    housingBankName: string;
    isSociallyVulnerable: boolean;
  };
  onBack: () => void;
}

const ResultPage: React.FC<ResultPageProps> = ({
  selectedBranchId,
  months,
  box1,
  box2,
  isRecommended,
  recommendationInfo,
  onBack,
}) => {
  const { globalConfig, militaryBranches } = data;
  const [expandedBankIdx, setExpandedBankIdx] = useState<number | null>(null);
  const currentBranch = militaryBranches.find(b => b.id === selectedBranchId) || militaryBranches[0];

  const res1 = calculateResult(box1, months);
  const res2 = calculateResult(box2, months);
  const totalPrincipal = res1.principal + res2.principal;
  const totalInterest = res1.bankInterest + res2.bankInterest;
  const totalMatching = res1.matchingSupport + res2.matchingSupport;
  const grandTotal = totalPrincipal + totalInterest + totalMatching;

  const formatKRW = (val: number) => new Intl.NumberFormat('ko-KR').format(val);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} 
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="min-h-screen bg-[#F8FAFF] flex flex-col items-center"
    >
      <div className="w-full max-w-[480px] min-h-screen flex flex-col relative bg-[#F8FAFF] sm:shadow-[0_0_80px_rgba(0,0,0,0.03)]">
        
        {/* Header */}
        <header className="w-full h-16 px-4 flex items-center justify-between sticky top-0 bg-[#F8FAFF] z-30 border-b border-slate-200 shadow-sm">
          <button onClick={onBack} className="p-2 text-slate-900">
            <ChevronLeft size={28} strokeWidth={2.5} />
          </button>
          <h1 className="text-[17px] font-bold text-slate-900">상세 분석 결과</h1>
          <div className="w-10" />
        </header>

        <div className="flex-1 px-4 pt-4 pb-20">
          <div className="flex justify-between items-center mb-4 ml-1">
            <p className="text-[10px] font-bold text-slate-400">
              내용은 2026.04.01. 기준이에요
            </p>
            {!isRecommended && (
              <div className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-blue-100 flex items-center gap-1">
                📅 {months}개월 납입 조건
              </div>
            )}
          </div>

          {/* Recommended Badge */}
          {isRecommended && (
            <div className="mb-6">
              <div className="mb-2.5 bg-blue-600 rounded-xl p-3 flex items-center gap-2 text-white shadow-lg shadow-blue-200">
                <Sparkles size={18} />
                <span className="text-xs font-black">AI 기반 최적의 조합을 찾았습니다</span>
              </div>
              {recommendationInfo && (
                <div className="flex flex-wrap gap-1.5 ml-1">
                  <div className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-blue-100">
                    📅 {months}개월 납입
                  </div>
                  <div className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-blue-100">
                    {recommendationInfo.preference === 'profit' ? '💰 수익 우선' : '📱 편의 우선'}
                  </div>
                  <div className="bg-slate-100 text-slate-500 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-slate-200">
                    🏠 청약: {recommendationInfo.housingBankName}
                  </div>
                  {recommendationInfo.isSociallyVulnerable && (
                    <div className="bg-purple-50 text-purple-600 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-purple-100">
                      💜 기초생활수급자 우대 적용
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Main Result Card */}
          <div className="bg-[#1A5CFF] rounded-[2.5rem] p-8 text-white shadow-xl shadow-blue-200/50 mb-10 relative overflow-hidden">

            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-blue-100 text-sm font-bold opacity-80">최종 예상 만기 수령액</p>
                <div className="px-2 py-0.5 bg-white/20 rounded-md text-[10px] font-bold">
                  {res1.bankName} + {res2.bankName}
                </div>
              </div>
              <h2 className="text-4xl font-black mb-6">
                {formatKRW(grandTotal)}<span className="text-xl ml-1 font-bold text-blue-100">원</span>
              </h2>
              
              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/20">
                <div>
                  <p className="text-blue-100/70 text-[11px] font-bold mb-1 uppercase tracking-wider">총 납입 원금</p>
                  <p className="text-lg font-black">{formatKRW(totalPrincipal)}원</p>
                </div>
                <div>
                  <p className="text-blue-100/70 text-[11px] font-bold mb-1 uppercase tracking-wider">총 혜택 금액</p>
                  <p className="text-lg font-black">{formatKRW(totalInterest + totalMatching)}원</p>
                </div>
              </div>
            </div>
          </div>

          {/* Breakdown Sections */}
          <div className="space-y-6">
            <h3 className="text-lg font-black text-slate-900 px-1 flex items-center gap-2">
              <PieChart size={20} className="text-blue-600" />
              금액 구성 상세
            </h3>

            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-5">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                    <Wallet size={20} />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-slate-900">원금 총액</p>
                    <p className="text-[11px] text-slate-400 font-medium">{currentBranch.name}</p>
                  </div>
                </div>
                <p className="text-base font-black text-slate-900">{formatKRW(totalPrincipal)}원</p>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500">
                    <TrendingUp size={20} />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-slate-900">은행 이자 합계</p>
                    <p className="text-[11px] text-slate-400 font-medium">비과세 혜택 적용됨</p>
                  </div>
                </div>
                <p className="text-base font-black text-orange-500">+{formatKRW(totalInterest)}원</p>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-500">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-slate-900">정부 매칭지원금</p>
                    <p className="text-[11px] text-slate-400 font-medium">원금의 {globalConfig.matchingSupportRate * 100}% 지원</p>
                  </div>
                </div>
                <p className="text-base font-black text-green-500">+{formatKRW(totalMatching)}원</p>
              </div>
            </div>

            <h3 className="text-lg font-black text-slate-900 px-1 pt-4 flex items-center gap-2">
              <Landmark size={20} className="text-blue-600" />
              은행별 상세 금리 및 우대 조건
            </h3>

            {[res1, res2].map((res, idx) => {
              const isExpanded = expandedBankIdx === idx;
              return (
                <div 
                  key={idx} 
                  className={`bg-white rounded-3xl border transition-all duration-300 overflow-hidden cursor-pointer
                    ${isExpanded ? 'border-blue-200 shadow-md ring-1 ring-blue-50' : 'border-slate-100 shadow-sm hover:border-slate-200'}`}
                  onClick={() => setExpandedBankIdx(isExpanded ? null : idx)}
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mb-2 inline-block ${idx === 0 ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                          은행 {idx === 0 ? 'A' : 'B'}
                        </span>
                        <div className="flex items-center gap-2">
                          <h4 className="text-lg font-black text-slate-900">{res.bankName}</h4>
                          <div className={`p-1 rounded-full ${isExpanded ? 'bg-slate-100' : 'bg-slate-50'}`}>
                            {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                          </div>
                        </div>
                        <p className="text-[11px] font-bold text-slate-400 mt-0.5">월 {formatKRW(res.monthlyAmount)}원 납입</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter">최종 적용 금리</p>
                        <p className={`text-2xl font-black ${idx === 0 ? 'text-blue-600' : 'text-purple-600'}`}>
                          {((res.baseRate + res.primeRate) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 py-4 border-y border-slate-50 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500 font-medium">기본 금리 (기본)</span>
                        <span className="text-slate-900 font-bold">{(res.baseRate * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500 font-medium">우대 금리 (선택)</span>
                        <span className="text-green-500 font-bold">+{(res.primeRate * 100).toFixed(1)}%</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mb-4">
                      <span className="text-slate-500 text-xs font-bold">이 은행 만기 이자</span>
                      <span className="text-slate-900 font-black">{formatKRW(res.bankInterest)}원</span>
                    </div>

                    <a 
                      href={res.bankLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="w-full py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-600 text-[12px] font-bold flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors"
                    >
                      <Info size={14} />
                      은행 공식 안내 보기
                    </a>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-6 pt-6 border-t border-dashed border-slate-200">
                            <h5 className="text-[13px] font-black text-slate-800 mb-4 flex items-center gap-2">
                              <CheckCircle2 size={16} className="text-green-500" />
                              적용된 우대금리 상세
                            </h5>
                            
                            {res.selectedPrimes.length > 0 ? (
                              <div className="space-y-4">
                                {res.selectedPrimes.map((prime) => (
                                  <div key={prime.id} className="bg-slate-50 rounded-2xl p-4">
                                    <div className="flex justify-between items-center mb-2">
                                      <span className="text-[12px] font-bold text-slate-900">{prime.label}</span>
                                      <span className="text-[12px] font-black text-blue-600">+{(prime.rate * 100).toFixed(1)}%</span>
                                    </div>
                                    {prime.footnotes && (
                                      <div className="space-y-1.5">
                                        {prime.footnotes.map((note, nIdx) => (
                                          <p key={nIdx} className="text-[10px] text-slate-500 leading-relaxed pl-1 flex gap-1.5">
                                            <span className="text-slate-300">•</span>
                                            {note}
                                          </p>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                                {res.isCapped && (
                                  <div className="p-3 bg-amber-50 rounded-xl flex gap-2 items-center">
                                    <Info size={14} className="text-amber-500 shrink-0" />
                                    <p className="text-[10px] text-amber-700 font-medium leading-tight">
                                      은행 최대 우대금리 한도 적용으로 인해 일부 금리가 조정되었습니다.
                                    </p>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-[11px] text-slate-400 font-medium py-2 text-center">선택된 우대금리 조건이 없습니다.</p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}

            {/* Special Benefits Banner */}
            <div className="bg-slate-900 rounded-3xl p-6 text-white overflow-hidden relative">
              <div className="absolute right-0 bottom-0 opacity-20">
                <ShieldCheck size={120} />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <Info size={18} />
                  </div>
                  <h4 className="font-bold text-base">특별 혜택 안내</h4>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5 shrink-0"></div>
                    <p className="text-[13px] text-slate-300 leading-snug">
                      <strong className="text-white">이자소득 비과세:</strong> 일반 적금과 달리 이자에 대한 세금(15.4%)이 없어요.
                    </p>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5 shrink-0"></div>
                    <p className="text-[13px] text-slate-300 leading-snug">
                      <strong className="text-white">정부 매칭지원금:</strong> 국가에서 납입 원금의 {globalConfig.matchingSupportRate * 100}%를 추가로 지원해줘요.
                    </p>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Button */}
        <div className="sticky bottom-0 left-0 w-full p-4 pb-6 bg-[#F8FAFF] z-30 border-t border-slate-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] flex flex-col items-center gap-3">
          <button 
            onClick={() => {
              if (import.meta.env.PROD) {
                ReactGA.event({
                  category: 'User',
                  action: 'result_back_to_calc_click',
                  label: '다시 계산하기'
                });
              }
              onBack();
            }}
            className="w-full h-14 bg-white border-2 border-slate-200 text-slate-900 rounded-xl font-bold text-base shadow-sm active:scale-[0.98] transition-all"
          >
            다시 계산하기
          </button>

          <a 
            href="https://forms.gle/yN4kUQzbCYbFz59J7"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              if (import.meta.env.PROD) {
                ReactGA.event({
                  category: 'User',
                  action: 'contact_click',
                  label: '문의하기 및 제안'
                });
              }
            }}
            className="flex items-center justify-center gap-1 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <span className="text-[11px] font-bold border-b border-slate-300">문의하기 및 제안</span>
            <ChevronRight size={12} strokeWidth={3} />
          </a>
        </div>
      </div>
    </motion.div>
  );
};

export default ResultPage;
