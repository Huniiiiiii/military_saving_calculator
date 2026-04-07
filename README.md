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
│   ├── assets/             # 이미지 및 미디어 파일
│   ├── data/
│   │   └── data.json       # 은행별 금리 및 군별 복무 기간 데이터
│   ├── pages/
│   │   ├── Onboarding.tsx  # 온보딩 화면
│   │   ├── InputPage.tsx   # 군 정보 및 납입 계획 입력 화면
│   │   ├── CalculatorPage.tsx # 은행 선택 및 금리 설정 화면
│   │   └── ResultPage.tsx  # 최종 계산 결과 화면
│   ├── App.tsx             # 라우팅 및 전역 상태 관리
│   ├── main.tsx            # 엔트리 포인트
│   └── index.css           # 글로벌 스타일 (Tailwind CSS 포함)
├── tailwind.config.js      # Tailwind CSS 설정
├── vite.config.ts          # Vite 빌드 및 개발 설정
└── tsconfig.json           # TypeScript 설정
```

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
