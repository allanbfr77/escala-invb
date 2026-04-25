// Centraliza regras de permissão do sistema
export function podeEditarMinisterio(user, ministerioId) {
  if (user?.role === "master") return true;
  return user?.ministerioId === ministerioId;
}

export function isMaster(user) {
  return user?.role === "master";
}
