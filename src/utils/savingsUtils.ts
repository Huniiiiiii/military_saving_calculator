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
  globalConfig: { matchingSupportRate: number }
): CalcResult => {
  const bank = banks.find(b => b.id === boxState.bankId);
  
  if (!bank) {
    const principal = boxState.amount * months;
    const matchingSupport = Math.floor(principal * (globalConfig?.matchingSupportRate || 1.0));
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
  const matchingSupport = Math.floor(principal * (globalConfig?.matchingSupportRate || 1.0));
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
