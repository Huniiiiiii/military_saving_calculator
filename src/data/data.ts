export const data = {
  "version": "2026-03-31",
  "globalConfig": {
    "maxTotalMonthlyDeposit": 550000,
    "maxDepositPerBank": 300000,
    "matchingSupportRate": 1.0,
    "taxRate": 0.0
  },
  "militaryBranches": [
    { "id": "army", "name": "육군·해병대·상근예비역", "maxMonths": 18 },
    { "id": "navy", "name": "해군", "maxMonths": 20 },
    { "id": "airforce", "name": "공군·사회복무요원", "maxMonths": 21 },
    { "id": "alternative", "name": "대체복무요원", "maxMonths": 24 }
  ],
  "banks": [
{
      "id": "kb",   
      "name": "KB국민은행",
      "link": "https://obank.kbstar.com/quics?page=C016613&cc=b061496:b061645&isNew=N&prcode=DP01000939#loading",
      "baseRates": [
        { "range": [1, 11], "rate": 0.040 },
        { "range": [12, 14], "rate": 0.045 },
        { "range": [15, 24], "rate": 0.050 }
      ],
      "primeRates": [
        { 
	  "id": "kb_housing", "group": "housing", "label": "주택청약", "rate": 0.010,
	  "footnotes": ["적금 만기일의 전전월 말일을 기준으로, 고객이 KB국민은행 주택청약종합 저축(청년 주택드림 청약통장 포함) 계좌를 보유한 경우"]
	},
	{ 
          "id": "kb_card", "group": "kbcard", "label": "KB카드사용 6개월", "rate": 0.005, 
          "footnotes": ["적금 신규월 초일부터 만기일 전전월 말일까지 본인명의 KB국민은행 입출금통장에서 KB국민(신용/체크/BC)카드 결제대금출금(현금서비스 포함)이 발생한 월이 6개월 이상인 경우"]
        },
	{ "id": "kb_social_vulnerable", "group": "kb_social_vulnerable", "label": "기초생활수급자", "rate": 0.030,
	  "footnotes": ["적금 만기일의 전전월 말일을 기준으로 본인 명의 ‘수급자증명서’ 또는 ‘사회보장급여 중지통지서(중지사유:군입대)’를 영업점에 제출한 경우"]
	},
	{ "id": "kb_event", "group": "kb_event", "label": "KB Youth Club(밀리터리클럽)가입", "rate": 0.010,
	  "footnotes": ["2026.1.26~2026.7.25 기간동안 KB장병내일준비적금을 가입한 고객 중 적금 만기일의 전전월 말일을 기준으로 KB Youth Club(밀리터리클럽)에 가입되어 있는 경우"]
	}
      ],
      "maxPrimeRate": 0.055
    },
    {
      "id": "hana",
      "name": "하나은행",
      "link": "https://www.kebhana.com/cont/mall/mall08/mall0801/mall080102/1456099_115157.jsp",
      "baseRates": [
        { "range": [1, 11], "rate": 0.035 },
        { "range": [12, 14], "rate": 0.046 },
        { "range": [15, 24], "rate": 0.050 }
      ],
      "primeRates": [
	{ 
          "id": "hana_housing", "group": "housing", "label": "주택청약", "rate": 0.010, 
          "footnotes": ["이 예금 가입일로부터 3개월이 되는 달의 말일 기준으로 당행 주택청약종합저축을 보유한 경우"]
        },
        { 
          "id": "hana_salary", "group": "salary", "label": "군급여이체 3회/하나카드사용 3회", "rate": 0.010, 
          "footnotes": [
            "이 예금 가입후 만기 전전월의 말일까지 본인명의 하나은행 입출금통장을 통해 3회 이상 군급여 입금실적을 보유하거나, 하나카드(신용/체크) 결제실적이 3회 이상 있을 경우",
            "[급여이체 인정 기준]",
            "국군재정관리단을 통한 급여, 당행 창구 또는 인터넷을 통한 급여이체, 기타 이체방식*(지로대량이체, CMS 대량이체, 타행환, 전자금융)을 통해 '급여', '월급', '상여금' 등의 용어로 입금되는 경우",
            "* 단, 영업점 창구, 자동화기기 입금, 당행간 자동이체 분은 인정되지 않음"
          ]
        },
        
        { "id": "hana_mmaa_savings", "group": "hana_standalone", "label": "군인공제회 회원", "rate": 0.002,
	  "footnotes": ["이 예금 가입후 만기 전전월의 말일을 기준으로 군인공제회 병(兵) 회원 저축 상품 가입(초회납 완료)을 통해 회원 자격을 취득한 경우"]
	},
	{ "id": "hana_social_vulnerable", "group": "hana_social_vulnerable", "label": "기초생활수급자", "rate": 0.030,
	  "footnotes": ["이 예금 가입후 만기 전일까지 하나은행 영업점을 방문하여 ‘기초생활수급자’임을 증빙하는 서류를 제출하는 경우"]
	}
      ],
      "maxPrimeRate": 0.052
    },
{
      "id": "ibk",
      "name": "IBK기업은행",
      "link": "https://mybank.ibk.co.kr/uib/jsp/guest/ntr/ntr70/ntr7010/PNTR701000_i2.jsp?lncd=01&grcd=21&tmcd=121&pdcd=0112#_dummy",
      "baseRates": [
        { "range": [1, 5], "rate": 0.040 },
        { "range": [6, 11], "rate": 0.040 },
	{ "range": [12, 14], "rate": 0.045 },
        { "range": [15, 24], "rate": 0.050 }
      ],
      "primeRates": [
        { 
          "id": "ib_housing", "group": "housing", "label": "주택청약", "rate": 0.004, 
          "footnotes": ["만기 시점에 당행 주택청약종합저축(청년주택드림 청약통장 포함)을 보유한 경우"]
        },
        { 
         "id": "ib_salary", "group": "salary", "label": "군급여이체(10만원 이상) 12회", "rate": 0.012,
          "footnotes": [
            "당행 입출금식 계좌로 급여이체(10만원 이상) 12회 이상 실적이 있는 경우(단, 월 1회 이상 급여실적이 있는 경우 1회로 간주함)",
            "[급여이체 인정 기준]",
            "국군재정관리단을 통한 급여, 당행 창구 또는 인터넷을 통한 급여이체, 기타 이체방식*(지로대량이체, CMS 대량이체, 타행환, 전자금융)을 통해 '급여', '월급', '상여금' 등의 용어로 입금되는 경우",
            "* 단, 영업점 창구, 자동화기기 입금, 당행간 자동이체 분은 인정되지 않음"
          ]
        },
	{ 
          "id": "ib_card", "group": "ib_card", "label": "IBK기업은행 나라사라카드 1회 사용", "rate": 0.003, 
          "footnotes": ["당행 나라사랑카드를 1회 이상 사용한 경우(단, 매출표 접수일 기준)"]
        },
	{ 
          "id": "ib_bank", "group": "ib_bank", "label": "IBK기업은행 적립식상품 신규 가입", "rate": 0.003, 
          "footnotes": ["당행 본인 명의 적립식상품*(장병내일준비적금 제외)을 신규한 경우 * 적금, 펀드, 적립식중금채"]
        },
	{ 
          "id": "ib_social_vulnerable", "group": "ib_social_vulnerable", "label": "기초생활수급자", "rate": 0.030, 
          "footnotes": ["기초생활수급자로 영업점을 방문하여 본인 명의 '수급자 증명서' 또는 '사회보장급여 중지 통지서(중지사유:군입대)'를 제출하는 경우"]
        }
      ],
      "maxPrimeRate": 0.052
    },
    {
      "id": "shinhan",
      "name": "신한은행",
      "link": "https://bank.shinhan.com/index.jsp#020102010110",
      "baseRates": [
        { "range": [1, 5], "rate": 0.035 },
        { "range": [6, 11], "rate": 0.040 },
	      { "range": [12, 14], "rate": 0.045 },
        { "range": [15, 24], "rate": 0.050 }
      ],
      "primeRates": [
	{ 
          "id": "sh_housing", "group": "housing", "label": "주택청약", "rate": 0.010, 
          "footnotes": ["신한은행 ‘주택청약종합저축'(청년우대형 주택청약종합저축포함) 만기일 전일까지 유지한 경우"]
        },
        { 
          "id": "sh_bank", "group": "sh_bank", "label": "매달 신한은행 계좌 50만원이상 입금", "rate": 0.010, 
          "footnotes": ["예금주의 신한은행 입출금통장에 건별 50만원 이상 입금된 월에 이 예금에 입금한 금액에 대해 우대이자율 제공"]
        },
	{ 
          "id": "sh_social_vulnerable", "group": "sh_social_vulnerable", "label": "기초생활수급자", "rate": 0.030, 
          "footnotes": ["적금 만기일이 속한 달의 전전월까지 기초생활수급자로 본인 명의 ‘수급자증명서’ 또는 ‘사회보장급여중지통지서(통지사유 : 군입대)’를 제출한 경우"]
        }
    ],
      "maxPrimeRate": 0.050
    },
    /*
    {
      "id": "woori",
      "name": "우리은행",
      "link": "https://spot.wooribank.com/pot/Dream?withyou=PODEP0019&cc=c007095:c009166;c012263:c012399&PRD_CD=P010002283&PRD_YN=Y",
      "baseRates": [
        { "range": [1, 5], "rate": 0.037 },
        { "range": [6, 11], "rate": 0.040 },
	      { "range": [12, 14], "rate": 0.043 },
        { "range": [15, 24], "rate": 0.050 }
      ],
      "primeRates": [
        { 
          "id": "woori_housing", "group": "housing", "label": "주택청약", "rate": 0.002, 
          "footnotes": ["이 상품의 신규월에 우리은행에서 가입한 주택청약종합저축 상품을 보유한 경우"]
        },
        { 
         "id": "woori_marketing", "group": "woori_marketing", "label": "마케팅 동의 만기시까지 유지", "rate": 0.002,
          "footnotes": [
           "우리은행 상품ㆍ서비스 마케팅 동의항목 중 전화(휴대폰), SMS 항목 중 하나 이상을 동의한 후 만기 해지시점까지 유지한 경우"
          ]
        },
	      { 
          "id": "woori_card", "group": "woori_card", "label": "우리은행카드 매달 1회이상 사용", "rate": 0.002, 
          "footnotes": ["신규월 및 만기월을 제외한 가입기간 동안 우리은행 입출식 계좌에서 우리카드사 신용/체크카드 결제금액이 매월 출금된 실적 보유한 경우"]
        },
	      { 
          "id": "woori_bank", "group": "woori_bank", "label": "우리은행 입출금계좌에서 적금계좌로 자동이체", "rate": 0.004, 
          "footnotes": ["우리은행 입출식 계좌에서 매월 자동이체를 통해 신규월 및 만기월을 제외한 가입기간의 1/2기간 이상 이 적금으로 적립한 경우"]
        }
      ],
      "maxPrimeRate": 0.010
    }
    */
  ]
}
