#!/usr/bin/env node
/**
 * Altera senhas no Firebase Authentication via Admin SDK (sem precisar da senha antiga).
 *
 * Pré-requisito (uma das opções):
 *   - Variável de ambiente GOOGLE_APPLICATION_CREDENTIALS=caminho/absoluto/serviceAccount.json
 *   - ou FIREBASE_SERVICE_ACCOUNT=caminho/absoluto/serviceAccount.json
 *
 * Obtenha o JSON em: Firebase Console → Configurações do projeto → Contas de serviço →
 * "Gerar nova chave privada". NUNCA commite esse arquivo no Git.
 *
 * Uso (PowerShell):
 *   $env:GOOGLE_APPLICATION_CREDENTIALS="C:\caminho\serviceAccount.json"
 *   node scripts/alterar-senhas-usuarios.mjs --email=fulano@email.com --senha="NovaSenhaForte123"
 *
 * Vários emails (um por linha em UTF-8; linhas # são ignoradas):
 *   node scripts/alterar-senhas-usuarios.mjs --arquivo=scripts/emails-exemplo.txt --senha="MesmaParaTodos"
 *
 * Um CSV por usuário (sem cabeçalho): email,senha_nova
 *   node scripts/alterar-senhas-usuarios.mjs --csv=scripts/emails-senhas.csv
 *
 * Todos os docs em Firestore collection `users` que tenham campo `email`:
 *   node scripts/alterar-senhas-usuarios.mjs --firestore --senha="NovaSenha"
 *
 * Simular sem gravar:
 *   ... --dry-run
 */

import admin from "firebase-admin";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function parseArgs() {
  const raw = process.argv.slice(2);
  const out = { dryRun: false };
  for (let i = 0; i < raw.length; i++) {
    const a = raw[i];
    if (a === "--dry-run") {
      out.dryRun = true;
      continue;
    }
    if (!a.startsWith("--")) continue;
    const eq = a.indexOf("=");
    if (eq >= 0) {
      const key = a.slice(2, eq);
      const val = a.slice(eq + 1);
      out[key] = val;
    } else {
      const key = a.slice(2);
      const val = raw[i + 1];
      if (val && !val.startsWith("--")) {
        out[key] = val;
        i++;
      } else {
        out[key] = true;
      }
    }
  }
  return out;
}

function loadCredentialPath() {
  const raw =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.FIREBASE_SERVICE_ACCOUNT ||
    "";
  const p = String(raw).trim().replace(/^["']+|["']+$/g, "");
  if (!p) {
    console.error(
      "Defina GOOGLE_APPLICATION_CREDENTIALS ou FIREBASE_SERVICE_ACCOUNT com o caminho ao JSON da conta de serviço."
    );
    process.exit(1);
  }
  const abs = resolve(p);
  if (!existsSync(abs)) {
    console.error(`Arquivo de credencial não encontrado:\n  ${abs}`);
    console.error(
      "Confira no Explorer se o nome do arquivo não mudou; baixe de novo em Firebase Console → Contas de serviço → Gerar nova chave privada."
    );
    console.error('No PowerShell: Test-Path -LiteralPath "C:\\...\\arquivo.json"');
    process.exit(1);
  }
  return abs;
}

function initAdmin() {
  const pathCred = loadCredentialPath();
  const sa = JSON.parse(readFileSync(pathCred, "utf8"));
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(sa) });
  }
}

async function updatePasswordForEmail(authAdmin, email, newPassword, dryRun) {
  const trimmed = String(email).trim().toLowerCase();
  if (!trimmed) return { ok: false, skip: true, email: trimmed };
  try {
    const user = await authAdmin.getUserByEmail(trimmed);
    if (dryRun) {
      console.log(`[dry-run] ${trimmed} (uid ${user.uid})`);
      return { ok: true, dryRun: true, email: trimmed };
    }
    await authAdmin.updateUser(user.uid, { password: newPassword });
    console.log(`OK ${trimmed} (uid ${user.uid})`);
    return { ok: true, email: trimmed };
  } catch (e) {
    console.error(`ERRO ${trimmed}: ${e.message}`);
    return { ok: false, email: trimmed, error: e.message };
  }
}

function parseEmailFile(content) {
  return content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));
}

function parseCsv(content) {
  const rows = [];
  for (const line of content.split(/\r?\n/)) {
    const t = line.trim();
    if (!t.length || t.startsWith("#")) continue;
    const idx = t.indexOf(",");
    if (idx === -1) throw new Error(`CSV inválido (use email,senha por linha): ${t}`);
    rows.push({
      email: t.slice(0, idx).trim(),
      senha: t.slice(idx + 1).trim(),
    });
  }
  return rows;
}

async function main() {
  const opts = parseArgs();

  const flagTipoEmailErrado = Object.keys(opts).find(
    (k) => k.includes("@") && k !== "email"
  );
  if (flagTipoEmailErrado && !opts.email) {
    console.error(
      `Argumento incorreto "--${flagTipoEmailErrado}". O correto é:\n  --email=${flagTipoEmailErrado} --senha="..."`
    );
    process.exit(1);
  }

  if ((opts.email && !opts.senha) || (!opts.email && opts.senha && !opts.csv && !opts.arquivo && !opts.firestore)) {
    console.error(
      'Para um usuário use os dois parâmetros, por exemplo:\n  npm run auth:alterar-senhas -- --email=jean@invb.com --senha="vitorioso2026"'
    );
    process.exit(1);
  }

  initAdmin();
  const authAdmin = admin.auth();

  if (opts.csv) {
    const content = readFileSync(resolve(opts.csv), "utf8");
    const rows = parseCsv(content);
    let ok = 0;
    let fail = 0;
    for (const { email, senha } of rows) {
      const r = await updatePasswordForEmail(authAdmin, email, senha, opts.dryRun);
      if (r.ok) ok++;
      else fail++;
    }
    console.log(`\nResumo: ${ok} ok, ${fail} falhas`);
    process.exit(fail ? 1 : 0);
  }

  if (opts.email && opts.senha) {
    const r = await updatePasswordForEmail(authAdmin, opts.email, opts.senha, opts.dryRun);
    process.exit(r.ok ? 0 : 1);
  }

  let emails = [];
  if (opts.arquivo) {
    emails = parseEmailFile(readFileSync(resolve(opts.arquivo), "utf8"));
  } else if (opts.firestore) {
    const db = admin.firestore();
    const snap = await db.collection("users").get();
    const set = new Set();
    for (const d of snap.docs) {
      const mail = d.data()?.email;
      if (typeof mail === "string" && mail.trim()) set.add(mail.trim().toLowerCase());
    }
    emails = [...set];
    console.log(`Firestore users: ${emails.length} email(s) único(s) encontrado(s)`);
  } else {
    console.error(
      "Informe: (--email + --senha) | (--arquivo + --senha) | (--firestore + --senha) | (--csv)"
    );
    process.exit(1);
  }

  if (!opts.senha) {
    console.error("Para --arquivo ou --firestore é obrigatório --senha");
    process.exit(1);
  }

  let ok = 0;
  let fail = 0;
  for (const email of emails) {
    const r = await updatePasswordForEmail(authAdmin, email, opts.senha, opts.dryRun);
    if (r.ok) ok++;
    else fail++;
  }
  console.log(`\nResumo: ${ok} ok, ${fail} falhas`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
