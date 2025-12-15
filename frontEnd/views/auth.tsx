import React, { useState } from 'react';
import { BrandLogo, Card, Button, Input } from '../components/ui';
import { pb } from './lib/pocketbase';
import { User } from '../types';
import { Lock, Mail, ArrowLeft } from 'lucide-react';

interface AuthProps {
  onLogin: (user: User) => void;
  onNavigate?: (view: string) => void;
}

// Ícone do Google
const GoogleIcon = () => (
  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

export const LoginView: React.FC<AuthProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAdminMode, setIsAdminMode] = useState(false); // Toggle entre modos

  // Estados do formulário de Admin
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // 1. Login com Google (Para Alunos)
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const authData = await pb.collection('users').authWithOAuth2({ provider: 'google' });
      const userRecord = authData.record;

      // Se for novo usuário (sem role), define como estudante pendente
      if (!userRecord.role || userRecord.role === "") {
        const updatedUser = await pb.collection('users').update(userRecord.id, {
          role: 'student',
          status: 'pending',
          name: authData.meta.name || userRecord.name,
        });
        onLogin({
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role as 'admin' | 'student',
          status: updatedUser.status as 'active' | 'pending' | 'blocked',
          cohortId: updatedUser.cohort || ''
        });
      } else {
        // Usuário existente
        onLogin({
          id: userRecord.id,
          name: userRecord.name,
          email: userRecord.email,
          role: userRecord.role as 'admin' | 'student',
          status: userRecord.status as 'active' | 'pending' | 'blocked',
          cohortId: userRecord.cohort || ''
        });
      }
    } catch (err: any) {
      if (!err.isAbort) setError('Erro na conexão com Google.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Login com Senha (Para Admins)
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const authData = await pb.collection('users').authWithPassword(email, password);
      const userRecord = authData.record;

      // Verificação extra de segurança (Opcional: impedir aluno de logar por aqui)
      // if (userRecord.role !== 'admin') { throw new Error('Acesso restrito a administradores.'); }

      onLogin({
        id: userRecord.id,
        name: userRecord.name,
        email: userRecord.email,
        role: userRecord.role as 'admin' | 'student',
        status: userRecord.status as 'active' | 'pending' | 'blocked',
        cohortId: userRecord.cohort || ''
      });

    } catch (err: any) {
      console.error(err);
      setError('Email ou senha inválidos.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <BrandLogo size="large" className="mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-slate-900 font-['Playfair_Display']">
            {isAdminMode ? 'Acesso Administrativo' : 'Bem-vindo(a)'}
          </h2>
          <p className="mt-2 text-slate-600">
            {isAdminMode ? 'Entre com suas credenciais de gestão.' : 'Faça login para acessar sua área exclusiva.'}
          </p>
        </div>

        <Card className="p-8 shadow-xl border-slate-100">
          <div className="space-y-6">
            {error && (
              <div className="p-3 bg-rose-50 text-rose-600 text-sm rounded-lg border border-rose-100 text-center animate-in fade-in slide-in-from-top-1">
                {error}
              </div>
            )}

            {/* MODO ALUNO (GOOGLE) */}
            {!isAdminMode && (
              <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                <Button
                  onClick={handleGoogleLogin}
                  fullWidth
                  disabled={loading}
                  // MUDANÇA AQUI: Cores oficiais do Google (Azul com texto branco) para contraste perfeito
                  className="bg-[#4285F4] hover:bg-[#357ae8] text-white shadow-md h-14 text-base transition-all hover:shadow-lg flex items-center justify-center gap-3 border-none"
                >
                  {loading ? 'Conectando...' : (
                    <>
                      {/* O ícone usa 'currentColor', então ele ficará branco automaticamente */}
                      <GoogleIcon />
                      <span className="font-medium tracking-wide">Continuar com Google</span>
                    </>
                  )}
                </Button>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="px-2 bg-white text-slate-400">Opções</span></div>
                </div>

                <button
                  onClick={() => setIsAdminMode(true)}
                  className="w-full text-center text-sm text-slate-500 hover:text-amber-600 font-medium transition-colors"
                >
                  Sou da equipe administrativa
                </button>
              </div>
            )}

            {/* MODO ADMIN (EMAIL/SENHA) */}
            {isAdminMode && (
              <form onSubmit={handleAdminLogin} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <Input
                  label="Email Corporativo"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  icon={Mail}
                  placeholder="admin@concursosdpa.com.br"
                />
                <Input
                  label="Senha"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  icon={Lock}
                />

                <Button type="submit" fullWidth disabled={loading} className="h-12 text-base shadow-lg shadow-amber-100">
                  {loading ? 'Entrando...' : 'Acessar Painel'}
                </Button>

                <button
                  type="button"
                  onClick={() => setIsAdminMode(false)}
                  className="w-full flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-slate-600 mt-4 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Voltar para login de aluno
                </button>
              </form>
            )}
          </div>
        </Card>

        <p className="text-center text-xs text-slate-400">
          © 2025 Concursos DPA. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
};

export const RegisterView = LoginView;
export const PendingApprovalView: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
    <Card className="p-8 max-w-md text-center">
      <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Cadastro em Análise</h2>
      <p className="text-slate-600 mb-6">Sua conta foi criada com sucesso! Aguarde a aprovação da administração para acessar o sistema.</p>
      <Button onClick={onBack} variant="outline" fullWidth>Voltar para Login</Button>
    </Card>
  </div>
);