# 📚 DPA Concursos - Plataforma Full Stack

> Sistema web dinâmico integrado com Backend PocketBase e Infraestrutura automatizada via Docker.

![Status](https://img.shields.io/badge/Status-Finalizado-success)
![Docker](https://img.shields.io/badge/Container-Docker-blue)
![Backend](https://img.shields.io/badge/Backend-PocketBase-orange)
![Grupo Ninja](https://img.shields.io/badge/Dev-Grupo%20Ninja-black)

## 📋 Sobre o Projeto

O **DPA Concursos** é uma plataforma web desenvolvida para Gestão de alunos. 

O grande diferencial técnico deste projeto é sua arquitetura **Zero-Config**. Diferente de backends tradicionais onde é necessário configurar bancos de dados manualmente, este sistema utiliza um **"Genesis Script"** personalizado que detecta o primeiro uso e constrói toda a estrutura de dados automaticamente.

## 🚀 Tecnologias Utilizadas

* **Frontend:** HTML5, CSS3, JavaScript (Integração via SDK).
* **Backend:** [PocketBase](https://pocketbase.io/) (Go-based realtime backend).
* **Infraestrutura:** Docker & Docker Compose.
* **Automação:** Script Genesis (Auto-Schema Migration).

---

## ⚙️ Funcionalidades Principais

### 1. Automação "Genesis" 🧬
Ao iniciar o container pela primeira vez, o sistema executa uma verificação inteligente:
1.  Verifica se o banco de dados está vazio.
2.  Cria automaticamente as **Coleções** necessárias (Tabelas).
3.  Define os tipos de campos (Texto, Relação, Data, Arquivos).
4.  Aplica as regras de segurança (API Rules).

### 2. Integração Full Stack 🔗
* **Frontend Dinâmico:** Todo o conteúdo visível no site é consumido via API REST.
* **Admin UI:** Painel administrativo completo para gestão de conteúdo sem necessidade de código.
* **Persistência:** Dados salvos em volumes Docker, garantindo segurança contra reinicializações.

---

## 📦 Como Rodar o Projeto

### Pré-requisitos
* [Docker](https://www.docker.com/) instalado e rodando.
* Git instalado.

### Passo a Passo

1.  **Clone o repositório:**
    ```bash
    git clone [https://github.com/Grupo-Ninja/dpa-concursos.git](https://github.com/Grupo-Ninja/dpa-concursos.git)
    cd dpa-concursos
    ```

2.  **Inicie o ambiente:**
    Na raiz do projeto, execute:
    ```bash
    docker compose up -d
    ```

3.  **Aguarde a "Mágica" (Genesis Script):**
    Espere cerca de **5 a 10 segundos** para que o container suba e o script configure o banco de dados automaticamente.

4.  **Acesse:**
    * 💻 **Site (Frontend):** `http://localhost:8090` (ou a porta configurada no seu front).
    * 🛠 **Painel Admin (Backend):** `http://localhost:8090/_/`
    * **Credenciais Padrão (Dev):** `admin@email.com` / `123456` (Verifique o arquivo docker-compose).

---

## 📂 Estrutura de Pastas

dpa-concursos/ ├── pb_data/ # Volume persistente do Banco de Dados (Gerado automaticamente) ├── pb_migrations/ # Scripts de migração (Genesis Script) ├── src/ # Código fonte do Frontend (HTML/CSS/JS) ├── Dockerfile # Configuração da imagem do Backend ├── docker-compose.yml # Orquestração dos containers └── README.md # Documentação

## 🤝 Contribuição (Grupo Ninja)

1.  Faça o *Fork* do projeto.
2.  Crie uma *Branch* para sua feature (`git checkout -b feature/MinhaFeature`).
3.  Faça o *Commit* (`git commit -m 'feat: Adicionando nova funcionalidade'`).
4.  Faça o *Push* (`git push origin feature/MinhaFeature`).
5.  Abra um *Pull Request*.

---
Desenvolvido por **Isaac Macêdo** | Grupo Ninja 🥷
