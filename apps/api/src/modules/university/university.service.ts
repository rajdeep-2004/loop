import type { School } from '@campus/shared';
import { ProgramModel, SchoolModel } from './university.models';

/** All schools with their programs. Two queries, no N+1. */
export async function listSchools(): Promise<School[]> {
  const [schools, programs] = await Promise.all([
    SchoolModel.find().sort({ name: 1 }).lean(),
    ProgramModel.find().sort({ name: 1 }).lean(),
  ]);
  return schools.map((school) => ({
    id: String(school._id),
    name: school.name,
    description: school.description,
    color: school.color,
    programs: programs
      .filter((program) => String(program.schoolId) === String(school._id))
      .map((program) => ({
        id: String(program._id),
        name: program.name,
        years: program.years,
        sections: program.sections,
      })),
  }));
}
