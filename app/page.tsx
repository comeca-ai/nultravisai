"use client";

import { FormEvent, useState } from "react";
import type { GradeResult } from "@/lib/grade";

export default function Home() {
  const [domain, setDomain] = useState("datarisk.io");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<GradeResult | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/grade", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Não leu o site.");
        return;
      }
      setResult(data as GradeResult);
    } catch {
      setError("API fora. Tenta de novo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="wrap">
      <div className="brand">
        <span>Nultravis</span>
        <span>PoC · sem censo</span>
      </div>

      <h1>O site está pronto para ser citado?</h1>
      <p className="lead">
        Cola o domínio. Lemos a home, o robots.txt e o llms.txt agora.
        Isto não é score de ChatGPT — é prontidão do site.
      </p>

      <form id="busca" onSubmit={onSubmit}>
        <input
          type="text"
          name="domain"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="seudominio.com.br"
          aria-label="Domínio"
        />
        <button type="submit" disabled={loading}>
          {loading ? "Lendo…" : "Ler o site"}
        </button>
      </form>
      <p className="note">Sem login. Sem número inventado. Se o fetch falhar, a tela fala.</p>

      {error ? <div className="err">{error}</div> : null}

      {result ? (
        <section className="panel" aria-live="polite">
          <div className="selos">
            <span className={`selo ${result.label === "pronto" ? "ok" : result.label === "parcial" ? "warn" : "bad"}`}>
              {result.label}
            </span>
            <span className="selo">
              {result.passed}/{result.total} sinais
            </span>
            <span className="selo">{result.host}</span>
          </div>
          <p className="meta">
            <strong>{result.title || result.host}</strong>
            {result.h1 ? <> · {result.h1}</> : null}
          </p>
          {result.checks.map((c) => (
            <div className="check" key={c.id}>
              <b className={c.pass ? "ok" : "no"}>{c.pass ? "ok" : "falta"}</b>
              <span>
                {c.label}: {c.detail}
              </span>
            </div>
          ))}
          <p className="fonte">
            Fonte: HTML baixado agora de {result.source} · {result.measuredAt}
          </p>
        </section>
      ) : null}

      <footer>
        Não mede se a IA já cita a marca. Isso exige censo (Cloro / API). Este corte
        só diz se o site entrega o mínimo para um motor extrair entidade, título e
        permissão de crawl.
      </footer>
    </main>
  );
}
