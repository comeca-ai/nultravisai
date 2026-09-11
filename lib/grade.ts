export type Check = {
  id: string;
  label: string;
  pass: boolean;
  detail: string;
};

export type GradeResult = {
  host: string;
  fetchedUrl: string;
  status: number;
  title: string;
  description: string;
  h1: string;
  checks: Check[];
  passed: number;
  total: number;
  label: "fraco" | "parcial" | "pronto";
  measuredAt: string;
  source: string;
};

function attr(html: string, name: string): string {
  const re = new RegExp(
    `<meta[^>]+(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)["']`,
    "i"
  );
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]*(?:name|property)=["']${name}["']`,
    "i"
  );
  return (html.match(re)?.[1] || html.match(re2)?.[1] || "").trim();
}

function pick(html: string, re: RegExp): string {
  const m = html.match(re);
  return (m?.[1] || "").replace(/\s+/g, " ").trim();
}

export function normalizeHost(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) throw new Error("Cola um domínio.");
  let host = trimmed
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .split("?")[0];
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host)) {
    throw new Error("Domínio inválido.");
  }
  return host;
}

async function getText(url: string): Promise<{ status: number; text: string; url: string }> {
  const res = await fetch(url, {
    redirect: "follow",
    headers: {
      "user-agent":
        "NultravisBot/0.1 (+https://github.com/comeca-ai/nultravisai) Mozilla/5.0",
      accept: "text/html,text/plain,*/*",
    },
    cache: "no-store",
  });
  const text = await res.text();
  return { status: res.status, text, url: res.url };
}

export async function gradeHost(host: string): Promise<GradeResult> {
  const homeUrl = `https://${host}/`;
  let home: { status: number; text: string; url: string };
  try {
    home = await getText(homeUrl);
  } catch {
    throw new Error(`Não abriu https://${host}. Site fora ou bloqueou o fetch.`);
  }

  const html = home.text.slice(0, 400_000);
  const title = pick(html, /<title[^>]*>([^<]+)<\/title>/i);
  const description = attr(html, "description") || attr(html, "og:description");
  const h1 = pick(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i).replace(/<[^>]+>/g, "");
  const canonical = pick(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i);
  const og = attr(html, "og:title");
  const jsonld = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => m[1]);
  const ldBlob = jsonld.join(" ").toLowerCase();
  const hasOrg = /organization|localbusiness|person|product|faqpage|article/.test(ldBlob);
  const hasAuthor = /author|person/.test(ldBlob) || /rel=["']author["']/.test(html);
  const hasDate = /datepublished|datemodified/.test(ldBlob);

  let robots = "";
  let robotsStatus = 0;
  try {
    const r = await getText(`https://${host}/robots.txt`);
    robotsStatus = r.status;
    robots = r.text.slice(0, 20_000);
  } catch {
    robots = "";
  }

  let llms = "";
  let llmsStatus = 0;
  try {
    const r = await getText(`https://${host}/llms.txt`);
    llmsStatus = r.status;
    llms = r.text.slice(0, 20_000);
  } catch {
    llms = "";
  }

  const robotsBlocksAi =
    /gptbot|claudebot|google-extended|perplexitybot|ccbot|anthropic-ai/i.test(robots) &&
    /disallow:\s*\/\s*$/im.test(robots);
  const robotsAllows =
    robotsStatus === 200 && robots.length > 0 && !/user-agent:\s*\*[\s\S]{0,40}disallow:\s*\/\s*$/im.test(robots);

  const checks: Check[] = [
    {
      id: "live",
      label: "Home abre",
      pass: home.status >= 200 && home.status < 400 && html.length > 200,
      detail: `HTTP ${home.status} · ${html.length} chars`,
    },
    {
      id: "title",
      label: "Title",
      pass: title.length >= 8,
      detail: title || "ausente",
    },
    {
      id: "desc",
      label: "Description",
      pass: description.length >= 40,
      detail: description ? description.slice(0, 160) : "ausente",
    },
    {
      id: "h1",
      label: "H1",
      pass: h1.length >= 4,
      detail: h1 ? h1.slice(0, 140) : "ausente",
    },
    {
      id: "og",
      label: "Open Graph",
      pass: og.length > 0,
      detail: og || "sem og:title",
    },
    {
      id: "canonical",
      label: "Canonical",
      pass: canonical.length > 0,
      detail: canonical || "ausente",
    },
    {
      id: "jsonld",
      label: "JSON-LD",
      pass: hasOrg,
      detail: hasOrg ? "schema de entidade encontrado" : "sem Organization/Person/Article",
    },
    {
      id: "author",
      label: "Autor",
      pass: hasAuthor,
      detail: hasAuthor ? "sinal de autor" : "sem Person/author",
    },
    {
      id: "date",
      label: "Data",
      pass: hasDate,
      detail: hasDate ? "datePublished/Modified" : "sem data no schema",
    },
    {
      id: "robots",
      label: "robots.txt",
      pass: robotsStatus === 200 && robotsAllows && !robotsBlocksAi,
      detail:
        robotsStatus !== 200
          ? `HTTP ${robotsStatus || "falhou"}`
          : robotsBlocksAi
            ? "bloqueia bot de IA"
            : robotsAllows
              ? "presente"
              : "existe, mas Disallow: /",
    },
    {
      id: "llms",
      label: "llms.txt",
      pass: llmsStatus === 200 && llms.length > 20 && !llms.toLowerCase().includes("<html"),
      detail:
        llmsStatus === 200 && llms.length > 20 && !llms.toLowerCase().includes("<html")
          ? "presente"
          : "ausente (não é obrigatório; ajuda crawler de IA)",
    },
  ];

  const passed = checks.filter((c) => c.pass).length;
  const total = checks.length;
  const ratio = passed / total;
  const label: GradeResult["label"] = ratio >= 0.73 ? "pronto" : ratio >= 0.4 ? "parcial" : "fraco";

  return {
    host,
    fetchedUrl: home.url || homeUrl,
    status: home.status,
    title,
    description,
    h1,
    checks,
    passed,
    total,
    label,
    measuredAt: new Date().toISOString(),
    source: home.url || homeUrl,
  };
}
