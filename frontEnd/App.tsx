import React, { useState, useEffect } from 'react';
import { User, Subject, AppSettings } from './types';
import { LoginView, RegisterView, PendingApprovalView } from './views/auth';
import { StudentApp } from './views/student';
import { AdminApp } from './views/admin';
import { pb } from './views/lib/pocketbase'; // <--- O Guardião do Banco

type ViewState = 'login' | 'register' | 'pending_approval' | 'app';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>('login');

  // 1. Estados Globais (Iniciam vazios, esperando o Banco)
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [settings, setSettings] = useState<AppSettings>({
    schoolName: 'Carregando...', // Placeholder enquanto baixa
    instructorName: '',
    phone: '',
    email: '',
    welcomeMessage: '',
    whatsappLink: ''
  });

  // 2. Carregar Dados Globais (Matérias e Configurações)
  // 2. Carregar Dados Globais
  useEffect(() => {
    async function loadGlobalData() {
      try {
        const [subjectRecords, settingRecord] = await Promise.all([
          pb.collection('subjects').getFullList({ sort: 'name' }),
          pb.collection('settings').getFirstListItem('').catch(() => null)
        ]);

        setSubjects(subjectRecords.map((r: any) => ({
          id: r.id, name: r.name, color: r.color
        })));

        if (settingRecord) {
          setSettings({
            schoolName: settingRecord.schoolName,
            instructorName: settingRecord.instructorName, // <--- PEGA DO BANCO
            phone: settingRecord.phone,
            email: settingRecord.email,
            welcomeMessage: settingRecord.welcomeMessage,
            whatsappLink: settingRecord.whatsappLink
          });
        }
      } catch (err) { console.error("Erro dados globais:", err); }
    }
    loadGlobalData();
  }, []);

  // 3. Persistência de Login (Simples)
  useEffect(() => {
    const storedUser = localStorage.getItem('studyflow_user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setCurrentUser(user);

        // Se o token do PB ainda estiver válido na memória, ótimo.
        // Se não, num app real faríamos uma revalidação aqui.
        // Por hora, confiamos no localStorage para manter a UI logada.

        if (user.status === 'pending') {
          setCurrentView('pending_approval');
        } else {
          setCurrentView('app');
        }
      } catch (e) {
        // Se o JSON estiver corrompido
        localStorage.removeItem('studyflow_user');
      }
    }
  }, []);

  const handleLogin = (user: User) => {
    if (user.status === 'pending') {
      setCurrentView('pending_approval');
      return;
    }
    // Salva sessão local
    localStorage.setItem('studyflow_user', JSON.stringify(user));
    setCurrentUser(user);
    setCurrentView('app');
  };

  const handleLogout = () => {
    // Limpa tudo (Local + PocketBase)
    pb.authStore.clear();
    localStorage.removeItem('studyflow_user');
    setCurrentUser(null);
    setCurrentView('login');
  };

  // --- Roteamento ---

  if (currentView === 'login' || currentView === 'register') {
    // Agora usamos apenas a LoginView para entrada
    return <LoginView onLogin={handleLogin} />;
  }

  if (currentView === 'pending_approval') {
    return <PendingApprovalView onBack={() => {
      handleLogout(); // Desloga para tentar de novo
    }} />;
  }

  if (currentView === 'app' && currentUser) {
    if (currentUser.role === 'admin') {
      return (
        <AdminApp
          user={currentUser}
          onLogout={handleLogout}
          subjects={subjects}
          setSubjects={setSubjects}
          settings={settings}
          setSettings={setSettings}
        />
      );
    } else {
      return (
        <StudentApp
          user={currentUser}
          onLogout={handleLogout}
          subjects={subjects}
          settings={settings}
        />
      );
    }
  }

  // Fallback
  return <LoginView onLogin={handleLogin} onNavigate={(view) => setCurrentView(view as ViewState)} />;
};

export default App;