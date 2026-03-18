self.addEventListener('install', event => {
  console.log('Service Worker instalado');
});

self.addEventListener('push', event => {
  const data = event.data?.json() || {};

  self.registration.showNotification(data.title || 'Lembrete', {
    body: data.body || 'Você tem um atendimento',
    icon: '/icon.png'
  });
});
