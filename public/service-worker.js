// ======================
// CONFIGURAÇÕES GLOBAIS
// ======================

const CACHE_VERSION = 'v3.1.0';
const CACHE_NAME = `lunara-agenda-${CACHE_VERSION}`;
const STATIC_CACHE = `lunara-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `lunara-dynamic-${CACHE_VERSION}`;

// Assets críticos para precaching (App Shell)
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icone.png',
  '/icone-192.png',
  '/icone-512.png',
  // Adicionar aqui outros assets estáticos críticos
];

// URLs de API que devem usar estratégia NetworkFirst
const API_ENDPOINTS = [
  '/api/',
  '/supabase/',
  // Adicionar endpoints da sua API aqui
];

// URLs de imagens que devem usar CacheFirst
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico'];

// Tempo de cache para diferentes tipos de conteúdo
const CACHE_TTL = {
  static: 7 * 24 * 60 * 60 * 1000, // 7 dias para assets estáticos
  api: 5 * 60 * 1000,              // 5 minutos para APIs
  images: 30 * 24 * 60 * 60 * 1000, // 30 dias para imagens
};

// ======================
// UTILITÁRIOS
// ======================

/**
 * Verifica se a URL corresponde a um padrão de API
 */
const isApiRequest = (url) => {
  return API_ENDPOINTS.some(endpoint => url.includes(endpoint));
};

/**
 * Verifica se a URL é uma imagem
 */
const isImageRequest = (url) => {
  return IMAGE_EXTENSIONS.some(ext => url.toLowerCase().endsWith(ext));
};

/**
 * Verifica se a requisição deve ser cacheada
 */
const shouldCache = (request) => {
  // Não cachear requisições POST, PUT, DELETE
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    return false;
  }
  // Não cachear páginas com query strings dinâmicas
  if (request.url.includes('?')) {
    const url = new URL(request.url);
    // Permitir cache apenas se não tiver params dinâmicos
    const dynamicParams = ['token', 'session', 'random', 'timestamp'];
    for (const param of dynamicParams) {
      if (url.searchParams.has(param)) return false;
    }
  }
  return true;
};

/**
 * Adiciona headers de cache ao response
 */
const setCacheHeaders = (response, ttl) => {
  const cloned = response.clone();
  const headers = new Headers(cloned.headers);
  headers.set('Cache-Control', `public, max-age=${Math.floor(ttl / 1000)}`);
  headers.set('X-Cache-Date', new Date().toISOString());
  return new Response(cloned.body, {
    status: cloned.status,
    statusText: cloned.statusText,
    headers
  });
};

/**
 * Verifica se o cache está expirado
 */
const isCacheExpired = (cachedResponse, ttl) => {
  if (!cachedResponse) return true;
  
  const cacheDate = cachedResponse.headers.get('X-Cache-Date');
  if (!cacheDate) return true;
  
  const age = Date.now() - new Date(cacheDate).getTime();
  return age > ttl;
};

/**
 * Limpa caches antigos
 */
const cleanupOldCaches = async () => {
  try {
    const cacheNames = await caches.keys();
    const currentCaches = [CACHE_NAME, STATIC_CACHE, DYNAMIC_CACHE];
    
    for (const cacheName of cacheNames) {
      if (!currentCaches.some(name => cacheName.startsWith(name.replace(/-[\d.]+$/, '')))) {
        console.log(`🗑 Limpando cache antigo: ${cacheName}`);
        await caches.delete(cacheName);
      }
    }
  } catch (error) {
    console.error('❌ Erro ao limpar caches:', error);
  }
};

/**
 * Precache dos assets críticos
 */
const precacheAssets = async () => {
  try {
    const cache = await caches.open(STATIC_CACHE);
    const requests = PRECACHE_ASSETS.map(url => new Request(url, { cache: 'no-store' }));
    
    // Precache com fallback para erros
    await Promise.allSettled(
      requests.map(async (request) => {
        try {
          const response = await fetch(request);
          if (response.ok) {
            await cache.put(request, response);
            console.log(`✅ Precached: ${request.url}`);
          }
        } catch (error) {
          console.warn(`⚠ Falha ao precache ${request.url}:`, error.message);
        }
      })
    );
    
    console.log('📦 Precaching concluído');
  } catch (error) {
    console.error('❌ Erro no precaching:', error);
  }
};

// ======================
// ESTRATÉGIAS DE CACHE
// ======================

/**
 * Strategy: Cache First (para assets estáticos e imagens)
 * Retorna do cache, busca da rede apenas se não existir
 */
const cacheFirst = async (request, cacheName = STATIC_CACHE) => {
  try {
    const cached = await caches.match(request);
    if (cached) {
      // Atualiza em background se estiver quase expirado
      const ttl = isImageRequest(request.url) ? CACHE_TTL.images : CACHE_TTL.static;
      if (isCacheExpired(cached, ttl * 0.8)) {
        // Fire and forget update
        fetch(request.clone())
          .then(async (response) => {
            if (response.ok) {
              const cache = await caches.open(cacheName);
              await cache.put(request, setCacheHeaders(response, ttl));
            }
          })
          .catch(() => {});
      }
      console.log(`📦 Cache HIT (CacheFirst): ${request.url}`);
      return cached;
    }
    
    const response = await fetch(request);
    if (response.ok && shouldCache(request)) {
      const ttl = isImageRequest(request.url) ? CACHE_TTL.images : CACHE_TTL.static;
      const cache = await caches.open(cacheName);
      await cache.put(request, setCacheHeaders(response.clone(), ttl));
      console.log(`💾 Cache MISS + Store (CacheFirst): ${request.url}`);
    }
    return response;
  } catch (error) {
    console.warn(`⚠ CacheFirst failed: ${request.url}`, error.message);
    // Fallback offline para imagens
    if (isImageRequest(request.url)) {
      return caches.match('/icone.png');
    }
    throw error;
  }
};

/**
 * Strategy: Network First (para APIs e dados dinâmicos)
 * Tenta rede primeiro, fallback para cache se offline
 */
const networkFirst = async (request, cacheName = DYNAMIC_CACHE) => {
  try {
    const response = await fetch(request);
    if (response.ok && shouldCache(request)) {
      const cache = await caches.open(cacheName);
      await cache.put(request, setCacheHeaders(response.clone(), CACHE_TTL.api));
      console.log(`🌐 Network HIT + Cache: ${request.url}`);
    }
    return response;
  } catch (error) {
    console.warn(`⚠ Network failed, tentando cache: ${request.url}`);
    const cached = await caches.match(request);
    if (cached) {
      console.log(`📦 Cache fallback: ${request.url}`);
      // Retorna cache com header indicando que está desatualizado
      const headers = new Headers(cached.headers);
      headers.set('X-Cache-Status', 'stale');
      return new Response(cached.body, {
        status: cached.status,
        statusText: cached.statusText + ' (offline)',
        headers
      });
    }
    throw error;
  }
};

/**
 * Strategy: Stale While Revalidate (para conteúdo que muda ocasionalmente)
 * Retorna cache imediatamente, atualiza em background
 */
const staleWhileRevalidate = async (request, cacheName = DYNAMIC_CACHE) => {
  const cached = await caches.match(request);
  
  // Retorna cache imediatamente se existir
  if (cached) {
    // Atualiza em background
    fetch(request.clone())
      .then(async (response) => {
        if (response.ok) {
          const cache = await caches.open(cacheName);
          await cache.put(request, setCacheHeaders(response, CACHE_TTL.static));
          // Notifica tabs sobre atualização (opcional)
          self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({
                type: 'CACHE_UPDATED',
                url: request.url
              });
            });
          });
        }
      })
      .catch(() => {});
    
    console.log(`📦 Stale served: ${request.url}`);
    return cached;
  }
  
  // Se não tem cache, busca da rede
  try {
    const response = await fetch(request);
    if (response.ok && shouldCache(request)) {
      const cache = await caches.open(cacheName);
      await cache.put(request, setCacheHeaders(response.clone(), CACHE_TTL.static));
    }
    console.log(`🌐 Fresh fetch: ${request.url}`);
    return response;
  } catch (error) {
    console.error(`❌ StaleWhileRevalidate failed: ${request.url}`, error.message);
    throw error;
  }
};

// ======================
// EVENTOS DO SERVICE WORKER
// ======================

/**
 * Install: Precache assets críticos
 */
self.addEventListener('install', (event) => {
  console.log(`🔧 Service Worker installing (${CACHE_VERSION})`);
  
  event.waitUntil(
    Promise.all([
      precacheAssets(),
      self.skipWaiting() // Ativa imediatamente
    ]).catch(error => {
      console.error('❌ Erro na instalação:', error);
    })
  );
});

/**
 * Activate: Limpa caches antigos e assume controle
 */
self.addEventListener('activate', (event) => {
  console.log(`✅ Service Worker activated (${CACHE_VERSION})`);
  
  event.waitUntil(
    Promise.all([
      cleanupOldCaches(),
      self.clients.claim() // Assume controle das páginas abertas
    ]).then(() => {
      // Notifica clientes sobre ativação
      return self.clients.matchAll();
    }).then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'SW_ACTIVATED',
          version: CACHE_VERSION,
          message: 'App atualizado! Recarregue para aplicar mudanças.'
        });
      });
    })
  );
});

/**
 * Fetch: Intercepta requisições e aplica estratégias de cache
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = request.url;
  
  // Ignora requisições não-HTTP, chrome-extension, etc.
  if (!url.startsWith('http')) {
    return;
  }
  
  // Ignora requisições do próprio service worker
  if (url.includes('service-worker.js')) {
    return;
  }
  
  // Strategy selector baseado no tipo de requisição
  let strategy;
  
  if (isApiRequest(url)) {
    // APIs: Network First com fallback para cache
    strategy = () => networkFirst(request);
  } else if (isImageRequest(url)) {
    // Imagens: Cache First para performance
    strategy = () => cacheFirst(request);
  } else if (request.destination === 'script' || request.destination === 'style') {
    // JS/CSS: Stale While Revalidate para balancear performance e atualização
    strategy = () => staleWhileRevalidate(request);
  } else if (request.mode === 'navigate') {
    // Páginas HTML: Network First com fallback offline
    strategy = async () => {
      try {
        return await networkFirst(request);
      } catch (error) {
        // Fallback para página offline
        return caches.match('/index.html');
      }
    };
  } else {
    // Default: Cache First
    strategy = () => cacheFirst(request);
  }
  
  // Executa a estratégia e responde ao evento
  event.respondWith(
    strategy().catch((error) => {
      console.error(`❌ Falha na requisição: ${url}`, error.message);
      
      // Fallback genérico offline
      if (request.mode === 'navigate') {
        return caches.match('/index.html');
      }
      
      // Retorna resposta de erro customizada
      return new Response(
        JSON.stringify({ error: 'Offline - Não foi possível completar a requisição' }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    })
  );
});

/**
 * Push: Notificações push com ações e opções avançadas
 */
self.addEventListener('push', (event) => {
  console.log('🔔 Push recebido:', event.data?.text());
  
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    
    const notificationOptions = {
      body: data.body || 'Você tem uma atualização',
      icon: data.icon || '/icone.png',
      badge: '/icone-192.png',
      tag: data.tag || `lunara-${Date.now()}`,
      requireInteraction: data.requireInteraction !== false,
      silent: data.silent || false,
      timestamp: data.timestamp || Date.now(),
      vibrate: data.vibrate || [200, 100, 200],
      // Ações customizadas (botões na notificação)
      actions: data.actions || [
        {
          action: 'open',
          title: 'Abrir App',
          icon: '/icone-192.png'
        },
        {
          action: 'dismiss',
          title: 'Dispensar',
          icon: '/icone-192.png'
        }
      ],
      // Dados para manipular no notificationclick
      data: {
        url: data.url || '/',
        agendamentoId: data.agendamentoId,
        type: data.type || 'general'
      }
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Lunara Agenda', notificationOptions)
    );
    
  } catch (error) {
    console.error('❌ Erro ao processar push:', error);
    
    // Fallback para notificação simples
    event.waitUntil(
      self.registration.showNotification('Lunara Agenda', {
        body: 'Nova atualização disponível',
        icon: '/icone.png',
        tag: `lunara-fallback-${Date.now()}`
      })
    );
  }
});

/**
 * Notification Click: Manipula cliques nas notificações
 */
self.addEventListener('notificationclick', (event) => {
  console.log('🖱 Notification clicked:', event.action, event.notification.data);
  
  event.notification.close();
  
  const { url, agendamentoId, type } = event.notification.data || {};
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        // Se já existe uma janela do app, foca nela
        for (const client of clients) {
          if (client.url.includes(self.location.hostname) && 'focus' in client) {
            // Navega para a URL específica se fornecida
            if (url && url !== '/') {
              client.navigate(url);
            }
            // Envia dados do agendamento se aplicável
            if (agendamentoId) {
              client.postMessage({
                type: 'NOTIFICATION_CLICKED',
                agendamentoId,
                notificationType: type
              });
            }
            return client.focus();
          }
        }
        
        // Se não encontrou janela, abre uma nova
        if (url) {
          return self.clients.openWindow(url);
        }
        return self.clients.openWindow('/');
      })
      .catch((error) => {
        console.error('❌ Erro ao manipular notificationclick:', error);
      })
  );
});

/**
 * Background Sync: Sincroniza operações pendentes quando online
 */
self.addEventListener('sync', (event) => {
  console.log(`🔄 Background sync: ${event.tag}`);
  
  if (event.tag === 'sync-agendamentos' || event.tag === 'sync-all') {
    event.waitUntil(
      // Aqui você implementaria a lógica para sincronizar com seu backend
      // Exemplo: enviar agendamentos criados offline
      syncPendingOperations()
        .then(() => {
          console.log('✅ Sync concluído');
          // Notifica o app sobre sucesso
          return self.clients.matchAll();
        })
        .then(clients => {
          clients.forEach(client => {
            client.postMessage({ type: 'SYNC_COMPLETE', tag: event.tag });
          });
        })
        .catch(error => {
          console.error('❌ Erro no sync:', error);
          // Tenta novamente mais tarde
          return self.registration.sync.register(event.tag);
        })
    );
  }
});

/**
 * Função placeholder para sincronização de operações pendentes
 * Implemente conforme sua lógica de negócio
 */
const syncPendingOperations = async () => {
  // Exemplo: buscar operações pendentes do IndexedDB e enviar para API
  // Esta é uma implementação simplificada - adapte para seu caso
  
  try {
    // 1. Buscar operações pendentes (exemplo com IndexedDB)
    // const pending = await getPendingOperationsFromDB();
    
    // 2. Enviar para API em lote
    // for (const op of pending) {
    //   await fetch('/api/sync', {
    //     method: 'POST',
    //     body: JSON.stringify(op),
    //     headers: { 'Content-Type': 'application/json' }
    //   });
    // }
    
    // 3. Marcar como sincronizadas
    // await markOperationsAsSynced(pending.map(o => o.id));
    
    console.log('📤 Operações pendentes sincronizadas (placeholder)');
    return Promise.resolve();
  } catch (error) {
    console.error('❌ Erro ao sincronizar operações:', error);
    throw error;
  }
};

/**
 * Message: Comunicação bidirecional com o app
 */
self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};
  
  console.log(`💬 Message received: ${type}`, payload);
  
  switch (type) {
    case 'SKIP_WAITING':
      // Força ativação do novo SW (útil para updates)
      self.skipWaiting();
      break;
      
    case 'CACHE_URLS':
      // Permite que o app solicite cache de URLs específicas
      if (Array.isArray(payload?.urls)) {
        event.waitUntil(
          caches.open(DYNAMIC_CACHE).then(async (cache) => {
            for (const url of payload.urls) {
              try {
                const response = await fetch(url);
                if (response.ok) {
                  await cache.put(url, response);
                }
              } catch (error) {
                console.warn(`⚠ Falha ao cache ${url}:`, error.message);
              }
            }
          })
        );
      }
      break;
      
    case 'CLEAR_CACHE':
      // Permite que o app limpe caches específicos
      event.waitUntil(
        (async () => {
          const cacheName = payload?.cacheName || DYNAMIC_CACHE;
          await caches.delete(cacheName);
          console.log(`🗑 Cache limpo: ${cacheName}`);
          
          // Re-precache assets críticos se necessário
          if (payload?.reprecache) {
            await precacheAssets();
          }
        })()
      );
      break;
      
    case 'REGISTER_SYNC':
      // Registra um background sync a partir do app
      if ('sync' in self.registration && payload?.tag) {
        event.waitUntil(
          self.registration.sync.register(payload.tag)
        );
      }
      break;
      
    case 'GET_CACHE_STATS':
      // Retorna estatísticas do cache para o app
      event.waitUntil(
        (async () => {
          const stats = {};
          const cacheNames = await caches.keys();
          
          for (const name of cacheNames) {
            const cache = await caches.open(name);
            const keys = await cache.keys();
            stats[name] = {
              count: keys.length,
              size: await estimateCacheSize(keys)
            };
          }
          
          event.source?.postMessage({
            type: 'CACHE_STATS',
            payload: stats
          });
        })()
      );
      break;
      
    default:
      console.log(`⚠ Mensagem não tratada: ${type}`);
  }
});

/**
 * Estima o tamanho do cache (aproximado)
 */
const estimateCacheSize = async (requests) => {
  let totalSize = 0;
  
  for (const request of requests) {
    try {
      const response = await caches.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    } catch (error) {
      // Ignora erros de estimativa
    }
  }
  
  return totalSize;
};

/**
 * Periodic Background Sync (Chrome 98+)
 * Para atualizações periódicas em segundo plano
 */
if ('periodicSync' in self.registration) {
  self.addEventListener('periodicsync', (event) => {
    console.log(`🔄 Periodic sync: ${event.tag}`);
    
    if (event.tag === 'daily-update') {
      event.waitUntil(
        // Lógica para atualizações diárias (ex: verificar novos agendamentos)
        fetchDailyUpdates()
          .catch(error => console.error('❌ Erro no periodic sync:', error))
      );
    }
  });
  
  // Registrar periodic sync (chamar isso do app também)
  const registerPeriodicSync = async () => {
    try {
      await self.registration.periodicSync.register('daily-update', {
        minInterval: 24 * 60 * 60 * 1000 // 24 horas
      });
      console.log('📅 Periodic sync registrado');
    } catch (error) {
      console.warn('⚠ Periodic sync não disponível:', error);
    }
  };
  
  // Tenta registrar na ativação
  self.addEventListener('activate', () => {
    registerPeriodicSync();
  });
}

/**
 * Placeholder para atualizações diárias
 */
const fetchDailyUpdates = async () => {
  // Implementar lógica para buscar atualizações diárias
  console.log('📊 Buscando atualizações diárias...');
  return Promise.resolve();
};

// ======================
// ERROR HANDLING GLOBAL
// ======================

// Captura erros não tratados no service worker
self.addEventListener('error', (event) => {
  console.error('💥 Unhandled error in Service Worker:', event.error);
  
  // Reporta erro para o app (se possível)
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'SW_ERROR',
        error: {
          message: event.error?.message,
          stack: event.error?.stack,
          timestamp: Date.now()
        }
      });
    });
  });
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('💥 Unhandled promise rejection in SW:', event.reason);
});

// ======================
// INICIALIZAÇÃO
// ======================

console.log(`🚀 Lunara Agenda Service Worker ${CACHE_VERSION} carregado`);
console.log(`📦 Caches: ${CACHE_NAME}, ${STATIC_CACHE}, ${DYNAMIC_CACHE}`);
console.log(`🌐 Precached assets: ${PRECACHE_ASSETS.length} items`);