import { useState, useEffect } from 'react';
import { 
  Play, Sparkles, Terminal, Code2, ArrowRight, Zap, Copy, Check, Table, 
  Eye, X, Award, ArrowRightLeft, GitCommit, CheckCircle2, Target, HelpCircle,
  Layers, ChevronRight, CheckCheck
} from 'lucide-react';

interface ProcessStep {
  step: number;
  title: string;
  desc: string;
}

interface SpotlightExample {
  title: string;
  target_item: string;
  before_snippet: string;
  operation_desc: string;
  after_snippet: string;
  concept_rule: string;
}

interface Alternative {
  label: string;
  code: string;
  full_code?: string;
  effect: string;
  spotlight_example?: SpotlightExample;
  process_flow?: ProcessStep[];
}

interface TableDataInfo {
  columns: string[];
  rows: any[][];
  total_rows: number;
  total_cols: number;
}

interface MethodItem {
  id: string;
  category: string;
  root_object: string;
  method_name: string;
  compare_group: string;
  syntax: string;
  korean_desc: string;
  when_to_use: string;
  pros_cons?: string;
  default_code: string;
  spotlight_example?: SpotlightExample;
  process_flow?: ProcessStep[];
  alternatives: Alternative[];
}

export default function MethodExplorerTab() {
  const [methods, setMethods] = useState<MethodItem[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<MethodItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeAltIndex, setActiveAltIndex] = useState<number | 'default'>('default');
  const [activeAltLabel, setActiveAltLabel] = useState<string>('기본 표준 문법');
  const [userCode, setUserCode] = useState<string>('');
  const [output, setOutput] = useState<string>('');
  const [images, setImages] = useState<string[]>([]);
  const [tableBefore, setTableBefore] = useState<TableDataInfo | null>(null);
  const [tableAfter, setTableAfter] = useState<TableDataInfo | null>(null);
  const [showTableModal, setShowTableModal] = useState<boolean>(false);
  const [modalActiveTab, setModalActiveTab] = useState<'visual-diagram' | 'raw-tables' | 'pipeline'>('visual-diagram');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showTopBar, setShowTopBar] = useState(true);
  const [showMethodList, setShowMethodList] = useState(true);

  useEffect(() => {
    fetch('./api/method-explorer')
      .then((res) => res.json())
      .then((data) => {
        if (data.methods && data.methods.length > 0) {
          setMethods(data.methods);
          setSelectedMethod(data.methods[0]);
          setUserCode(data.methods[0].default_code);
          setActiveAltIndex('default');
          setActiveAltLabel('기본 표준 문법');
          handleRunCode(data.methods[0].default_code);
        }
      })
      .catch((err) => {
        console.error('Failed to load method explorer:', err);
      });
  }, []);

  const handleSelectMethod = (m: MethodItem, autoRun: boolean = true) => {
    setSelectedMethod(m);
    setUserCode(m.default_code);
    setActiveAltIndex('default');
    setActiveAltLabel('기본 표준 문법');
    setOutput('');
    setImages([]);
    setStatusMsg(null);
    if (autoRun) {
      handleRunCode(m.default_code);
    }
  };

  const handleRunCode = async (codeToRun?: string) => {
    const code = codeToRun || userCode;
    setIsLoading(true);
    setStatusMsg(null);
    setOutput('🐍 Python 커널 실행 중...');

    try {
      const res = await fetch('./api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.success) {
        setOutput(data.stdout || '(출력 결과 없음)');
        setImages(data.images || []);
        setTableBefore(data.table_before || null);
        setTableAfter(data.table_after || null);
        setStatusMsg({
          type: 'success',
          text: `⚡ 실행 완료 (${data.elapsed_ms || 0}ms)` + (data.images?.length ? ` · 차트 ${data.images.length}개 생성됨` : '')
        });
      } else {
        setOutput((data.stdout ? data.stdout + '\n\n' : '') + (data.stderr || '실행 오류 발생'));
        setImages(data.images || []);
        setStatusMsg({ type: 'error', text: '❌ 실행 중 에러 또는 예외 발생' });
      }
    } catch (err: any) {
      setOutput('서버 통신 실패: ' + err.message);
      setStatusMsg({ type: 'error', text: '❌ 백엔드 API 요청 실패' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyAlternative = (alt: Alternative, idx: number) => {
    setActiveAltIndex(idx);
    setActiveAltLabel(alt.label);

    let newCode = userCode;
    if (alt.full_code && alt.full_code.trim()) {
      newCode = alt.full_code;
    } else if (selectedMethod) {
      newCode = `import pandas as pd
import numpy as np
df = pd.read_csv('data/smd_process_log.csv')

# 실행 1줄:
res = ${alt.code}

print("=== [🔥 ${alt.label}] 실행 결과 ===")
print(res)
`;
    }
    setUserCode(newCode);
    handleRunCode(newCode);
  };

  const handleResetToDefault = () => {
    if (!selectedMethod) return;
    setActiveAltIndex('default');
    setActiveAltLabel('기본 표준 문법');
    setUserCode(selectedMethod.default_code);
    handleRunCode(selectedMethod.default_code);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(userCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const categories = ['all', ...Array.from(new Set(methods.map((m) => m.category)))];
  const filteredMethods = selectedCategory === 'all'
    ? methods
    : methods.filter((m) => m.category === selectedCategory);

  // Active step flow calculation
  const currentProcessFlow: ProcessStep[] = (() => {
    if (!selectedMethod) return [];
    if (activeAltIndex === 'default') {
      return selectedMethod.process_flow || [];
    }
    const alt = selectedMethod.alternatives?.[activeAltIndex as number];
    return alt?.process_flow || selectedMethod.process_flow || [];
  })();

  // Active spotlight sample tracking
  const currentSpotlight: SpotlightExample | undefined = (() => {
    if (!selectedMethod) return undefined;
    if (activeAltIndex === 'default') {
      return selectedMethod.spotlight_example;
    }
    const alt = selectedMethod.alternatives?.[activeAltIndex as number];
    return alt?.spotlight_example || selectedMethod.spotlight_example;
  })();

  // Helper to detect transformation type for rich diagram
  const getTransformVisualMeta = () => {
    const id = selectedMethod?.id || '';
    const label = activeAltLabel || '';

    if (id.includes('fillna') || label.includes('fillna') || label.includes('Imputer')) {
      return {
        type: 'merge-fill',
        title: '결측 셀(NaN) ➔ 통계치(Median) 주입 변환도',
        desc: '비어있는 N개 결측 셀이 하나의 대표 통계값(28.0)으로 채워져 단일화됩니다.',
        badgeColor: 'from-amber-500 to-emerald-500',
        beforeCells: [
          { label: 'PCB_ID#0 (장착오차)', val: '22.0', status: 'normal' },
          { label: 'PCB_ID#5 (장착오차)', val: 'NaN (결측)', status: 'missing' },
          { label: 'PCB_ID#17 (장착오차)', val: 'NaN (결측)', status: 'missing' },
          { label: 'PCB_ID#26 (장착오차)', val: 'NaN (결측)', status: 'missing' }
        ],
        operatorText: '중앙값(Median: 28.0) 대입',
        afterCells: [
          { label: 'PCB_ID#0 (정상 유지)', val: '22.0', status: 'normal' },
          { label: 'PCB_ID#5 (28.0 채움)', val: '28.0', status: 'filled' },
          { label: 'PCB_ID#17 (28.0 채움)', val: '28.0', status: 'filled' },
          { label: 'PCB_ID#26 (28.0 채움)', val: '28.0', status: 'filled' }
        ],
        mergeSummary: '4개 셀 중 결측되었던 3개 셀이 단일 중앙값 28.0으로 일괄 흡수·채움 완료'
      };
    }

    if (id.includes('lambda') || id.includes('apply') || id.includes('map') || label.includes('select')) {
      return {
        type: 'multi-to-one',
        title: '다중 컬럼 [Sex + Age] 영역 ➔ 1개 파생 범주 셀로 통합',
        desc: '기존에 분리되어 있던 성별과 장착오차 셀 영역이 조건 판정을 거쳐 1개의 파생 컬럼 셀로 압축 결합됩니다.',
        badgeColor: 'from-purple-500 to-indigo-500',
        beforeCells: [
          { label: '행#0 [Sex, Age]', val: "['male', 22.0]", status: 'multi' },
          { label: '행#1 [Sex, Age]', val: "['female', 38.0]", status: 'multi' },
          { label: '행#2 [Sex, Age]', val: "['female', 26.0]", status: 'multi' },
          { label: '행#3 [Sex, Age]', val: "['male', 35.0]", status: 'multi' }
        ],
        operatorText: '람다/select 조건 결합 분기',
        afterCells: [
          { label: '행#0 통합 결과', val: "'Other'", status: 'merged' },
          { label: '행#1 통합 결과', val: "'Adult Female'", status: 'merged' },
          { label: '행#2 통합 결과', val: "'Young Female'", status: 'highlight' },
          { label: '행#3 통합 결과', val: "'Adult Male'", status: 'merged' }
        ],
        mergeSummary: '2개 컬럼(Sex, Age)의 개별 셀 영역들이 하나의 명확한 파생변수 셀로 통합 인코딩'
      };
    }

    if (id.includes('group') || id.includes('agg') || label.includes('agg')) {
      return {
        type: 'group-collapse',
        title: 'N개 행 그룹 영역 ➔ 1개 요약 행 셀로 압축',
        desc: '수백 명의 개별 PCB_ID 행들이 Machine 기준 1개의 요약 통계 행(평균/최대)으로 수축·압축됩니다.',
        badgeColor: 'from-blue-500 to-cyan-500',
        beforeCells: [
          { label: '1등석 PCB_ID #1', val: '장착오차: 38 / 장착압력: 71.28', status: 'multi' },
          { label: '1등석 PCB_ID #3', val: '장착오차: 35 / 장착압력: 53.10', status: 'multi' },
          { label: '1등석 PCB_ID #6', val: '장착오차: 54 / 장착압력: 51.86', status: 'multi' },
          { label: '... (총 216명)', val: '개별 216개 행 영역', status: 'multi' }
        ],
        operatorText: 'groupby("pclass").agg()',
        afterCells: [
          { label: '1등석 통합 요약 셀', val: 'avg_age: 38.23 / max_fare: 512.33', status: 'highlight' }
        ],
        mergeSummary: '기존 216개 셀 영역 ➔ 단 1개의 그룹 대표 통계 셀로 완전 통합'
      };
    }

    if (id.includes('lasso') || id.includes('ridge') || label.includes('Lasso') || label.includes('Ridge')) {
      return {
        type: 'regularization',
        title: 'L1/L2 패널티 ➔ 회귀계수(Weights) 수축 & 특성 선택 변환도',
        desc: '불필요한 변수 계수를 0으로 소거(Lasso)하거나 다중공선성을 완화(Ridge)하여 일반화 성능을 극대화합니다.',
        badgeColor: 'from-amber-500 to-rose-500',
        beforeCells: [
            { label: 'OLS SibSp 계수', val: '-0.0452 (불안정)', status: 'multi' },
            { label: 'OLS Parch 계수', val: '-0.0121 (미미함)', status: 'multi' },
            { label: 'OLS Fare 계수', val: '+0.1523 (강함)', status: 'normal' },
            { label: 'OLS Sex_male 계수', val: '-0.5124 (강함)', status: 'normal' }
        ],
        operatorText: 'Lasso L1 패널티 (α=0.05)',
        afterCells: [
            { label: 'Lasso SibSp', val: '0.0000 (소거)', status: 'missing' },
            { label: 'Lasso Parch', val: '0.0000 (소거)', status: 'missing' },
            { label: 'Lasso Fare', val: '+0.1245 (보존)', status: 'highlight' },
            { label: 'Lasso Sex_male', val: '-0.4820 (보존)', status: 'highlight' }
        ],
        mergeSummary: '영향력 낮은 변수 계수 2개가 정확히 0.0000으로 수축되어 핵심 변수 2개만 자동 선택 완료'
      };
    }

    if (id.includes('rf') || id.includes('tree') || id.includes('xgb') || label.includes('RandomForest')) {
      return {
        type: 'tree-importance',
        title: '100개 결정 트리 앙상블 ➔ 지니 불순도 감소 누적합 (총합 1.0)',
        desc: '수많은 트리 노드의 분기 효율을 측정하여 전체 양품(Normal) 예측에 가장 결정적인 핵심 변수를 랭킹화합니다.',
        badgeColor: 'from-emerald-500 to-teal-500',
        beforeCells: [
            { label: 'Sex_male 노드', val: 'ΔGini = 0.325 (최다 분기)', status: 'normal' },
            { label: 'Fare 장착압력 노드', val: 'ΔGini = 0.284 (주요 분기)', status: 'normal' },
            { label: 'Age 장착오차 노드', val: 'ΔGini = 0.231 (보조 분기)', status: 'normal' },
            { label: 'Machine 등급 노드', val: 'ΔGini = 0.160 (보조 분기)', status: 'normal' }
        ],
        operatorText: '100-Trees Ensemble 정규화',
        afterCells: [
            { label: '1위: Sex_male', val: '32.5% (0.3250)', status: 'highlight' },
            { label: '2위: Fare', val: '28.4% (0.2840)', status: 'highlight' },
            { label: '3위: Age', val: '23.1% (0.2310)', status: 'merged' },
            { label: '4위: Machine', val: '16.0% (0.1600)', status: 'merged' }
        ],
        mergeSummary: '성별과 장착압력 2개 피처가 전체 모델 예측 기여도의 60% 이상을 압도적으로 차지함'
      };
    }

    if (id.includes('pca') || label.includes('PCA')) {
      return {
        type: 'pca-projection',
        title: '5차원 다차원 특성 ➔ 2개 주성분(PC1, PC2) 직교 회전 압축',
        desc: '분산(Variance)이 최대가 되는 직교 축으로 데이터를 회전 투영하여 80% 이상의 정보량을 보존합니다.',
        badgeColor: 'from-blue-500 to-indigo-500',
        beforeCells: [
            { label: '원래 변수 5개', val: '[Machine, Age, Fare, SibSp, Parch]', status: 'multi' }
        ],
        operatorText: '공분산 고유벡터 직교 투영',
        afterCells: [
            { label: 'PC1 주성분 1', val: '설명 분산: 35.4%', status: 'highlight' },
            { label: 'PC2 주성분 2', val: '설명 분산: 29.8%', status: 'highlight' }
        ],
        mergeSummary: '5개 고차원 변수를 2개 주성분으로 압축 투영하여 전체 데이터 정보의 65.2% 완벽 보존'
      };
    }

    if (id.includes('kmeans') || id.includes('dbscan') || label.includes('KMeans') || label.includes('Cluster')) {
      return {
        type: 'clustering',
        title: '다차원 포인트 ➔ 중심점(Centroid) 거리 기반 군집 ID 할당',
        desc: '유클리드 거리가 가장 가까운 중심점에 포인트를 반복 배정하여 고객 세그먼트를 자동 형성합니다.',
        badgeColor: 'from-cyan-500 to-emerald-500',
        beforeCells: [
            { label: 'PCB_ID#1 [Age:38, Fare:71]', val: '표준화 좌표 (0.57, 0.85)', status: 'normal' },
            { label: 'PCB_ID#0 [Age:22, Fare:7]', val: '표준화 좌표 (-0.53, -0.48)', status: 'normal' }
        ],
        operatorText: '최단 유클리드 거리 할당',
        afterCells: [
            { label: 'PCB_ID#1 배정 결과', val: 'Cluster #2 (VIP 상류층)', status: 'highlight' },
            { label: 'PCB_ID#0 배정 결과', val: 'Cluster #0 (일반 서민층)', status: 'merged' }
        ],
        mergeSummary: '레이블이 없는 상태에서도 데이터의 밀도와 거리 특성에 따라 3개 그룹으로 완전 자동 분할'
      };
    }

    if (id.includes('vif') || id.includes('ols') || label.includes('VIF') || label.includes('OLS') || label.includes('ANOVA')) {
      return {
        type: 'regression-vif',
        title: '다중공선성(VIF) 진단 & OLS 회귀계수 분해 변환도',
        desc: '독립변수 간 종속성(VIF >= 10 위험)을 진단하고 통계적 유의성(p-value < 0.05)을 판정합니다.',
        badgeColor: 'from-blue-600 to-cyan-500',
        beforeCells: [
            { label: '독립변수 Age', val: 'VIF = 1.05 (안전)', status: 'normal' },
            { label: '독립변수 Machine', val: 'VIF = 1.05 (안전)', status: 'normal' },
            { label: '가상 다중공선 변수', val: 'VIF = 14.82 (위험)', status: 'missing' }
        ],
        operatorText: 'VIF = 1 / (1 - R_i²)',
        afterCells: [
            { label: 'Age 회귀계수', val: '-0.334 (p=0.038 유의)', status: 'highlight' },
            { label: 'Machine 2/3등급', val: '-32.14 / -44.92 (p<0.001)', status: 'highlight' },
            { label: '다중공선 변수 조치', val: 'Ridge or 제거 대상', status: 'merged' }
        ],
        mergeSummary: 'VIF < 5로 다중공선성 완벽 방어 및 Machine ➔ 장착압력(Fare) 통계적 유의성 입증 완료'
      };
    }

    if (id.includes('svm') || id.includes('knn') || label.includes('SVC') || label.includes('KNN')) {
      return {
        type: 'margin-knn',
        title: '최대 마진 초평면(SVM) & k개 최근접 이웃(KNN) 분류도',
        desc: '거리 공간(StandardScaler)에서 경계선 마진을 극대화하거나 k개 인접 이웃 다수결 투표를 수행합니다.',
        badgeColor: 'from-violet-500 to-purple-600',
        beforeCells: [
            { label: '미분류 PCB_ID X', val: '표준화 좌표 (0.2, -0.4)', status: 'normal' },
            { label: '최인접 5개 이웃', val: '양품(Normal) 4명 / 불량(Defect) 1명', status: 'multi' }
        ],
        operatorText: 'k=5 최근접 다수결 투표',
        afterCells: [
            { label: 'KNN 최종 예측', val: '양품(Normal) (P=80.0%)', status: 'highlight' },
            { label: 'SVM 서포트벡터 마진', val: 'Margin = 2/||w|| 최적화', status: 'highlight' }
        ],
        mergeSummary: '거리 기반 기하학적 공간에서 5개 이웃 다수결(80% 찬성)로 양품(Normal)자 판정 완료'
      };
    }

    if (id.includes('hierarchical') || label.includes('Agglomerative') || label.includes('linkage')) {
      return {
        type: 'dendrogram-tree',
        title: '바텀업 계층 병합 & Ward 최소 분산 트리 변환도',
        desc: '모든 개별 PCB_ID 점에서 시작하여 군집 간 분산 증가량(ΔSS)이 최소인 쌍을 순차 결합합니다.',
        badgeColor: 'from-amber-600 to-teal-500',
        beforeCells: [
            { label: 'PCB_ID #3 & #4', val: '거리 d = 0.08 (최단)', status: 'normal' },
            { label: 'PCB_ID #10 & #12', val: '거리 d = 0.12 (차순위)', status: 'normal' },
            { label: '기존 50개 개별 군집', val: '단일 데이터 포인트들', status: 'multi' }
        ],
        operatorText: 'Ward 분산 최소화 병합',
        afterCells: [
            { label: '노드 51 결합', val: 'Node(3, 4) ➔ 거리 0.08', status: 'highlight' },
            { label: '최종 k=3 클러스터', val: 'Dendrogram 절단 완료', status: 'highlight' }
        ],
        mergeSummary: '50개 개별 데이터가 거리 순서대로 상향식 결합되어 계층적 트리 구조(Z-matrix) 완성'
      };
    }

    if (id.includes('metrics') || id.includes('roc') || label.includes('confusion') || label.includes('ROC') || label.includes('Recall')) {
      return {
        type: 'confusion-matrix',
        title: '혼동행렬(Confusion Matrix) 4분면 ➔ ROC-AUC & F1-Score 변환도',
        desc: 'TN/FP/FN/TP 분류 표에서 Precision vs Recall 트레이드오프 및 ROC 곡선 아래 면적을 적분합니다.',
        badgeColor: 'from-rose-500 to-emerald-500',
        beforeCells: [
            { label: 'TN (진짜 불량(Defect) 적중)', val: '364명', status: 'normal' },
            { label: 'FP (오탐지: 억울한 불량(Defect))', val: '60명', status: 'missing' },
            { label: 'FN (누락: 놓친 양품(Normal)자)', val: '136명 (치명적)', status: 'missing' },
            { label: 'TP (진짜 양품(Normal) 적중)', val: '154명', status: 'highlight' }
        ],
        operatorText: 'F1 = 2PR/(P+R) & ROC-AUC',
        afterCells: [
            { label: '정확도 (Accuracy)', val: '72.55%', status: 'normal' },
            { label: '정밀도 (Precision)', val: '71.96%', status: 'normal' },
            { label: '재현율 (Recall)', val: '53.10% (임계값 0.3 조정 시 74%)', status: 'highlight' },
            { label: 'ROC-AUC Score', val: '0.7925 (우수)', status: 'highlight' }
        ],
        mergeSummary: '확률 점수 predict_proba()를 기반으로 ROC-AUC 0.7925 획득 및 재현율 최적화 달성'
      };
    }

    if (id.includes('hypo') || id.includes('ttest') || label.includes('ttest') || label.includes('ANOVA') || label.includes('Chi2') || label.includes('Shapiro')) {
      return {
        type: 'hypothesis-testing',
        title: '가설검정 p-value 산출 ➔ 귀무가설(H0) 기각/채택 판정 흐름도',
        desc: 't-통계량, F-비율, χ²값을 계산하여 유의수준 α=0.05 기준 우연 여부를 판정합니다.',
        badgeColor: 'from-emerald-600 to-indigo-600',
        beforeCells: [
            { label: '남성 장착오차 표본', val: '평균 30.72세 (n=453)', status: 'normal' },
            { label: '여성 장착오차 표본', val: '평균 27.92세 (n=261)', status: 'normal' },
            { label: '표본 평균 차이', val: '2.80세', status: 'multi' }
        ],
        operatorText: 'Welch t-test (equal_var=False)',
        afterCells: [
            { label: 't-통계량 (t_stat)', val: '2.454', status: 'normal' },
            { label: 'p-value (유의확률)', val: '0.0144 (< 0.05)', status: 'highlight' },
            { label: '최종 결론 판정', val: '귀무가설 기각 ➔ 유의미한 차이 입증', status: 'highlight' }
        ],
        mergeSummary: 'p-value 0.0144 < 0.05 이므로 남녀 탑PCB_ID 평균 장착오차는 통계적으로 유의미하게 다름을 증명'
      };
    }

    if (id.includes('confidence') || id.includes('ci') || label.includes('CI') || label.includes('ppf') || label.includes('interval')) {
      return {
        type: 'confidence-interval',
        title: '표본평균 ± t-분위수 표본오차 ➔ 95% 신뢰구간 산출도',
        desc: '모분산을 모를 때 표본표준편차 s(ddof=1)와 t(0.025, df=n-1)로 모평균 포함 구간을 추정합니다.',
        badgeColor: 'from-cyan-500 to-blue-600',
        beforeCells: [
            { label: '표본 크기 n', val: '50명', status: 'normal' },
            { label: '표본평균 x̄', val: '30.430세', status: 'normal' },
            { label: '표본표준편차 s', val: '14.221 (ddof=1)', status: 'normal' }
        ],
        operatorText: 'Margin = t(0.025, 49) * (s / √n)',
        afterCells: [
            { label: 't-임계값 t_val', val: '2.0096', status: 'normal' },
            { label: '표본오차 (Margin)', val: '± 4.041세', status: 'highlight' },
            { label: '95% 신뢰구간 [L, U]', val: '[26.389, 34.471]', status: 'highlight' }
        ],
        mergeSummary: '동일 표본 추출 100회 반복 시 약 95개 구간이 참 모평균을 포함하는 엄밀한 구간 확정'
      };
    }

    if (id.includes('cut') || label.includes('cut') || label.includes('Binning')) {
      return {
        type: 'binning',
        title: '연속형 수치 ➔ 절대 구간(cut) vs 4분위수(qcut) 범주화 변환도',
        desc: '연속형 장착오차/장착압력을 절대 수치 경계 또는 25% 균등 빈도로 분할하여 범주형 파생변수를 만듭니다.',
        badgeColor: 'from-amber-500 to-emerald-500',
        beforeCells: [
            { label: 'PCB_ID #0 (장착오차: 22.0)', val: '연속형 수치', status: 'normal' },
            { label: 'PCB_ID #1 (장착압력: 71.28)', val: '연속형 수치', status: 'normal' },
            { label: 'PCB_ID #6 (장착오차: 54.0)', val: '연속형 수치', status: 'normal' }
        ],
        operatorText: 'pd.cut(bins) & pd.qcut(q=4)',
        afterCells: [
            { label: '장착오차 22세 cut', val: 'Young (15~30세 구간)', status: 'highlight' },
            { label: '장착압력 71.28 qcut', val: 'Q4 (상위 25% 최고가 구간)', status: 'highlight' },
            { label: '장착오차 54세 cut', val: 'Senior (50~100세 구간)', status: 'highlight' }
        ],
        mergeSummary: '비선형 패턴을 선형 모델이 쉽게 학습할 수 있도록 구간 범주형 변수로 완벽 치환'
      };
    }

    if (id.includes('melt') || id.includes('pivot') || label.includes('melt') || label.includes('pivot')) {
      return {
        type: 'reshape',
        title: '가로형 Wide 포맷 ↔ 세로형 Long 포맷 (Tidy Data) 변환도',
        desc: '여러 컬럼에 펼쳐진 데이터를 [식별자, 변수명, 수치값] 단일 열 세로 구조로 언롤링합니다.',
        badgeColor: 'from-purple-500 to-indigo-600',
        beforeCells: [
            { label: 'Kim 학생 가로행', val: '[Math: 90, English: 85]', status: 'multi' },
            { label: 'Lee 학생 가로행', val: '[Math: 80, English: 95]', status: 'multi' }
        ],
        operatorText: 'pd.melt(id_vars=["Name"])',
        afterCells: [
            { label: '1행 (Kim, Math)', val: 'Score: 90', status: 'highlight' },
            { label: '2행 (Kim, English)', val: 'Score: 85', status: 'highlight' },
            { label: '3행 (Lee, Math)', val: 'Score: 80', status: 'highlight' },
            { label: '4행 (Lee, English)', val: 'Score: 95', status: 'highlight' }
        ],
        mergeSummary: '가로 2행 표가 세로 4행 Tidy Data로 재구성되어 Seaborn 시각화 및 ML 피처에 즉시 투입 가능'
      };
    }

    if (id.includes('str') || id.includes('regex') || label.includes('extract') || label.includes('contains')) {
      return {
        type: 'string-regex',
        title: '긴 문자열 ➔ 정규표현식(Regex) 핵심 토큰 캡처 변환도',
        desc: 'PCB_ID의 긴 이름 텍스트에서 호칭(Mr, Mrs, Miss)을 정규식으로 파싱하여 신분 파생변수를 생성합니다.',
        badgeColor: 'from-teal-500 to-cyan-600',
        beforeCells: [
            { label: 'PCB_ID #0', val: '"Braund, Mr. Owen Harris"', status: 'multi' },
            { label: 'PCB_ID #1', val: '"Cumings, Mrs. John Bradley"', status: 'multi' },
            { label: 'PCB_ID #2', val: '"Heikkinen, Miss. Laina"', status: 'multi' }
        ],
        operatorText: 'str.extract(r"([A-Za-z]+)\\.")',
        afterCells: [
            { label: '호칭 토큰 #0', val: '"Mr" (미혼/성인 남성)', status: 'highlight' },
            { label: '호칭 토큰 #1', val: '"Mrs" (기혼 여성)', status: 'highlight' },
            { label: '호칭 토큰 #2', val: '"Miss" (미혼 여성)', status: 'highlight' }
        ],
        mergeSummary: '비정형 텍스트에서 100% 벡터화 연산으로 신분/성별 핵심 특성 추출 완료'
      };
    }

    if (id.includes('index') || id.includes('query') || id.includes('loc') || label.includes('loc') || label.includes('query')) {
      return {
        type: 'indexing-filter',
        title: '2차원 조건 불리언 마스크 ➔ 특정 행/열 고속 슬라이싱',
        desc: '복합 조건(50세 이상 & 1등석)을 만족하는 행과 지정된 5개 컬럼만 안전하게 추출합니다.',
        badgeColor: 'from-emerald-500 to-teal-600',
        beforeCells: [
            { label: 'PCB_ID #0 (3등석, 22세)', val: '불만족 (False)', status: 'missing' },
            { label: 'PCB_ID #6 (1등석, 54세)', val: '완전 만족 (True)', status: 'normal' },
            { label: '전체 891명 PCB_ID', val: '원시 데이터 매트릭스', status: 'multi' }
        ],
        operatorText: 'df.loc[(age>=50) & (pclass==1), cols]',
        afterCells: [
            { label: '필터링 통과 행', val: 'PCB_ID #6, #11, #54 등 64명', status: 'highlight' },
            { label: '선택 컬럼 슬라이싱', val: '[Machine, Sex, Age, Fare, Survived]', status: 'highlight' }
        ],
        mergeSummary: '891개 원본 행 중 조건 만족 64개 행 및 5개 피처 열만 깔끔하게 교차 추출'
      };
    }

    // Default general transformation
    return {
      type: 'general-transform',
      title: '기존 원본 셀 영역 ➔ 계산 정제 후 단일 셀 변환',
      desc: '원본 데이터 영역의 각 셀이 함수 및 파이프라인 연산을 거쳐 최종 결과 셀 형태로 재구성됩니다.',
      badgeColor: 'from-teal-500 to-emerald-500',
      beforeCells: [
        { label: '원시 데이터 셀', val: currentSpotlight?.before_snippet || '원본 값', status: 'normal' }
      ],
      operatorText: selectedMethod?.syntax || '변환 연산 적용',
      afterCells: [
        { label: '변환 확정 셀', val: currentSpotlight?.after_snippet || '결과 값', status: 'highlight' }
      ],
      mergeSummary: currentSpotlight?.concept_rule || '데이터 정제 및 변환이 정확하게 적용되었습니다.'
    };
  };

  const visualMeta = getTransformVisualMeta();

  return (
    <div className="space-y-4 max-w-7xl mx-auto p-2 md:p-4 text-slate-100 font-sans">

      {/* ── 집중 컨트롤 바 (항상 표시) ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setShowTopBar(!showTopBar)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition flex items-center gap-1.5 ${
            showTopBar
              ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              : 'bg-amber-500 border-amber-400 text-slate-950'
          }`}
        >
          {showTopBar ? '🙈 상단 배너 숨기기' : '👁️ 상단 배너 보이기'}
        </button>
        <button
          onClick={() => setShowMethodList(!showMethodList)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition flex items-center gap-1.5 ${
            showMethodList
              ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              : 'bg-amber-500 border-amber-400 text-slate-950'
          }`}
        >
          {showMethodList ? '🙈 목록 숨기기' : '📋 목록 보이기'}
        </button>
        {!showMethodList && (
          <div className="flex flex-wrap gap-1 ml-2">
            {filteredMethods.map((m) => (
              <button
                key={m.id}
                onClick={() => handleSelectMethod(m)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition ${
                  selectedMethod?.id === m.id
                    ? 'bg-amber-500 border-amber-400 text-slate-950'
                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {m.method_name.split(' ')[0]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Top Header Banner ── */}
      {showTopBar && (
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 md:p-5 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 text-amber-400 font-mono text-xs uppercase tracking-widest font-bold">
              <Zap className="w-4 h-4 text-amber-400 animate-pulse" /> 1-Click Pandas & Machine Learning Dataflow Studio
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2 mt-0.5">
              공정 데이터 처리 &amp; 모델링 스튜디오
              <span className="text-xs px-2 py-0.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded-full font-mono font-normal">
                SMD Process Engine
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowTableModal(true);
                setModalActiveTab('visual-diagram');
              }}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-950/60 transition active:scale-95 border border-emerald-400/50"
            >
              <Table className="w-4 h-4" /> 표 설명 & 색상 시각화 자료 보기
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-1.5 pt-2.5 border-t border-slate-800/80">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950 font-black scale-105'
                  : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700/80 border border-slate-700/60'
              }`}
            >
              {cat === 'all' ? '🔍 전체 보기' : cat}
            </button>
          ))}
        </div>
      </div>
      )}

      {/* ── Main 2-Column Grid ── */}
      <div className={`grid grid-cols-1 gap-4 ${showMethodList ? 'lg:grid-cols-12' : ''}`}>
        {/* Left Method List */}
        {showMethodList && (
        <div className="lg:col-span-4 xl:col-span-3 space-y-2">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1 flex items-center justify-between">
            <span>데이터 엔지니어링 모듈 ({filteredMethods.length})</span>
            <span className="text-cyan-400 font-mono text-[11px]">원클릭 실행</span>
          </div>
          <div className="space-y-1.5 max-h-[76vh] overflow-y-auto pr-1">
            {filteredMethods.map((m) => {
              const isSelected = selectedMethod?.id === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => handleSelectMethod(m)}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-gradient-to-r from-amber-950/60 to-slate-900 border-amber-500 text-white shadow-lg shadow-amber-950/40 translate-x-1'
                      : 'bg-slate-900/80 border-slate-800/80 hover:bg-slate-800/70 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-mono font-bold text-amber-300 px-1.5 py-0.5 bg-slate-950 rounded border border-amber-500/30">
                      {m.root_object}
                    </span>
                    <span className="text-[9px] text-slate-400 bg-slate-800/90 px-1.5 py-0.5 rounded font-medium">
                      {m.category.split('.')[1] || m.category}
                    </span>
                  </div>
                  <div className="font-bold text-xs text-slate-100 line-clamp-1">{m.method_name}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{m.korean_desc}</div>
                </button>
              );
            })}
          </div>
        </div>
        )}

        {/* Right Comparison Studio */}
        <div className={showMethodList ? 'lg:col-span-8 xl:col-span-9 flex flex-col gap-3.5' : 'flex flex-col gap-3.5'}>
          {/* 1. Comparison & Switcher Bar */}
          {selectedMethod && (
            <div className="bg-slate-900/90 border-2 border-amber-500/50 rounded-2xl p-4 shadow-xl space-y-3 relative overflow-hidden backdrop-blur-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-amber-500 text-slate-950 text-[10px] font-black rounded uppercase tracking-wider">
                      Selected Topic
                    </span>
                    <h2 className="text-base md:text-lg font-black text-white flex items-center gap-2">
                      {selectedMethod.method_name}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    {selectedMethod.korean_desc}
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    onClick={() => {
                      setShowTableModal(true);
                      setModalActiveTab('visual-diagram');
                    }}
                    className="text-[11px] font-mono font-bold text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900/90 border border-emerald-500/50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow transition active:scale-95"
                  >
                    <Eye className="w-3.5 h-3.5 text-emerald-400" /> 표 설명 팝업 열기
                  </button>
                  <span className="text-[11px] font-mono text-amber-300 bg-amber-950/80 px-2.5 py-1.5 rounded-lg border border-amber-500/40">
                    모드: <strong className="text-white">{activeAltLabel}</strong>
                  </span>
                </div>
              </div>

              {/* Pros / Cons Recommendation Badge */}
              {selectedMethod.pros_cons && (
                <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-2.5 flex items-center gap-2 text-xs text-emerald-200">
                  <Award className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{selectedMethod.pros_cons}</span>
                </div>
              )}

              {/* A/B/C Direct Action Buttons Bar */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <div className="text-[11px] font-bold text-amber-400 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" /> 문법 대안을 원클릭으로 교체 비교하세요:
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {/* Default Standard Button */}
                  <button
                    onClick={handleResetToDefault}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                      activeAltIndex === 'default'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-bold'
                        : 'bg-slate-950 hover:bg-slate-800/80 border-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold mb-1">
                      <span>⭐ 기본 표준 문법</span>
                      <ArrowRight className={`w-3.5 h-3.5 ${activeAltIndex === 'default' ? 'text-slate-950' : 'text-slate-500'}`} />
                    </div>
                    <div className={`text-[10px] font-mono truncate px-1 rounded ${activeAltIndex === 'default' ? 'bg-amber-600 text-white' : 'text-slate-400 bg-slate-900'}`}>
                      {selectedMethod.syntax}
                    </div>
                  </button>

                  {/* Alternative Buttons */}
                  {selectedMethod.alternatives?.map((alt, idx) => {
                    const isActive = activeAltIndex === idx;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleApplyAlternative(alt, idx)}
                        className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                          isActive
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-bold'
                            : 'bg-slate-950 hover:bg-slate-800/80 border-slate-800 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-bold mb-1">
                          <span>{alt.label}</span>
                          <ArrowRight className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-slate-500'}`} />
                        </div>
                        <div className={`text-[10px] font-mono truncate px-1 rounded ${isActive ? 'bg-amber-600 text-white' : 'text-amber-400/90 bg-slate-900'}`}>
                          {alt.code}
                        </div>
                        <div className={`text-[10px] mt-1 line-clamp-1 ${isActive ? 'text-slate-900 font-semibold' : 'text-slate-400'}`}>
                          💡 {alt.effect}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 🎯 SPOTLIGHT: 대표 1개 행/영역 집중 시각화 (개념 직관 파악) */}
          {currentSpotlight && (
            <div className="bg-gradient-to-br from-amber-950/40 via-slate-950 to-slate-900 border-2 border-amber-500/70 rounded-2xl p-4 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between pb-2.5 border-b border-amber-500/30">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-500/20 text-amber-300 rounded-lg border border-amber-500/40">
                    <Target className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs md:text-sm font-black text-amber-300 flex items-center gap-1.5">
                      {currentSpotlight.title}
                    </h3>
                    <span className="text-[11px] text-slate-300">
                      대상: <strong className="text-white font-mono">{currentSpotlight.target_item}</strong>
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowTableModal(true);
                    setModalActiveTab('visual-diagram');
                  }}
                  className="px-2.5 py-1 text-[10px] font-black bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 rounded-full shadow hover:scale-105 transition flex items-center gap-1"
                >
                  <Eye className="w-3 h-3" /> 자세한 셀 시각설명 보기
                </button>
              </div>

              {/* Before ➔ Transformation ➔ After Visual Box */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 mt-3 items-center">
                {/* 1. Before Area */}
                <div className="md:col-span-4 bg-slate-900/90 border border-rose-500/40 rounded-xl p-3 space-y-1">
                  <div className="text-[10px] font-bold text-rose-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500" /> 변환 전 특정 원본 값 (Before):
                  </div>
                  <div className="text-xs font-mono font-bold text-white bg-slate-950 p-2 rounded border border-slate-800 break-all">
                    {currentSpotlight.before_snippet}
                  </div>
                </div>

                {/* 2. Middle Operation Arrow */}
                <div className="md:col-span-4 bg-amber-950/30 border border-amber-500/40 rounded-xl p-3 flex flex-col justify-center text-center space-y-1">
                  <div className="text-[10px] font-bold text-amber-300 flex items-center justify-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-400" /> 연산 적용 메커니즘
                  </div>
                  <div className="text-[11px] font-sans text-amber-100 leading-tight">
                    {currentSpotlight.operation_desc}
                  </div>
                </div>

                {/* 3. After Result Area */}
                <div className="md:col-span-4 bg-slate-900/90 border-2 border-emerald-500/70 rounded-xl p-3 space-y-1 shadow-md shadow-emerald-950/40">
                  <div className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> 변환 후 확정 결과 (After):
                  </div>
                  <div className="text-xs font-mono font-black text-emerald-300 bg-emerald-950/60 p-2 rounded border border-emerald-500/40 break-all">
                    {currentSpotlight.after_snippet}
                  </div>
                </div>
              </div>

              {/* Intuitive Concept Rule Footer */}
              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-start gap-2 text-xs text-slate-300">
                <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-amber-300 font-bold mr-1">직관 개념 한줄 정리:</strong>
                  {currentSpotlight.concept_rule}
                </span>
              </div>
            </div>
          )}

          {/* ⚡ STEP-BY-STEP CALCULATION PIPELINE */}
          {currentProcessFlow.length > 0 && (
            <div className="bg-slate-950 border-2 border-cyan-500/40 rounded-2xl p-4 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-cyan-500/10 text-cyan-400 rounded-lg border border-cyan-500/30">
                    <GitCommit className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs md:text-sm font-black text-cyan-300 flex items-center gap-1.5">
                      데이터 변환 & 계산 과정 상세 파이프라인 (Step-by-Step Data Flow)
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      컴퓨터/엔진 내부에서 어떤 단계와 수식으로 처리되는지 한눈에 파악합니다.
                    </p>
                  </div>
                </div>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 rounded-full">
                  총 {currentProcessFlow.length}단계 처리
                </span>
              </div>

              {/* Step Pipeline Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {currentProcessFlow.map((stepItem, sIdx) => (
                  <div
                    key={sIdx}
                    className="relative bg-slate-900/90 border border-cyan-500/30 hover:border-cyan-400/60 rounded-xl p-3 flex flex-col justify-between transition group shadow-md"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30 text-[10px] font-black font-mono flex items-center gap-1">
                          Step {stepItem.step || sIdx + 1}
                        </span>
                        {sIdx < currentProcessFlow.length - 1 && (
                          <ArrowRight className="hidden md:block w-3.5 h-3.5 text-cyan-500/60 group-hover:text-cyan-300 group-hover:translate-x-0.5 transition" />
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-white mb-1">
                        {stepItem.title}
                      </h4>
                      <p className="text-[11px] text-slate-300 whitespace-pre-line leading-relaxed font-sans">
                        {stepItem.desc}
                      </p>
                    </div>

                    <div className="mt-2 pt-1.5 border-t border-slate-800/60 flex items-center gap-1 text-[10px] font-mono text-cyan-400/80">
                      <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                      <span>단계 완료</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Side-by-Side: Left (Code) & Right (Console Output) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-stretch">
            {/* Left: Code Snippet */}
            <div className="md:col-span-5 flex flex-col bg-slate-950 border border-slate-800/90 rounded-2xl overflow-hidden shadow-xl ring-1 ring-slate-800">
              <div className="bg-slate-900/95 px-3.5 py-2.5 border-b border-slate-800/90 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>파이썬 실행 코드</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleCopy}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-md text-[11px] font-medium flex items-center gap-1 transition"
                    title="코드 복사"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? '복사됨' : '복사'}</span>
                  </button>
                  <button
                    onClick={() => handleRunCode()}
                    disabled={isLoading}
                    className="px-3 py-1 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 text-[11px] font-black rounded-md flex items-center gap-1 shadow transition active:scale-95"
                  >
                    <Play className="w-3 h-3 fill-slate-950" /> {isLoading ? '실행 중...' : '실행 (Run)'}
                  </button>
                </div>
              </div>
              <textarea
                value={userCode}
                onChange={(e) => setUserCode(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.shiftKey) && e.key === 'Enter') {
                    e.preventDefault();
                    handleRunCode();
                  }
                }}
                rows={9}
                className="w-full flex-1 bg-slate-950 text-amber-300 font-mono text-xs p-3.5 outline-none resize-none leading-relaxed selection:bg-amber-600 selection:text-white border-0"
                spellCheck={false}
              />
            </div>

            {/* Right: Live Console & Table Output */}
            <div className="md:col-span-7 flex flex-col bg-slate-950 border border-slate-800/90 rounded-2xl overflow-hidden shadow-xl ring-1 ring-slate-800">
              <div className="bg-slate-900/95 px-3.5 py-2.5 border-b border-slate-800/90 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5 ml-1">
                    <Terminal className="w-3.5 h-3.5" /> 실시간 터미널 결과 (Console Out):
                  </span>
                </div>
                {statusMsg && (
                  <span className="text-[10px] font-mono text-slate-400 px-2 py-0.5 bg-slate-950 rounded border border-slate-800">
                    {statusMsg.text}
                  </span>
                )}
              </div>
              <pre className="p-3.5 text-xs font-mono text-emerald-200 overflow-x-auto min-h-[200px] max-h-[360px] whitespace-pre-wrap leading-relaxed selection:bg-slate-700 bg-slate-950">
                {output || '# 버튼을 누르면 단일 결과가 여기에 깔끔하게 출력됩니다.'}
              </pre>
            </div>
          </div>

          {/* Matplotlib Charts if generated */}
          {images.length > 0 && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2 shadow-lg">
              <div className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                시각화 차트 결과
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {images.map((img, idx) => (
                  <div key={idx} className="bg-white/5 p-2 rounded-xl border border-slate-800 flex items-center justify-center">
                    <img src={img} alt={`Chart ${idx + 1}`} className="max-w-full h-auto rounded shadow" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* When to use Tip */}
          {selectedMethod && (
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 flex items-start gap-2.5 text-xs text-slate-300">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-cyan-300 font-bold mr-1">엔지니어링 활용 팁:</strong>
                <span>{selectedMethod.when_to_use}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 🚀 ADVANCED DATA TABLE TRANSFORMATION & EXPLANATION MODAL */}
      {/* ======================================================== */}
      {showTableModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2.5 md:p-6 animate-fadeIn">
          <div className="bg-slate-900 border-2 border-emerald-500/70 rounded-2xl w-full max-w-6xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl ring-2 ring-emerald-500/20">
            {/* Modal Header */}
            <div className="bg-slate-950 px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-xl text-emerald-400 border border-emerald-500/40 shadow-inner">
                  <Table className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-black text-white flex items-center gap-2">
                    데이터 표 색상 시각화 및 셀 통합/변환 설명서
                    <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded font-normal font-mono">
                      Visual Guide
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    현재 모드: <span className="text-amber-300 font-bold">{activeAltLabel}</span> · <span className="text-emerald-300 font-mono">{selectedMethod?.syntax}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTableModal(false)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs Header */}
            <div className="bg-slate-950/90 px-5 py-2 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setModalActiveTab('visual-diagram')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition ${
                    modalActiveTab === 'visual-diagram'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md font-black'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" /> 🎨 셀 변환·통합 시각 설명도
                </button>
                <button
                  onClick={() => setModalActiveTab('raw-tables')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition ${
                    modalActiveTab === 'raw-tables'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md font-black'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Table className="w-3.5 h-3.5" /> 📊 Before & After 실 데이터 테이블
                </button>
                <button
                  onClick={() => setModalActiveTab('pipeline')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition ${
                    modalActiveTab === 'pipeline'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md font-black'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <GitCommit className="w-3.5 h-3.5" /> ⚙️ 3단계 처리 파이프라인
                </button>
              </div>

              <div className="text-[11px] text-slate-400 font-mono hidden md:block">
                💡 셀 영역이 어떻게 1개의 셀로 변화하는지 색상으로 직관 파악
              </div>
            </div>

            {/* Modal Body Content */}
            <div className="p-5 overflow-y-auto space-y-6 flex-1 bg-slate-950/70">
              
              {/* TAB 1: VISUAL DIAGRAM (셀 색상 시각설명자료) */}
              {modalActiveTab === 'visual-diagram' && (
                <div className="space-y-5">
                  {/* Visual Board Top Header Card */}
                  <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-4 shadow-xl">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/20 rounded-xl text-amber-300 border border-amber-500/30">
                          <Layers className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm md:text-base font-black text-white">
                            {visualMeta.title}
                          </h4>
                          <p className="text-xs text-slate-300 mt-0.5">
                            {visualMeta.desc}
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1 text-[11px] font-mono font-bold bg-slate-800 text-emerald-400 rounded-full border border-slate-700 self-start md:self-auto">
                        {visualMeta.mergeSummary}
                      </span>
                    </div>

                    {/* Interactive 3-Step Visual Transform Diagram */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mt-4 items-stretch">
                      {/* 1. Before Cell Box */}
                      <div className="md:col-span-5 bg-slate-950/90 border-2 border-rose-500/50 rounded-xl p-4 space-y-2.5 flex flex-col justify-between shadow-lg">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-extrabold text-rose-400 flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                              기존 개별 셀 영역 (Before)
                            </span>
                            <span className="text-[10px] font-mono text-rose-300 bg-rose-950/70 px-2 py-0.5 rounded border border-rose-500/30">
                              {visualMeta.beforeCells.length}개 원본 슬롯
                            </span>
                          </div>
                          
                          {/* Render cells */}
                          <div className="space-y-1.5">
                            {visualMeta.beforeCells.map((c, i) => (
                              <div
                                key={i}
                                className={`p-2 rounded-lg border text-xs font-mono flex items-center justify-between ${
                                  c.status === 'missing'
                                    ? 'bg-rose-950/40 border-rose-500/40 text-rose-300 animate-pulse'
                                    : c.status === 'multi'
                                    ? 'bg-purple-950/30 border-purple-500/30 text-purple-200'
                                    : 'bg-slate-900 border-slate-800 text-slate-200'
                                }`}
                              >
                                <span className="font-bold text-[11px] text-slate-400">{c.label}</span>
                                <span className="font-extrabold">{c.val}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-800/80">
                          ⚠️ 기존에는 각 셀이 개별 분산되어 있거나 결측(NaN) 상태입니다.
                        </div>
                      </div>

                      {/* 2. Middle Transform Arrow Operator */}
                      <div className="md:col-span-2 flex flex-col items-center justify-center p-3 bg-gradient-to-b from-amber-950/30 via-slate-900 to-amber-950/30 border border-amber-500/40 rounded-xl text-center space-y-2 shadow-inner">
                        <div className="p-2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          <Zap className="w-5 h-5 text-amber-400" />
                        </div>
                        <div className="text-xs font-black text-amber-300">
                          연산 메커니즘
                        </div>
                        <div className="text-[10px] font-mono text-amber-200 bg-slate-950 px-2 py-1 rounded border border-amber-500/30 break-all leading-tight">
                          {visualMeta.operatorText}
                        </div>
                        <div className="flex items-center text-[10px] text-slate-400">
                          <span>하나로 수렴</span>
                          <ChevronRight className="w-3 h-3 text-amber-400 animate-bounce" />
                        </div>
                      </div>

                      {/* 3. After Unified Cell Box */}
                      <div className="md:col-span-5 bg-slate-950/90 border-2 border-emerald-500/70 rounded-xl p-4 space-y-2.5 flex flex-col justify-between shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/40">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-extrabold text-emerald-400 flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                              통합·확정된 단일 셀 (After)
                            </span>
                            <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-500/30 font-bold">
                              {visualMeta.afterCells.length}개 확정 슬롯
                            </span>
                          </div>

                          {/* Render result cells */}
                          <div className="space-y-1.5">
                            {visualMeta.afterCells.map((c, i) => (
                              <div
                                key={i}
                                className={`p-2 rounded-lg border text-xs font-mono flex items-center justify-between ${
                                  c.status === 'filled'
                                    ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-200 font-black'
                                    : c.status === 'highlight'
                                    ? 'bg-gradient-to-r from-emerald-950/80 to-teal-950/80 border-emerald-400 text-emerald-100 font-black shadow'
                                    : 'bg-emerald-950/30 border-emerald-600/30 text-emerald-300 font-bold'
                                }`}
                              >
                                <span className="font-bold text-[11px] text-slate-300">{c.label}</span>
                                <span className="font-extrabold text-emerald-300">{c.val}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="text-[10px] text-emerald-300/90 pt-2 border-t border-slate-800/80 flex items-center gap-1">
                          <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>연산 규칙에 따라 하나의 정제된 셀 영역으로 확정되었습니다.</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Spotlight Detailed Breakdown */}
                  {currentSpotlight && (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                        <Target className="w-4 h-4 text-amber-400" />
                        <span>대표 1행 집중 추적 상세 설명:</span>
                        <strong className="text-white font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {currentSpotlight.target_item}
                        </strong>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-sans">
                        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                          <div className="text-[10px] font-mono text-rose-400">1. 변환 전 입력 값</div>
                          <div className="font-mono text-slate-200 font-bold">{currentSpotlight.before_snippet}</div>
                        </div>
                        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                          <div className="text-[10px] font-mono text-amber-400">2. 적용된 메커니즘</div>
                          <div className="text-slate-300">{currentSpotlight.operation_desc}</div>
                        </div>
                        <div className="p-3 bg-slate-950 rounded-xl border border-emerald-500/40 space-y-1 bg-emerald-950/20">
                          <div className="text-[10px] font-mono text-emerald-400 font-bold">3. 변환 후 출력 결과</div>
                          <div className="font-mono text-emerald-300 font-black">{currentSpotlight.after_snippet}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: RAW BEFORE & AFTER TABLES */}
              {modalActiveTab === 'raw-tables' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* BEFORE TABLE */}
                    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-rose-400 bg-rose-950/60 border border-rose-500/30 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          정제 전 원본 데이터프레임 (df)
                        </span>
                        {tableBefore && (
                          <span className="text-[11px] font-mono text-slate-400">
                            {tableBefore.total_rows}행 × {tableBefore.total_cols}열 (상위 10건)
                          </span>
                        )}
                      </div>
                      
                      {tableBefore ? (
                        <div className="overflow-x-auto border border-slate-800 rounded-lg max-h-[360px]">
                          <table className="w-full text-[11px] text-left border-collapse">
                            <thead className="bg-slate-950 text-slate-300 sticky top-0 border-b border-slate-800">
                              <tr>
                                <th className="p-2 text-slate-500 border-r border-slate-800">#</th>
                                {tableBefore.columns.map((col, cIdx) => (
                                  <th key={cIdx} className="p-2 border-r border-slate-800 font-mono text-amber-300 whitespace-nowrap">
                                    {col}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60 font-mono">
                              {tableBefore.rows.map((row, rIdx) => (
                                <tr key={rIdx} className="hover:bg-slate-800/40">
                                  <td className="p-2 text-slate-500 border-r border-slate-800 text-center">{rIdx}</td>
                                  {row.map((cell, cIdx) => (
                                    <td
                                      key={cIdx}
                                      className={`p-2 border-r border-slate-800 whitespace-nowrap ${
                                        cell === null || cell === 'NaN' || cell === 'None'
                                          ? 'bg-rose-950/50 text-rose-400 font-black'
                                          : 'text-slate-200'
                                      }`}
                                    >
                                      {cell === null ? 'NaN' : String(cell)}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg">
                          원본 테이블 데이터가 없습니다.
                        </div>
                      )}
                    </div>

                    {/* AFTER TABLE */}
                    <div className="bg-slate-900/90 border-2 border-emerald-500/50 rounded-xl p-4 space-y-3 shadow-lg shadow-emerald-950/30">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          변환/정제 후 결과 데이터 (res / output)
                        </span>
                        {tableAfter && (
                          <span className="text-[11px] font-mono text-emerald-400 font-bold">
                            {tableAfter.total_rows}행 × {tableAfter.total_cols}열
                          </span>
                        )}
                      </div>

                      {tableAfter ? (
                        <div className="overflow-x-auto border border-emerald-900/40 rounded-lg max-h-[360px]">
                          <table className="w-full text-[11px] text-left border-collapse">
                            <thead className="bg-slate-950 text-emerald-300 sticky top-0 border-b border-emerald-800/50">
                              <tr>
                                <th className="p-2 text-slate-500 border-r border-slate-800">#</th>
                                {tableAfter.columns.map((col, cIdx) => (
                                  <th key={cIdx} className="p-2 border-r border-slate-800 font-mono text-emerald-400 whitespace-nowrap">
                                    {col}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60 font-mono">
                              {tableAfter.rows.map((row, rIdx) => (
                                <tr key={rIdx} className="hover:bg-emerald-950/30 bg-emerald-950/10">
                                  <td className="p-2 text-slate-500 border-r border-slate-800 text-center">{rIdx}</td>
                                  {row.map((cell, cIdx) => (
                                    <td
                                      key={cIdx}
                                      className="p-2 border-r border-slate-800 whitespace-nowrap text-emerald-200 font-semibold"
                                    >
                                      {cell === null ? 'NaN' : String(cell)}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-emerald-800/40 rounded-lg">
                          <div className="font-mono text-slate-300 mb-1">콘솔 텍스트 출력 형태:</div>
                          <pre className="text-[11px] font-mono text-emerald-300 bg-slate-950 p-3 rounded text-left overflow-x-auto">
                            {output}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: PIPELINE FLOW */}
              {modalActiveTab === 'pipeline' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {currentProcessFlow.map((stepItem, sIdx) => (
                      <div
                        key={sIdx}
                        className="bg-slate-900 border-2 border-cyan-500/40 rounded-2xl p-4 flex flex-col justify-between shadow-xl"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="px-2.5 py-1 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-500/40 text-xs font-black font-mono">
                              Step {stepItem.step || sIdx + 1}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">진행 단계</span>
                          </div>
                          <h4 className="text-sm font-bold text-white mb-1.5">
                            {stepItem.title}
                          </h4>
                          <p className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-line">
                            {stepItem.desc}
                          </p>
                        </div>
                        <div className="mt-4 pt-2 border-t border-slate-800 flex items-center gap-1.5 text-xs text-cyan-400 font-mono">
                          <CheckCircle2 className="w-4 h-4" /> 단계 완료 및 다음 단계 전파
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom Transformation Insight Footer */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-xs text-slate-300">
                  <ArrowRightLeft className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    <strong className="text-emerald-300 font-bold mr-1">변화 요약:</strong>
                    {selectedMethod?.korean_desc} (기존 셀 영역 정제 및 단일 결과 셀 변환 완료)
                  </span>
                </div>
                <button
                  onClick={() => setShowTableModal(false)}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition self-end sm:self-auto"
                >
                  확인 및 닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
