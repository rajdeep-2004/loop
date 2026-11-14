import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import type { Me, School } from '@campus/shared';
import { useAuth } from '@/features/auth/AuthContext';
import { api, errorMessage } from '@/lib/api';
import { Button, Choice, ErrorState, Loading, Screen, TagRow, Txt, colors, space } from '@/ui';

/** Pick school, then program, then year, then class. Each choice resets the ones below it. */
export default function Onboarding() {
  const { setUser, signOut } = useAuth();
  const schools = useQuery({ queryKey: ['schools'], queryFn: () => api.get<School[]>('/schools') });
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [programId, setProgramId] = useState<string | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [classSection, setClassSection] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (schools.isPending) return <Screen><Loading label="Loading your university" /></Screen>;
  if (schools.isError) {
    return <Screen><ErrorState message={errorMessage(schools.error)} onRetry={() => schools.refetch()} /></Screen>;
  }

  const school = schools.data.find((item) => item.id === schoolId) ?? null;
  const program = school?.programs.find((item) => item.id === programId) ?? null;
  const years = program ? Array.from({ length: program.years }, (_, index) => index + 1) : [];
  const ready = school && program && year && classSection;

  const submit = async () => {
    if (!ready) return;
    setBusy(true);
    setFailure(null);
    try {
      setUser(await api.put<Me>('/users/me/onboarding', { schoolId, programId, year, classSection }));
    } catch (error) {
      setFailure(errorMessage(error));
      setBusy(false);
    }
  };

  return (
    <Screen scroll color={school?.color ?? colors.paper}>
      <Txt variant="display">Where do you study?</Txt>

      <Section title="School">
        {schools.data.map((item) => (
          <Choice
            key={item.id}
            label={item.name}
            color={colors.white}
            selected={item.id === schoolId}
            onPress={() => {
              setSchoolId(item.id);
              setProgramId(null);
              setYear(null);
              setClassSection(null);
            }}
          />
        ))}
      </Section>

      {school ? (
        <Section title="Program">
          {school.programs.map((item) => (
            <Choice
              key={item.id}
              label={item.name}
              selected={item.id === programId}
              onPress={() => {
                setProgramId(item.id);
                setYear(null);
                setClassSection(null);
              }}
            />
          ))}
        </Section>
      ) : null}

      {program ? (
        <Section title="Year">
          {years.map((item) => (
            <Choice key={item} label={`Year ${item}`} selected={item === year} onPress={() => setYear(item)} />
          ))}
        </Section>
      ) : null}

      {program && year ? (
        <Section title="Class">
          {program.sections.map((item) => (
            <Choice key={item} label={`Section ${item}`} selected={item === classSection} onPress={() => setClassSection(item)} />
          ))}
        </Section>
      ) : null}

      {failure ? <Txt color={colors.red} accessibilityRole="alert">{failure}</Txt> : null}
      <Button label="Enter campus" onPress={submit} disabled={!ready} loading={busy} />
      <Button label="Log out" color={colors.white} small onPress={signOut} />
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <Txt variant="label">{title}</Txt>
      <TagRow>{children}</TagRow>
    </View>
  );
}
