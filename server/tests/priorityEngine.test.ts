import { classifyEmergency, getSeverityColor, getSeverityBadge } from '../src/shared/utils/priorityEngine';

describe('Priority Engine', () => {
  describe('classifyEmergency', () => {
    it('should classify cardiac arrest as CRITICAL', () => {
      const result = classifyEmergency('Patient is experiencing cardiac arrest and is not breathing');
      expect(result.severity).toBe('CRITICAL');
      expect(result.score).toBeGreaterThanOrEqual(90);
      expect(result.keywords).toContain('cardiac arrest');
      expect(result.keywords).toContain('not breathing');
    });

    it('should classify stroke as CRITICAL', () => {
      const result = classifyEmergency('Patient showing signs of stroke, unconscious');
      expect(result.severity).toBe('CRITICAL');
      expect(result.score).toBeGreaterThanOrEqual(90);
    });

    it('should classify chest pain as URGENT', () => {
      const result = classifyEmergency('Patient has severe chest pain and difficulty breathing');
      expect(result.severity).toBe('URGENT');
      expect(result.score).toBeGreaterThanOrEqual(70);
      expect(result.score).toBeLessThan(90);
    });

    it('should classify broken bone as NORMAL', () => {
      const result = classifyEmergency('Patient has a broken bone and moderate pain');
      expect(result.severity).toBe('NORMAL');
      expect(result.score).toBeGreaterThanOrEqual(40);
      expect(result.score).toBeLessThan(70);
    });

    it('should classify mild pain as LOW', () => {
      const result = classifyEmergency('Patient has mild pain and a rash');
      expect(result.severity).toBe('LOW');
      expect(result.score).toBeLessThan(40);
    });

    it('should return LOW for unknown symptoms', () => {
      const result = classifyEmergency('Patient came for a routine checkup');
      expect(result.severity).toBe('LOW');
      expect(result.score).toBeGreaterThanOrEqual(1);
    });

    it('should handle empty symptoms gracefully', () => {
      const result = classifyEmergency('');
      expect(result.severity).toBe('LOW');
      expect(result.score).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getSeverityColor', () => {
    it('should return correct colors', () => {
      expect(getSeverityColor('CRITICAL')).toBe('#DC2626');
      expect(getSeverityColor('URGENT')).toBe('#F97316');
      expect(getSeverityColor('NORMAL')).toBe('#EAB308');
      expect(getSeverityColor('LOW')).toBe('#22C55E');
      expect(getSeverityColor('UNKNOWN')).toBe('#6B7280');
    });
  });

  describe('getSeverityBadge', () => {
    it('should return correct badge classes', () => {
      expect(getSeverityBadge('CRITICAL')).toContain('bg-red-600');
      expect(getSeverityBadge('URGENT')).toContain('bg-orange-500');
      expect(getSeverityBadge('NORMAL')).toContain('bg-yellow-400');
      expect(getSeverityBadge('LOW')).toContain('bg-green-500');
    });
  });
});
