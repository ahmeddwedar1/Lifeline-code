export interface PriorityResult {
  severity: 'CRITICAL' | 'URGENT' | 'NORMAL' | 'LOW';
  score: number;
  keywords: string[];
}

const severityRules = [
  {
    severity: 'CRITICAL' as const,
    minScore: 90,
    keywords: [
      'cardiac arrest', 'stroke', 'not breathing', 'unconscious', 'severe trauma',
      'no pulse', 'massive bleeding', 'anaphylaxis', 'seizure', 'overdose',
      'drowning', 'electrocution', 'severe burn', 'head trauma', 'spinal injury',
    ],
  },
  {
    severity: 'URGENT' as const,
    minScore: 70,
    keywords: [
      'chest pain', 'difficulty breathing', 'heavy bleeding', 'head injury',
      'fracture', 'dislocation', 'severe pain', 'burn', 'allergic reaction',
      'high fever', 'dehydration', 'hypothermia', 'heat stroke',
    ],
  },
  {
    severity: 'NORMAL' as const,
    minScore: 40,
    keywords: [
      'broken bone', 'moderate pain', 'fever', 'allergic reaction',
      'infection', 'vomiting', 'diarrhea', 'asthma', 'migraine',
      'cut', 'wound', 'sprain', 'strain',
    ],
  },
  {
    severity: 'LOW' as const,
    minScore: 1,
    keywords: [
      'mild pain', 'rash', 'sprain', 'sore throat', 'cold',
      'cough', 'minor cut', 'bruise', 'checkup', 'routine',
    ],
  },
];

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[.,!?;:'"]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function classifyEmergency(symptoms: string): PriorityResult {
  const normalized = normalizeText(symptoms);
  let matchedKeywords: string[] = [];
  let maxSeverity: 'CRITICAL' | 'URGENT' | 'NORMAL' | 'LOW' = 'LOW';
  let score = 0;

  for (const rule of severityRules) {
    for (const keyword of rule.keywords) {
      if (normalized.includes(keyword)) {
        matchedKeywords.push(keyword);
        if (rule.severity === 'CRITICAL' || rule.severity === 'URGENT') {
          const wordCount = normalized.split(/\s+/).length;
          const keywordRatio = matchedKeywords.length / Math.max(wordCount, 1);
          score = Math.min(100, rule.minScore + Math.floor(keywordRatio * 20));
        } else {
          score = Math.max(score, rule.minScore);
        }
        if (severityLevel(rule.severity) > severityLevel(maxSeverity)) {
          maxSeverity = rule.severity;
        }
      }
    }
  }

  if (matchedKeywords.length === 0) {
    score = Math.floor(Math.random() * 20) + 10;
    maxSeverity = 'LOW';
  }

  if (maxSeverity === 'CRITICAL' && score < 90) score = 90 + Math.floor(Math.random() * 10);

  return {
    severity: maxSeverity,
    score: Math.min(100, Math.max(1, score)),
    keywords: [...new Set(matchedKeywords)],
  };
}

function severityLevel(severity: string): number {
  const levels: Record<string, number> = { LOW: 0, NORMAL: 1, URGENT: 2, CRITICAL: 3 };
  return levels[severity] || 0;
}

export function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    CRITICAL: '#DC2626',
    URGENT: '#F97316',
    NORMAL: '#EAB308',
    LOW: '#22C55E',
  };
  return colors[severity] || '#6B7280';
}

export function getSeverityBadge(severity: string): string {
  const badges: Record<string, string> = {
    CRITICAL: 'bg-red-600 text-white',
    URGENT: 'bg-orange-500 text-white',
    NORMAL: 'bg-yellow-400 text-black',
    LOW: 'bg-green-500 text-white',
  };
  return badges[severity] || 'bg-gray-500 text-white';
}
