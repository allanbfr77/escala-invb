// Centraliza regras de permissão do sistema
export function podeEditarMinisterio(user, ministerioId) {
  return user?.ministerioId === ministerioId;
}
