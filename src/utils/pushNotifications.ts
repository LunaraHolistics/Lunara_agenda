export async function inscreverPush(vapidPublicKey: string) {
  if (!('serviceWorker' in navigator)) return;

  const registration = await navigator.serviceWorker.ready;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: vapidPublicKey
  });

  console.log('Usuário inscrito:', subscription);

  // (Futuro) enviar para backend
  return subscription;
}

export function dispararNotificacaoSimulada() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.ready.then(reg => {
    reg.showNotification('Atendimento hoje', {
      body: 'Você tem sessões agendadas',
      icon: '/icon.png'
    });
  });
}
