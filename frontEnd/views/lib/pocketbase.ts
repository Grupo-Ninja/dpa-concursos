import PocketBase from 'pocketbase';

// Conecta no seu banco de dados local rodando no Docker ou Terminal
export const pb = new PocketBase('http://127.0.0.1:8090');

// (Opcional) Desabilita o cancelamento automático de requisições duplicadas
// Isso evita erros no console quando o React (em modo Dev) faz requisições duplas
pb.autoCancellation(false);