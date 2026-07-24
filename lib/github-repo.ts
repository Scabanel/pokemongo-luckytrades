// Petit client pour committer des fichiers dans le dépôt GitHub du projet
// via l'API Contents : même mécanisme que app/api/cron/backup, mutualisé
// ici pour être réutilisé par app/api/cron/refresh-data.
//
// Variables requises : GITHUB_TOKEN, GITHUB_BACKUP_REPO (voir README.md).

const API_BASE = "https://api.github.com";

function githubHeaders() {
  return {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
  };
}

function repoOrThrow() {
  const repo = process.env.GITHUB_BACKUP_REPO;
  if (!repo) throw new Error("GITHUB_BACKUP_REPO manquant");
  return repo;
}

async function getRepoFile(repoPath: string): Promise<{ sha: string; content: string } | null> {
  const res = await fetch(`${API_BASE}/repos/${repoOrThrow()}/contents/${repoPath}`, {
    headers: githubHeaders(),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET ${repoPath} → ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return { sha: data.sha, content: Buffer.from(data.content, "base64").toString("utf-8") };
}

async function putRepoFile(repoPath: string, content: Buffer, message: string, sha?: string) {
  const res = await fetch(`${API_BASE}/repos/${repoOrThrow()}/contents/${repoPath}`, {
    method: "PUT",
    headers: { ...githubHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      content: content.toString("base64"),
      ...(sha && { sha }),
    }),
  });
  if (!res.ok) throw new Error(`PUT ${repoPath} → ${res.status}: ${await res.text()}`);
}

// Écrit un fichier texte (JSON...) uniquement si son contenu a changé.
export async function putIfChangedText(repoPath: string, newContent: string, message: string) {
  const existing = await getRepoFile(repoPath);
  if (existing && existing.content === newContent) return { changed: false };
  await putRepoFile(repoPath, Buffer.from(newContent, "utf-8"), message, existing?.sha);
  return { changed: true };
}

// Liste les noms de fichiers d'un dossier en un seul appel : bien plus
// rapide que vérifier l'existence de chaque image une par une (ce qui,
// avec ~200 images, dépasserait largement maxDuration sur une fonction
// serverless rien qu'en vérifications, même sans rien de nouveau à committer).
export async function listRepoDirectory(repoPath: string): Promise<Set<string>> {
  const res = await fetch(`${API_BASE}/repos/${repoOrThrow()}/contents/${repoPath}`, {
    headers: githubHeaders(),
  });
  if (res.status === 404) return new Set();
  if (!res.ok) throw new Error(`GET ${repoPath} → ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return new Set((data as { name: string }[]).map((f) => f.name));
}

// Crée un fichier binaire (image) qui n'existe pas encore. L'appelant doit
// avoir déjà vérifié l'absence (ex: via listRepoDirectory) : pas de
// vérification ici pour rester rapide sur un gros lot de fichiers.
export async function createBinaryFile(repoPath: string, content: Buffer, message: string) {
  await putRepoFile(repoPath, content, message);
}

// Le missing-in-go.json déjà committé : utilisé en repli quand l'une des
// deux sources (margxt.fr ou PokeMiners) échoue, pour ne pas écraser ses
// catégories avec du vide. {} si le fichier n'existe pas encore.
export async function getExistingMissingInGo(): Promise<Record<string, unknown>> {
  const existing = await getRepoFile("data/missing-in-go.json");
  return existing ? JSON.parse(existing.content) : {};
}
