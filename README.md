# 🇰🇷 장병내일준비적금 계산기 (Military Savings Calculator)

장병내일준비적금의 복잡한 이자 계산과 매칭지원금을 한눈에 확인하고 비교할 수 있는 웹 애플리케이션입니다.

## 🚀 주요 기능

- **맞춤형 계산**: 군별 복무 기간(육군, 해군, 공군 등) 및 입대일에 따른 정확한 만기일 산출
- **은행별 정보 제공**: 시중 5개 은행의 기본 금리 및 우대 금리 조건 정보 제공
- **매칭지원금 자동 계산**: 원금과 이자 외에 정부에서 지원하는 매칭지원금을 실시간으로 계산
- **결과 시각화**: 월별 납입액에 따른 최종 수령액을 직관적인 UI로 제공
- **반응형 디자인**: 모바일 및 데스크탑 환경에 최적화된 사용자 경험

## 🛠 기술 스택

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Animation**: Framer Motion
- **Icons**: Lucide React
- **Deployment & Analytics**: Vercel, Google Analytics 4

## 📁 프로젝트 구조

```text
C:\university_life\군대\military savings calculator\
├── public/                 # 정적 자산 (파비콘, SEO 관련 파일)
├── src/
│   ├── assets/             # 이미지 및 미디어 파일 (온보딩 캐릭터 등)
│   ├── data/
│   │   └── data.json       # 은행별 금리, 우대 조건 및 군별 복무 기간 데이터
│   ├── pages/
│   │   ├── Onboarding.tsx  # 서비스 소개 및 시작 화면
│   │   ├── InputPage.tsx   # 입대일, 복무 군종 등 사용자 정보 입력 화면
│   │   ├── RecommendationPage.tsx # 사용자 성향 기반 최적 은행 조합 분석 화면 (AI 추천)
│   │   ├── CalculatorPage.tsx # 직접 은행을 선택하고 금리를 설정하는 화면
│   │   └── ResultPage.tsx  # 최종 만기 수령액 및 상세 계산 결과 화면
│   ├── utils/
│   │   └── savingsUtils.ts # 복리 이자 계산, 매칭지원금 산출 및 추천 알고리즘 로직
│   ├── App.tsx             # 라우팅 및 전역 상태 관리
│   ├── App.css             # 앱 전용 스타일
│   ├── main.tsx            # React 엔트리 포인트
│   └── index.css           # 글로벌 스타일 (Tailwind CSS 설정 포함)
├── tailwind.config.js      # Tailwind CSS 디자인 시스템 설정
├── vite.config.ts          # Vite 빌드 최적화 및 서버 설정
└── tsconfig.json           # TypeScript 환경 설정
```

## 🧠 주요 로직 및 알고리즘

### 1. AI 최적 조합 추천 (`RecommendationPage.tsx`)
단순한 계산을 넘어, 사용자의 주택청약 보유 여부, 기초생활수급자 해당 여부, 그리고 '수익 우선' vs '편의 우선' 성향을 분석하여 **시중 14개 은행의 데이터를 바탕으로 최적의 2개 은행 조합**을 자동으로 찾아줍니다.

### 2. 정밀한 이자 계산 (`savingsUtils.ts`)
- **월 단위 단리 계산**: 적금 특성에 맞게 납입 회차별 잔존 기간을 계산하여 정밀한 이자를 산출합니다.
- **매칭지원금 계산**: 2025년/2026년 정부 정책에 따른 매칭지원금(원리금의 100%)을 자동 합산합니다.
- **우대 금리 필터링**: 가입 기간(개월 수)에 따라 가입 가능한 우대 금리 항목을 동적으로 필터링하여 정확한 금리를 적용합니다.

## 📊 데이터 구성 (`data.json`)

프로젝트의 핵심 로직은 `src/data/data.json`에 정의된 데이터를 기반으로 동작합니다.
- `globalConfig`: 매칭지원금 비율, 최대 납입 한도 등 정책 데이터
- `militaryBranches`: 군별 복무 기간 데이터
- `banks`: 은행별 금리 정보, 우대 금리 조건 및 상세 설명

## 📦 시작하기

### 설치
```bash
npm install
```

### 개발 서버 실행
```bash
npm run dev
```

### 빌드
```bash
npm run build
```

---
본 프로젝트는 국군 장병들의 효율적인 자산 형성을 돕기 위해 제작되었습니다.
