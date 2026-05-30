#!/usr/bin/env node
/**
 * Cria usuário no Firebase Auth + documento em Firestore `users/{uid}`.
 *
 * Pré-requisito: GOOGLE_APPLICATION_CREDENTIALS ou FIREBASE_SERVICE_ACCOUNT
 * apontando para o JSON da conta de serviço (mesmo do alterar-senhas-usuarios.mjs).
 *
 * Uso:
 *   node scripts/criar-usuario.mjs --email=marcios@invb.com --senha=invb26 --role=master --readOnly
 *
 * Roles: master (--readOnly para somente leitura) | (omitir = usuário de ministério com --ministerioId)
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
      out[a.slice(2, eq)] = a.slice(eq + 1);
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

async function main() {
  const opts = parseArgs();
  const email = String(opts.email || "").trim().toLowerCase();
  const senha = opts.senha;
  const role = opts.role || "";
  const ministerioId = opts.ministerioId || "";
  const nome = opts.nome || "";

  if (!email || !senha) {
    console.error("Uso: node scripts/criar-usuario.mjs --email=... --senha=... [--role=master] [--readOnly]");
    process.exit(1);
  }

  const readOnly =
    opts.readOnly === true ||
    opts.readOnly === "true" ||
    opts.readOnly === "1" ||
    role === "master_readonly";

  if (role === "master" || role === "master_readonly") {
    // ok — master_readonly no CLI vira master + readOnly
  } else if (ministerioId) {
    // usuário de ministério
  } else {
    console.error(`Informe --role=master ou --ministerioId=comunicacao|louvor|...`);
    process.exit(1);
  }

  initAdmin();
  const authAdmin = admin.auth();
  const db = admin.firestore();

  let uid;
  try {
    const existing = await authAdmin.getUserByEmail(email);
    uid = existing.uid;
    console.log(`Auth: usuário já existe (${email}, uid ${uid})`);
    if (!opts.dryRun) {
      await authAdmin.updateUser(uid, { password: senha });
      console.log("Auth: senha atualizada");
    }
  } catch (e) {
    if (e.code !== "auth/user-not-found") throw e;
    if (opts.dryRun) {
      console.log(`[dry-run] Criaria Auth ${email}`);
      uid = "dry-run-uid";
    } else {
      const created = await authAdmin.createUser({ email, password: senha });
      uid = created.uid;
      console.log(`Auth: criado ${email} (uid ${uid})`);
    }
  }

  const isMaster = role === "master" || role === "master_readonly";
  const profile = {
    email,
    role: isMaster ? "master" : role || undefined,
    readOnly: isMaster && readOnly ? true : undefined,
    ministerioId: isMaster ? null : ministerioId || undefined,
    nome: nome || email.split("@")[0],
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  if (!profile.role) delete profile.role;
  if (!profile.readOnly) delete profile.readOnly;
  if (!profile.ministerioId) delete profile.ministerioId;

  if (opts.dryRun) {
    console.log("[dry-run] Firestore users/", uid, profile);
    return;
  }

  await db.collection("users").doc(uid).set(profile, { merge: true });
  console.log(`Firestore: users/${uid}`, profile);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
