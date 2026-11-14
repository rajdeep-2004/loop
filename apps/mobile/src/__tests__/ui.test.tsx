import { fireEvent, render, screen } from '@testing-library/react-native';
import type { PublicUser } from '@campus/shared';
import { ProfileCard, placeLine } from '@/features/profile/ProfileCard';
import { Button, Input, initials } from '@/ui';

describe('Button', () => {
  it('calls onPress when pressed', async () => {
    const onPress = jest.fn();
    await render(<Button label="Save" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('ignores presses while loading, so a request cannot be sent twice', async () => {
    const onPress = jest.fn();
    await render(<Button label="Save" onPress={onPress} loading />);
    const button = screen.getByRole('button', { name: 'Save' });
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
    expect(button.props.accessibilityState).toMatchObject({ disabled: true, busy: true });
  });

  it('ignores presses when disabled', async () => {
    const onPress = jest.fn();
    await render(<Button label="Save" onPress={onPress} disabled />);
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('Input', () => {
  it('shows the error in place of the hint', async () => {
    await render(<Input label="Email" value="" onChangeText={() => undefined} hint="Use your university email" error="Invalid email" />);
    expect(screen.getByText('Invalid email')).toBeTruthy();
    expect(screen.queryByText('Use your university email')).toBeNull();
  });
});

describe('Avatar initials', () => {
  it('uses the first letters of the first two words', () => {
    expect(initials('rajdeep sanyal')).toBe('RS');
    expect(initials('  Mira ')).toBe('M');
    expect(initials('A B C')).toBe('AB');
  });
});

const user: PublicUser = {
  id: 'u1',
  name: 'Rajdeep Sanyal',
  username: 'rajdeep',
  avatarUrl: null,
  bio: 'Building things.',
  school: { id: 's1', name: 'School of Technology', color: '#3D5AFE' },
  program: { id: 'p1', name: 'B.Tech Computer Science' },
  year: 2,
  classSection: 'A',
  skills: ['react'],
  interests: ['ai'],
  role: 'student',
};

describe('ProfileCard', () => {
  it('shows identity, place in the university, bio and tags', async () => {
    await render(<ProfileCard user={user} />);
    expect(screen.getByText('Rajdeep Sanyal')).toBeTruthy();
    expect(screen.getByText('@rajdeep')).toBeTruthy();
    expect(screen.getByText('School of Technology')).toBeTruthy();
    expect(screen.getByText('B.Tech Computer Science · Year 2 · Section A')).toBeTruthy();
    expect(screen.getByText('react')).toBeTruthy();
    expect(screen.getByText('ai')).toBeTruthy();
  });

  it('leaves out the university section before onboarding', async () => {
    await render(<ProfileCard user={{ ...user, school: null, program: null, year: null, classSection: null, bio: '', skills: [], interests: [] }} />);
    expect(screen.queryByText('Skills')).toBeNull();
    expect(placeLine({ program: null, year: null, classSection: null })).toBe('');
  });
});
