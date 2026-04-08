import { data } from '../data/data';

export interface PrimeRate {
  id: string;
  group: string;
  label: string;
  rate: number;
  footnotes?: string[];
}

export interface RateVersion {
  id: string;         // 버전 식별자 (예: "2026-04-08")
  effectiveDate: string; // 시행일 (YYYY-MM-DD)
  baseRates: { range: number[]; rate: number }[];
  primeRates: PrimeRate[];
  maxPrimeRate: number;
}

export interface Bank {
  id: string;
  name: string;
  link: string;
  rateVersions: RateVersion[];
}

export interface BoxState {
  bankId: string;
  amount: number;
  selectedPrimeIds: string[];
}

export interface CalcResult {
  principal: number;
  bankInterest: number;
  matchingSupport: number;
  total: number;
  baseRate: number;
  primeRate: number;
  bankName: string;
  bankLink: string;
  selectedPrimes: PrimeRate[];
  isCapped: boolean;
  monthlyAmount: number;
  effectiveDate: string;
}

const { globalConfig, banks } = data;

/**
 * 특정 날짜에 해당하는 금리 버전을 찾습니다.
 * 시행일(effectiveDate)이 입력된 날짜와 가장 가까운(과거) 버전을 반환합니다.
 */
export const getRateVersionForDate = (bank: Bank, date: Date): RateVersion => {
  if (!bank.rateVersions || bank.rateVersions.length === 0) {
    throw new Error(`Bank ${bank.name} has no rate versions.`);
  }

  // 시행일 기준으로 내림차순 정렬
  const sortedVersions = [...bank.rateVersions].sort(
    (a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()
  );
  
  // 입력 날짜보다 이전이거나 같은 시행일 중 가장 최근 것
  const version = sortedVersions.find(v => new Date(v.effectiveDate) <= date);
  
  // 만약 입력 날짜가 모든 시행일보다 이전이라면 가장 오래된 버전을 반환
  return version || sortedVersions[sortedVersions.length - 1];
};

export const getFilteredPrimeRates = (bank: Bank, months: number, version: RateVersion) => {
  const today = new Date();
  const kbeventStartDate = new Date('2026-01-26');
  const kbeventEndDate = new Date('2026-07-25');

  return version.primeRates.filter(prime => {
    // KB Event Period Check
    if (prime.id === 'kb_event') {
      const isPeriodValid = today >= kbeventStartDate && today <= kbeventEndDate;
      return isPeriodValid && months >= 3;
    }
    // KB Card Period Check
    if (prime.id === 'kb_card') {
      return months >= 6;
    }
    // KB 3-month Minimum Period Check
    if (bank.id === 'kb' && (prime.id === 'kb_housing' || prime.id === 'kb_social_vulnerable')) {
      return months >= 3;
    }
    // IBK 12-month Minimum Period Check
    if (prime.id === 'ib_salary') {
      return months >= 12;
    }
    // Hana 3-month Minimum Period Check
    if (prime.id === 'hana_salary' || prime.id === 'hana_housing') {
      return months >= 3;
    }
    return true;
  });
};

export const calculateResult = (boxState: BoxState, months: number, openingDate: Date = new Date()): CalcResult => {
  const bank = (banks as unknown as Bank[]).find(b => b.id === boxState.bankId);
  
  if (!bank) {
    const principal = boxState.amount * months;
    const matchingSupport = Math.floor(principal * globalConfig.matchingSupportRate);
    return { 
      principal, 
      bankInterest: 0, 
      matchingSupport, 
      total: principal + matchingSupport, 
      baseRate: 0,
      primeRate: 0,
      bankName: '',
      bankLink: '',
      selectedPrimes: [],
      isCapped: false,
      monthlyAmount: boxState.amount,
      effectiveDate: ''
    };
  }

  const version = getRateVersionForDate(bank, openingDate);
  const baseRateObj = version.baseRates.find(r => months >= r.range[0] && months <= r.range[1]);
  const baseRate = baseRateObj ? baseRateObj.rate : 0.05;
  
  const filteredPrimes = getFilteredPrimeRates(bank, months, version);
  const selectedPrimes = filteredPrimes.filter(p => boxState.selectedPrimeIds.includes(p.id));
  const totalSelectedPrime = selectedPrimes.reduce((sum, p) => sum + p.rate, 0);
  const appliedPrimeRate = Math.min(totalSelectedPrime, version.maxPrimeRate);
  
  let bankInterest = 0;
  for (let i = 1; i <= months; i++) {
    const remainingMonths = months - i + 1;
    bankInterest += boxState.amount * (remainingMonths / 12) * (baseRate + appliedPrimeRate);
  }
  bankInterest = Math.floor(bankInterest);
  const principal = boxState.amount * months;
  const matchingSupport = Math.floor(principal * globalConfig.matchingSupportRate);
  const totalMaturity = principal + bankInterest + matchingSupport;

  return { 
    principal, 
    bankInterest, 
    matchingSupport, 
    total: totalMaturity, 
    baseRate,
    primeRate: appliedPrimeRate,
    bankName: bank.name,
    bankLink: bank.link,
    selectedPrimes,
    isCapped: totalSelectedPrime > version.maxPrimeRate,
    monthlyAmount: boxState.amount,
    effectiveDate: version.effectiveDate
  };
};

