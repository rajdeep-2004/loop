export type Program = { id: string; name: string; years: number; sections: string[] };
export type School = {
  id: string;
  name: string;
  description: string;
  color: string;
  programs: Program[];
};
