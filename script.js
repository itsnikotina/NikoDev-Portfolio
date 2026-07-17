// =========================================
// UTIL
// =========================================
const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

// =========================================
// HEADER: sombra/fundo ao rolar
// =========================================
const header = $('#header');

function handleHeaderScroll() {
  if (window.scrollY > 20) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
}

// =========================================
// BARRA DE PROGRESSO DE LEITURA
// =========================================
const scrollProgress = $('#scroll-progress');

function updateScrollProgress() {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
  scrollProgress.style.width = `${progress}%`;
}

// =========================================
// PARTÍCULAS CONECTADAS NO HERO (canvas)
// =========================================
function initParticles() {
  const canvas = $('#particles-canvas');
  const heroSection = $('#home');
  if (!canvas || !heroSection) return;

  const ctx = canvas.getContext('2d');
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let prefersReducedMotion = motionQuery.matches;
  const isSmallScreen = window.matchMedia('(max-width: 768px)').matches;

  const AREA_PER_PARTICLE = 9000; // menor = mais partículas
  const MAX_PARTICLES = isSmallScreen ? 55 : 110;
  const MAX_LINK_DIST = 130;
  const GREEN = '33, 224, 138';
  const BLUE = '47, 184, 255';

  let width = 0;
  let height = 0;
  let particles = [];
  const mouse = { x: null, y: null, radius: 150 };

  function createParticles() {
    const count = Math.min(MAX_PARTICLES, Math.floor((width * height) / AREA_PER_PARTICLE));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 1.5 + 1,
    }));
  }

  function resize() {
    const rect = heroSection.getBoundingClientRect();
    const newWidth = rect.width;
    const newHeight = rect.height;

    if (particles.length && width && height) {
      // reposiciona as partículas proporcionalmente em vez de recriá-las,
      // evitando que o canvas fique fora de sincronia com o cursor quando
      // o terminal do hero cresce (ex: durante a digitação do whoami.py)
      const scaleX = newWidth / width;
      const scaleY = newHeight / height;
      particles.forEach(p => {
        p.x *= scaleX;
        p.y *= scaleY;
      });
    }

    width = canvas.width = newWidth;
    height = canvas.height = newHeight;

    if (!particles.length) {
      createParticles();
    }
  }

  function drawFrame(updatePhysics = true) {
    ctx.clearRect(0, 0, width, height);

    particles.forEach(p => {
      if (updatePhysics) {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x <= 0 || p.x >= width) p.vx *= -1;
        if (p.y <= 0 || p.y >= height) p.vy *= -1;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${GREEN}, 0.8)`;
      ctx.fill();
    });

    // liga partículas próximas entre si
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i];
        const b = particles[j];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);

        if (dist < MAX_LINK_DIST) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(${GREEN}, ${1 - dist / MAX_LINK_DIST})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    }

    // gera mais ligações ao redor do cursor do mouse
    if (mouse.x !== null) {
      particles.forEach(p => {
        const dist = Math.hypot(p.x - mouse.x, p.y - mouse.y);

        if (dist < mouse.radius) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = `rgba(${BLUE}, ${1 - dist / mouse.radius})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      });

      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${BLUE}, 0.9)`;
      ctx.fill();
    }

    if (!prefersReducedMotion && !document.hidden) {
      requestAnimationFrame(drawFrame);
    }
  }

  heroSection.addEventListener('mousemove', (event) => {
    const rect = heroSection.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;

    // com "reduzir movimento" ativado a animação contínua fica pausada,
    // mas o efeito interativo do mouse (iniciado pelo usuário) continua
    // funcionando através de um redesenho pontual, sem mover as partículas
    if (prefersReducedMotion) {
      drawFrame(false);
    }
  });

  heroSection.addEventListener('mouseleave', () => {
    mouse.x = null;
    mouse.y = null;

    if (prefersReducedMotion) {
      drawFrame(false);
    }
  });

  window.addEventListener('resize', resize);

  // acompanha mudanças de altura do hero (ex: terminal expandindo ao digitar)
  const resizeObserver = new ResizeObserver(() => resize());
  resizeObserver.observe(heroSection);

  // reage em tempo real se o usuário ligar/desligar "reduzir movimento" no
  // sistema, sem precisar recarregar a página
  motionQuery.addEventListener('change', (event) => {
    prefersReducedMotion = event.matches;

    if (!prefersReducedMotion && !document.hidden) {
      drawFrame();
    }
  });

  // pausa a animação quando a aba fica oculta e retoma ao voltar (economia de CPU/bateria)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !prefersReducedMotion) {
      drawFrame();
    }
  });

  resize();
  drawFrame();
}

// =========================================
// MENU MOBILE
// =========================================
const menuToggle = $('#menu-toggle');
const navLinks = $('#nav-links');

function toggleMenu() {
  menuToggle.classList.toggle('open');
  navLinks.classList.toggle('open');
}

menuToggle.addEventListener('click', toggleMenu);

$$('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    menuToggle.classList.remove('open');
    navLinks.classList.remove('open');
  });
});

// =========================================
// NAV LINK ATIVO CONFORME SCROLL
// =========================================
const sections = $$('main > section[id]');
const navItems = $$('.nav-link');

function updateActiveNavLink() {
  const scrollPos = window.scrollY + header.offsetHeight + 40;

  let currentId = sections[0]?.id;
  sections.forEach(section => {
    if (scrollPos >= section.offsetTop) {
      currentId = section.id;
    }
  });

  navItems.forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === `#${currentId}`);
  });
}

// =========================================
// BOTÃO VOLTAR AO TOPO
// =========================================
const backToTop = $('#back-to-top');

function handleBackToTop() {
  backToTop.classList.toggle('visible', window.scrollY > 500);
}

backToTop.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// =========================================
// INDICADOR DE SCROLL DO HERO
// (fixo na viewport, some assim que o usuário começa a rolar — evita que ele
// "desça" junto com a seção quando o terminal do whoami.py cresce)
// =========================================
const scrollIndicator = $('.scroll-indicator');

function handleScrollIndicator() {
  if (!scrollIndicator) return;
  scrollIndicator.classList.toggle('hidden', window.scrollY > 80);
}

// =========================================
// SCROLL ANIMATIONS (reveal + skill bars)
// =========================================
function initRevealAnimations() {
  const revealTargets = [
    ...$$('.about-text'),
    ...$$('.skills-box'),
    ...$$('.info-card'),
    ...$$('.project-card'),
    ...$$('.live-demo'),
    ...$$('.service-card'),
    ...$$('.contact-form'),
    ...$$('.contact-info'),
  ];

  revealTargets.forEach(el => el.classList.add('reveal'));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        el.classList.add('visible');

        // anima barras de habilidade quando a caixa de skills aparece
        if (el.classList.contains('skills-box')) {
          $$('.skill-fill', el).forEach(fill => fill.classList.add('animated'));
        }

        // depois que a animação de entrada termina, removemos as classes
        // 'reveal'/'visible' para que a transição rápida de hover (tilt) dos
        // cards volte a valer, sem disputar com a transição de 0.7s do reveal
        el.addEventListener('transitionend', () => {
          el.classList.remove('reveal', 'visible');
        }, { once: true });

        observer.unobserve(el);
      }
    });
  }, { threshold: 0.15 });

  revealTargets.forEach(el => observer.observe(el));
}

// =========================================
// VALIDAÇÃO DO FORMULÁRIO DE CONTATO
// =========================================
const form = $('#contact-form');
const formStatus = $('#form-status');

// Envio do formulário: chama um Cloudflare Worker que guarda a URL do webhook
// do Discord em segredo (nunca fica visível no código do site/repositório) e
// repassa a mensagem por trás dos panos. Veja cloudflare-worker.js para o
// código do proxy e o passo a passo de deploy.
const CONTACT_ENDPOINT = 'https://niko-contact-proxy.pik4chug4m3rbr.workers.dev';

// Limites defensivos (independente do maxlength do HTML) para nunca estourar
// os limites da API do Discord nem permitir payloads gigantes
const MAX_NAME_LENGTH = 80;
const MAX_EMAIL_LENGTH = 100;
const MAX_MESSAGE_LENGTH = 1000;

// Cooldown entre envios, para dificultar spam repetido pelo próprio formulário
const SUBMIT_COOLDOWN_MS = 30000;
const LAST_SUBMIT_KEY = 'contactFormLastSubmit';

function truncate(value, max) {
  return value.slice(0, max);
}

async function sendToDiscord({ name, email, message }) {
  const response = await fetch(CONTACT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: truncate(name, MAX_NAME_LENGTH),
      email: truncate(email, MAX_EMAIL_LENGTH),
      message: truncate(message, MAX_MESSAGE_LENGTH),
    }),
  });

  if (!response.ok) {
    throw new Error(`Endpoint de contato respondeu com status ${response.status}`);
  }
}

const fields = {
  name: {
    input: $('#name'),
    error: $('#error-name'),
    validate: (value) => value.trim().length >= 2,
    message: 'Informe seu nome (mínimo 2 caracteres).',
  },
  email: {
    input: $('#email'),
    error: $('#error-email'),
    validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()),
    message: 'Informe um e-mail válido.',
  },
  message: {
    input: $('#message'),
    error: $('#error-message'),
    validate: (value) => value.trim().length >= 10,
    message: 'Sua mensagem deve ter pelo menos 10 caracteres.',
  },
};

function validateField(field) {
  const value = field.input.value;
  const isValid = field.validate(value);

  field.input.classList.toggle('invalid', !isValid);
  field.error.textContent = isValid ? '' : field.message;

  return isValid;
}

Object.values(fields).forEach(field => {
  field.input.addEventListener('blur', () => validateField(field));
  field.input.addEventListener('input', () => {
    if (field.input.classList.contains('invalid')) {
      validateField(field);
    }
  });
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const results = Object.values(fields).map(validateField);
  const allValid = results.every(Boolean);

  if (!allValid) {
    formStatus.textContent = 'Por favor, corrija os campos destacados.';
    formStatus.className = 'form-status error';
    return;
  }

  // Honeypot: se o campo invisível foi preenchido, é bot — finge sucesso e não envia nada
  const honeypot = $('#website');
  if (honeypot && honeypot.value.trim() !== '') {
    formStatus.textContent = 'Mensagem enviada com sucesso! Retornarei em breve.';
    formStatus.className = 'form-status success';
    form.reset();
    return;
  }

  // Cooldown: evita envios repetidos em sequência pelo mesmo navegador
  const lastSubmit = Number(localStorage.getItem(LAST_SUBMIT_KEY) || 0);
  const elapsed = Date.now() - lastSubmit;
  if (elapsed < SUBMIT_COOLDOWN_MS) {
    const secondsLeft = Math.ceil((SUBMIT_COOLDOWN_MS - elapsed) / 1000);
    formStatus.textContent = `Aguarde ${secondsLeft}s antes de enviar outra mensagem.`;
    formStatus.className = 'form-status error';
    return;
  }

  const submitBtn = form.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Enviando...';
  formStatus.textContent = '';
  formStatus.className = 'form-status';

  try {
    await sendToDiscord({
      name: fields.name.input.value.trim(),
      email: fields.email.input.value.trim(),
      message: fields.message.input.value.trim(),
    });

    formStatus.textContent = 'Mensagem enviada com sucesso! Retornarei em breve.';
    formStatus.className = 'form-status success';
    form.reset();
    localStorage.setItem(LAST_SUBMIT_KEY, String(Date.now()));

    Object.values(fields).forEach(field => {
      field.input.classList.remove('invalid');
      field.error.textContent = '';
    });
  } catch (err) {
    formStatus.textContent = 'Não consegui enviar agora. Tente novamente ou fale por e-mail/WhatsApp.';
    formStatus.className = 'form-status error';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalBtnText;
  }
});

// =========================================
// TERMINAL DO HERO: efeito de digitação
// =========================================
const typingCode = $('#typing-code');

const terminalScript = `>>> class Dev:
...     nome_base = "Niko"
...     apelidos = ["Nikodot", "Nikito", "Nikotina"]
...     frontend = ["HTML", "CSS", "JavaScript"]
...     principal = "Python"
...
>>> print(f"Oi, eu sou o {Dev.nome_base} 👋")
Oi, eu sou o Niko 👋
>>> Dev.missao
"Soluções práticas e seguras para pequenos negócios."`;

// Sempre que uma linguagem/tecnologia for citada, ela recebe uma cor própria
function colorizeLanguages(text) {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return escaped
    .replace(/JavaScript/g, '<span class="lang lang-js">JavaScript</span>')
    .replace(/Python/g, '<span class="lang lang-python">Python</span>')
    .replace(/HTML/g, '<span class="lang lang-html">HTML</span>')
    .replace(/CSS/g, '<span class="lang lang-css">CSS</span>');
}

function typeTerminal(text, el, speed = 22) {
  let i = 0;
  el.textContent = '';

  function step() {
    if (i < text.length) {
      el.textContent = text.slice(0, i + 1);
      i++;
      setTimeout(step, speed);
    } else {
      el.innerHTML = colorizeLanguages(text);
    }
  }

  step();
}

function initTerminalTyping() {
  if (!typingCode) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        typeTerminal(terminalScript, typingCode);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });

  observer.observe($('.hero-terminal'));
}

// =========================================
// COPIAR E-MAIL PARA A ÁREA DE TRANSFERÊNCIA
// =========================================
const copyEmailBtn = $('#copy-email');
const copyToast = $('#copy-toast');
let copyToastTimeout;

function initCopyEmail() {
  if (!copyEmailBtn) return;

  copyEmailBtn.addEventListener('click', async () => {
    const emailValue = copyEmailBtn.dataset.copy;

    try {
      await navigator.clipboard.writeText(emailValue);
    } catch (err) {
      // fallback para navegadores sem suporte à Clipboard API
      const tempInput = document.createElement('input');
      tempInput.value = emailValue;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);
    }

    copyEmailBtn.classList.add('copied');
    copyToast.classList.add('visible');

    clearTimeout(copyToastTimeout);
    copyToastTimeout = setTimeout(() => {
      copyEmailBtn.classList.remove('copied');
      copyToast.classList.remove('visible');
    }, 2000);
  });
}

// =========================================
// INCLINAÇÃO SUTIL NOS CARDS (efeito 3D)
// =========================================
function initCardTilt() {
  const tiltCards = $$('.service-card, .info-card, .project-card');

  tiltCards.forEach(card => {
    card.style.transformStyle = 'preserve-3d';
    card.style.willChange = 'transform';

    card.addEventListener('mousemove', (event) => {
      const rect = card.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const rotateX = ((y / rect.height) - 0.5) * -6;
      const rotateY = ((x / rect.width) - 0.5) * 6;

      card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

// =========================================
// ANO ATUAL NO RODAPÉ
// =========================================
$('#year').textContent = new Date().getFullYear();

// =========================================
// DEMO AO VIVO: VERIFICADOR DE FORÇA DE SENHA
// (mesma lógica do security_scanner.py, rodando 100% no navegador)
// =========================================
const COMMON_WEAK_PASSWORDS = new Set([
  '123456', 'password', '12345678', 'qwerty', 'abc123', 'senha123',
  'admin', 'letmein', '111111', '123123', 'iloveyou', 'senha',
]);

function evaluatePasswordStrength(password) {
  const length = password.length;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSymbol = /[^\w\s]/.test(password);
  const isCommon = COMMON_WEAK_PASSWORDS.has(password.toLowerCase());

  const charsetSize = (hasLower ? 26 : 0) + (hasUpper ? 26 : 0) + (hasDigit ? 10 : 0) + (hasSymbol ? 32 : 0) || 1;
  const entropyBits = length * Math.log2(charsetSize);

  let strength;
  let percent;
  let color;

  if (length === 0) {
    strength = null;
  } else if (isCommon || length < 8) {
    strength = 'Muito fraca'; percent = 15; color = '#e05a5a';
  } else if (entropyBits < 40) {
    strength = 'Fraca'; percent = 35; color = '#e0925a';
  } else if (entropyBits < 60) {
    strength = 'Média'; percent = 55; color = 'var(--color-lang-python)';
  } else if (entropyBits < 80) {
    strength = 'Forte'; percent = 78; color = 'var(--color-primary-light)';
  } else {
    strength = 'Muito forte'; percent = 100; color = 'var(--color-primary)';
  }

  return {
    length, hasLower, hasUpper, hasDigit, hasSymbol, isCommon,
    entropyBits: Math.round(entropyBits * 10) / 10,
    strength, percent, color,
  };
}

function initPasswordDemo() {
  const input = $('#password-demo');
  const toggleBtn = $('#toggle-password');
  const fill = $('#strength-fill');
  const label = $('#strength-label');
  const checklist = $('#strength-checklist');
  if (!input || !fill || !label || !checklist) return;

  const EYE_ICON = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>';
  const EYE_OFF_ICON = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/></svg>';

  toggleBtn?.addEventListener('click', () => {
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    toggleBtn.innerHTML = isPassword ? EYE_OFF_ICON : EYE_ICON;
  });

  input.addEventListener('input', () => {
    const value = input.value;
    const result = evaluatePasswordStrength(value);

    if (!result.strength) {
      fill.style.width = '0%';
      label.textContent = 'Digite uma senha acima para começar';
    } else {
      fill.style.width = `${result.percent}%`;
      fill.style.background = result.color;
      label.textContent = `${result.strength} — ~${result.entropyBits} bits de entropia`;
    }

    const checks = {
      length: result.length >= 12,
      lower: result.hasLower,
      upper: result.hasUpper,
      digit: result.hasDigit,
      symbol: result.hasSymbol,
      common: value.length > 0 && !result.isCommon,
    };

    Object.entries(checks).forEach(([key, passed]) => {
      const item = checklist.querySelector(`[data-check="${key}"]`);
      item?.classList.toggle('valid', passed);
    });
  });
}

// =========================================
// EVENT LISTENERS GLOBAIS
// =========================================
window.addEventListener('scroll', () => {
  handleHeaderScroll();
  updateActiveNavLink();
  handleBackToTop();
  handleScrollIndicator();
  updateScrollProgress();
});

document.addEventListener('DOMContentLoaded', () => {
  handleHeaderScroll();
  updateActiveNavLink();
  handleBackToTop();
  handleScrollIndicator();
  updateScrollProgress();
  initRevealAnimations();
  initTerminalTyping();
  initCopyEmail();
  initCardTilt();
  initParticles();
  initPasswordDemo();
});
