/**
 * Cloudflare Worker: proxy seguro para o formulário de contato.
 *
 * Objetivo: esconder a URL do Webhook do Discord (ela nunca aparece no
 * código do site) e validar/filtrar as requisições antes de repassá-las.
 *
 * ------------------------------------------------------------------
 * COMO IMPLANTAR (sem precisar instalar nada no computador)
 * ------------------------------------------------------------------
 * 1. Crie uma conta gratuita em https://dash.cloudflare.com/sign-up
 * 2. No painel, vá em "Workers & Pages" → "Create" → "Create Worker".
 * 3. Dê um nome (ex: "niko-contact-proxy") e clique em "Deploy" (ele cria
 *    um worker de exemplo primeiro).
 * 4. Clique em "Edit code", apague o conteúdo padrão e cole todo o
 *    conteúdo deste arquivo. Clique em "Save and deploy".
 * 5. Volte para a página do Worker → aba "Settings" → "Variables and Secrets".
 *    Adicione duas variáveis (as duas marcadas como "Encrypt"):
 *      - Nome: DISCORD_WEBHOOK_URL
 *        Valor: a URL do seu webhook do Discord
 *      - Nome: DISCORD_USER_ID
 *        Valor: o seu ID de usuário do Discord (para ser mencionado a cada
 *        mensagem recebida). Nenhuma dessas duas informações fica visível
 *        no código do site nem no código deste arquivo.
 * 6. Ainda em "Settings", copie a URL pública do Worker
 *    (algo como https://niko-contact-proxy.SEU-USUARIO.workers.dev).
 * 7. Edite a constante ALLOWED_ORIGINS abaixo, trocando pelo domínio real
 *    onde o site vai ficar hospedado (e opcionalmente um endereço local
 *    tipo http://127.0.0.1:5500 para testar antes de publicar).
 * 8. No script.js do site, troque o valor de CONTACT_ENDPOINT pela URL
 *    do Worker copiada no passo 6.
 * ------------------------------------------------------------------
 */

// Só requisições vindas destes domínios são aceitas.
const ALLOWED_ORIGINS = [
  'https://itsnikotina.github.io',
  'http://127.0.0.1:5500',
  'http://localhost:5500',
];

const MAX_NAME_LENGTH = 80;
const MAX_EMAIL_LENGTH = 100;
const MAX_MESSAGE_LENGTH = 1000;

function corsHeaders(origin) {
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const headers = corsHeaders(origin);

    // Requisição de pre-flight do navegador (CORS)
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405, headers });
    }

    // Só aceita chamadas vindas de origens conhecidas
    if (!ALLOWED_ORIGINS.includes(origin)) {
      return new Response('Forbidden', { status: 403, headers });
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return new Response('Invalid JSON', { status: 400, headers });
    }

    const name = String(payload.name || '').trim().slice(0, MAX_NAME_LENGTH);
    const email = String(payload.email || '').trim().slice(0, MAX_EMAIL_LENGTH);
    const message = String(payload.message || '').trim().slice(0, MAX_MESSAGE_LENGTH);

    if (!name || !email || !message || !isValidEmail(email)) {
      return new Response('Missing or invalid fields', { status: 400, headers });
    }

    if (!env.DISCORD_WEBHOOK_URL) {
      return new Response('Server misconfigured', { status: 500, headers });
    }

    // Menciona você especificamente (via secret, nunca exposto no site).
    // allowed_mentions.users restringe o ping só a esse ID, então nada que
    // o remetente digitar na mensagem consegue pingar @everyone, cargos
    // ou outras pessoas.
    const mentionContent = env.DISCORD_USER_ID ? `<@${env.DISCORD_USER_ID}>` : undefined;
    const allowedMentions = env.DISCORD_USER_ID
      ? { parse: [], users: [env.DISCORD_USER_ID] }
      : { parse: [] };

    const discordResponse = await fetch(env.DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: mentionContent,
        allowed_mentions: allowedMentions,
        embeds: [{
          title: '📬 Nova mensagem pelo portfólio',
          color: 0x21e08a,
          fields: [
            { name: 'Nome', value: name },
            { name: 'E-mail', value: email },
            { name: 'Mensagem', value: message },
          ],
          timestamp: new Date().toISOString(),
        }],
      }),
    });

    if (!discordResponse.ok) {
      return new Response('Failed to relay message', { status: 502, headers });
    }

    return new Response('OK', { status: 200, headers });
  },
};
