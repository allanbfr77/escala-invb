/** Abre o ConfirmModal do Dashboard e resolve com true/false. */
export function pedirConfirmacao(setConfirmModal, opts) {
  return new Promise((resolve) => {
    setConfirmModal({
      aberto: true,
      titulo: opts.titulo,
      descricao: opts.descricao,
      confirmLabel: opts.confirmLabel ?? "Confirmar",
      perigoso: opts.perigoso ?? false,
      onConfirmar: () => {
        setConfirmModal((prev) => ({ ...prev, aberto: false }));
        resolve(true);
      },
      onCancelarHook: () => resolve(false),
    });
  });
}

export function cancelarConfirmacao(setConfirmModal, confirmModal) {
  confirmModal.onCancelarHook?.();
  setConfirmModal((prev) => ({ ...prev, aberto: false }));
}
