import { useRef, useState } from 'react';
import { ActionLink } from '../components/ActionLink';
import { Alert } from '../components/Alert';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { SelectField } from '../components/SelectField';
import { Toast } from '../components/Toast';

const colorTokens = [
  {
    name: '--color-primary',
    background: 'var(--color-primary)',
    foreground: 'var(--color-on-primary)',
  },
  {
    name: '--color-primary-hover',
    background: 'var(--color-primary-hover)',
    foreground: 'var(--color-on-primary)',
  },
  {
    name: '--color-on-primary',
    background: 'var(--color-primary)',
    foreground: 'var(--color-on-primary)',
  },
  {
    name: '--color-highlight',
    background: 'var(--color-highlight)',
    foreground: 'var(--color-on-surface)',
  },
  {
    name: '--color-success',
    background: 'var(--color-success)',
    foreground: 'var(--color-surface)',
  },
  {
    name: '--color-success-surface',
    background: 'var(--color-success-surface)',
    foreground: 'var(--color-success)',
  },
  {
    name: '--color-warning',
    background: 'var(--color-warning)',
    foreground: 'var(--color-surface)',
  },
  {
    name: '--color-warning-surface',
    background: 'var(--color-warning-surface)',
    foreground: 'var(--color-warning)',
  },
  {
    name: '--color-surface',
    background: 'var(--color-surface)',
    foreground: 'var(--color-on-surface)',
  },
  {
    name: '--color-surface-container',
    background: 'var(--color-surface-container)',
    foreground: 'var(--color-on-surface)',
  },
  {
    name: '--color-on-surface',
    background: 'var(--color-on-surface)',
    foreground: 'var(--color-surface)',
  },
  { name: '--color-muted', background: 'var(--color-muted)', foreground: 'var(--color-surface)' },
  {
    name: '--color-outline',
    background: 'var(--color-outline)',
    foreground: 'var(--color-surface)',
  },
  { name: '--color-danger', background: 'var(--color-danger)', foreground: 'var(--color-surface)' },
  {
    name: '--color-error-surface',
    background: 'var(--color-error-surface)',
    foreground: 'var(--color-danger)',
  },
] as const;

const typographyTokens = [
  { name: '--text-display-large', className: 'text-display-large' },
  { name: '--text-display-medium', className: 'text-display-medium' },
  { name: '--text-display-small', className: 'text-display-small' },
  { name: '--text-headline-large', className: 'text-headline-large' },
  { name: '--text-headline-medium', className: 'text-headline-medium' },
  { name: '--text-headline-small', className: 'text-headline-small' },
  { name: '--text-title-large', className: 'text-title-large' },
  { name: '--text-title-medium', className: 'text-title-medium' },
  { name: '--text-title-small', className: 'text-title-small' },
  { name: '--text-body-large', className: 'text-body-large' },
  { name: '--text-body-medium', className: 'text-body-medium' },
  { name: '--text-body-small', className: 'text-body-small' },
  { name: '--text-label-large', className: 'text-label-large' },
  { name: '--text-label-medium', className: 'text-label-medium' },
  { name: '--text-label-small', className: 'text-label-small' },
] as const;

const spacingReferences = [
  {
    value: '4 px',
    note: '0,25 rem · unidade base',
    example: '--spacing · tema Tailwind',
    markerClass: 'w-1',
  },
  {
    value: '8 px',
    note: '2 × unidade base',
    example: 'space-y-2 · campos de autenticação',
    markerClass: 'w-2',
  },
  {
    value: '12 px',
    note: '3 × unidade base',
    example: 'gap-3 · grupos do cabeçalho',
    markerClass: 'w-3',
  },
  {
    value: '16 px',
    note: '4 × unidade base',
    example: 'p-4 · superfícies compartilhadas',
    markerClass: 'w-4',
  },
  {
    value: '24 px',
    note: '6 × unidade base',
    example: 'lg:px-6 · conteúdo administrativo',
    markerClass: 'w-6',
  },
  {
    value: '32 px',
    note: '8 × unidade base',
    example: 'py-8 · página 404',
    markerClass: 'w-8',
  },
] as const;

const radiusReferences = [
  {
    category: 'Controles',
    value: '8 px',
    example: 'rounded-lg · campos e botões existentes',
  },
  {
    category: 'Cartões',
    value: '16 px',
    example: 'rounded-2xl · autenticação, navegação e página 404',
  },
  {
    category: 'Diálogos',
    value: '20 px',
    example: 'Referência aprovada · sem componente de diálogo em uso',
  },
] as const;

const surfaceTokens = [
  {
    name: '--color-panel-outline',
    value: '#D9D9D9',
    description: 'Contorno decorativo das superfícies compartilhadas.',
  },
  {
    name: '--shadow-panel',
    value: 'var(--shadow-panel)',
    description: 'Uma sombra sutil centralizada para painéis e cartões em uso.',
  },
] as const;

export function DesignSystemGalleryPage() {
  const [toastVisible, setToastVisible] = useState(false);
  const toastTriggerRef = useRef<HTMLButtonElement>(null);
  const toastContainerRef = useRef<HTMLDivElement>(null);

  function dismissToastSample() {
    if (toastContainerRef.current?.contains(document.activeElement)) {
      toastTriggerRef.current?.focus();
    }
    setToastVisible(false);
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-10 px-4 py-8 text-on-surface sm:px-6 lg:py-10">
      <header className="flex flex-col gap-5 border-b border-outline pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <p className="text-label-large font-semibold uppercase text-primary">
            NotasMAX · documentação local
          </p>
          <h1 className="text-headline-large font-semibold">Design system do NotasMAX</h1>
          <p className="max-w-3xl text-body-large leading-6 text-muted">
            Referência dos tokens visuais aprovados e dos layouts compartilhados que já são usados
            na aplicação.
          </p>
        </div>
        <ActionLink className="shrink-0" leadingIcon="arrowBack" to="/" variant="secondary">
          Voltar para entrar
        </ActionLink>
      </header>

      <section aria-labelledby="design-system-colors" className="space-y-4">
        <div>
          <h2 className="text-title-large font-semibold" id="design-system-colors">
            Papéis de cor
          </h2>
          <p className="mt-1 text-body-medium text-muted">
            Amostras conectadas aos tokens CSS ativos da aplicação.
          </p>
        </div>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {colorTokens.map((token) => (
            <li className="panel-surface min-w-0 rounded-2xl bg-surface p-4" key={token.name}>
              <code className="break-all text-label-medium text-on-surface">{token.name}</code>
              <div
                aria-hidden="true"
                className="mt-3 flex h-14 items-center rounded-lg px-4 text-title-medium font-semibold"
                style={{ backgroundColor: token.background, color: token.foreground }}
              >
                Aa
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="design-system-typography" className="space-y-4">
        <div>
          <h2 className="text-title-large font-semibold" id="design-system-typography">
            Escala tipográfica
          </h2>
          <p className="mt-1 text-body-medium text-muted">
            Os 15 papéis tipográficos Material 3 definidos no tema.
          </p>
        </div>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {typographyTokens.map((token) => (
            <li
              className="panel-surface flex min-w-0 items-baseline justify-between gap-3 rounded-2xl bg-surface p-4"
              key={token.name}
            >
              <code className="break-all text-label-small text-muted">{token.name}</code>
              <span aria-hidden="true" className={`${token.className} shrink-0 text-primary`}>
                Aa
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="design-system-spacing" className="space-y-4">
        <div>
          <h2 className="text-title-large font-semibold" id="design-system-spacing">
            Escala de espaçamento
          </h2>
          <p className="mt-1 text-body-medium text-muted">
            A escala parte de --spacing (0,25 rem) e seus múltiplos. O intervalo típico aprovado
            entre blocos é de 16–24 px.
          </p>
        </div>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {spacingReferences.map((token) => (
            <li className="panel-surface space-y-2 rounded-2xl bg-surface p-4" key={token.value}>
              <div className="flex items-baseline justify-between gap-3">
                <code className="text-title-medium font-semibold text-primary">{token.value}</code>
                <span className="text-label-small text-muted">{token.note}</span>
              </div>
              <p className="mt-2 break-words text-label-small text-on-surface">
                <code>{token.example}</code>
              </p>
              <div
                aria-hidden="true"
                className={'mt-3 h-2 rounded-full bg-primary ' + token.markerClass}
              />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="design-system-radii" className="space-y-4">
        <div>
          <h2 className="text-title-large font-semibold" id="design-system-radii">
            Raios aprovados
          </h2>
          <p className="mt-1 text-body-medium text-muted">
            Controles e cartões usam as classes de raio do tema ativo; 20 px é uma referência para
            diálogos.
          </p>
        </div>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {radiusReferences.map((token) => (
            <li className="panel-surface space-y-2 rounded-2xl bg-surface p-4" key={token.category}>
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-title-medium font-semibold text-on-surface">
                  {token.category}
                </h3>
                <code className="text-title-medium font-semibold text-primary">{token.value}</code>
              </div>
              <p className="mt-2 break-words text-label-small text-muted">
                <code>{token.example}</code>
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="design-system-surfaces" className="space-y-4">
        <div>
          <h2 className="text-title-large font-semibold" id="design-system-surfaces">
            Contorno e sombra das superfícies
          </h2>
          <p className="mt-1 text-body-medium text-muted">
            A borda clara é decorativa. Campos, estados de erro e foco mantêm seus contornos
            funcionais.
          </p>
        </div>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          {surfaceTokens.map((token) => (
            <div className="panel-surface min-w-0 rounded-2xl bg-surface p-4" key={token.name}>
              <dt>
                <code className="text-title-medium font-semibold text-primary">{token.name}</code>
              </dt>
              <dd className="mt-1 text-label-medium text-on-surface">
                <code>{token.value}</code>
              </dd>
              <dd className="mt-1 text-body-medium text-muted">{token.description}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="design-system-actions" className="space-y-4">
        <div>
          <h2 className="text-title-large font-semibold" id="design-system-actions">
            Ações e estados
          </h2>
          <p className="mt-1 text-body-medium text-muted">
            Variantes reutilizáveis com altura, foco, cores e ícones coerentes.
          </p>
        </div>
        <div className="panel-surface space-y-4 bg-surface p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button leadingIcon="search">Buscar</Button>
            <Button leadingIcon="edit" variant="secondary">
              Editar
            </Button>
            <Button leadingIcon="delete" variant="danger">
              Remover
            </Button>
            <ActionLink leadingIcon="arrowBack" to="/" variant="text">
              Voltar
            </ActionLink>
            <Button aria-label="Fechar" leadingIcon="close" size="icon" variant="text" />
            <Button disabled>Indisponível</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="positive">Ativa</Badge>
            <Badge tone="warning">Aguardando</Badge>
            <Badge tone="danger">Erro</Badge>
            <label className="min-w-56 flex-1 space-y-1 text-label-large font-medium text-on-surface">
              Seletor
              <SelectField aria-label="Seletor de exemplo" defaultValue="option-1">
                <option value="option-1">Opção disponível</option>
              </SelectField>
            </label>
          </div>
        </div>
      </section>

      <section aria-labelledby="design-system-feedback" className="space-y-4">
        <div>
          <h2 className="text-title-large font-semibold" id="design-system-feedback">
            Avisos e notificações
          </h2>
          <p className="mt-1 text-body-medium text-muted">
            Exemplos seguros de mensagens: nenhum cadastro ou dado é alterado.
          </p>
        </div>
        <div className="panel-surface space-y-4 bg-surface p-4">
          <Alert tone="info">Mensagem informativa de exemplo.</Alert>
          <Alert tone="danger">Alerta de exemplo. Nenhuma ação foi executada.</Alert>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-body-medium text-muted">
              A notificação permanece visível até ser fechada.
            </p>
            <Button
              leadingIcon="info"
              onClick={() => setToastVisible(true)}
              ref={toastTriggerRef}
              type="button"
              variant="secondary"
            >
              Exibir notificação de exemplo
            </Button>
          </div>
          {toastVisible && (
            <div ref={toastContainerRef}>
              <Toast
                durationMs={0}
                message="Notificação de exemplo. Nenhum dado foi alterado."
                onDismiss={dismissToastSample}
                position="bottom-center"
                tone="info"
              />
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="design-system-layouts" className="space-y-4">
        <div>
          <h2 className="text-title-large font-semibold" id="design-system-layouts">
            Superfícies compartilhadas em uso
          </h2>
          <p className="mt-1 text-body-medium text-muted">
            O mesmo contorno e token de sombra aparecem nos painéis reais descritos abaixo; os
            fundos próprios de cada tela são preservados.
          </p>
        </div>
        <dl className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div className="panel-surface space-y-2 rounded-2xl bg-surface p-4">
            <dt>
              <code className="text-title-medium font-semibold text-primary">AuthPageLayout</code>
            </dt>
            <dd className="text-body-medium text-muted">
              Layout compartilhado nas rotas de entrar, recuperar senha, redefinir senha e ativar
              conta.
            </dd>
            <dd className="text-label-medium text-on-surface">
              Painel de autenticação · / · /recuperar-senha · /redefinir-senha · /ativar-conta
            </dd>
          </div>
          <div className="panel-surface space-y-2 rounded-2xl bg-surface p-4">
            <dt>
              <code className="text-title-medium font-semibold text-primary">AppLayout</code>
            </dt>
            <dd className="text-body-medium text-muted">
              Painel de navegação do shell administrativo.
            </dd>
            <dd className="text-label-medium text-on-surface">/admin</dd>
          </div>
          <div className="panel-surface space-y-2 rounded-2xl bg-surface p-4">
            <dt>
              <code className="text-title-medium font-semibold text-primary">NotFoundPage</code>
            </dt>
            <dd className="text-body-medium text-muted">
              Cartão da rota de página não encontrada.
            </dd>
            <dd className="text-label-medium text-on-surface">Rotas desconhecidas · 404</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
