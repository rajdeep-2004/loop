import bcrypt from 'bcryptjs';
import { ProgramModel, SchoolModel, type ProgramDoc, type SchoolDoc } from '../../src/modules/university/university.models';
import { UserModel, toNameWords, type UserDoc } from '../../src/modules/users/user.model';
import { BIOS, DEMO_PASSWORD, FIRST_NAMES, INTERESTS, LAST_NAMES, SCHOOLS, SKILLS } from './data';
import type { Random } from './random';

const STUDENTS_PER_SECTION_YEAR = 6;

export type SeededUniversity = { schools: SchoolDoc[]; programs: ProgramDoc[]; students: UserDoc[]; admin: UserDoc };

export async function seedUniversity(random: Random): Promise<SeededUniversity> {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const schools: SchoolDoc[] = [];
  const programs: ProgramDoc[] = [];

  for (const school of SCHOOLS) {
    const created = await SchoolModel.create({ name: school.name, description: school.description, color: school.color });
    schools.push(created.toObject());
    for (const program of school.programs) {
      const createdProgram = await ProgramModel.create({ schoolId: created._id, name: program.name, years: program.years, sections: [...program.sections] });
      programs.push(createdProgram.toObject());
    }
  }

  const usedUsernames = new Set<string>();
  const rows: Partial<UserDoc>[] = [];
  const addStudent = (program: ProgramDoc, year: number, classSection: string, fixed?: { name: string; username: string }) => {
    let name = fixed?.name ?? `${random.pick(FIRST_NAMES)} ${random.pick(LAST_NAMES)}`;
    let username = fixed?.username ?? name.toLowerCase().replace(/[^a-z]/g, '.');
    while (usedUsernames.has(username)) {
      name = `${random.pick(FIRST_NAMES)} ${random.pick(LAST_NAMES)}`;
      username = `${name.toLowerCase().replace(/[^a-z]/g, '.')}${random.int(1, 99)}`;
    }
    usedUsernames.add(username);
    rows.push({
      name,
      nameWords: toNameWords(name),
      username,
      email: `${username}@campus.test`,
      passwordHash,
      bio: random.pick(BIOS),
      schoolId: program.schoolId,
      programId: program._id,
      year,
      classSection,
      skills: random.sample(SKILLS, random.int(2, 4)),
      interests: random.sample(INTERESTS, random.int(2, 4)),
      role: 'student',
      onboarded: true,
    });
  };

  // Two fixed demo accounts in different schools and years, for the announcement demo.
  const cse = programs.find((p) => p.name === 'B.Tech Computer Science')!;
  const design = programs.find((p) => p.name === 'B.Des Interaction Design')!;
  addStudent(cse, 2, 'A', { name: 'Rajdeep Sanyal', username: 'rajdeep' });
  addStudent(design, 1, 'A', { name: 'Mira Kapoor', username: 'mira' });

  for (const program of programs) {
    for (let year = 1; year <= program.years; year += 1) {
      for (const section of program.sections) {
        for (let i = 0; i < STUDENTS_PER_SECTION_YEAR; i += 1) addStudent(program, year, section);
      }
    }
  }

  const students = (await UserModel.insertMany(rows)).map((doc) => doc.toObject());
  const admin = await UserModel.create({
    name: 'University Office',
    nameWords: toNameWords('University Office'),
    username: 'university',
    email: 'admin@campus.test',
    passwordHash,
    bio: 'Official announcements.',
    role: 'university_admin',
    onboarded: true,
  });
  return { schools, programs, students, admin: admin.toObject() };
}
