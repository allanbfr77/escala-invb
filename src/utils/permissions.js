// Centraliza regras de permissão do sistema

function isTruthyFlag(value) {
  return value === true || value === "true" || value === 1;
}

/** Master que só visualiza (sem editar escalas). */
export function isMasterReadOnly(user) {
  if (!user) return false;
  if (user.role === "master_readonly") return true; // legado
  return user.role === "master" && isTruthyFlag(user.readOnly);
}

/** Acesso global (qualquer ministério no login, relatório unificado). */
export function hasMasterAccess(user) {
  return user?.role === "master" || user?.role === "master_readonly";
}

export function podeEditarMinisterio(user, ministerioId) {
  if (user?.role === "master" && !isMasterReadOnly(user)) return true;
  return user?.ministerioId === ministerioId;
}

export function isMaster(user) {
  return user?.role === "master" && !isMasterReadOnly(user);
}
