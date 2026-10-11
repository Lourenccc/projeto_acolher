# Acolher — Gestão de Consultórios (demonstração)

Interface inicial de um SaaS brasileiro de gestão de consultórios, começando por psicólogos e preparada
para outras profissões da saúde.

> **Demonstração:** somente frontend, com dados **fictícios** em memória. Não há autenticação, banco de dados,
> prontuários nem coleta de dados clínicos. Não insira dados reais.

## Stack

Next.js 14 (App Router) · React 18 · TypeScript (strict) · Tailwind CSS 3 · lucide-react (ícones)

## Como executar

Pré-requisito: **Node.js 18.18+** (recomendado 20 LTS).

```bash
npm install
npm run dev
```

Acesse http://localhost:3000 (redireciona para `/dashboard`).

Outros scripts: `npm run build`, `npm start`, `npm run lint`, `npm run typecheck`.

## Funcionalidades

| Área | O que tem |
| --- | --- |
| **Dashboard** | Atendimentos do dia, próximo atendimento, pendências financeiras, recebido no mês, próximos compromissos e resumo semanal. |
| **Agenda** | Grade semanal por horários e visualização em lista; navegação entre semanas; novo agendamento (inclusive clicando no horário vazio); detalhes; reagendamento; cancelamento **com confirmação**; registro de falta; registro de atendimento realizado com geração opcional de cobrança. Detecção de conflito de horário. |
| **Pacientes** | Tabela pesquisável (nome, e-mail, telefone, sem acentos), filtro por situação, cadastro e edição com valor por sessão, frequência e horário recorrente. Cartões no celular. |
| **Financeiro** | Filtros de período (mês anterior/atual/próximo/personalizado), paciente e status; indicadores; títulos a receber com registrar pagamento, editar e cancelar; demonstrativo por paciente com totais. |
| **Configurações** | Dados do consultório, área de atuação (multiprofissional futuro), expediente, duração padrão, dias de atendimento; simulação de falha e restauração dos dados. |

Padrões brasileiros: datas **DD/MM/AAAA** (campos com máscara, independentes do idioma do navegador),
horários **24h**, moeda **BRL** (`Intl.NumberFormat('pt-BR')`, valores guardados em centavos).

Estados de interface: carregamento (skeletons), vazio, erro com "Tentar novamente" (ative
*Simular falha* em Configurações para ver), sucesso (toasts com `aria-live`).

Acessibilidade: modais com `<dialog>` nativo (foco preso, Esc fecha, foco restaurado), confirmação com
foco inicial no botão seguro, link "Pular para o conteúdo", `aria-current` no menu, rótulos e erros
associados aos campos (`aria-invalid`, `aria-describedby`), foco no primeiro campo inválido,
tabelas com `caption`/`scope`, respeito a `prefers-reduced-motion`.

## Estrutura

```
src/
├── app/                      # Rotas (App Router)
│   ├── layout.tsx            # HTML raiz (pt-BR), fonte, metadados
│   ├── page.tsx              # Redireciona para /dashboard
│   ├── not-found.tsx
│   └── (admin)/              # Área administrativa com sidebar
│       ├── layout.tsx
│       ├── dashboard/  agenda/  pacientes/  financeiro/  configuracoes/
├── components/
│   ├── layout/               # AppShell, Sidebar (desktop + gaveta mobile), Topbar, DataBoundary
│   └── ui/                   # Button, Fields, Modal, ConfirmDialog, Toast, Badge, Card, StatCard, Alert, States…
├── features/                 # Telas por domínio (dashboard, agenda, patients, finance, settings)
├── store/AppDataProvider.tsx # Estado local + ações (única ponte entre UI e serviços)
├── services/                 # "API" mockada com latência simulada — ponto de troca para a API real
├── data/mockData.ts          # Dados fictícios gerados relativos à data atual
├── hooks/                    # useNow, useMounted
├── lib/                      # Datas, formatação BRL/telefone, rótulos, utilidades
└── types/                    # Tipos de domínio (contratos da futura API)
```

## Integração futura com API

Os componentes não acessam dados diretamente: usam `useAppData()` → `src/services/*`. Para conectar um
backend, substitua `mockRequest(...)` em cada serviço por `fetch(`${process.env.NEXT_PUBLIC_API_URL}/...`)`
mantendo as assinaturas e os tipos de `src/types`. Veja `.env.example` (sem segredos).
