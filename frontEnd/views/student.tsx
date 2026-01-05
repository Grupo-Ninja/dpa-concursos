import React, { useState, useMemo, useEffect } from 'react';
import { Task, CheckIn, User, Subject, AppSettings } from '../types';
import { Button, Card, Badge, Modal, Input, Select, BrandLogo } from '../components/ui';
import {
    Check, Video, BookOpen, PenTool, Brain, Trophy, X, Clock,
    LayoutDashboard, LogOut, Sparkles, Flame, Target, Eye, History,
    AlertCircle, Sunrise, Sun, Moon, Star, Info, MessageCircle, Phone, Mail, Trash2
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { pb } from './lib/pocketbase';

// --- Types & Constants ---

type TaskStatus = 'pending' | 'completed' | 'failed';

const DAYS_NAV = [
    { key: 'Monday', label: 'Seg' }, { key: 'Tuesday', label: 'Ter' },
    { key: 'Wednesday', label: 'Qua' }, { key: 'Thursday', label: 'Qui' },
    { key: 'Friday', label: 'Sex' }, { key: 'Saturday', label: 'Sáb' },
    { key: 'Sunday', label: 'Dom' },
];

const getModeIcon = (mode: Task['mode']) => {
    switch (mode) {
        case 'Video': return Video;
        case 'Reading': return BookOpen;
        case 'Questions': return PenTool;
        default: return Brain;
    }
};

// --- COMPONENTS ---

interface TaskCardProps {
    task: Task;
    status: TaskStatus;
    onClick: () => void;
    onViewDetails: () => void;
    subjectColor: string;
    modeColor: string; // Nova prop para a cor do modo
    isPersonalized: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, status, onClick, onViewDetails, subjectColor, modeColor, isPersonalized }) => {
    const Icon = getModeIcon(task.mode);

    // Configuração visual baseada no status (Concluído/Falha)
    let cardStyle = "bg-white border-slate-100 hover:border-slate-300 hover:shadow-lg";
    let iconStyle = "bg-slate-50 text-slate-600 group-hover:scale-110";
    let statusBorder = { borderLeft: `4px solid ${subjectColor}` }; // Cor da Matéria na lateral

    if (status === 'completed') {
        cardStyle = "bg-emerald-50/50 border-emerald-100 opacity-75";
        iconStyle = "bg-emerald-100 text-emerald-600";
        statusBorder = { borderLeft: `4px solid #10b981` }; // Verde
    } else if (status === 'failed') {
        cardStyle = "bg-rose-50/50 border-rose-100 opacity-75";
        iconStyle = "bg-rose-100 text-rose-600";
        statusBorder = { borderLeft: `4px solid #f43f5e` }; // Vermelho
    }

    return (
        <div
            className={`group relative flex flex-col justify-between p-5 rounded-2xl border transition-all duration-300 overflow-hidden cursor-pointer ${cardStyle}`}
            style={statusBorder}
            onClick={onClick}
        >
            <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors duration-300 ${iconStyle}`}>
                    {status === 'completed' ? <Check className="w-6 h-6" /> :
                        status === 'failed' ? <X className="w-6 h-6" /> :
                            <Icon className="w-6 h-6" />}
                </div>

                <button
                    onClick={(e) => { e.stopPropagation(); onViewDetails(); }}
                    className="p-3 -m-1 text-slate-300 hover:text-amber-500 hover:bg-amber-50 rounded-full transition-colors" // Touch target increased
                    title="Ver Detalhes"
                >
                    <Eye className="w-5 h-5" />
                </button>
            </div>

            <div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {/* BADGE DE MODO COM COR DO BANCO */}
                    <span
                        className="px-2.5 py-0.5 rounded-full text-xs font-medium text-white shadow-sm"
                        style={{ backgroundColor: modeColor || '#94a3b8' }} // Usa a cor do banco ou cinza
                    >
                        {task.mode}
                    </span>

                    {isPersonalized && status === 'pending' && <Badge color="amber">Reforço</Badge>}
                    {status === 'failed' && <Badge color="red">Não Feito</Badge>}
                </div>

                <h3 className={`font-bold text-lg leading-tight mb-1 ${status !== 'pending' ? 'text-slate-500' : 'text-slate-900'}`}>
                    {task.subject}
                </h3>

                <p className="text-sm text-slate-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {task.durationMinutes} min
                </p>
            </div>

            {/* Hover Effect para desfazer */}
            {status !== 'pending' && (
                <div className="absolute inset-0 bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-sm font-bold text-slate-600 flex items-center gap-2">
                        <Trash2 className="w-4 h-4" /> Clique para desfazer
                    </span>
                </div>
            )}
        </div>
    );
};

const TaskDetailModal: React.FC<{ task: Task | null; isOpen: boolean; onClose: () => void }> = ({ task, isOpen, onClose }) => {
    if (!task) return null;
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Detalhes da Aula">
            <div className="space-y-6">
                <div>
                    <Badge color="amber">{task.mode}</Badge>
                    <h3 className="text-xl font-bold text-slate-900 mt-2">{task.subject}</h3>
                    <div className="flex items-center gap-2 text-slate-500 text-sm mt-1">
                        <Clock className="w-4 h-4" />
                        <span>Duração estimada: {task.durationMinutes} minutos</span>
                    </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2"><BookOpen className="w-4 h-4" /> Observações / Instruções</h4>
                    <p className="text-slate-600 text-sm md:text-base leading-relaxed whitespace-pre-wrap">{task.description || "Nenhuma observação adicional para esta aula."}</p>
                </div>
                <Button fullWidth onClick={onClose} variant="outline">Fechar</Button>
            </div>
        </Modal>
    );
};

// --- VIEWS ---

const HistoryView: React.FC<{ user: User, subjects: Subject[] }> = ({ user, subjects }) => {
    const [history, setHistory] = useState<CheckIn[]>([]);
    const [loading, setLoading] = useState(true);
    const [taskMap, setTaskMap] = useState<Record<string, string>>({});

    const [filterDate, setFilterDate] = useState('');
    const [filterSubject, setFilterSubject] = useState('');

    useEffect(() => {
        async function fetchHistory() {
            try {
                const records = await pb.collection('checkins').getFullList({
                    filter: `student = "${user.id}"`,
                    sort: '-timestamp',
                    expand: 'task'
                });

                const mappedHistory: CheckIn[] = records.map((r: any) => ({
                    id: r.id, taskId: r.task, studentId: r.student, completed: r.completed,
                    actualDurationMinutes: r.actualDurationMinutes, note: r.note,
                    period: r.period, reasonForFailure: r.reasonForFailure, timestamp: r.timestamp
                }));

                const tMap: Record<string, string> = {};
                records.forEach((r: any) => {
                    if (r.expand?.task) tMap[r.task] = r.expand.task.subject;
                });
                setTaskMap(tMap);
                setHistory(mappedHistory);
            } catch (err) { console.error(err); } finally { setLoading(false); }
        }
        fetchHistory();
    }, [user.id]);

    const filteredHistory = useMemo(() => {
        return history.filter(checkin => {
            const subjectName = taskMap[checkin.taskId];
            let dateMatch = filterDate ? new Date(checkin.timestamp).toISOString().split('T')[0] === filterDate : true;
            let subjectMatch = filterSubject ? subjectName === filterSubject : true;
            return dateMatch && subjectMatch;
        });
    }, [history, filterDate, filterSubject, taskMap]);

    const formatDate = (isoString: string) => {
        const date = new Date(isoString);
        return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date);
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Carregando histórico...</div>;

    return (
        <div className="space-y-6 pb-24 md:pb-8">
            <header>
                <h1 className="text-3xl font-bold text-slate-900 font-['Playfair_Display']">Histórico de Atividades</h1>
                <p className="text-slate-500">Seus registros de estudo e ocorrências.</p>
            </header>

            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-4">
                <Input type="date" label="Data" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="bg-slate-50" />
                <Select label="Matéria" value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} options={[{ value: '', label: 'Todas' }, ...subjects.map(s => ({ value: s.name, label: s.name }))]} className="bg-slate-50" />
            </div>

            <div className="space-y-4">
                {filteredHistory.map((checkin, index) => (
                    <div key={checkin.id} className="relative flex gap-4">
                        {index !== filteredHistory.length - 1 && <div className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-slate-100 -mb-4"></div>}
                        <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 border-white shadow-sm ${checkin.completed ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                            {checkin.completed ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                        </div>
                        <Card className="flex-1 p-4 mb-2">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                                <h3 className="font-bold text-slate-900">{taskMap[checkin.taskId] || 'Aula Removida'}</h3>
                                <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-md">{formatDate(checkin.timestamp)}</span>
                            </div>
                            {checkin.completed ? (
                                <div className="text-sm md:text-base text-slate-600">
                                    <span className="font-medium text-emerald-600 flex items-center gap-1 mb-1"><Sparkles className="w-3 h-3" /> Meta Cumprida</span>
                                    <p>Tempo: {checkin.actualDurationMinutes} min {checkin.note ? `• "${checkin.note}"` : ''}</p>
                                </div>
                            ) : (
                                <div className="text-sm md:text-base text-slate-600">
                                    <span className="font-medium text-rose-500 flex items-center gap-1 mb-1"><AlertCircle className="w-3 h-3" /> Não Realizado</span>
                                    <p>Motivo: {checkin.reasonForFailure}</p>
                                </div>
                            )}
                        </Card>
                    </div>
                ))}
            </div>
        </div>
    );
};

const CompanyInfoView: React.FC<{ settings: AppSettings }> = ({ settings }) => {
    return (
        <div className="space-y-8 pb-24 md:pb-8">
            <header><h1 className="text-3xl font-bold text-slate-900 font-['Playfair_Display']">Sobre Nós</h1></header>
            <Card className="p-8 text-center bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10">
                    <BrandLogo size="large" className="mb-6" theme="dark" />
                    <h2 className="text-2xl font-bold mb-1">{settings.schoolName}</h2>
                    <h3 className="text-lg font-medium text-amber-300 tracking-wide font-['Playfair_Display']">
                        {settings.instructorName || "Orientadora"}
                    </h3>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="flex items-center gap-4 p-6"><Phone className="w-6 h-6 text-amber-500" /><div><p className="text-sm text-slate-500">Telefone</p><p className="font-bold text-slate-900">{settings.phone}</p></div></Card>
                <Card className="flex items-center gap-4 p-6"><Mail className="w-6 h-6 text-amber-500" /><div><p className="text-sm text-slate-500">Email</p><p className="font-bold text-slate-900">{settings.email}</p></div></Card>
            </div>
            {settings.whatsappLink && settings.whatsappLink !== "" && (
                <a href={settings.whatsappLink} target="_blank" rel="noreferrer" className="block group">
                    <Card className="bg-emerald-50 border-emerald-100 hover:border-emerald-300 transition-colors p-6 flex items-center justify-center gap-4 group-hover:shadow-md cursor-pointer">
                        <div className="bg-emerald-500 text-white p-3 rounded-full shadow-lg group-hover:scale-110 transition-transform"><MessageCircle className="w-8 h-8" /></div>
                        <div className="text-left"><h3 className="font-bold text-emerald-900 text-lg">Grupo Exclusivo no WhatsApp</h3><p className="text-emerald-700 text-sm">Clique para participar e interagir com a turma.</p></div>
                    </Card>
                </a>
            )}
        </div>
    )
}

const AnalyticsView: React.FC<{ user: User }> = ({ user }) => {
    const [data, setData] = useState<any[]>([]);
    const [stats, setStats] = useState({ efficiency: 0, streak: 0, completedTotal: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchAnalytics() {
            try {
                const allTasks = await pb.collection('tasks').getFullList();
                const myTasks = allTasks.filter((t: any) => (t.cohort === user.cohortId && !t.student) || t.student === user.id);
                const history = await pb.collection('checkins').getFullList({ filter: `student = "${user.id}"`, sort: '-timestamp' });

                const last7Days = [];
                for (let i = 0; i < 7; i++) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    last7Days.push(d);
                }

                const chartData = last7Days.map(dateObj => {
                    const dateStr = dateObj.toISOString().split('T')[0];
                    const weekDayIndex = dateObj.getDay();
                    const pbDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    const currentPbDay = pbDays[weekDayIndex];

                    const metaMinutes = myTasks.filter(t => t.dayOfWeek === currentPbDay).reduce((acc, t) => acc + t.durationMinutes, 0);
                    const realMinutes = history.filter(h => h.timestamp.startsWith(dateStr) && h.completed).reduce((acc, h) => acc + (h.actualDurationMinutes || 0), 0);

                    return {
                        name: dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }),
                        meta: parseFloat((metaMinutes / 60).toFixed(1)),
                        real: parseFloat((realMinutes / 60).toFixed(1))
                    };
                });

                const successCount = history.filter(h => h.completed).length;
                const totalAttempts = history.length;
                const efficiency = totalAttempts > 0 ? Math.round((successCount / totalAttempts) * 100) : 0;

                let currentStreak = 0;
                const today = new Date();
                for (let i = 0; i < 30; i++) {
                    const d = new Date();
                    d.setDate(today.getDate() - i);
                    const dStr = d.toISOString().split('T')[0];
                    const hasStudy = history.some(h => h.timestamp.startsWith(dStr) && h.completed);
                    if (hasStudy) currentStreak++;
                    else if (i > 0) break;
                }

                setStats({ efficiency, streak: currentStreak, completedTotal: successCount });
                setData(chartData.reverse());

            } catch (err) { console.error(err); } finally { setLoading(false); }
        }
        fetchAnalytics();
    }, [user]);

    return (
        <div className="space-y-8 pb-24 md:pb-8">
            <header>
                <h1 className="text-3xl font-bold text-slate-900 font-['Playfair_Display']">Sua Evolução</h1>
                <p className="text-slate-500">A constância é a chave da aprovação.</p>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 flex flex-col items-center justify-center text-center border-l-4 border-l-emerald-500">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-3"><Target className="w-6 h-6" /></div>
                    <span className="text-4xl font-bold text-slate-900 mb-1">{loading ? '...' : `${stats.efficiency}%`}</span><span className="text-sm text-slate-500 font-medium uppercase">Aproveitamento</span>
                </Card>
                <Card className="p-6 flex flex-col items-center justify-center text-center border-l-4 border-l-amber-500">
                    <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-3"><Trophy className="w-6 h-6" /></div>
                    <div className="flex items-baseline gap-1"><span className="text-4xl font-bold text-slate-900 mb-1">{loading ? '...' : stats.completedTotal}</span></div><span className="text-sm text-slate-500 font-medium uppercase">Aulas Concluídas</span>
                </Card>
                <Card className="p-6 flex flex-col items-center justify-center text-center border-l-4 border-l-rose-500">
                    <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-3"><Flame className="w-6 h-6" /></div>
                    <span className="text-4xl font-bold text-slate-900 mb-1">{loading ? '...' : stats.streak}</span><span className="text-sm text-slate-500 font-medium uppercase">Dias de Sequência</span>
                </Card>
            </div>
            <Card className="p-6 md:p-8">
                <div className="flex justify-between items-center mb-8"><h3 className="font-bold text-lg text-slate-900">Horas de Estudo: Meta vs Realizado</h3><Badge color="gray">Últimos 7 dias</Badge></div>
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} barGap={8}>
                            <XAxis dataKey="name" fontSize={12} stroke="#94a3b8" tickLine={false} axisLine={false} dy={10} />
                            <YAxis fontSize={12} stroke="#94a3b8" tickLine={false} axisLine={false} />
                            <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                            <Bar dataKey="meta" name="Meta (Horas)" fill="#e2e8f0" radius={[4, 4, 4, 4]} />
                            <Bar dataKey="real" name="Executado (Horas)" fill="#0f172a" radius={[4, 4, 4, 4]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </Card>
        </div>
    );
};

// Na importação (linha 1) adicione useRef se faltar

const StudentDashboard: React.FC<{
    allTasks: Task[];
    taskStatusMap: Record<string, CheckIn>;
    onTaskClick: (taskId: string) => void;
    onViewDetails: (task: Task) => void;
    user: User;
    subjects: Subject[];
    settings: AppSettings;
    modes: any[];
}> = ({ allTasks, taskStatusMap, onTaskClick, onViewDetails, user, subjects, settings, modes }) => {
    const [selectedDayKey, setSelectedDayKey] = useState('Monday');

    // --- Drag Scroll Logic ---
    const navRef = React.useRef<HTMLDivElement>(null); // Usando React.useRef direto para garantir
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!navRef.current) return;
        setIsDragging(true);
        setStartX(e.pageX - navRef.current.offsetLeft);
        setScrollLeft(navRef.current.scrollLeft);
    };
    const handleMouseLeave = () => { setIsDragging(false); };
    const handleMouseUp = () => { setIsDragging(false); };
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !navRef.current) return;
        e.preventDefault();
        const x = e.pageX - navRef.current.offsetLeft;
        const walk = (x - startX) * 2;
        navRef.current.scrollLeft = scrollLeft - walk;
    };

    // Auto-scroll para dia selecionado se quiser depois
    // -------------------------

    const dailyTasks = useMemo(() => allTasks.filter(t => t.dayOfWeek === selectedDayKey), [allTasks, selectedDayKey]);

    const totalTasks = dailyTasks.length > 0 ? dailyTasks.length : 1;
    const completedCount = dailyTasks.filter(t => taskStatusMap[t.id]?.completed).length;
    const progress = Math.round((completedCount / totalTasks) * 100);
    const selectedDayLabel = DAYS_NAV.find(d => d.key === selectedDayKey)?.label;

    const getSubjectColor = (subjName: string) => subjects.find(s => s.name === subjName)?.color || '#94a3b8';

    // Função para pegar a cor do modo dinamicamente
    const getModeColor = (modeValue: string) => {
        const found = modes.find(m => m.value === modeValue || m.label === modeValue);
        return found?.color || '#94a3b8';
    };

    const isTaskTrulyPersonalized = (task: Task) => {
        if (!task.studentId) return false;
        const isCopy = allTasks.some(b => !b.studentId && b.subject === task.subject && b.dayOfWeek === task.dayOfWeek && b.cohortId === task.cohortId);
        return !isCopy;
    };

    return (
        <div className="space-y-6 pb-24 md:pb-8">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white to-amber-50 border border-slate-100 p-6 md:p-8 shadow-sm">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <div className="flex items-center gap-2 text-amber-500 font-bold text-xs uppercase tracking-wider mb-2"><span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span> Visão Geral</div>
                        <h1 className="text-3xl md:text-4xl font-bold font-['Playfair_Display'] text-slate-900 mb-2">Olá, {user.name.split(' ')[0]}</h1>
                        <p className="text-slate-500 text-lg md:text-xl">{settings.welcomeMessage || "Hoje é um ótimo dia para evoluir."}</p>
                    </div>
                    <div className="w-full md:w-64">
                        <div className="flex justify-between items-end mb-2"><span className="text-sm font-medium text-slate-600">Progresso de {selectedDayLabel}</span><span className="text-2xl font-bold text-slate-900">{progress}%</span></div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden"><div className="bg-amber-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${progress}%` }}></div></div>
                        <p className="text-xs text-slate-400 mt-2 text-right">{completedCount}/{dailyTasks.length} missões cumpridas</p>
                    </div>
                </div>
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-amber-100/50 rounded-full blur-3xl pointer-events-none mix-blend-multiply"></div>
            </div>

            <div
                ref={navRef}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 cursor-grab active:cursor-grabbing select-none"
            >
                {DAYS_NAV.map((day, idx) => {
                    const isSelected = selectedDayKey === day.key;
                    return (
                        <button key={day.key} onClick={() => setSelectedDayKey(day.key)} className={`flex-shrink-0 flex flex-col items-center justify-center min-w-[60px] h-[70px] rounded-2xl border transition-all duration-200 snap-start ${isSelected ? 'bg-slate-900 border-slate-900 text-white shadow-md transform scale-105' : 'bg-white border-slate-100 text-slate-400 hover:border-amber-200 hover:text-amber-500'}`}>
                            <span className="text-xs font-medium uppercase tracking-wide">{day.label}</span>
                            <span className={`text-lg font-bold ${isSelected ? 'text-amber-400' : 'text-slate-600'}`}>{20 + idx}</span>
                        </button>
                    )
                })}
            </div>

            <div>
                <div className="flex items-center justify-between mb-6"><h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Target className="w-5 h-5 text-amber-500" /> Cronograma</h2><Badge color="gray">{dailyTasks.length} Aulas</Badge></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
                    {dailyTasks.map((task) => {
                        const checkin = taskStatusMap[task.id];
                        const status: any = checkin ? (checkin.completed ? 'completed' : 'failed') : 'pending';
                        return (
                            <TaskCard
                                key={task.id}
                                task={task}
                                status={status}
                                onClick={() => onTaskClick(task.id)}
                                onViewDetails={() => onViewDetails(task)}
                                subjectColor={getSubjectColor(task.subject)}
                                modeColor={getModeColor(task.mode)} // Passa a cor do modo
                                isPersonalized={isTaskTrulyPersonalized(task)}
                            />
                        );
                    })}
                    {dailyTasks.length === 0 && (
                        <div className="col-span-full py-16 text-center"><div className="inline-flex items-center justify-center w-16 h-16 bg-slate-50 rounded-full mb-4 text-slate-300"><Sparkles className="w-8 h-8" /></div><h3 className="text-slate-900 font-medium text-lg">Dia Livre!</h3><p className="text-slate-500 max-w-xs mx-auto">Nenhuma tarefa agendada.</p></div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- MAIN APP ---

interface StudentViewProps {
    user: User;
    onLogout: () => void;
    subjects: Subject[];
    settings: AppSettings;
}

export const StudentApp: React.FC<StudentViewProps> = ({ user, onLogout, subjects, settings }) => {
    const [activeTab, setActiveTab] = useState<'home' | 'analytics' | 'history' | 'about'>('home');

    // STATES PARA DADOS DINÂMICOS
    const [failureReasons, setFailureReasons] = useState<any[]>([]);
    const [modes, setModes] = useState<any[]>([]); // Lista completa de modos

    // Data State
    const [tasks, setTasks] = useState<Task[]>([]);
    const [taskStatusMap, setTaskStatusMap] = useState<Record<string, CheckIn>>({});

    // UI State
    const [selectedTask, setSelectedTask] = useState<string | null>(null);
    const [viewingTask, setViewingTask] = useState<Task | null>(null);
    const [checkInStep, setCheckInStep] = useState<'period_select' | 'success' | 'failure'>('period_select');
    const [selectedPeriod, setSelectedPeriod] = useState<CheckIn['period']>();

    const [minutes, setMinutes] = useState('60');
    const [note, setNote] = useState('');

    // 1. Carregar Cadastros Auxiliares (Modos e Motivos)
    useEffect(() => {
        const fetchAux = async () => {
            try {
                // MODOS
                const modesRes = await pb.collection('study_modes').getFullList({ sort: 'label' });
                setModes(modesRes);

                // MOTIVOS
                const reasonsRes = await pb.collection('failure_reasons').getFullList({ sort: 'label' });
                setFailureReasons(reasonsRes);
            } catch (err) { console.error("Erro carregando auxiliares:", err); }
        };
        fetchAux();
    }, []);

    // 2. Carregar Dados do Aluno
    useEffect(() => {
        async function loadData() {
            try {
                const allSystemTasks = await pb.collection('tasks').getFullList();
                const myTasks = allSystemTasks.filter((t: any) => (t.cohort === user.cohortId && !t.student) || t.student === user.id);
                myTasks.sort((a: any, b: any) => new Date(b.created).getTime() - new Date(a.created).getTime());

                const mappedTasks: Task[] = myTasks.map((r: any) => ({
                    id: r.id, cohortId: r.cohort, studentId: r.student || undefined,
                    subject: r.subject, mode: r.mode, durationMinutes: r.durationMinutes,
                    dayOfWeek: r.dayOfWeek, description: r.description
                }));
                setTasks(mappedTasks);

                const checkinRecords = await pb.collection('checkins').getFullList({ filter: `student = "${user.id}"` });
                const statusMap: Record<string, CheckIn> = {};
                checkinRecords.forEach((r: any) => {
                    statusMap[r.task] = {
                        id: r.id, taskId: r.task, studentId: r.student, completed: r.completed,
                        actualDurationMinutes: r.actualDurationMinutes, note: r.note,
                        period: r.period, reasonForFailure: r.reasonForFailure, timestamp: r.timestamp
                    };
                });
                setTaskStatusMap(statusMap);
            } catch (e) { console.error(e); }
        }
        loadData();
    }, [user.id, user.cohortId]);

    const handleTaskClick = async (taskId: string) => {
        const existingCheckIn = taskStatusMap[taskId];
        if (existingCheckIn) {
            if (confirm("Deseja desfazer o status desta aula? O registro será removido.")) {
                try {
                    await pb.collection('checkins').delete(existingCheckIn.id);
                    setTaskStatusMap(prev => {
                        const newMap = { ...prev };
                        delete newMap[taskId];
                        return newMap;
                    });
                } catch (err) { alert("Erro ao desfazer."); }
            }
        } else {
            setSelectedTask(taskId);
            setCheckInStep('period_select');
            setSelectedPeriod(undefined);
            setMinutes('60');
            setNote('');
        }
    };

    const handleCloseCheckIn = () => {
        setSelectedTask(null);
        setCheckInStep('period_select');
        setSelectedPeriod(undefined);
    };

    const handleSubmitCheckIn = async (isSuccess: boolean, failureReason?: string) => {
        if (!selectedTask) return;

        const payload = {
            task: selectedTask,
            student: user.id,
            completed: isSuccess,
            actualDurationMinutes: isSuccess ? parseInt(minutes) : 0,
            note: note,
            period: selectedPeriod,
            reasonForFailure: failureReason || '',
            timestamp: new Date().toISOString()
        };

        try {
            const record = await pb.collection('checkins').create(payload);
            const newCheckIn: CheckIn = {
                id: record.id, taskId: selectedTask, studentId: user.id,
                completed: isSuccess, actualDurationMinutes: payload.actualDurationMinutes,
                note: note, period: selectedPeriod, reasonForFailure: payload.reasonForFailure,
                timestamp: payload.timestamp
            };

            setTaskStatusMap(prev => ({ ...prev, [selectedTask]: newCheckIn }));
            handleCloseCheckIn();
        } catch (err) {
            console.error(err);
            alert('Erro ao salvar check-in');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* ... Sidebar igual ... */}
            <aside className="hidden md:flex w-64 bg-white border-r border-slate-100 flex-col fixed inset-y-0 z-50">
                <div className="p-6 flex justify-center border-b border-slate-50"><BrandLogo size="small" /></div>
                <nav className="flex-1 p-4 space-y-2">
                    <button onClick={() => setActiveTab('home')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${activeTab === 'home' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}><LayoutDashboard className="w-5 h-5" /> Meu Dia</button>
                    <button onClick={() => setActiveTab('analytics')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${activeTab === 'analytics' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}><Trophy className="w-5 h-5" /> Evolução</button>
                    <button onClick={() => setActiveTab('history')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${activeTab === 'history' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}><History className="w-5 h-5" /> Histórico</button>
                    <button onClick={() => setActiveTab('about')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${activeTab === 'about' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}><Info className="w-5 h-5" /> Sobre Nós</button>
                </nav>
                <div className="p-4 border-t border-slate-50"><button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-rose-600 rounded-xl hover:bg-rose-50 transition-colors"><LogOut className="w-5 h-5" /> Sair</button></div>
            </aside>

            <main className="flex-1 md:ml-64 p-4 md:p-8 max-w-[1600px] mx-auto w-full">
                <header className="md:hidden flex justify-between items-center mb-6">
                    <BrandLogo size="small" />
                    <div className="flex items-center gap-3"><button onClick={onLogout} className="text-slate-400 hover:text-rose-600"><LogOut className="w-6 h-6" /></button><div className="w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center text-amber-500 font-bold text-sm">{user.name.charAt(0)}</div></div>
                </header>

                {/* PASSA OS MODOS PARA O DASHBOARD */}
                {activeTab === 'home' && <StudentDashboard allTasks={tasks} taskStatusMap={taskStatusMap} onTaskClick={handleTaskClick} onViewDetails={setViewingTask} user={user} subjects={subjects} settings={settings} modes={modes} />}
                {activeTab === 'analytics' && <AnalyticsView user={user} />}
                {activeTab === 'history' && <HistoryView user={user} subjects={subjects} />}
                {activeTab === 'about' && <CompanyInfoView settings={settings} />}
            </main>

            {/* Mobile Nav - Increased touch targets */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-2 pb-safe flex justify-between items-center z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center justify-center gap-1 w-16 h-16 ${activeTab === 'home' ? 'text-amber-500' : 'text-slate-400'}`}><LayoutDashboard className="w-7 h-7" /><span className="text-[10px] font-bold">Hoje</span></button>
                <button onClick={() => setActiveTab('analytics')} className={`flex flex-col items-center justify-center gap-1 w-16 h-16 ${activeTab === 'analytics' ? 'text-amber-500' : 'text-slate-400'}`}><Trophy className="w-7 h-7" /><span className="text-[10px] font-bold">Evolução</span></button>
                <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center justify-center gap-1 w-16 h-16 ${activeTab === 'history' ? 'text-amber-500' : 'text-slate-400'}`}><History className="w-7 h-7" /><span className="text-[10px] font-bold">Histórico</span></button>
                <button onClick={() => setActiveTab('about')} className={`flex flex-col items-center justify-center gap-1 w-16 h-16 ${activeTab === 'about' ? 'text-amber-500' : 'text-slate-400'}`}><Info className="w-7 h-7" /><span className="text-[10px] font-bold">Sobre</span></button>
            </nav>

            <TaskDetailModal task={viewingTask} isOpen={!!viewingTask} onClose={() => setViewingTask(null)} />

            <Modal isOpen={!!selectedTask} onClose={handleCloseCheckIn}>
                {checkInStep === 'period_select' && (
                    <div className="text-center space-y-6">
                        <h3 className="text-xl font-bold text-slate-900">Em qual período?</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setSelectedPeriod('Morning')} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${selectedPeriod === 'Morning' ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-slate-100 hover:border-amber-200'}`}><Sunrise className="w-6 h-6 text-amber-500" /><span className="font-bold text-sm">Manhã</span></button>
                            <button onClick={() => setSelectedPeriod('Afternoon')} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${selectedPeriod === 'Afternoon' ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-slate-100 hover:border-amber-200'}`}><Sun className="w-6 h-6 text-amber-500" /><span className="font-bold text-sm">Tarde</span></button>
                            <button onClick={() => setSelectedPeriod('Night')} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${selectedPeriod === 'Night' ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-slate-100 hover:border-indigo-200'}`}><Moon className="w-6 h-6 text-indigo-500" /><span className="font-bold text-sm">Noite</span></button>
                            <button onClick={() => setSelectedPeriod('Dawn')} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${selectedPeriod === 'Dawn' ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-slate-100 hover:border-purple-200'}`}><Star className="w-6 h-6 text-purple-500" /><span className="font-bold text-sm">Madrugada</span></button>
                        </div>
                        {selectedPeriod && (
                            <div className="grid grid-cols-2 gap-4 pt-4 animate-in fade-in slide-in-from-bottom-2">
                                <Button variant="success" fullWidth icon={Check} onClick={() => setCheckInStep('success')}>Concluído</Button>
                                <Button variant="danger" fullWidth icon={X} onClick={() => setCheckInStep('failure')}>Não Feito</Button>
                            </div>
                        )}
                    </div>
                )}

                {checkInStep === 'success' && (
                    <div className="space-y-6">
                        <div className="text-center">
                            <div className="inline-block p-3 rounded-full bg-emerald-100 text-emerald-600 mb-4"><Sparkles className="w-8 h-8" /></div>
                            <h3 className="text-lg font-bold">Ótimo trabalho! 🎉</h3>
                        </div>
                        <Input type="number" label="Quantos minutos você estudou?" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
                        <Input label="Alguma observação? (Opcional)" placeholder="Ex: Fiz 20 questões a mais..." value={note} onChange={(e) => setNote(e.target.value)} />
                        <Button fullWidth onClick={() => handleSubmitCheckIn(true)} variant="success">Confirmar Conclusão</Button>
                        <button onClick={() => setCheckInStep('period_select')} className="w-full text-center text-xs text-slate-400 hover:text-slate-600 mt-2">Voltar</button>
                    </div>
                )}

                {checkInStep === 'failure' && (
                    <div className="space-y-6">
                        <div className="text-center">
                            <div className="inline-block p-3 rounded-full bg-rose-100 text-rose-600 mb-4"><Target className="w-8 h-8" /></div>
                            <h3 className="text-lg font-bold">O que houve?</h3>
                        </div>
                        {/* BOTÕES DE FALHA DINÂMICOS (COM COR) */}
                        <div className="grid grid-cols-2 gap-2">
                            {failureReasons.map((r) => (
                                <button
                                    key={r.id}
                                    onClick={() => handleSubmitCheckIn(false, r.label)}
                                    className="px-4 py-3 rounded-xl bg-slate-50 text-slate-600 hover:shadow-md border border-transparent text-sm font-medium transition-all"
                                    // Se quiser aplicar a cor do motivo no botão:
                                    style={{ borderLeft: `4px solid ${r.color || '#f43f5e'}` }}
                                >
                                    {r.label}
                                </button>
                            ))}
                            {failureReasons.length === 0 && <div className="col-span-2 text-center text-slate-400">Nenhum motivo cadastrado.</div>}
                        </div>
                        <button onClick={() => setCheckInStep('period_select')} className="w-full text-center text-xs text-slate-400 hover:text-slate-600 mt-2">Voltar</button>
                    </div>
                )}
            </Modal>
        </div>
    );
};