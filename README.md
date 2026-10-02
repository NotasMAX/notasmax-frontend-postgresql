# NotasMAX — frontend web

Base inicial do frontend web do NotasMAX, construída com React, Vite e TypeScript. A aplicação contém navegação e rotas de demonstração, além de um cliente Axios compartilhado preparado para uma URL pública de API.

## Pré-requisitos

- Node.js 24.21.0
- npm incluído com essa versão do Node.js

Confira as versões instaladas:

```powershell
node --version
npm --version
```

## Instalação

Na pasta do projeto, instale as dependências a partir do lockfile:

```powershell
npm ci
```

## Configuração do ambiente

A variável opcional **VITE_API_BASE_URL** define a URL base usada pelo cliente Axios. Ela aceita uma URL HTTP(S) absoluta ou um caminho relativo da mesma origem. Use a URL confirmada para o ambiente da API; esta base não define endpoints de negócio.

Para configuração local, crie um arquivo .env.local na raiz do projeto:

```text
VITE_API_BASE_URL=URL_BASE_CONFIRMADA_DA_API
```

Substitua o valor de exemplo pela URL da API do ambiente. URLs absolutas devem usar HTTPS em produção. Todas as variáveis VITE_* são incluídas no bundle público do navegador. Não coloque credenciais ou segredos nessa variável. Arquivos .env são ignorados pelo Git.

## Execução local

```powershell
npm run dev
```

O Vite informa o endereço local no terminal. A aplicação oferece as rotas /, /exemplo e uma página de fallback para outros caminhos.

## Comandos disponíveis

| Comando              | Descrição                                         |
| -------------------- | ------------------------------------------------- |
| npm run lint         | Verifica o código com ESLint.                     |
| npm run format       | Formata os arquivos com Prettier.                 |
| npm run format:check | Verifica a formatação sem modificar arquivos.     |
| npm run typecheck    | Verifica os tipos TypeScript.                     |
| npm run test         | Executa testes unitários Vitest em ambiente Node. |
| npm run build        | Verifica os tipos e gera o build de produção.     |

O cliente normaliza erros da API com mensagens genéricas e mantém code e errors[] disponíveis como metadados. Não renderize valores brutos de erro sem um contrato de apresentação seguro.
