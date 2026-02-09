export interface Dimension {
  id: string;
  name: string;
  default_weight: number;
}

export interface QuestionText {
  self: string;
  partner: string;
}

export interface QuestionItem {
  id: string;
  dimension: string;
  sub_dimension: string;
  direction: 'positive' | 'reverse' | 'check';
  weight: number;
  text: QuestionText;
  expected_value?: number;
}

export interface Recommendation {
  id: string;
  title: string;
  detail: string;
  action_steps: string[];
  caution: string;
}

export interface BankMeta {
  bank_id: string;
  title: string;
  version: string;
  locale: string;
  scale: {
    type: string;
    min: number;
    max: number;
    anchors: Record<string, string>;
    reverse_scoring: {
      enabled: boolean;
      rule: string;
      example: string;
    };
  };
  dimensions: Dimension[];
  time_window: string;
}

export interface QuestionBank {
  meta: BankMeta;
  items: QuestionItem[];
  recommendations: Record<string, Recommendation[]>;
}

export interface AssessmentState {
  answers: Record<string, number>;
  currentQuestionIndex: number;
  mode: 'self' | 'partner';
  startTime: number | null;
  endTime: number | null;
  shuffledQuestions: QuestionItem[];
}
