# 국영수 학원 시간표 관리 시스템

학원 학생 등록 및 시간표 자동 생성 웹 애플리케이션입니다.

## 기능

### 학생 관리
- 학생 이름과 부반(초등부/중등부/고등부) 선택
- 등록된 학생 목록 조회

### 선생님 선택
- 선택한 학생의 과목별 선생님 지정
- 초등부/중등부: 국어, 영어, 수학
- 고등부: 영어만 수강

### 자동 시간표 생성
- 선생님 선택 후 시간표 자동 생성
- 부반별 시간대:
  - 초등부: 14:00 ~ 18:00 (2시 ~ 6시)
  - 중등부: 17:00 ~ 21:00 (5시 ~ 9시)
  - 고등부: 월/화 18:00 ~ 21:00 (6시 ~ 9시) - 영어만

### 선생님 구성
- 국어: 1명
- 영어: 4명
- 수학: 2명

## 기술 스택

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: CSS-in-JS
- **State Management**: React Hooks
- **Storage**: localStorage (구글 시트 연동 예정)

## 설치 및 실행

### 필수 요구사항
- Node.js 16 이상
- npm

### 설치
```bash
cd academy-schedule
npm install
```

### 개발 서버 실행
```bash
npm run dev
```

브라우저에서 `http://localhost:5173` 접속

### 빌드
```bash
npm run build
```

## 프로젝트 구조

```
academy-schedule/
├── src/
│   ├── components/
│   │   ├── StudentManager.tsx      # 학생 관리 컴포넌트
│   │   ├── TeacherSelector.tsx     # 선생님 선택 컴포넌트
│   │   └── ScheduleDisplay.tsx     # 시간표 표시 컴포넌트
│   ├── utils/
│   │   └── scheduleGenerator.ts    # 시간표 생성 로직
│   ├── types.ts                    # TypeScript 타입 정의
│   ├── App.tsx                     # 메인 앱 컴포넌트
│   ├── main.tsx                    # 진입점
│   ├── App.css                     # 앱 스타일
│   └── index.css                   # 글로벌 스타일
├── package.json
├── tsconfig.json
├── vite.config.ts
└── index.html
```

## 사용 방법

1. **학생 추가**
   - 좌측 패널에서 학생 이름 입력
   - 부반 선택 (초등부/중등부/고등부)
   - "학생 추가" 클릭

2. **선생님 선택**
   - 학생 목록에서 학생 클릭
   - 중앙 패널에서 각 과목의 선생님 선택
   - 모든 과목을 선택한 후 "시간표 생성" 클릭

3. **시간표 확인**
   - 우측 패널에서 생성된 시간표 확인
   - 월~금, 시간대별로 수강 과목 및 선생님 표시

## 데이터 저장

현재는 브라우저의 localStorage에 데이터 저장됨
- `students`: 등록된 학생 정보
- `teachers`: 선생님 정보

## 향후 개선 사항

- [ ] Google Sheets API 연동
- [ ] 사용자 로그인/회원가입
- [ ] 시간표 저장 및 다운로드
- [ ] 시간표 충돌 감지 및 경고
- [ ] 모바일 반응형 디자인 개선
- [ ] 다크 모드 지원
