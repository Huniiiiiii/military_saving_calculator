import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronDown, 
  MessageCircle, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  Zap, 
  Landmark, 
  Calendar, 
  Info, 
  PieChart,
  Wallet,
  Trophy,
  HelpCircle
} from 'lucide-react';
import ReactGA from 'react-ga4';
import inquiryData from '../data/inquiry.json';

interface InquiryPageProps {
  onBack: () => void;
}

type TabType = 'intro' | 'qa_tab' | 'inquiry' | 'advantages';

const InquiryPage: React.FC<InquiryPageProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<TabType>('intro');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  
  const handleKakaoClick = () => {
    if (import.meta.env.PROD) {
      ReactGA.event({
        category: 'Inquiry',
        action: 'kakao_chat_click',
        label: '카카오톡 문의'
      });
    }
    window.open('http://pf.kakao.com/_vEnxlX/chat', '_blank');
  };

  const renderIntro = () => (
    <div className="space-y-6 pb-10">
      <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl shadow-slate-200 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
        <div className="relative z-10 text-center py-4">
          <h3 className="text-2xl font-black mb-3 whitespace-pre-wrap">{inquiryData.intro.headline}</h3>
          <p className="text-slate-300 font-bold leading-relaxed break-keep">{inquiryData.intro.subHeadline}</p>
        </div>
      </div>
      <h3 className="text-lg font-black text-slate-900 px-1 flex items-center gap-2 pt-4">
        <PieChart size={20} className="text-slate-900" />
        저희는 이렇게 도와드려요
      </h3>
      <div className="grid grid-cols-1 gap-4">
        {inquiryData.coreValues.map((val, i) => {
          const icons = [Calendar, Landmark, ShieldCheck, Zap];
          const Icon = icons[i];
          return (
            <div key={val.id} className="bg-white p-6 rounded-3xl flex items-start gap-5 border border-slate-100 shadow-sm">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-slate-50 text-slate-900">
                <Icon size={24} />
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-base mb-1">{val.title}</h4>
                <p className="text-slate-400 text-[13px] font-medium leading-normal break-keep">{val.content}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderFaqSection = (title: string, items: { id: string, question: string, answer: string }[]) => (
    <div className="space-y-4 mb-10">
      <h3 className="text-lg font-black text-slate-900 px-1 flex items-center gap-2 pt-4">
        <Info size={20} className="text-slate-900" />
        {title}
      </h3>
      {items.map((item) => {
        const isExpanded = expandedFaq === item.id;
        return (
          <div key={item.id} className={`bg-white rounded-3xl border transition-all duration-300 overflow-hidden cursor-pointer ${isExpanded ? 'border-slate-900 shadow-md ring-1 ring-slate-50' : 'border-slate-100 shadow-sm hover:border-slate-200'}`} onClick={() => setExpandedFaq(isExpanded ? null : item.id)}>
            <div className="p-6">
              <div className="flex justify-between items-start">
                <h4 className="text-base font-black text-slate-900 leading-snug pr-4">{item.question}</h4>
                <div className={`mt-1 p-1 rounded-full ${isExpanded ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400'}`}>
                  {isExpanded ? <ChevronDown size={18} className="rotate-180" /> : <ChevronDown size={18} />}
                </div>
              </div>
              <AnimatePresence>
                {isExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="mt-4 pt-4 border-t border-slate-50">
                      <p className="text-[14px] text-slate-500 font-medium leading-relaxed break-keep">{item.answer}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderAdvantages = () => (
    <div className="space-y-6 pb-10">
      <div className="bg-slate-100 rounded-[2.5rem] p-8 text-slate-900 shadow-sm border border-slate-200 relative overflow-hidden">
        <div className="absolute right-[-20px] bottom-[-20px] opacity-5"><Wallet size={160} /></div>
        <div className="relative z-10">
          <h3 className="text-2xl font-black mb-2 flex items-center gap-3">
            <Trophy size={28} />
            군적금 똑똑이만의 장점
          </h3>
          <p className="text-slate-400 font-bold leading-relaxed break-keep">단순히 숫자만 보여주는 게 아니에요.<br />장병님께 가장 든든한 금융 파트너가 될게요.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 pt-4">
        {inquiryData.advantages.map((adv) => (
          <div key={adv.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-start gap-5">
            <div className="w-12 h-12 bg-slate-50 text-slate-900 rounded-2xl flex items-center justify-center shrink-0"><CheckCircle2 size={24} /></div>
            <div>
              <h4 className="font-black text-slate-900 text-base mb-1">{adv.title}</h4>
              <p className="text-slate-400 text-[13px] font-medium leading-normal break-keep">{adv.content}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderInquiry = () => {
    return (
      <div className="space-y-8 pb-10 pt-4 flex flex-col items-center">
        <div className="w-24 h-24 bg-slate-100 rounded-[2.5rem] flex items-center justify-center text-slate-900 mb-2">
          <MessageCircle size={48} />
        </div>
        
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-black text-slate-900">도움이 필요하신가요?</h2>
          <p className="text-slate-500 font-bold leading-relaxed break-keep">
            궁금한 점이나 서비스 제안이 있다면<br />
            카카오톡 1:1 채팅으로 언제든 문의해 주세요.
          </p>
        </div>

        <div className="w-full space-y-4 pt-4">
          <button 
            onClick={handleKakaoClick}
            className="w-full h-20 bg-slate-900 text-white rounded-3xl font-black text-lg shadow-xl shadow-slate-200 flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
          >
            <MessageCircle size={24} />
            카카오톡으로 문의하기
          </button>
          
          <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
            <h4 className="text-sm font-black text-slate-900 mb-3 flex items-center gap-2">
              <Sparkles size={16} />
              이런 내용을 보내주세요
            </h4>
            <ul className="space-y-2.5">
              {[
                '서비스 이용 중 발생한 오류 제보',
                '추가되었으면 하는 새로운 기능 제안',
                '계산 결과에 대한 궁금한 점',
                '기타 모든 서비스 관련 의견'
              ].map((text, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[13px] text-slate-500 font-medium leading-tight">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 shrink-0" />
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 font-bold text-center leading-relaxed flex items-center gap-1.5 justify-center">
          <HelpCircle size={14} />
          채팅 상담은 순차적으로 확인 후 답변해 드리고 있습니다.
        </p>
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="min-h-screen bg-[#F8FAFF] flex flex-col items-center">
      <div className="w-full max-w-[480px] h-screen flex flex-col relative bg-[#F8FAFF] sm:shadow-[0_0_80px_rgba(0,0,0,0.03)] overflow-hidden">
        
        <header className="shrink-0 h-16 px-4 flex items-center justify-between bg-[#F8FAFF] z-40 border-b border-slate-200 shadow-sm">
          <button onClick={onBack} className="p-2 text-slate-900"><ChevronLeft size={28} strokeWidth={2.5} /></button>
          <h1 className="text-[17px] font-bold text-slate-900">문의 및 제안</h1>
          <div className="w-10" />
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="px-6 pt-10 pb-6 bg-[#F8FAFF]">
            <h2 className="text-[28px] font-black text-slate-900 tracking-tight leading-tight">무엇을 도와드릴까요?</h2>
            <p className="text-slate-400 font-bold mt-2 text-sm">군적금 똑똑이에 대한 궁금증을 해결해 보세요.</p>
          </div>

          <div className="sticky top-0 bg-[#F8FAFF]/95 backdrop-blur-sm border-b border-slate-100 z-30 px-3">
            <div className="flex">
              {[
                { id: 'intro', label: '기능소개' },
                { id: 'qa_tab', label: 'Q/A' },
                { id: 'advantages', label: '장점' },
                { id: 'inquiry', label: '문의' }
              ].map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as TabType)} className={`relative flex-1 py-5 text-[14px] font-black transition-colors ${activeTab === tab.id ? 'text-slate-900' : 'text-slate-400'}`}>
                  {tab.label}
                  {activeTab === tab.id && <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-6 right-6 h-[3px] bg-slate-900 rounded-t-full" />}
                </button>
              ))}
            </div>
          </div>

          <div className="px-5 pt-8 pb-10">
            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                {activeTab === 'intro' && renderIntro()}
                {activeTab === 'qa_tab' && (
                  <>
                    {renderFaqSection(inquiryData.militarySavingsFAQ.title, inquiryData.militarySavingsFAQ.items)}
                    {renderFaqSection(inquiryData.serviceFAQ.title, inquiryData.serviceFAQ.items)}
                    <div className="mt-4 text-center pb-10">
                      <p className="text-[12px] text-slate-400 font-bold mb-4">원하시는 답변을 찾지 못하셨나요?</p>
                      <button onClick={() => setActiveTab('inquiry')} className="w-full h-14 bg-white border-2 border-slate-100 rounded-2xl flex items-center justify-center gap-2 text-slate-900 font-bold text-[14px] hover:border-slate-900 hover:bg-slate-50 transition-all shadow-sm active:scale-[0.98]">
                        <MessageCircle size={18} />
                        1:1 문의하기
                      </button>
                    </div>
                  </>
                )}
                {activeTab === 'inquiry' && renderInquiry()}
                {activeTab === 'advantages' && renderAdvantages()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default InquiryPage;
