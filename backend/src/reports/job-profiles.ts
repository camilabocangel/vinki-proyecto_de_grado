export interface JobProfile {
  id: string;
  title: string;
  companyType: string;
  level: string;
  requiredSkills: Record<string, number>;
}

export const JOB_PROFILES: JobProfile[] = [
  {
    id: 'backend-mid-fintech',
    title: 'Backend Developer',
    companyType: 'Fintech',
    level: 'Mid',
    requiredSkills: {
      'rest-api-design': 70,
      'database-optimization': 75,
      'security': 80,
      'async-patterns': 65,
      'testing': 60,
    },
  },
  {
    id: 'fullstack-junior-startup',
    title: 'Full Stack Developer',
    companyType: 'Startup',
    level: 'Junior',
    requiredSkills: {
      'rest-api-design': 50,
      'design-patterns': 45,
      'testing': 40,
      'error-handling': 50,
      'deployment': 40,
    },
  },
  {
    id: 'backend-senior-bigtech',
    title: 'Senior Backend Engineer',
    companyType: 'Big Tech',
    level: 'Senior',
    requiredSkills: {
      'system-design': 85,
      'database-optimization': 80,
      'async-patterns': 80,
      'performance': 75,
      'security': 70,
      'algorithms': 70,
      'design-patterns': 75,
    },
  },
  {
    id: 'frontend-mid-agency',
    title: 'Frontend Developer',
    companyType: 'Digital Agency',
    level: 'Mid',
    requiredSkills: {
      'design-patterns': 65,
      'performance': 60,
      'testing': 55,
      'error-handling': 55,
    },
  },
  {
    id: 'devops-mid-cloud',
    title: 'DevOps Engineer',
    companyType: 'Cloud Provider',
    level: 'Mid',
    requiredSkills: {
      'deployment': 80,
      'security': 70,
      'performance': 65,
      'system-design': 60,
    },
  },
  {
    id: 'backend-junior-saas',
    title: 'Backend Developer',
    companyType: 'SaaS',
    level: 'Junior',
    requiredSkills: {
      'rest-api-design': 55,
      'database-optimization': 50,
      'error-handling': 50,
      'testing': 45,
    },
  },
  {
    id: 'fullstack-senior-enterprise',
    title: 'Senior Full Stack Engineer',
    companyType: 'Enterprise',
    level: 'Senior',
    requiredSkills: {
      'system-design': 80,
      'rest-api-design': 75,
      'design-patterns': 80,
      'testing': 75,
      'security': 70,
      'performance': 70,
      'deployment': 65,
    },
  },
  {
    id: 'data-eng-mid-analytics',
    title: 'Data Engineer',
    companyType: 'Analytics',
    level: 'Mid',
    requiredSkills: {
      'database-optimization': 75,
      'algorithms': 65,
      'data-structures': 65,
      'async-patterns': 60,
      'performance': 60,
    },
  },
];
