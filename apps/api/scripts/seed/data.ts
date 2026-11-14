/** The demo university. Replace this file with your real campus to change the whole demo. */
export const SCHOOLS = [
  {
    name: 'School of Technology',
    description: 'Computer science, AI and electronics.',
    color: '#3D5AFE',
    programs: [
      { name: 'B.Tech Computer Science', years: 4, sections: ['A', 'B'] },
      { name: 'B.Tech AI & Data Science', years: 4, sections: ['A'] },
      { name: 'B.Tech Electronics', years: 4, sections: ['A'] },
    ],
  },
  {
    name: 'School of Psychology',
    description: 'Mind, behaviour and research.',
    color: '#9B5CFF',
    programs: [
      { name: 'B.Sc Psychology', years: 3, sections: ['A', 'B'] },
      { name: 'M.Sc Clinical Psychology', years: 2, sections: ['A'] },
    ],
  },
  {
    name: 'School of Design',
    description: 'Product, communication and interaction design.',
    color: '#FF3D8B',
    programs: [
      { name: 'B.Des Product Design', years: 4, sections: ['A'] },
      { name: 'B.Des Interaction Design', years: 4, sections: ['A'] },
    ],
  },
  {
    name: 'School of Entrepreneurship',
    description: 'Building and running ventures.',
    color: '#FF7A1A',
    programs: [
      { name: 'BBA Entrepreneurship', years: 3, sections: ['A', 'B'] },
      { name: 'MBA Innovation', years: 2, sections: ['A'] },
    ],
  },
] as const;

export const FIRST_NAMES = [
  'Aarav', 'Aditi', 'Akash', 'Ananya', 'Arjun', 'Bhavna', 'Chirag', 'Diya', 'Esha', 'Farhan',
  'Gauri', 'Harsh', 'Ishaan', 'Jiya', 'Kabir', 'Kavya', 'Lakshya', 'Meera', 'Nikhil', 'Nisha',
  'Om', 'Pooja', 'Pranav', 'Riya', 'Rohan', 'Saanvi', 'Sahil', 'Sneha', 'Tanvi', 'Uday',
  'Vanya', 'Varun', 'Yash', 'Zara', 'Ira', 'Dev', 'Mira', 'Neel', 'Tara', 'Vihaan',
];
export const LAST_NAMES = [
  'Sharma', 'Verma', 'Iyer', 'Nair', 'Reddy', 'Gupta', 'Mehta', 'Kapoor', 'Das', 'Banerjee',
  'Chatterjee', 'Singh', 'Patel', 'Shah', 'Joshi', 'Kulkarni', 'Menon', 'Rao', 'Bose', 'Sanyal',
  'Khan', 'Fernandes', 'Pillai', 'Saxena', 'Malhotra',
];
export const SKILLS = [
  'react', 'node', 'python', 'figma', 'ml', 'java', 'c++', 'flutter', 'sql', 'public speaking',
  'video editing', 'illustration', 'research', 'marketing', 'finance', 'writing', 'photography', 'ui design',
];
export const INTERESTS = [
  'ai', 'startups', 'open source', 'music', 'football', 'photography', 'gaming', 'robotics',
  'psychology', 'design', 'hackathons', 'debate', 'film', 'travel', 'chess', 'product',
];
export const BIOS = [
  'Building things and breaking them.',
  'Coffee, code and campus walks.',
  'Here for the hackathons.',
  'Design nerd. Ask me about type.',
  'Trying to ship one project a month.',
  'Curious about how people think.',
  'Always up for a jam session.',
  'Future founder, current student.',
];

export const DEMO_PASSWORD = 'campus123';
