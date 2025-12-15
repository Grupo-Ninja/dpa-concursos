
import { Cohort, Task, User, StudentRank, CheckIn, Subject, AppSettings } from '../types';

export const MOCK_COHORTS: Cohort[] = [
  { id: 'c1', name: 'Turma INSS 2024' },
  { id: 'c2', name: 'Turma Receita Federal' },
  { id: 'c3', name: 'Turma Polícia Federal' },
];

export const MOCK_SUBJECTS: Subject[] = [
  { id: 'sub1', name: 'Português', color: '#3b82f6' }, // blue-500
  { id: 'sub2', name: 'Raciocínio Lógico', color: '#f59e0b' }, // amber-500
  { id: 'sub3', name: 'Direito Constitucional', color: '#10b981' }, // emerald-500
  { id: 'sub4', name: 'Informática', color: '#8b5cf6' }, // violet-500
  { id: 'sub5', name: 'Contabilidade Geral', color: '#ef4444' }, // red-500
  { id: 'sub6', name: 'Direito Administrativo', color: '#06b6d4' }, // cyan-500
];

export const MOCK_SETTINGS: AppSettings = {
  schoolName: 'Concursos DPA',
  phone: '(11) 99999-9999',
  email: 'contato@concursosdpa.com.br',
  welcomeMessage: 'Bem-vindo à plataforma de estudos de alto rendimento. A disciplina é a ponte entre metas e realizações.',
  whatsappLink: 'https://chat.whatsapp.com/ExemploDeGrupo'
};

export const MOCK_TASKS: Task[] = [
  // Base Cohort 1 Tasks
  { id: 't1', cohortId: 'c1', subject: 'Português', mode: 'Video', durationMinutes: 120, dayOfWeek: 'Monday', description: 'Assistir aula sobre Crase e Regência Verbal. Fazer anotações dos casos proibidos.' },
  { id: 't2', cohortId: 'c1', subject: 'Raciocínio Lógico', mode: 'Questions', durationMinutes: 60, dayOfWeek: 'Monday', description: 'Resolver 20 questões da banca Cebraspe. Link do caderno: https://qconcursos.com/...' },
  { id: 't3', cohortId: 'c1', subject: 'Direito Constitucional', mode: 'Reading', durationMinutes: 90, dayOfWeek: 'Tuesday', description: 'Ler PDF Aula 03: Direitos Fundamentais (Art. 5º ao 17).' },
  { id: 't4', cohortId: 'c1', subject: 'Informática', mode: 'Review', durationMinutes: 45, dayOfWeek: 'Tuesday', description: 'Revisar atalhos do Windows e conceitos de segurança da informação.' },
  
  // Base Cohort 2 Tasks
  { id: 't5', cohortId: 'c2', subject: 'Contabilidade Geral', mode: 'Video', durationMinutes: 120, dayOfWeek: 'Monday', description: 'Introdução ao Balanço Patrimonial' },

  // Specific Student Task (Alice - s1)
  { id: 't6', cohortId: 'c1', studentId: 's1', subject: 'Mentoria Individual', mode: 'Review', durationMinutes: 30, dayOfWeek: 'Friday', description: 'Revisão de pontos fracos com o professor.' }
];

export const MOCK_STUDENTS: User[] = [
  { id: 's1', name: 'Alice Silva', email: 'alice@example.com', role: 'student', cohortId: 'c1', status: 'active' },
  { id: 's2', name: 'Bob Santos', email: 'bob@example.com', role: 'student', cohortId: 'c1', status: 'pending' },
  { id: 's3', name: 'Carlos Lima', email: 'carlos@example.com', role: 'student', cohortId: 'c1', status: 'active' },
];

export const MOCK_RANKING: StudentRank[] = [
  { id: 's1', name: 'Alice Silva', efficiency: 92, totalHours: 24, trend: 'up', failures: 0, cohortId: 'c1', status: 'active' },
  { id: 's3', name: 'Carlos Lima', efficiency: 85, totalHours: 20, trend: 'stable', failures: 2, cohortId: 'c1', status: 'active' },
  { id: 's4', name: 'Diana Prince', efficiency: 70, totalHours: 15, trend: 'down', failures: 5, cohortId: 'c2', status: 'active' },
  { id: 's5', name: 'Eduardo M.', efficiency: 45, totalHours: 5, trend: 'down', failures: 8, cohortId: 'c2', status: 'blocked' },
];

export const MOCK_CHECKINS: CheckIn[] = [
  { id: 'ck1', taskId: 't1', studentId: 's1', completed: true, actualDurationMinutes: 125, timestamp: '2023-11-24T10:00:00', note: 'A aula foi excelente, entendi tudo sobre crase.', period: 'Morning' },
  { id: 'ck2', taskId: 't3', studentId: 's1', completed: false, reasonForFailure: 'Tired', timestamp: '2023-11-23T19:30:00', period: 'Night' },
  { id: 'ck3', taskId: 't2', studentId: 's1', completed: true, actualDurationMinutes: 55, timestamp: '2023-11-22T14:00:00', period: 'Afternoon' },
  { id: 'ck4', taskId: 't4', studentId: 's1', completed: true, actualDurationMinutes: 50, timestamp: '2023-11-21T16:00:00', note: 'Revisão rápida.', period: 'Afternoon' },
];

export const FAILURE_REASONS = [
  { label: 'Trabalho', value: 'Work' },
  { label: 'Cansaço', value: 'Tired' },
  { label: 'Sono', value: 'Sleep' },
  { label: 'Fome', value: 'Hungry' },
  { label: 'Imprevisto', value: 'Other' },
];

// --- Novos Dados para Gráficos do Dashboard ---

export const MOCK_DAILY_AVERAGE = [
  { day: 'Seg', hours: 3.2 },
  { day: 'Ter', hours: 4.5 },
  { day: 'Qua', hours: 2.8 },
  { day: 'Qui', hours: 5.1 },
  { day: 'Sex', hours: 3.5 },
  { day: 'Sáb', hours: 6.0 },
  { day: 'Dom', hours: 1.5 },
];

export const MOCK_SUBJECT_RANKING = [
  { subject: 'Português', hours: 145 },
  { subject: 'Dir. Const.', hours: 120 },
  { subject: 'RLM', hours: 98 },
  { subject: 'Informática', hours: 75 },
  { subject: 'Dir. Adm.', hours: 60 },
];

export const MOCK_COHORT_STATS = [
  { name: 'INSS 2024', totalHours: 450, failures: 12 },
  { name: 'Receita Federal', totalHours: 320, failures: 8 },
  { name: 'Polícia Federal', totalHours: 210, failures: 15 },
];
