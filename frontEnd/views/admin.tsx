
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User, Task, Cohort, StudentRank, Subject, AppSettings } from '../types';
import { Button, Card, Badge, Input, Select, Modal, TextArea, BrandLogo } from '../components/ui';
import { LayoutDashboard, Users, BookOpen, Settings, Check, X, TrendingUp, AlertTriangle, LogOut, Plus, GraduationCap, AlignLeft, ChevronDown, Edit2, Trash2, Filter, Search, Lock, Unlock, ArrowRightLeft, Copy, User as UserIcon, RefreshCw, Files, Palette, MessageSquare, Phone, Link, Library, List, Menu as MenuIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { pb } from './lib/pocketbase'; // <--- Import do Backend

interface AdminViewProps {
  user: User;
  onLogout: () => void;
  subjects: Subject[];
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>;
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
}

const COLORS = ['#0f172a', '#d97706', '#94a3b8', '#cbd5e1'];

interface AdminDashboardProps {
  cohorts: Cohort[];
  subjects: Subject[];
}

// --- Admin Dashboard (COM DADOS REAIS) ---
const AdminDashboard: React.FC<AdminDashboardProps> = ({ cohorts, subjects }) => {
  // --- States de Filtro ---
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCohort, setSelectedCohort] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');

  // --- States de Dados Reais ---
  const [students, setStudents] = useState<User[]>([]);
  const [checkins, setCheckins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // --- States dos Gráficos ---
  const [kpis, setKpis] = useState({ totalStudents: 0, efficiency: 0, topFailure: 'Nenhum' });
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [subjectData, setSubjectData] = useState<any[]>([]);
  const [cohortData, setCohortData] = useState<any[]>([]);
  const [failureData, setFailureData] = useState<any[]>([]);

  // 1. Carregar Tudo (Alunos e Checkins)
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // Busca Alunos
        const users = await pb.collection('users').getFullList({ filter: 'role="student"' });
        setStudents(users.map((u: any) => ({ id: u.id, name: u.name, cohortId: u.cohort, status: u.status } as User)));

        // Busca Histórico (Checkins) com detalhes da Tarefa e do Aluno
        const history = await pb.collection('checkins').getFullList({
          sort: '-timestamp',
          expand: 'task,student'
        });
        setCheckins(history);

        processAnalytics(users, history);

      } catch (err) {
        console.error("Erro ao carregar dashboard:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // 2. Processar Dados (Recalcula quando os filtros mudam)
  useEffect(() => {
    processAnalytics(students, checkins);
  }, [selectedCohort, selectedSubject, selectedStudent, startDate, endDate, students, checkins]);

  // 2. Ação de Aprovar/Rejeitar
  const handleStudentAction = async (studentId: string, action: 'approve' | 'reject') => {
    const newStatus = action === 'approve' ? 'active' : 'blocked';
    try {
      if (action === 'reject') {
        await pb.collection('users').update(studentId, { status: 'blocked' });
      } else {
        await pb.collection('users').update(studentId, { status: 'active' });
      }
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, status: newStatus } : s));
    } catch (err) {
      alert("Erro ao processar solicitação.");
    }
  };

  const processAnalytics = (usersList: any[], historyList: any[]) => {
    // --- Filtragem ---
    let filteredHistory = historyList.filter(item => {
      const task = item.expand?.task;
      const student = item.expand?.student;

      if (selectedCohort && student?.cohort !== selectedCohort) return false;
      if (selectedStudent && item.student !== selectedStudent) return false;
      if (selectedSubject && task?.subject !== selectedSubject) return false;
      if (startDate && new Date(item.timestamp) < new Date(startDate)) return false;
      if (endDate && new Date(item.timestamp) > new Date(endDate)) return false;

      return true;
    });

    // --- KPI: Total Alunos ---
    // Se tiver filtro de turma, conta só da turma. Senão, todos.
    const filteredStudentsCount = selectedCohort
      ? usersList.filter(u => u.cohortId === selectedCohort).length
      : usersList.length;

    // --- KPI: Eficiência (Concluídos / Total Tentados) ---
    const totalCheckins = filteredHistory.length;
    const completedCheckins = filteredHistory.filter(h => h.completed).length;
    const efficiency = totalCheckins > 0 ? Math.round((completedCheckins / totalCheckins) * 100) : 0;

    // --- KPI: Maior Motivo de Falha ---
    const failures = filteredHistory.filter(h => !h.completed && h.reasonForFailure);
    const failureCounts: Record<string, number> = {};
    failures.forEach(f => {
      const reason = f.reasonForFailure || 'Outros';
      failureCounts[reason] = (failureCounts[reason] || 0) + 1;
    });
    const topFailure = Object.entries(failureCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Nenhum';

    setKpis({ totalStudents: filteredStudentsCount, efficiency, topFailure });

    // --- GRÁFICO 1: Média Diária (Por dia da semana) ---
    const daysMap = { 'Monday': 'Seg', 'Tuesday': 'Ter', 'Wednesday': 'Qua', 'Thursday': 'Qui', 'Friday': 'Sex', 'Saturday': 'Sáb', 'Sunday': 'Dom' };
    const dailyStats: Record<string, number> = { 'Seg': 0, 'Ter': 0, 'Qua': 0, 'Qui': 0, 'Sex': 0, 'Sáb': 0, 'Dom': 0 };

    filteredHistory.forEach(h => {
      if (h.completed) {
        // Tenta pegar o dia da tarefa, ou calcula pelo timestamp
        const dayKey = h.expand?.task?.dayOfWeek;
        if (dayKey && daysMap[dayKey as keyof typeof daysMap]) {
          const label = daysMap[dayKey as keyof typeof daysMap];
          // Soma horas (minutos / 60)
          dailyStats[label] += (h.actualDurationMinutes || 0) / 60;
        }
      }
    });

    // Formata para o Recharts e faz média (dividir pelo numero de alunos filtrados ou 1)
    const divider = filteredStudentsCount || 1;
    const dailyChartData = Object.entries(dailyStats).map(([day, totalHours]) => ({
      day,
      hours: parseFloat((totalHours / divider).toFixed(1)) // Média por aluno
    }));
    setDailyData(dailyChartData);

    // --- GRÁFICO 2: Top Disciplinas ---
    const subjectStats: Record<string, number> = {};
    filteredHistory.filter(h => h.completed).forEach(h => {
      const subj = h.expand?.task?.subject || 'Outros';
      subjectStats[subj] = (subjectStats[subj] || 0) + (h.actualDurationMinutes || 0) / 60;
    });
    const subjectChartData = Object.entries(subjectStats)
      .map(([subject, hours]) => ({ subject, hours: Math.round(hours) }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 5); // Top 5
    setSubjectData(subjectChartData);

    // --- GRÁFICO 3: Distribuição de Falhas (Pie Chart) ---
    const failureChartData = Object.entries(failureCounts).map(([name, value]) => ({ name, value }));
    setFailureData(failureChartData);

    // --- GRÁFICO 4: Desempenho por Turma (Só faz sentido se não tiver filtro de turma) ---
    const cohortStats: Record<string, { total: number, fails: number }> = {};

    // Usa a lista completa de histórico para comparar turmas, ignorando filtro de turma atual
    historyList.forEach(h => {
      const cohortName = h.expand?.student?.expand?.cohort?.name || 'Sem Turma'; // Deep expand seria necessario, ou linkar pelo ID
      // Simplificação: Vamos usar o cohortId do aluno e buscar o nome na lista de cohorts passada via props
      const stud = usersList.find(u => u.id === h.student);
      const cId = stud?.cohortId;
      const cName = cohorts.find(c => c.id === cId)?.name || 'Sem Turma';

      if (!cohortStats[cName]) cohortStats[cName] = { total: 0, fails: 0 };

      if (h.completed) cohortStats[cName].total += (h.actualDurationMinutes || 0) / 60;
      else cohortStats[cName].fails += 1;
    });

    const cohortChartData = Object.entries(cohortStats).map(([name, stats]) => ({
      name,
      totalHours: Math.round(stats.total),
      failures: stats.fails
    }));
    setCohortData(cohortChartData);
  };

  // Opções para o Select de Alunos
  const studentOptions = useMemo(() => {
    let filtered = students.filter(s => s.status === 'active');
    if (selectedCohort) {
      filtered = filtered.filter(s => s.cohortId === selectedCohort);
    }
    return filtered.map(s => ({ value: s.id, label: s.name }));
  }, [selectedCohort, students]);

  const handleClearFilters = () => {
    setStartDate(''); setEndDate(''); setSelectedCohort(''); setSelectedSubject(''); setSelectedStudent('');
  };

  return (
    <div className="space-y-8">
      {/* Filters Section */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 font-['Playfair_Display'] text-lg leading-none">Filtros de Análise</h3>
            </div>
          </div>
          <button onClick={handleClearFilters} className="text-xs font-semibold text-slate-400 hover:text-amber-500 transition-colors">
            Limpar tudo
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Input type="date" label="De" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="text-base md:text-sm border-slate-200 bg-slate-50/50 focus:bg-white" />
          <Input type="date" label="Até" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="text-base md:text-sm border-slate-200 bg-slate-50/50 focus:bg-white" />
          <Select label="Turma" value={selectedCohort} onChange={(e) => { setSelectedCohort(e.target.value); setSelectedStudent(''); }}
            options={[{ value: '', label: 'Todas as Turmas' }, ...cohorts.map(c => ({ value: c.id, label: c.name }))]} className="text-base md:text-sm border-slate-200 bg-slate-50/50 focus:bg-white" />
          <Select label="Disciplina" value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}
            options={[{ value: '', label: 'Todas as Disciplinas' }, ...subjects.map(s => ({ value: s.name, label: s.name }))]} className="text-base md:text-sm border-slate-200 bg-slate-50/50 focus:bg-white" />
          <Select label="Aluno" value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)}
            options={[{ value: '', label: 'Todos os Alunos' }, ...studentOptions]} disabled={studentOptions.length === 0} className="text-base md:text-sm border-slate-200 bg-slate-50/50 focus:bg-white" />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="flex flex-col border-l-4 border-l-slate-900">
          <span className="text-slate-500 text-sm font-medium">Total de Alunos (Filtro)</span>
          <span className="text-3xl font-bold text-slate-900 mt-2 font-['Playfair_Display']">
            {loading ? '...' : kpis.totalStudents}
          </span>
        </Card>
        <Card className="flex flex-col border-l-4 border-l-emerald-500">
          <span className="text-slate-500 text-sm font-medium">Eficiência Média</span>
          <span className="text-3xl font-bold text-emerald-600 mt-2 font-['Playfair_Display']">{kpis.efficiency}%</span>
        </Card>
        <Card className="flex flex-col border-l-4 border-l-amber-500">
          <span className="text-slate-500 text-sm font-medium">Maior Motivo de Falha</span>
          <span className="text-3xl font-bold text-amber-500 mt-2 font-['Playfair_Display'] truncate" title={kpis.topFailure}>{kpis.topFailure}</span>
        </Card>
      </div>

      {/* Row 1: Daily Average & Subject Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <h3 className="font-bold text-lg text-slate-900 mb-6 font-['Playfair_Display']">Média de Horas Estudadas (Diário)</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData} margin={{ top: 5, right: 30, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }} />
                <Line type="monotone" dataKey="hours" name="Horas" stroke="#f59e0b" strokeWidth={3} dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 className="font-bold text-lg text-slate-900 mb-6 font-['Playfair_Display']">Top Disciplinas</h3>
          <div className="h-72 w-full">
            {subjectData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={subjectData} margin={{ top: 0, right: 0, left: 40, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="subject" type="category" width={100} axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }} />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="hours" name="Horas Totais" fill="#0f172a" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">Sem dados de disciplinas</div>
            )}
          </div>
        </Card>
      </div>

      {/* Row 2: Cohort Stats & Failures */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <h3 className="font-bold text-lg text-slate-900 mb-6 font-['Playfair_Display']">Desempenho por Turma</h3>
          <div className="h-64 w-full">
            {cohortData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cohortData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="totalHours" name="Horas Totais" fill="#0f172a" radius={[4, 4, 0, 0]} barSize={30} />
                  <Bar dataKey="failures" name="Falhas Registradas" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">Sem dados de turmas</div>
            )}
          </div>
        </Card>

        <Card>
          <h3 className="font-bold text-lg text-slate-900 mb-6 font-['Playfair_Display']">Distribuição de Falhas</h3>
          <div className="h-64 w-full flex items-center justify-center">
            {failureData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={failureData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {failureData.map((entry, index) => (
                      <Cell key={`cell - ${index} `} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" layout="vertical" verticalAlign="middle" align="right" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">Sem falhas registradas</div>
            )}
          </div>
        </Card>
      </div>

      {/* Pending Approvals (Mantido Real) */}
      <Card>
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg text-slate-900 font-['Playfair_Display']">Aprovações Pendentes</h3>
          <Badge color="amber">
            {students.filter(s => s.status === 'pending').length} novos
          </Badge>
        </div>
        <div className="space-y-4">
          {students.filter(s => s.status === 'pending').map(student => (
            <div key={student.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center font-bold text-slate-600">
                  {student.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-slate-900">{student.name}</p>
                  <p className="text-xs text-slate-500">{student.email}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleStudentAction(student.id, 'approve')}
                  className="p-2 bg-white border border-slate-200 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition-colors"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleStudentAction(student.id, 'reject')}
                  className="p-2 bg-white border border-slate-200 rounded-lg text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {students.filter(s => s.status === 'pending').length === 0 && (
            <p className="text-slate-400 text-sm text-center py-4">Nenhuma aprovação pendente.</p>
          )}
        </div>
      </Card>
    </div>
  );
};

// --- Cohorts Management View ---
const CohortsView: React.FC<{ cohorts: Cohort[], setCohorts: React.Dispatch<React.SetStateAction<Cohort[]>> }> = ({ cohorts, setCohorts }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCohort, setEditingCohort] = useState<Cohort | null>(null);
  const [newCohortName, setNewCohortName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleOpenModal = (cohort?: Cohort) => {
    if (cohort) {
      setEditingCohort(cohort);
      setNewCohortName(cohort.name);
    } else {
      setEditingCohort(null);
      setNewCohortName('');
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCohortName.trim()) return;
    setLoading(true);
    try {
      if (editingCohort) {
        await pb.collection('cohorts').update(editingCohort.id, { name: newCohortName });
        setCohorts(prev => prev.map(c => c.id === editingCohort.id ? { ...c, name: newCohortName } : c));
      } else {
        const record = await pb.collection('cohorts').create({ name: newCohortName });
        setCohorts(prev => [...prev, { id: record.id, name: record.name }]);
      }
      setIsModalOpen(false); setNewCohortName(''); setEditingCohort(null);
    } catch (err) {
      alert("Erro ao salvar.");
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h3 className="text-lg font-bold text-slate-900 font-['Playfair_Display']">Turmas Cadastradas</h3><p className="text-slate-500 text-sm">Gerencie as turmas ativas.</p></div>
        <Button icon={Plus} onClick={() => handleOpenModal()}>Nova Turma</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cohorts.map((cohort) => (
          <Card key={cohort.id} className="hover:border-amber-200 transition-colors group relative overflow-hidden">
            <div className="flex justify-between items-start z-10 relative">
              <div className="w-10 h-10 bg-slate-900 text-amber-500 rounded-xl flex items-center justify-center mb-3"><GraduationCap className="w-5 h-5" /></div>
              <button onClick={(e) => { e.stopPropagation(); handleOpenModal(cohort); }} className="text-slate-300 hover:text-amber-500 p-2 rounded-full hover:bg-amber-50 transition-colors"><Edit2 className="w-4 h-4" /></button>
            </div>
            <h4 className="font-bold text-slate-900">{cohort.name}</h4>
            <p className="text-sm text-slate-500 mt-1">ID: {cohort.id}</p>
          </Card>
        ))}
      </div>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCohort ? "Editar Turma" : "Nova Turma"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nome da Turma" placeholder="Ex: Turma PRF 2025" value={newCohortName} onChange={(e) => setNewCohortName(e.target.value)} required autoFocus />
          <Button type="submit" fullWidth disabled={loading}>{loading ? 'Salvando...' : (editingCohort ? 'Salvar Alterações' : 'Criar Turma')}</Button>
        </form>
      </Modal>
    </div>
  );
};

// --- Subjects Management View ---
const SubjectsView: React.FC<{ subjects: Subject[], setSubjects: React.Dispatch<React.SetStateAction<Subject[]>> }> = ({ subjects, setSubjects }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [loading, setLoading] = useState(false);

  const colors = [
    { label: 'Blue', value: '#3b82f6' }, { label: 'Cyan', value: '#06b6d4' }, { label: 'Teal', value: '#14b8a6' },
    { label: 'Green', value: '#22c55e' }, { label: 'Yellow', value: '#eab308' }, { label: 'Amber', value: '#f59e0b' },
    { label: 'Orange', value: '#f97316' }, { label: 'Red', value: '#ef4444' }, { label: 'Pink', value: '#ec4899' },
    { label: 'Purple', value: '#a855f7' }, { label: 'Violet', value: '#8b5cf6' }, { label: 'Indigo', value: '#6366f1' },
    { label: 'Slate', value: '#64748b' }, { label: 'Zinc', value: '#71717a' },
  ];

  const handleOpenModal = (subject?: Subject) => {
    if (subject) { setEditingSubject(subject); setName(subject.name); setColor(subject.color); } else { setEditingSubject(null); setName(''); setColor('#3b82f6'); }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      if (editingSubject) {
        await pb.collection('subjects').update(editingSubject.id, { name, color });
        setSubjects(prev => prev.map(s => s.id === editingSubject.id ? { ...s, name, color } : s));
      } else {
        const record = await pb.collection('subjects').create({ name, color });
        setSubjects(prev => [...prev, { id: record.id, name: record.name, color: record.color }]);
      }
      setIsModalOpen(false);
    } catch (err) { alert("Erro ao salvar."); } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h3 className="text-lg font-bold text-slate-900 font-['Playfair_Display']">Disciplinas</h3><p className="text-slate-500 text-sm">Gerencie as matérias do curso.</p></div>
        <Button icon={Plus} onClick={() => handleOpenModal()}>Nova Disciplina</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {subjects.map((sub) => (
          <Card key={sub.id} className="hover:border-amber-200 transition-colors group relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="w-5 h-5 rounded-full border border-slate-200" style={{ backgroundColor: sub.color }}></div>
                <button onClick={(e) => { e.stopPropagation(); handleOpenModal(sub); }} className="text-slate-300 hover:text-amber-500 transition-colors"><Edit2 className="w-4 h-4" /></button>
              </div>
              <h4 className="font-bold text-slate-900 text-lg leading-tight">{sub.name}</h4>
              <p className="text-xs text-slate-400 mt-2 uppercase tracking-wider">{sub.color}</p>
            </div>
          </Card>
        ))}
      </div>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingSubject ? "Editar Disciplina" : "Nova Disciplina"}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input label="Nome da Matéria" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Direito Penal" required autoFocus />
          <div>
            <label className="text-sm font-medium text-slate-700 ml-1 block mb-2">Cor de Identificação</label>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3">{colors.map(c => (<button key={c.value} type="button" onClick={() => setColor(c.value)} className={`w-8 h-8 rounded-full border-2 transition-transform ${color === c.value ? 'border-slate-900 scale-110' : 'border-transparent hover:scale-105'}`} style={{ backgroundColor: c.value }} title={c.label} />))}</div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">Ou digite o código:</span>
                <div className="relative flex-1">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-slate-200" style={{ backgroundColor: color }}></div>
                  <input type="text" value={color} onChange={(e) => setColor(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-200" placeholder="#000000" />
                </div>
              </div>
            </div>
          </div>
          <Button type="submit" fullWidth disabled={loading}>{loading ? 'Salvando...' : (editingSubject ? 'Salvar Alterações' : 'Adicionar')}</Button>
        </form>
      </Modal>
    </div>
  );
}

// --- Settings View ---
const SettingsView: React.FC<{ settings: AppSettings, setSettings: React.Dispatch<React.SetStateAction<AppSettings>> }> = ({ settings, setSettings }) => {
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      try {
        const record = await pb.collection('settings').getFirstListItem('');
        await pb.collection('settings').update(record.id, settings);
      } catch (err) {
        await pb.collection('settings').create(settings);
      }
      alert('Configurações salvas!');
    } catch (err) { alert('Erro ao salvar.'); } finally { setLoading(false); }
  };

  // Ícone Helper Component
  const SectionHeader: React.FC<{ icon: React.ElementType, title: string }> = ({ icon: Icon, title }) => (
    <div className="flex items-center gap-3 mb-6">
      <div className="bg-amber-50 p-2 rounded-lg text-amber-600"><Icon className="w-5 h-5" /></div>
      <h4 className="text-lg font-bold text-slate-800">{title}</h4>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h3 className="text-xl font-bold text-slate-900 font-['Playfair_Display']">Configurações Gerais</h3>
        <p className="text-slate-500 text-sm">Personalize a identidade e contatos da escola.</p>
      </div>

      {/* CARD 1: Info Básica */}
      <Card className="p-6 !rounded-[16px] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border-0">
        <SectionHeader icon={Settings} title="Informações Básicas" />
        <div className="grid grid-cols-1 gap-5">
          <Input
            label="Nome da Escola (Logo)"
            value={settings.schoolName}
            onChange={(e) => setSettings({ ...settings, schoolName: e.target.value })}
            placeholder="Ex: Concursos DPA"
            icon={Library}
          />
          <Input
            label="Nome da Orientadora"
            value={settings.instructorName}
            onChange={(e) => setSettings({ ...settings, instructorName: e.target.value })}
            placeholder="Ex: Prof. Elaine Reis"
            icon={UserIcon}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input
              label="Telefone de Contato"
              value={settings.phone}
              onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
              icon={Phone}
            />
            <Input
              label="Email de Suporte"
              value={settings.email}
              onChange={(e) => setSettings({ ...settings, email: e.target.value })}
              type="email"
              icon={MessageSquare}
            />
          </div>
        </div>
      </Card>

      {/* CARD 2: Comunicação */}
      <Card className="p-6 !rounded-[16px] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border-0">
        <SectionHeader icon={MessageSquare} title="Comunicação" />
        <div className="space-y-5">
          <TextArea
            label="Frase Motivacional (Topo do App)"
            value={settings.welcomeMessage}
            onChange={(e) => setSettings({ ...settings, welcomeMessage: e.target.value })}
            placeholder="Ex: Hoje é um ótimo dia para evoluir."
            className="bg-slate-50"
          />
          <Input
            label="Link do Grupo WhatsApp"
            value={settings.whatsappLink}
            onChange={(e) => setSettings({ ...settings, whatsappLink: e.target.value })}
            placeholder="https://chat.whatsapp.com/..."
            icon={Link}
          />
        </div>
      </Card>

      <div className="pt-2">
        <Button
          onClick={handleSave}
          fullWidth
          disabled={loading}
          className="py-4 text-base font-bold shadow-xl shadow-slate-900/10"
        >
          {loading ? 'Salvando...' : 'Salvar Todas as Configurações'}
        </Button>
      </div>
    </div>
  );
}

// --- Planner View ---
const PlannerView: React.FC<{ cohorts: Cohort[], subjects: Subject[] }> = ({ cohorts, subjects }) => {
  const [selectedCohortId, setSelectedCohortId] = useState(cohorts[0]?.id || '');
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [planMode, setPlanMode] = useState<'base' | 'student'>('base');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [isTaskModalOpen, setTaskModalOpen] = useState(false);
  const [localTasks, setLocalTasks] = useState<Task[]>([]);
  const [cohortStudents, setCohortStudents] = useState<User[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [importConflictModalOpen, setImportConflictModalOpen] = useState(false);

  // 1. STATE PARA MODOS DINÂMICOS
  const [availableModes, setAvailableModes] = useState<any[]>([]);

  // Form State
  const [newTaskSubject, setNewTaskSubject] = useState(subjects[0]?.name || '');
  const [newTaskMode, setNewTaskMode] = useState<Task['mode']>('Video');
  const [newTaskDuration, setNewTaskDuration] = useState('60');
  const [newTaskDesc, setNewTaskDesc] = useState('');

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // --- Drag Scroll Logic ---
  const daysContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!daysContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - daysContainerRef.current.offsetLeft);
    setScrollLeft(daysContainerRef.current.scrollLeft);
  };
  const handleMouseLeave = () => {
    setIsDragging(false);
  };
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !daysContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - daysContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Scroll-fast
    daysContainerRef.current.scrollLeft = scrollLeft - walk;
  };
  // -------------------------

  // Sincronia: Seleciona a primeira turma
  useEffect(() => {
    if (cohorts.length > 0 && !selectedCohortId) {
      setSelectedCohortId(cohorts[0].id);
    }
  }, [cohorts, selectedCohortId]);

  // 2. BUSCAR MODOS DE ESTUDO DO BANCO
  useEffect(() => {
    const fetchModes = async () => {
      try {
        const records = await pb.collection('study_modes').getFullList({ sort: 'label' });
        setAvailableModes(records);
      } catch (err) {
        // Fallback
        setAvailableModes([
          { label: 'Vídeo Aula', value: 'Video' },
          { label: 'Leitura', value: 'Reading' },
          { label: 'Questões', value: 'Questions' },
          { label: 'Revisão', value: 'Review' }
        ]);
      }
    };
    fetchModes();
  }, []);

  // Carregar Dados
  useEffect(() => {
    if (!selectedCohortId) return;

    async function loadData() {
      try {
        const resultList = await pb.collection('tasks').getList(1, 500); // Sem filtro API

        let tasksForThisCohort = resultList.items.filter((t: any) => t.cohort === selectedCohortId);
        tasksForThisCohort.sort((a: any, b: any) => new Date(b.created).getTime() - new Date(a.created).getTime());

        const mappedTasks: Task[] = tasksForThisCohort.map((r: any) => ({
          id: r.id, cohortId: r.cohort, studentId: r.student || undefined,
          subject: r.subject, mode: r.mode, durationMinutes: r.durationMinutes,
          dayOfWeek: r.dayOfWeek, description: r.description
        }));
        setLocalTasks(mappedTasks);

        const studentRecords = await pb.collection('users').getFullList({
          filter: `cohort = "${selectedCohortId}" && role = "student"`,
          sort: 'name'
        });
        const mappedStudents: User[] = studentRecords.map((r: any) => ({
          id: r.id, name: r.name, email: r.email, role: r.role, status: r.status, cohortId: r.cohort
        }));
        setCohortStudents(mappedStudents);

      } catch (err) { console.error("Erro no Planner:", err); }
    }
    loadData();
  }, [selectedCohortId]);

  // Lógica inteligente de Badge
  const isTrulyPersonalized = (task: Task) => {
    if (!task.studentId) return false;
    const isCopyFromBase = localTasks.some(baseTask =>
      !baseTask.studentId &&
      baseTask.subject === task.subject &&
      baseTask.dayOfWeek === task.dayOfWeek &&
      baseTask.cohortId === task.cohortId
    );
    return !isCopyFromBase;
  };

  const filteredTasks = localTasks.filter(t => {
    const isDayMatch = t.dayOfWeek === selectedDay;
    const isCohortMatch = t.cohortId === selectedCohortId;
    if (planMode === 'base') return isDayMatch && isCohortMatch && !t.studentId;
    else return isDayMatch && t.studentId === selectedStudentId;
  });

  const studentHasTasks = useMemo(() => {
    if (!selectedStudentId) return false;
    return localTasks.some(t => t.studentId === selectedStudentId);
  }, [localTasks, selectedStudentId]);

  const handleOpenCreate = () => {
    if (planMode === 'student' && !selectedStudentId) { alert("Selecione um aluno primeiro."); return; }
    setEditingTask(null); setNewTaskSubject(subjects[0]?.name || '');
    // Define o primeiro modo da lista como padrão
    setNewTaskMode(availableModes[0]?.value || 'Video');
    setNewTaskDuration('60'); setNewTaskDesc(''); setTaskModalOpen(true);
  };

  const handleOpenEdit = (task: Task) => {
    setEditingTask(task); setNewTaskSubject(task.subject); setNewTaskMode(task.mode); setNewTaskDuration(task.durationMinutes.toString()); setNewTaskDesc(task.description || ''); setTaskModalOpen(true);
  };

  const handleSaveTask = async () => {
    const duration = parseInt(newTaskDuration) || 60;
    const payload = {
      cohort: selectedCohortId,
      student: planMode === 'student' ? selectedStudentId : null,
      subject: newTaskSubject,
      mode: newTaskMode,
      durationMinutes: duration,
      dayOfWeek: selectedDay,
      description: newTaskDesc
    };
    try {
      if (editingTask) {
        await pb.collection('tasks').update(editingTask.id, payload);
        setLocalTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...payload, cohortId: selectedCohortId, studentId: payload.student || undefined } : t));
      } else {
        const record = await pb.collection('tasks').create(payload);
        const newTask: Task = { id: record.id, cohortId: selectedCohortId, studentId: payload.student || undefined, subject: newTaskSubject, mode: newTaskMode, durationMinutes: duration, dayOfWeek: selectedDay, description: newTaskDesc };
        setLocalTasks(prev => [...prev, newTask]);
      }
      setTaskModalOpen(false);
    } catch (err) { alert("Erro ao salvar."); }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (confirm('Tem certeza que deseja excluir esta aula?')) {
      try { await pb.collection('tasks').delete(taskId); setLocalTasks(prev => prev.filter(t => t.id !== taskId)); } catch (err) { console.error(err); }
    }
  };

  const executeImport = async (strategy: 'merge' | 'replace') => {
    const baseTasks = localTasks.filter(t => t.cohortId === selectedCohortId && !t.studentId);
    if (baseTasks.length === 0) { alert("Sem base para importar."); setImportConflictModalOpen(false); return; }
    try {
      if (strategy === 'replace') {
        const tasksToDelete = localTasks.filter(t => t.studentId === selectedStudentId);
        await Promise.all(tasksToDelete.map(t => pb.collection('tasks').delete(t.id)));
        setLocalTasks(prev => prev.filter(t => t.studentId !== selectedStudentId));
      }
      const promises = baseTasks.map(baseTask => {
        return pb.collection('tasks').create({ cohort: selectedCohortId, student: selectedStudentId, subject: baseTask.subject, mode: baseTask.mode, durationMinutes: baseTask.durationMinutes, dayOfWeek: baseTask.dayOfWeek, description: baseTask.description });
      });
      const newRecords = await Promise.all(promises);
      const newTasksUI: Task[] = newRecords.map((r: any) => ({ id: r.id, cohortId: r.cohort, studentId: r.student, subject: r.subject, mode: r.mode, durationMinutes: r.durationMinutes, dayOfWeek: r.dayOfWeek, description: r.description }));
      setLocalTasks(prev => [...prev, ...newTasksUI]);
      setImportConflictModalOpen(false); alert("Importação concluída!");
    } catch (err) { alert("Erro ao importar."); }
  };

  const getSubjectColor = (subjName: string) => { const s = subjects.find(sub => sub.name === subjName); return s ? s.color : '#94a3b8'; };

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)] h-auto">
      {/* ... (Topo com seletores de turma e botões Base/Aluno - Mantido igual) ... */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm mb-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="w-full sm:w-auto">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">Turma</label>
                <div className="relative group min-w-[220px]">
                  <select value={selectedCohortId} onChange={(e) => { setSelectedCohortId(e.target.value); setSelectedStudentId(''); }} className="appearance-none w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-semibold rounded-xl pl-4 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all cursor-pointer hover:bg-slate-100">
                    {cohorts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-4 h-4 group-hover:text-amber-500 transition-colors" />
                </div>
              </div>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto self-end sm:self-auto sm:mt-6">
              <button onClick={() => setPlanMode('base')} className={`flex-1 sm:flex-none justify-center px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${planMode === 'base' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Users className="w-4 h-4" /> Base da Turma</button>
              <button onClick={() => setPlanMode('student')} className={`flex-1 sm:flex-none justify-center px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${planMode === 'student' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><UserIcon className="w-4 h-4" /> Aluno Específico</button>
            </div>
          </div>
        </div>
        {planMode === 'student' && (
          <div className="animate-in slide-in-from-top-2 duration-200 border-t border-slate-100 pt-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-full sm:w-auto min-w-[300px]">
                <label className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-1 block">Selecione o Aluno</label>
                <Select options={[{ value: '', label: 'Selecione um aluno...' }, ...cohortStudents.map(s => ({ value: s.id, label: s.name }))]} value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} className="border-amber-200 focus:ring-amber-200" />
              </div>
            </div>
            {selectedStudentId && !studentHasTasks && (<p className="text-xs text-slate-500 mt-2 flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-amber-500" /> Este aluno ainda não possui um cronograma personalizado. Comece do zero ou importe a base no botão acima.</p>)}
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-6 h-auto">
        {/* ... (Menu lateral de Dias da Semana com Drag) ... */}
        <div
          ref={daysContainerRef}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          className="w-full md:w-40 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-y-auto pb-2 md:pb-0 shrink-0 scrollbar-hide snap-x snap-mandatory cursor-grab active:cursor-grabbing select-none"
        >
          {days.map(day => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`flex-shrink-0 text-center md:text-left px-4 py-3 rounded-xl text-sm font-medium transition-all snap-start scroll-ml-2 ${selectedDay === day ? 'bg-slate-900 text-white shadow-md shadow-slate-300 transform scale-105 sticky left-0 z-10' : 'bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-transparent hover:border-slate-200'}`}
            >
              {day === 'Monday' ? 'Segunda' : day === 'Tuesday' ? 'Terça' : day === 'Wednesday' ? 'Quarta' : day === 'Thursday' ? 'Quinta' : day === 'Friday' ? 'Sexta' : day === 'Saturday' ? 'Sábado' : 'Domingo'}
            </button>
          ))}
        </div>

        <div className="flex-1 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm overflow-visible flex flex-col relative h-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 py-2 border-b border-slate-50 gap-4 shrink-0">
            <div><h2 className="text-xl font-bold text-slate-900 font-['Playfair_Display']">{planMode === 'base' ? 'Cronograma Geral' : `Cronograma de ${cohortStudents.find(s => s.id === selectedStudentId)?.name || 'Aluno'} `}</h2><p className="text-xs text-slate-500">{planMode === 'base' ? 'Todas as edições aqui afetam novos alunos.' : 'Edições aqui são exclusivas deste aluno.'}</p></div>
            <div className="flex gap-2 w-full sm:w-auto">
              {planMode === 'student' && selectedStudentId && (<Button onClick={() => selectedStudentId && studentHasTasks ? setImportConflictModalOpen(true) : executeImport('merge')} icon={Copy} variant="outline" className="border-amber-200 text-amber-700 hover:bg-amber-50 flex-1 sm:flex-none">Importar Base</Button>)}
              <Button icon={Plus} onClick={handleOpenCreate} disabled={planMode === 'student' && !selectedStudentId} className={`flex-1 sm:flex-none ${planMode === 'student' && !selectedStudentId ? 'opacity-50 cursor-not-allowed' : ''}`}>Adicionar Aula</Button>
            </div>
          </div>
          <div className="h-auto -mx-6 px-6 relative">
            <div className="space-y-3 pb-6">
              {filteredTasks.map(task => (
                <div key={task.id} className="flex flex-col p-4 border border-slate-100 rounded-xl hover:border-amber-200 transition-all group bg-white hover:shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-1.5 h-12 rounded-full mt-1" style={{ backgroundColor: getSubjectColor(task.subject) }}></div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-lg leading-tight">{task.subject}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge color="gray">{task.mode}</Badge>
                          <span className="text-xs text-slate-400 font-medium">• {task.durationMinutes} min</span>
                          {/* Lógica do Badge: Só mostra 'Personalizado' se NÃO for cópia da base */}
                          {task.studentId ? (
                            isTrulyPersonalized(task) ? (<Badge color="amber">Personalizado</Badge>) : (<Badge color="blue">Turma</Badge>)
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => handleOpenEdit(task)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button><button onClick={() => handleDeleteTask(task.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button></div>
                  </div>
                  {task.description && (<div className="mt-4 pt-3 border-t border-slate-50 flex items-start gap-3"><AlignLeft className="w-4 h-4 text-slate-300 mt-0.5 shrink-0" /><p className="text-sm text-slate-600 leading-relaxed">{task.description}</p></div>)}
                </div>
              ))}
              {filteredTasks.length === 0 && (<div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50"><div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3"><BookOpen className="w-6 h-6 text-slate-300" /></div><p className="text-slate-500 font-medium">Nenhuma aula planejada para este dia.</p></div>)}
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={isTaskModalOpen} onClose={() => setTaskModalOpen(false)} title={editingTask ? "Editar Aula" : "Nova Aula"}>
        <div className="space-y-4">
          <Select label="Matéria" value={newTaskSubject} onChange={(e) => setNewTaskSubject(e.target.value)} options={subjects.map(s => ({ value: s.name, label: s.name }))} />
          <div className="grid grid-cols-2 gap-4">
            {/* SELECT DE MODO AGORA USA DADOS DO BANCO */}
            <Select
              label="Modo"
              value={newTaskMode}
              onChange={(e) => setNewTaskMode(e.target.value as any)}
              options={availableModes.map(m => ({ value: m.value || m.label, label: m.label }))}
            />
            <Input label="Duração (min)" type="number" value={newTaskDuration} onChange={(e) => setNewTaskDuration(e.target.value)} />
          </div>
          <TextArea label="Observações / Instruções" placeholder="Ex: Ler..." value={newTaskDesc} onChange={(e) => setNewTaskDesc(e.target.value)} />
          <Button fullWidth onClick={handleSaveTask}>{editingTask ? 'Salvar Alterações' : 'Adicionar ao Cronograma'}</Button>
        </div>
      </Modal>

      <Modal isOpen={importConflictModalOpen} onClose={() => setImportConflictModalOpen(false)} title="Importar Cronograma">
        <div className="space-y-6">
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl"><div className="flex items-start"><AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 mr-3" /><div><h3 className="text-amber-800 font-bold text-sm">Atenção!</h3><p className="text-amber-700 text-sm mt-1">Este aluno já possui aulas cadastradas.</p></div></div></div>
          <div className="grid grid-cols-1 gap-4">
            <button onClick={() => executeImport('merge')} className="flex items-center p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-left group"><div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg mr-4 group-hover:bg-emerald-200"><Files className="w-6 h-6" /></div><div><h4 className="font-bold text-slate-900">Mesclar</h4><p className="text-xs text-slate-500 mt-1">Mantém atuais.</p></div></button>
            <button onClick={() => executeImport('replace')} className="flex items-center p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-left group"><div className="p-3 bg-rose-100 text-rose-600 rounded-lg mr-4 group-hover:bg-rose-200"><RefreshCw className="w-6 h-6" /></div><div><h4 className="font-bold text-slate-900">Substituir</h4><p className="text-xs text-slate-500 mt-1">Apaga tudo e aplica a base.</p></div></button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// --- Student Management View (CORRIGIDO) ---
const StudentManagementView: React.FC<{ cohorts: Cohort[] }> = ({ cohorts }) => {
  // AQUI ESTAVA O ERRO: MOCK_RANKING -> array vazio []
  const [students, setStudents] = useState<StudentRank[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingStudent, setEditingStudent] = useState<StudentRank | null>(null);
  const [isCohortModalOpen, setCohortModalOpen] = useState(false);
  const [newCohortId, setNewCohortId] = useState('');

  // Busca do Banco
  useEffect(() => {
    async function fetchStudents() {
      try {
        const records = await pb.collection('users').getFullList({ filter: 'role = "student"', sort: 'name' });
        const mappedStudents: StudentRank[] = records.map((r: any) => ({
          id: r.id, name: r.name, cohortId: r.cohort || '', status: r.status, efficiency: 0, totalHours: 0, trend: 'stable', failures: 0
        }));
        setStudents(mappedStudents);
      } catch (err) { console.error("Erro ao buscar alunos:", err); }
    }
    fetchStudents();
  }, []);

  const filteredStudents = useMemo(() => { return students.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())); }, [students, searchQuery]);

  const handleToggleStatus = async (id: string) => {
    const student = students.find(s => s.id === id);
    if (!student) return;
    const newStatus = student.status === 'active' ? 'blocked' : 'active';
    try {
      await pb.collection('users').update(id, { status: newStatus });
      setStudents(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
    } catch (err) { alert("Erro ao atualizar status."); }
  };

  const handleOpenCohortModal = (student: StudentRank) => { setEditingStudent(student); setNewCohortId(student.cohortId); setCohortModalOpen(true); };

  const handleSaveCohort = async () => {
    if (editingStudent && newCohortId) {
      try {
        await pb.collection('users').update(editingStudent.id, { cohort: newCohortId });
        setStudents(prev => prev.map(s => s.id === editingStudent.id ? { ...s, cohortId: newCohortId } : s));
        setCohortModalOpen(false); setEditingStudent(null);
      } catch (err) { alert("Erro ao trocar turma."); }
    }
  };

  const getCohortName = (id: string) => cohorts.find(c => c.id === id)?.name || 'Sem Turma';

  // --- Drag Scroll Logic (Reutilizado) ---
  const tableRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!tableRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - tableRef.current.offsetLeft);
    setScrollLeft(tableRef.current.scrollLeft);
  };
  const handleMouseLeave = () => { setIsDragging(false); };
  const handleMouseUp = () => { setIsDragging(false); };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !tableRef.current) return;
    e.preventDefault();
    const x = e.pageX - tableRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    tableRef.current.scrollLeft = scrollLeft - walk;
  };
  // ----------------------------------------

  return (
    <Card>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-xl font-bold text-slate-900 font-['Playfair_Display']">Gestão de Alunos</h2>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Buscar aluno..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 transition-all" />
        </div>
      </div>
      <div
        ref={tableRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        className="overflow-x-auto scrollbar-hide cursor-grab active:cursor-grabbing select-none"
      >
        <table className="w-full text-left min-w-[800px]">
          <thead><tr className="border-b border-slate-100 text-slate-500 text-sm"><th className="pb-3 px-4">Aluno</th><th className="pb-3 px-4">Turma</th><th className="pb-3 px-4">Eficiência</th><th className="pb-3 px-4">Horas</th><th className="pb-3 px-4 text-center">Falhas</th><th className="pb-3 px-4 text-center">Status</th><th className="pb-3 px-4 text-right">Ações</th></tr></thead>
          <tbody className="divide-y divide-slate-50">
            {filteredStudents.map((student) => (
              <tr key={student.id} className="text-sm hover:bg-slate-50 group transition-colors">
                <td className="py-4 px-4 font-medium text-slate-900"><div className="flex items-center gap-3"><div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-500 text-xs">{student.name.charAt(0)}</div>{student.name}</div></td>
                <td className="py-4 px-4 text-slate-600"><Badge color="gray">{getCohortName(student.cohortId)}</Badge></td>
                <td className="py-4 px-4"><div className="flex items-center gap-2"><div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-amber-500 rounded-full" style={{ width: `${student.efficiency}% ` }}></div></div><span className="text-xs font-medium">{student.efficiency}%</span></div></td>
                <td className="py-4 px-4 text-slate-600">{student.totalHours}h</td>
                <td className="py-4 px-4 text-center"><span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold ${student.failures > 3 ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>{student.failures}</span></td>
                <td className="py-4 px-4 text-center"><div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${student.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>{student.status === 'active' ? 'Ativo' : 'Bloqueado'}</div></td>
                <td className="py-4 px-4 text-right">
                  <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleOpenCohortModal(student)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Trocar Turma"><ArrowRightLeft className="w-4 h-4" /></button>
                    <button onClick={() => handleToggleStatus(student.id)} className={`p-1.5 rounded-lg transition-colors ${student.status === 'active' ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50' : 'text-rose-500 hover:text-emerald-600 hover:bg-emerald-50'}`} title={student.status === 'active' ? 'Bloquear Acesso' : 'Liberar Acesso'}>{student.status === 'active' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal isOpen={isCohortModalOpen} onClose={() => setCohortModalOpen(false)} title="Trocar Aluno de Turma">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Selecione a nova turma para <strong>{editingStudent?.name}</strong>.</p>
          <Select label="Nova Turma" value={newCohortId} onChange={(e) => setNewCohortId(e.target.value)} options={cohorts.map(c => ({ value: c.id, label: c.name }))} />
          <Button fullWidth onClick={handleSaveCohort}>Confirmar Troca</Button>
        </div>
      </Modal>
    </Card>
  );
}

// --- Registers View (CORRIGIDO: Cor liberada para ambas as abas) ---
const RegistersView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'modes' | 'failures'>('modes');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Inputs
  const [newItemLabel, setNewItemLabel] = useState('');
  const [newItemValue, setNewItemValue] = useState('');
  const [newItemColor, setNewItemColor] = useState('#64748b'); // Cor padrão

  const collectionName = activeTab === 'modes' ? 'study_modes' : 'failure_reasons';

  useEffect(() => {
    loadItems();
  }, [activeTab]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const records = await pb.collection(collectionName).getFullList({ sort: 'label' });
      setItems(records);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza?")) return;
    try {
      await pb.collection(collectionName).delete(id);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (err) { alert("Erro ao deletar."); }
  };

  const handleAdd = async () => {
    if (!newItemLabel) return;
    try {
      // 1. Monta o payload básico
      const payload: any = {
        label: newItemLabel,
        color: newItemColor // AGORA SALVA A COR PARA OS DOIS CASOS!
      };

      // 2. Se for modo, adiciona o value (código)
      if (activeTab === 'modes') {
        payload.value = newItemValue || newItemLabel;
      }

      const record = await pb.collection(collectionName).create(payload);
      setItems(prev => [...prev, record]);

      // Limpa os campos
      setNewItemLabel('');
      setNewItemValue('');
      setNewItemColor('#64748b');
    } catch (err) { alert("Erro ao criar."); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h3 className="text-xl font-bold text-slate-900 font-['Playfair_Display']">Cadastros Auxiliares</h3>
        <p className="text-slate-500 text-sm">Gerencie as opções e cores dos formulários.</p>
      </div>

      <div className="bg-slate-100 p-1 rounded-xl flex mb-6">
        <button
          onClick={() => setActiveTab('modes')}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all shadow-sm ${activeTab === 'modes' ? 'bg-white text-slate-800' : 'text-slate-500 hover:text-slate-600 bg-transparent shadow-none'}`}
        >
          Modos de Estudo
        </button>
        <button
          onClick={() => setActiveTab('failures')}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all shadow-sm ${activeTab === 'failures' ? 'bg-white text-slate-800' : 'text-slate-500 hover:text-slate-600 bg-transparent shadow-none'}`}
        >
          Motivos de Falha
        </button>
      </div>

      <Card className="p-6">
        <div className="flex flex-col gap-4 mb-8">
          <Input
            label={activeTab === 'modes' ? "Nome" : "Motivo"}
            value={newItemLabel}
            onChange={(e) => setNewItemLabel(e.target.value)}
            placeholder={activeTab === 'modes' ? "Ex: Vídeo Aula" : "Ex: Sem Energia"}
            containerClassName="w-full"
          />

          {activeTab === 'modes' && (
            <Input
              label="Código (Opcional)"
              value={newItemValue}
              onChange={(e) => setNewItemValue(e.target.value)}
              containerClassName="w-full"
              placeholder="Ex: video"
            />
          )}

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">Cor da Etiqueta</label>
            <div className="relative flex items-center gap-3 p-3 border border-slate-200 rounded-lg bg-white hover:border-amber-300 transition-colors cursor-pointer group">
              <input
                type="color"
                value={newItemColor}
                onChange={(e) => setNewItemColor(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="w-8 h-8 rounded-full shadow-sm border border-slate-100" style={{ backgroundColor: newItemColor }}></div>
              <span className="text-sm font-mono text-slate-600 uppercase flex-1">{newItemColor}</span>
              <Palette className="w-5 h-5 text-slate-400 group-hover:text-amber-500" />
            </div>
          </div>

          <Button onClick={handleAdd} icon={Plus} fullWidth className="mt-2 py-3 shadow-lg shadow-amber-500/20">
            Adicionar Item
          </Button>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div></div>
          ) : (
            items.map(item => (
              <div key={item.id} className="flex justify-between items-center p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
                <div className="flex items-center gap-4">
                  <div
                    className="w-4 h-4 rounded-full shadow-sm ring-2 ring-slate-50"
                    style={{ backgroundColor: item.color || '#94a3b8' }}
                  ></div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-800 text-base">{item.label}</span>
                    {item.value && <span className="text-xs text-slate-400 font-mono">{item.value}</span>}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))
          )}
          {items.length === 0 && !loading && (
            <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <p className="text-slate-400 text-sm">Nenhum item cadastrado.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

// --- Main App Wrapper ---
export const AdminApp: React.FC<AdminViewProps> = ({ user, onLogout, subjects, setSubjects, settings, setSettings }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'cohorts' | 'planner' | 'students' | 'subjects' | 'settings' | 'registers'>('dashboard');
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Novo State para Menu Mobile

  useEffect(() => {
    async function fetchCohorts() {
      try {
        const records = await pb.collection('cohorts').getFullList({ sort: 'name' });
        setCohorts(records.map((r: any) => ({ id: r.id, name: r.name })));
      } catch (err) { console.error("Erro ao carregar turmas:", err); }
    }
    fetchCohorts();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row relative overflow-hidden">
      {/* 1. Mobile Header (Fixo no topo) */}
      <header className="lg:hidden bg-white border-b border-slate-100 min-h-[60px] py-2 px-4 flex justify-between items-center sticky top-0 z-40 shadow-sm relative">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            id="mobile-menu-trigger"
            className="p-2 -ml-2 text-slate-600 hover:bg-slate-50 rounded-lg relative z-10"
          >
            <MenuIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Logo Centralizado Absolutamente */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="pointer-events-auto max-h-[40px] flex items-center">
            <BrandLogo size="small" layout="horizontal" />
          </div>
        </div>

        <div className="w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center text-amber-500 font-bold border border-amber-500 text-xs relative z-10">{user.name.charAt(0)}</div>
      </header>

      {/* 2. Mobile Sidebar Overlay (Backdrop) */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 lg:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* 3. Mobile Sidebar Container (Off-Canvas) */}
      <aside
        className={`fixed inset-y-0 left-0 w-80 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 lg:hidden flex flex-col p-6 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex justify-between items-center mb-6">
          <BrandLogo size="small" />
          <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 -mr-2 text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        <nav className="flex-1 flex flex-col space-y-2 overflow-y-auto scrollbar-hide">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Visão Geral' },
            { id: 'cohorts', icon: GraduationCap, label: 'Turmas' },
            { id: 'planner', icon: BookOpen, label: 'Planejamento' },
            { id: 'students', icon: Users, label: 'Alunos & Rankings' },
            { id: 'registers', icon: List, label: 'Cadastros' },
            { id: 'subjects', icon: Library, label: 'Disciplinas' },
            { id: 'settings', icon: Settings, label: 'Configurações' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id as any); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-4 px-4 py-3 text-base font-medium rounded-xl transition-all ${activeTab === item.id
                ? 'bg-amber-50 text-amber-600'
                : 'text-slate-600 hover:bg-slate-50 hover:text-amber-600'
                }`}
            >
              <item.icon className="w-6 h-6" /> {item.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto pt-6 border-t border-slate-100">
          <button onClick={onLogout} className="w-full flex items-center gap-4 px-4 py-3 text-base font-medium text-rose-600 rounded-xl hover:bg-rose-50 transition-colors">
            <LogOut className="w-6 h-6" /> Sair
          </button>
        </div>
      </aside>

      {/* Desktop Sidebar (Mantido Igual, apenas hidden em mobile) */}
      <aside className="w-64 bg-white border-r border-slate-100 fixed inset-y-0 left-0 flex flex-col hidden lg:flex">
        <div className="p-6 border-b border-slate-50 flex justify-center"><BrandLogo size="small" /></div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors ${activeTab === 'dashboard' ? 'bg-slate-900 text-white shadow-md shadow-slate-200' : 'text-slate-600 hover:bg-slate-50'}`}><LayoutDashboard className="w-5 h-5" /> Visão Geral</button>
          <button onClick={() => setActiveTab('cohorts')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors ${activeTab === 'cohorts' ? 'bg-slate-900 text-white shadow-md shadow-slate-200' : 'text-slate-600 hover:bg-slate-50'}`}><GraduationCap className="w-5 h-5" /> Turmas</button>
          <button onClick={() => setActiveTab('planner')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors ${activeTab === 'planner' ? 'bg-slate-900 text-white shadow-md shadow-slate-200' : 'text-slate-600 hover:bg-slate-50'}`}><BookOpen className="w-5 h-5" /> Planejamento</button>
          <button onClick={() => setActiveTab('students')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors ${activeTab === 'students' ? 'bg-slate-900 text-white shadow-md shadow-slate-200' : 'text-slate-600 hover:bg-slate-50'}`}><Users className="w-5 h-5" /> Alunos & Rankings</button>
          <div className="pt-4 mt-4 border-t border-slate-50"><span className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Gestão</span></div>
          <button onClick={() => setActiveTab('registers')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${activeTab === 'registers' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
            <List className="w-5 h-5" /> Cadastros
          </button>
          <button onClick={() => setActiveTab('subjects')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors ${activeTab === 'subjects' ? 'bg-slate-900 text-white shadow-md shadow-slate-200' : 'text-slate-600 hover:bg-slate-50'}`}><Library className="w-5 h-5" /> Disciplinas</button>
          <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors ${activeTab === 'settings' ? 'bg-slate-900 text-white shadow-md shadow-slate-200' : 'text-slate-600 hover:bg-slate-50'}`}><Settings className="w-5 h-5" /> Configurações</button>
        </nav>
        <div className="p-4 border-t border-slate-50"><button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-rose-600 rounded-xl hover:bg-rose-50 transition-colors"><LogOut className="w-5 h-5" /> Sair</button></div>
      </aside>

      <main className="flex-1 lg:ml-64 p-4 lg:p-8 overflow-x-hidden">
        <header className="mb-8 hidden lg:flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-900 font-['Playfair_Display']">
            {activeTab === 'dashboard' && 'Dashboard'}
            {activeTab === 'cohorts' && 'Gerenciamento de Turmas'}
            {activeTab === 'planner' && 'Planejamento de Estudos'}
            {activeTab === 'students' && 'Desempenho dos Alunos'}
            {activeTab === 'subjects' && 'Cadastro de Disciplinas'}
            {activeTab === 'settings' && 'Configurações'}
          </h2>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block"><p className="text-sm font-medium text-slate-900">{user.name}</p><p className="text-xs text-slate-500">Administrador</p></div>
            <div className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center text-amber-500 font-bold border border-amber-500">{user.name.charAt(0)}</div>
          </div>
        </header>
        {activeTab === 'dashboard' && <AdminDashboard cohorts={cohorts} subjects={subjects} />}
        {activeTab === 'cohorts' && <CohortsView cohorts={cohorts} setCohorts={setCohorts} />}
        {activeTab === 'planner' && <PlannerView cohorts={cohorts} subjects={subjects} />}
        {activeTab === 'students' && <StudentManagementView cohorts={cohorts} />}
        {activeTab === 'registers' && <RegistersView />}
        {activeTab === 'subjects' && <SubjectsView subjects={subjects} setSubjects={setSubjects} />}
        {activeTab === 'settings' && <SettingsView settings={settings} setSettings={setSettings} />}
      </main>
    </div>
  );
};