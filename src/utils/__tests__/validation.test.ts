import {
  isValidServerUrl,
  normalizeServerUrl,
  parseCoordinates,
  validateTaskForm,
  type TaskFormValues,
} from '../validation';

const NOW = new Date('2026-09-11T10:00:00.000Z');
const minutesFromNow = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000);

const validValues = (overrides: Partial<TaskFormValues> = {}): TaskFormValues => ({
  title: 'Visit supplier',
  description: 'Collect the signed contract',
  dueDate: minutesFromNow(120),
  address: 'Chorsu Bazaar, Tashkent',
  latitude: '',
  longitude: '',
  status: 'new',
  attachments: [],
  ...overrides,
});

describe('validateTaskForm', () => {
  it('accepts a complete task', () => {
    const result = validateTaskForm(validValues(), { now: NOW });
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('requires title, description, due date and address', () => {
    const result = validateTaskForm(
      validValues({ title: '  ', description: '', dueDate: null, address: '' }),
      { now: NOW },
    );
    expect(result.isValid).toBe(false);
    expect(Object.keys(result.errors).sort()).toEqual(['address', 'description', 'dueDate', 'title']);
  });

  it('enforces minimum lengths on trimmed input', () => {
    const result = validateTaskForm(validValues({ title: ' ab ', description: 'abc' }), { now: NOW });
    expect(result.errors.title).toMatch(/at least 3/);
    expect(result.errors.description).toMatch(/at least 5/);
  });

  it('rejects due dates in the past', () => {
    const result = validateTaskForm(validValues({ dueDate: minutesFromNow(-5) }), { now: NOW });
    expect(result.errors.dueDate).toMatch(/future/);
  });

  it('allows keeping the unchanged (overdue) due date of an existing task', () => {
    const past = minutesFromNow(-60);
    const result = validateTaskForm(validValues({ dueDate: new Date(past) }), { now: NOW, originalDueDate: past });
    expect(result.errors.dueDate).toBeUndefined();
  });

  it('warns (without blocking) when due in less than 30 minutes', () => {
    const result = validateTaskForm(validValues({ dueDate: minutesFromNow(10) }), { now: NOW });
    expect(result.isValid).toBe(true);
    expect(result.warnings.dueDate).toMatch(/less than 30 minutes/);
  });

  it('does not warn for closed tasks', () => {
    const result = validateTaskForm(validValues({ dueDate: minutesFromNow(10), status: 'completed' }), { now: NOW });
    expect(result.warnings.dueDate).toBeUndefined();
  });

  it('requires coordinates as a complete, in-range pair', () => {
    expect(validateTaskForm(validValues({ latitude: '41.3' }), { now: NOW }).errors.longitude).toMatch(/required/);
    expect(validateTaskForm(validValues({ latitude: '91', longitude: '69' }), { now: NOW }).errors.latitude).toMatch(
      /between/,
    );
    expect(validateTaskForm(validValues({ latitude: 'abc', longitude: '69' }), { now: NOW }).errors.latitude).toMatch(
      /number/,
    );
    expect(validateTaskForm(validValues({ latitude: '41.3', longitude: '69.2' }), { now: NOW }).isValid).toBe(true);
  });
});

describe('parseCoordinates', () => {
  it('parses valid pairs, including comma decimals', () => {
    expect(parseCoordinates('41,3111', '69.2797')).toEqual({ latitude: 41.3111, longitude: 69.2797 });
  });

  it('returns null for incomplete or invalid input', () => {
    expect(parseCoordinates('', '69')).toBeNull();
    expect(parseCoordinates('x', '69')).toBeNull();
    expect(parseCoordinates('100', '69')).toBeNull();
  });
});

describe('server URL helpers', () => {
  it('normalises scheme and trailing slashes', () => {
    expect(normalizeServerUrl(' 192.168.1.10:3000/ ')).toBe('http://192.168.1.10:3000');
    expect(normalizeServerUrl('https://api.example.com//')).toBe('https://api.example.com');
  });

  it('validates URLs', () => {
    expect(isValidServerUrl('http://10.0.2.2:3000')).toBe(true);
    expect(isValidServerUrl('localhost:3000')).toBe(true);
    expect(isValidServerUrl('http://bad host')).toBe(false);
  });
});
