import { signupInput } from '@campus/shared';
import { splitTags, validateForm } from '@/lib/forms';

describe('validateForm', () => {
  it('returns one message per failing field', () => {
    const result = validateForm(signupInput, { name: '', username: 'a b', email: 'nope', password: 'short' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual(['email', 'name', 'password', 'username']);
  });

  it('returns cleaned data when the form is valid', () => {
    const result = validateForm(signupInput, { name: ' Asha ', username: 'Asha_R', email: ' ASHA@x.com ', password: 'password123' });
    expect(result).toEqual({ ok: true, data: { name: 'Asha', username: 'asha_r', email: 'asha@x.com', password: 'password123' } });
  });
});

describe('splitTags', () => {
  it('splits on commas and drops empty parts', () => {
    expect(splitTags(' react, ,Node ,, ai ')).toEqual(['react', 'Node', 'ai']);
    expect(splitTags('')).toEqual([]);
  });
});
