import PocketBase from 'pocketbase';

// URL da API configurável via variável de ambiente
const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8090';

// Conecta no seu banco de dados (Docker, Terminal ou Produção)
export const pb = new PocketBase(API_URL);

// (Opcional) Desabilita o cancelamento automático de requisições duplicadas
// Isso evita erros no console quando o React (em modo Dev) faz requisições duplas
pb.autoCancellation(false);