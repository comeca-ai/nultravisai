# Nultravis

PoC do job da Ultravis sem o monólito.

A pessoa cola o domínio. O app lê a home, `robots.txt` e `llms.txt` e mostra o que o site já entrega para ser citado por um motor de IA.

Não inventa score de ChatGPT. Número = sinais presentes no HTML baixado agora.

## Job

`a pessoa consegue colar o domínio e ver se o site está pronto para ser citado`

## Stack

Next.js 15 na Vercel. Um POST `/api/grade`. Sem Supabase, sem Cloro, sem login.

## Local

```bash
npm install
npm run dev
```

## Docs

- `docs/ideia.md`
- `docs/regras.md`
- `docs/fontes.md`
- `docs/decisoes.md`
