// backEnd/seed.js
import PocketBase from 'pocketbase';

// Configuração via variáveis de ambiente
const POCKETBASE_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@email.com';
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD || '1234567890';

const pb = new PocketBase(POCKETBASE_URL);

// --- DADOS ---
const DATA = {
    cohorts: [
        { id: 'c1', name: 'Turma INSS 2024' },
        { id: 'c2', name: 'Turma Receita Federal' },
        { id: 'c3', name: 'Turma Polícia Federal' },
    ],
    subjects: [
        { id: 'sub1', name: 'Português', color: '#3b82f6' },
        { id: 'sub2', name: 'Raciocínio Lógico', color: '#f59e0b' },
        { id: 'sub3', name: 'Direito Constitucional', color: '#10b981' },
        { id: 'sub4', name: 'Informática', color: '#8b5cf6' },
        { id: 'sub5', name: 'Contabilidade Geral', color: '#ef4444' },
        { id: 'sub6', name: 'Direito Administrativo', color: '#06b6d4' },
    ],
    settings: {
        schoolName: 'Concursos DPA',
        phone: '(11) 99999-9999',
        email: 'contato@concursosdpa.com.br',
        welcomeMessage: 'Bem-vindo à plataforma de estudos de alto rendimento.',
        whatsappLink: 'https://chat.whatsapp.com/ExemploDeGrupo'
    },
    users: [
        { id: 's1', name: 'Alice Silva', email: 'alice@example.com', role: 'student', cohortId: 'c1', status: 'active' },
        { id: 's2', name: 'Bob Santos', email: 'bob@example.com', role: 'student', cohortId: 'c1', status: 'pending' },
        { id: 's3', name: 'Carlos Lima', email: 'carlos@example.com', role: 'student', cohortId: 'c1', status: 'active' },
        { id: 'adm1', name: 'Admin Isaac', email: 'admin@escola.com', role: 'admin', cohortId: '', status: 'active' }
    ],
    tasks: [
        { id: 't1', cohortId: 'c1', subject: 'Português', mode: 'Video', durationMinutes: 120, dayOfWeek: 'Monday', description: 'Assistir aula sobre Crase e Regência Verbal.' },
        { id: 't2', cohortId: 'c1', subject: 'Raciocínio Lógico', mode: 'Questions', durationMinutes: 60, dayOfWeek: 'Monday', description: 'Resolver 20 questões da banca Cebraspe.' },
        { id: 't3', cohortId: 'c1', subject: 'Direito Constitucional', mode: 'Reading', durationMinutes: 90, dayOfWeek: 'Tuesday', description: 'Ler PDF Aula 03: Direitos Fundamentais.' },
        { id: 't4', cohortId: 'c1', subject: 'Informática', mode: 'Review', durationMinutes: 45, dayOfWeek: 'Tuesday', description: 'Revisar atalhos do Windows.' },
        { id: 't5', cohortId: 'c2', subject: 'Contabilidade Geral', mode: 'Video', durationMinutes: 120, dayOfWeek: 'Monday', description: 'Introdução ao Balanço Patrimonial' },
        { id: 't6', cohortId: 'c1', studentId: 's1', subject: 'Mentoria Individual', mode: 'Review', durationMinutes: 30, dayOfWeek: 'Friday', description: 'Revisão de pontos fracos.' }
    ]
};

// Mapa para traduzir IDs antigos ('c1') para novos IDs do banco
const ID_MAP = {};

async function main() {
    try {
        console.log('🔌 Conectando ao PocketBase...');
        // Use variáveis de ambiente para credenciais do admin
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log('✅ Autenticado!');

        console.log('🛠  Verificando/Criando tabelas...');

        // Criar coleções se não existirem (ignora erro se já existir)
        await createCollection('cohorts', [{ name: 'name', type: 'text' }]);
        await createCollection('subjects', [
            { name: 'name', type: 'text' },
            { name: 'color', type: 'text' }
        ]);
        await createCollection('settings', [
            { name: 'schoolName', type: 'text' },
            { name: 'phone', type: 'text' },
            { name: 'email', type: 'email' },
            { name: 'welcomeMessage', type: 'text' },
            { name: 'whatsappLink', type: 'url' }
        ]);

        // Tasks e Checkins precisam de relacionamentos, então buscamos os IDs das coleções
        try {
            const cohortsId = (await pb.collections.getOne('cohorts')).id;
            const usersId = (await pb.collections.getOne('users')).id;
            const tasksId = (await pb.collections.getOne('tasks').catch(() => null))?.id;

            if (!tasksId) {
                await createCollection('tasks', [
                    { name: 'subject', type: 'text' },
                    { name: 'mode', type: 'select', options: { values: ['Video', 'Questions', 'Reading', 'Review'] } },
                    { name: 'durationMinutes', type: 'number' },
                    { name: 'dayOfWeek', type: 'select', options: { values: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] } },
                    { name: 'description', type: 'text' },
                    { name: 'cohort', type: 'relation', collectionId: cohortsId, maxSelect: 1 },
                    { name: 'student', type: 'relation', collectionId: usersId, maxSelect: 1 }
                ]);
            }

            const tasksCollection = await pb.collections.getOne('tasks'); // Pega o ID atualizado

            await createCollection('checkins', [
                { name: 'task', type: 'relation', collectionId: tasksCollection.id, maxSelect: 1 },
                { name: 'student', type: 'relation', collectionId: usersId, maxSelect: 1 },
                { name: 'completed', type: 'bool' },
                { name: 'actualDurationMinutes', type: 'number' },
                { name: 'note', type: 'text' },
                { name: 'period', type: 'select', options: { values: ['Morning', 'Afternoon', 'Night', 'Dawn'] } },
                { name: 'reasonForFailure', type: 'text' },
                { name: 'timestamp', type: 'date' }
            ]);
        } catch (e) {
            console.log("Aviso na criação de tabelas relacionais (pode ser que já existam):", e.message);
        }


        // --- INSERÇÃO ---
        console.log('🌱 Inserindo dados...');

        // 1. Cohorts
        for (const item of DATA.cohorts) {
            // Enviamos apenas o nome, sem o ID 'c1'
            const record = await upsert('cohorts', 'name', item.name, { name: item.name });
            ID_MAP[item.id] = record.id; // Mapeamos: 'c1' -> 'ak82...'
        }

        // 2. Subjects
        for (const item of DATA.subjects) {
            await upsert('subjects', 'name', item.name, { name: item.name, color: item.color });
        }

        // 3. Settings
        const settingsCheck = await pb.collection('settings').getList(1, 1);
        if (settingsCheck.totalItems === 0) {
            await pb.collection('settings').create(DATA.settings);
        }

        // 4. Users
        for (const item of DATA.users) {
            const userData = {
                email: item.email,
                emailVisibility: true,
                password: '12345678',
                passwordConfirm: '12345678',
                name: item.name,
                role: item.role,
                status: item.status,
                cohort: ID_MAP[item.cohortId] || null
            };
            try {
                // Tenta criar
                const record = await pb.collection('users').create(userData);
                ID_MAP[item.id] = record.id;
            } catch (e) {
                // Se der erro (ex: email duplicado), tenta buscar o ID existente
                try {
                    const existing = await pb.collection('users').getFirstListItem(`email="${item.email}"`);
                    ID_MAP[item.id] = existing.id;
                } catch {
                    console.log(`Erro ao criar user ${item.name}:`, e.message);
                }
            }
        }

        // 5. Tasks
        for (const item of DATA.tasks) {
            const taskData = {
                subject: item.subject,
                mode: item.mode,
                durationMinutes: item.durationMinutes,
                dayOfWeek: item.dayOfWeek,
                description: item.description,
                cohort: ID_MAP[item.cohortId],
                student: item.studentId ? ID_MAP[item.studentId] : null
            };
            await pb.collection('tasks').create(taskData);
        }

        console.log('------------------------------------------------');
        console.log('🚀 DADOS INSERIDOS COM SUCESSO!');
        console.log('------------------------------------------------');

    } catch (err) {
        console.error('Erro Fatal:', err);
    }
}

async function createCollection(name, schema) {
    try {
        await pb.collections.create({ name, type: 'base', schema });
        console.log(`   + Tabela '${name}' criada.`);
    } catch (e) {
        if (e.status !== 400) console.error(`Erro criar ${name}:`, e.message);
    }
}

async function upsert(col, field, val, data) {
    try {
        return await pb.collection(col).getFirstListItem(`${field}="${val}"`);
    } catch {
        return await pb.collection(col).create(data);
    }
}

main();