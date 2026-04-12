export interface GlobalConfig {
  id: number;
  max_total_monthly_deposit: number;
  max_deposit_per_bank: number;
  matching_support_rate: number;
  tax_rate: number;
  version: string;
  effective_day_config: string;
}

// Helper to get effective config for a given date
export const getEffectiveConfig = (configs: GlobalConfig[], date: string): GlobalConfig => {
  // Sort by effective_day_config DESC to find the latest version <= date
  const sorted = [...configs].sort((a, b) => b.effective_day_config.localeCompare(a.effective_day_config));
  const effective = sorted.find(c => c.effective_day_config <= date);
  return effective || configs[configs.length - 1];
};

/**
 * 전역일 계산: 입대일과 복무 기간(개월)을 기반으로 계산
 * 공식: 입대일 + 복무기간 - 1일
 */
export const calculateDischargeDate = (enlistmentDate: string, serviceMonths: number): Date => {
  const date = new Date(enlistmentDate);
  date.setMonth(date.getMonth() + serviceMonths);
  date.setDate(date.getDate() - 1);
  return date;
};

/**
 * 달력 기준 납입 개월 수 계산
 * 공식: (전역월 - 시작월) + 1
 */
export const calculateCalendarMonths = (startDate: Date, dischargeDate: Date): number => {
  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth();
  const endYear = dischargeDate.getFullYear();
  const endMonth = dischargeDate.getMonth();
  
  return (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
};

export interface PrimeRate {
  id: string;
  group: string;
  label: string;
  rate: number;
  footnotes?: string[];
  min_months?: number;
  start_date?: string;
  end_date?: string;
}

export interface RateVersion {
  id: string;
  effectiveDate: string;
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

/**
 * 특정 날짜에 해당하는 금리 버전을 찾습니다.
 */
export const getRateVersionForDate = (bank: Bank, date: Date): RateVersion => {
  if (!bank.rateVersions || bank.rateVersions.length === 0) {
    throw new Error(`Bank ${bank.name} has no rate versions.`);
  }

  const sortedVersions = [...bank.rateVersions].sort(
    (a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()
  );
  
  const version = sortedVersions.find(v => new Date(v.effectiveDate) <= date);
  return version || sortedVersions[sortedVersions.length - 1];
};

/**
 * 은행 및 개월 수에 따른 유효한 우대금리 목록을 필터링합니다.
 */
export const getFilteredPrimeRates = (_bank: Bank, months: number, version: RateVersion) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return version.primeRates.filter(prime => {
    // 1. 최소 개월 수 조건 확인
    if (prime.min_months && months < prime.min_months) {
      return false;
    }

    // 2. 이벤트 기간 조건 확인 (시작일)
    if (prime.start_date) {
      const startDate = new Date(prime.start_date);
      startDate.setHours(0, 0, 0, 0);
      if (today < startDate) return false;
    }

    // 3. 이벤트 기간 조건 확인 (종료일)
    if (prime.end_date) {
      const endDate = new Date(prime.end_date);
      endDate.setHours(23, 59, 59, 999);
      if (today > endDate) return false;
    }

    return true;
  });
};

/**
 * 최종 수령액 및 금리 상세를 계산합니다.
 */
export const calculateResult = (
  boxState: BoxState, 
  months: number, 
  openingDate: Date, 
  banks: Bank[], 
  config: GlobalConfig
): CalcResult => {
  const bank = banks.find(b => b.id === boxState.bankId);
  
  if (!bank) {
    const principal = boxState.amount * months;
    const matchingSupport = Math.floor(principal * (config?.matching_support_rate || 1.0));
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
  
  // Apply tax
  const tax = bankInterest * (config?.tax_rate || 0);
  const netBankInterest = Math.floor(bankInterest - tax);

  const principal = boxState.amount * months;
  // Matching support is based on principal only
  const matchingSupport = Math.floor(principal * (config?.matching_support_rate || 1.0));
  const totalMaturity = principal + netBankInterest + matchingSupport;

  return { 
    principal, 
    bankInterest: netBankInterest, 
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
