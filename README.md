# NotasMAX — frontend web

Frontend web do NotasMAX, construído com React, Vite e TypeScript. Inclui acesso administrativo, sessão por cookie HTTP-only e os fluxos públicos de recuperação, redefinição de senha e ativação de conta.

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

O Vite informa o endereço local no terminal. Rotas da fase AUTH:

| Rota                       | Uso                                                                                |
| -------------------------- | ---------------------------------------------------------------------------------- |
| `/`                        | Entrar na área administrativa.                                                     |
| `/recuperar-senha`         | Solicitar um link de redefinição com resposta genérica.                            |
| `/redefinir-senha?token=…` | Definir uma nova senha pelo link enviado pela API.                                 |
| `/ativar-conta?token=…`    | Ativar a conta e definir a senha inicial.                                          |
| `/admin`                   | Área protegida pela consulta de sessão da API; a guarda do navegador é somente UX. |

O cliente envia cookies somente para a origem configurada em `VITE_API_BASE_URL` e acrescenta `X-Requested-With: XMLHttpRequest` às mutações. Tokens dos links são removidos da barra de endereço assim que a aplicação inicia e não ficam em storage do navegador. Use os fluxos apenas em desenvolvimento e testes locais, sem exposição externa. O transporte de e-mail da API permanece fake/local nesta fase.

## Comandos disponíveis

| Comando              | Descrição                                         |
| -------------------- | ------------------------------------------------- |
| npm run lint         | Verifica o código com ESLint.                     |
| npm run format       | Formata os arquivos com Prettier.                 |
| npm run format:check | Verifica a formatação sem modificar arquivos.     |
| npm run typecheck    | Verifica os tipos TypeScript.                     |
| npm run test         | Executa testes unitários Vitest em ambiente Node. |
| npm run build        | Verifica os tipos e gera o build de produção.     |

**Regra de apresentação:** para erros RFC 9457 utilizáveis, a interface deve exibir os textos seguros da API em `detail` e, para validações de campo, em `errors[].detail`, associados ao campo indicado em `errors[].source`. Se `detail` não existir, pode usar `title` quando apropriado à tela. `status` e `code` orientam o comportamento; a ausência de `code` não impede a exibição do texto seguro. Mensagens genéricas locais ficam como contingência para falhas de rede, respostas vazias ou inválidas. A API mantém respostas genéricas nos fluxos públicos de autenticação e recuperação para evitar revelar se uma conta existe; conflitos administrativos autenticados podem ser específicos. Respostas de health check são técnicas e não devem aparecer como mensagens de produto.

**Implementação atual:** a fronteira compartilhada só normaliza respostas com mídia `application/problem+json` e envelope válido. Os fluxos AUTH apresentam `detail`, erros de campo validados e `title` de contingência como texto comum, sem inferir comportamento pelo conteúdo textual. Fontes de campo são associadas somente por pointers de body conhecidos; fontes válidas sem campo correspondente permanecem no formulário. Textos que contenham valores enviados ou padrões de credenciais são omitidos. Respostas inutilizáveis usam contingência genérica local.
