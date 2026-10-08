/**
 * Agency Dallas - Conversion Page Scripts
 * Tooling: Pure Vanilla JS (sem jQuery, Bootstrap JS ou Swiper, para a página carregar rápido)
 * Carregado com "defer": quando roda, o HTML já está pronto.
 */

// CONFIGURAÇÃO DOS VÍDEOS DE DEPOIMENTO (YOUTUBE SHORTS)
// Troque os 3 IDs abaixo pelos vídeos reais dos clientes da Dallas.
// O ID é o trecho final da URL do YouTube, ex: https://youtube.com/shorts/ID_DO_SHORT_1
// O player nativo do YouTube já exibe sozinho o avatar, o nome do canal e os
// inscritos do vídeo (é o mesmo comportamento padrão de um Short incorporado),
// por isso não é preciso montar esse selo manualmente.
// ATENÇÃO: os IDs abaixo são vídeos públicos de terceiros usados apenas
// como placeholder temporário para testar o layout. Substitua antes de publicar.
const testimonialVideos = [
  'XqY5uPsFxBA',
  '_RFBxOSD8Sk',
  'vkSObVsBBOM'
];

// API oficial do YouTube (carregada só quando o 1º short se aproxima da tela).
// É o único jeito confiável de ligar a legenda por código: o parâmetro de URL
// cc_load_policy não é respeitado por todos os players incorporados.
let youtubeApiReady = false;
const youtubeApiQueue = [];

function loadYouTubeIframeApi() {
  if (document.getElementById('youtube-iframe-api')) return;
  const tag = document.createElement('script');
  tag.id = 'youtube-iframe-api';
  tag.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(tag);
}

window.onYouTubeIframeAPIReady = function () {
  youtubeApiReady = true;
  youtubeApiQueue.forEach(function (fn) { fn(); });
  youtubeApiQueue.length = 0;
};

(function () {
  const WHATSAPP_PHONE = "557191840986"; // Sem o 9 de propósito: é como a conta está registrada no WhatsApp, e assim a prévia mostra a foto e o nome do perfil

  const $ = function (selector) { return document.querySelector(selector); };
  const $$ = function (selector) { return document.querySelectorAll(selector); };

  function setValue(selector, value) {
    const el = $(selector);
    if (el) el.value = value;
  }

  function fieldValue(selector) {
    const el = $(selector);
    return el ? el.value.trim() : '';
  }

  // 1. CAPTURA DE PARÂMETROS UTM E TRACKING DA URL
  function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get('utm_source') || '',
      utm_medium: params.get('utm_medium') || '',
      utm_campaign: params.get('utm_campaign') || '',
      utm_content: params.get('utm_content') || '',
      utm_term: params.get('utm_term') || '',
      fbclid: params.get('fbclid') || '',
      gclid: params.get('gclid') || ''
    };
  }

  const utmData = getUrlParams();

  // TESTE A/B: cada página marca a própria versão no <body data-variante="...">
  // A = index.html (com formulário) | B = lp.html (direto para o WhatsApp)
  const VARIANTE = document.body.dataset.variante || 'A';
  $$('.js-variante').forEach(function (el) { el.value = VARIANTE; });

  // Ponto único para avisar os pixels de que alguém abriu o WhatsApp.
  // Quando instalar o Meta Pixel e/ou o Google Analytics, os eventos já disparam daqui.
  function notifyPixels(origem) {
    if (typeof window.fbq === 'function') {
      window.fbq('track', 'Contact', { content_name: origem, variante: VARIANTE });
    }
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'whatsapp_click', { origem: origem, variante: VARIANTE });
    }
  }

  setValue('#form-utm-source', utmData.utm_source);
  setValue('#form-utm-medium', utmData.utm_medium);
  setValue('#form-utm-campaign', utmData.utm_campaign);
  setValue('#form-utm-content', utmData.utm_content);
  setValue('#form-utm-term', utmData.utm_term);
  setValue('#form-fbclid', utmData.fbclid);
  setValue('#form-gclid', utmData.gclid);
  setValue('#form-debug-url', window.location.href);
  setValue('#form-creation-time', Math.floor(Date.now() / 1000));

  // 2. MÁSCARA DINÂMICA DE TELEFONE (DDD + 8 ou 9 DÍGITOS)
  const phoneField = $('#form-field-telefone');
  if (phoneField) {
    phoneField.addEventListener('input', function () {
      let v = this.value.replace(/\D/g, '');
      if (v.length > 11) v = v.slice(0, 11);

      if (v.length > 10) {
        // (11) 99999-9999
        v = v.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
      } else if (v.length > 6) {
        // (11) 9999-9999
        v = v.replace(/^(\d{2})(\d{4})(\d{0,4})$/, '($1) $2-$3');
      } else if (v.length > 2) {
        // (11) 999...
        v = v.replace(/^(\d{2})(\d{0,5})$/, '($1) $2');
      } else if (v.length > 0) {
        v = v.replace(/^(\d*)$/, '($1');
      }
      this.value = v;

      // Limpa o aviso de telefone inválido assim que a pessoa corrige o campo
      this.setCustomValidity('');
    });
  }

  // 3. ENVIO E CONVERSÃO DO FORMULÁRIO
  const conversionForm = $('#conversion-form');

  // Registra o lead no Netlify Forms (Painel da Netlify > Forms > lead-conversao).
  // Resolve mesmo em caso de erro ou demora, para nunca travar o redirecionamento.
  function saveLeadOnNetlify(form) {
    const body = new URLSearchParams(new FormData(form)).toString();
    const request = fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body,
      keepalive: true
    }).catch(function () {});
    const timeout = new Promise(function (resolve) { setTimeout(resolve, 1500); });
    return Promise.race([request, timeout]);
  }

  if (conversionForm) {
    const submitBtn = conversionForm.querySelector('button[type="submit"]');
    const submitBtnHtml = submitBtn.innerHTML;

    // Se a pessoa voltar do WhatsApp sem enviar, o navegador pode restaurar a
    // página do cache com o botão travado em "ENVIANDO...". Aqui ele é liberado.
    window.addEventListener('pageshow', function () {
      submitBtn.innerHTML = submitBtnHtml;
      submitBtn.disabled = false;
    });

    conversionForm.addEventListener('submit', function (e) {
      e.preventDefault();

      // Telefone precisa ter DDD + 8 ou 9 dígitos
      const phoneDigits = phoneField.value.replace(/\D/g, '');
      phoneField.setCustomValidity(phoneDigits.length >= 10 ? '' : 'Informe seu WhatsApp com DDD.');

      if (!this.checkValidity()) {
        this.reportValidity();
        return;
      }

      const nome = fieldValue('#form-field-nome');
      const telefone = fieldValue('#form-field-telefone');
      const segmento = fieldValue('#form-field-segmento');
      const servico = fieldValue('#form-field-servico');

      // Feedback visual no botão
      submitBtn.innerHTML = '<span>ENVIANDO...</span>';
      submitBtn.disabled = true;

      // Monta texto formatado para envio para WhatsApp
      let msg = `Olá! Fiquei interessado nos serviços da Agency Dallas e gostaria de mais informações.\n\n`;
      if (nome) msg += `*Nome:* ${nome}\n`;
      if (telefone) msg += `*WhatsApp:* ${telefone}\n`;
      if (segmento) msg += `*Segmento:* ${segmento}\n`;
      if (servico) msg += `*Plano de Interesse:* ${servico}\n`;

      if (utmData.utm_source) {
        msg += `\n*Origem:* ${utmData.utm_source} | Campanha: ${utmData.utm_campaign || 'N/A'}`;
      }
      msg += `\n\n(ref. ${VARIANTE})`;

      notifyPixels('formulario');

      const waUrl = `https://api.whatsapp.com/send?phone=${WHATSAPP_PHONE}&text=${encodeURIComponent(msg)}`;

      // Salva o lead primeiro; assim, mesmo que a pessoa desista no WhatsApp,
      // nome, telefone, segmento e UTMs ficam registrados para contato posterior.
      saveLeadOnNetlify(this).then(function () {
        window.location.href = waUrl;
      });
    });
  }

  // 4. BOTÕES QUE ABREM O WHATSAPP DIRETO, sem passar pelo formulário.
  // data-origem = qual botão foi clicado | data-servico = combo escolhido (opcional)
  // O "(ref. A/B)" no fim da mensagem mostra de qual versão da página o cliente veio.
  $$('.js-wa-direct').forEach(function (link) {
    const servico = link.dataset.servico;
    let msg = servico
      ? `Olá! Vim pela página da Agency Dallas e tenho interesse no *${servico}*.`
      : 'Olá! Vim pela página da Agency Dallas e quero saber mais sobre as páginas.';
    if (utmData.utm_source) {
      msg += `\n\n*Origem:* ${utmData.utm_source} | Campanha: ${utmData.utm_campaign || 'N/A'}`;
    }
    msg += `\n\n(ref. ${VARIANTE})`;
    link.href = `https://api.whatsapp.com/send?phone=${WHATSAPP_PHONE}&text=${encodeURIComponent(msg)}`;

    // Registra o clique no Netlify Forms (Painel da Netlify > Forms > clique-whatsapp).
    // O link abre em nova aba, então a página continua aberta e o envio termina normalmente.
    link.addEventListener('click', function () {
      const origem = link.dataset.origem || 'desconhecida';
      const body = new URLSearchParams({
        'form-name': 'clique-whatsapp',
        variante: VARIANTE,
        origem: origem,
        servico: servico || '',
        utm_source: utmData.utm_source,
        utm_medium: utmData.utm_medium,
        utm_campaign: utmData.utm_campaign,
        utm_content: utmData.utm_content,
        fbclid: utmData.fbclid,
        gclid: utmData.gclid
      }).toString();
      fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body,
        keepalive: true
      }).catch(function () {});
      notifyPixels(origem);
    });
  });

  // 5. ACCORDION FAQ (abre um por vez, com animação de altura)
  function slide(body, open) {
    body.style.overflow = 'hidden';
    body.style.display = 'block';
    const full = body.scrollHeight + 'px';
    const anim = body.animate(
      open ? [{ height: '0px' }, { height: full }] : [{ height: full }, { height: '0px' }],
      { duration: open ? 250 : 200, easing: 'ease' }
    );
    anim.onfinish = function () {
      body.style.overflow = '';
      if (!open) body.style.display = 'none';
    };
  }

  $$('.lp-faq-header').forEach(function (header) {
    header.addEventListener('click', function () {
      const item = header.closest('.lp-faq-item');
      const body = item.querySelector('.lp-faq-body');

      if (item.classList.contains('active')) {
        item.classList.remove('active');
        slide(body, false);
      } else {
        $$('.lp-faq-item.active').forEach(function (openItem) {
          openItem.classList.remove('active');
          slide(openItem.querySelector('.lp-faq-body'), false);
        });
        item.classList.add('active');
        slide(body, true);
      }
    });
  });

  // 6. ROLAGEM SUAVE ATÉ O FORMULÁRIO (e os botões de combo já preenchem o plano escolhido)
  function scrollToForm() {
    const target = $('#formulario-conversao');
    if (!target) return;
    window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 40, behavior: 'smooth' });
    const nameField = $('#form-field-nome');
    if (nameField) nameField.focus({ preventScroll: true });
  }

  $$('a[href="#formulario-conversao"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      if (link.dataset.comboSelect) setValue('#form-field-servico', link.dataset.comboSelect);
      scrollToForm();
    });
  });

  // 7. DEPOIMENTOS - VÍDEOS SHORTS DO YOUTUBE
  // Cada card recebe o player nativo do YouTube (o mesmo player que a própria
  // Assessoria Alpha usa): ele já mostra sozinho a thumbnail, o botão de play,
  // o avatar, o nome do canal e os inscritos. O vídeo só toca quando o
  // visitante clica no player, então já sai com som, sem autoplay algum.
  // O player só é criado quando o card se aproxima da viewport (lazy load),
  // usando a API oficial do YouTube para conseguir ligar a legenda sozinho.
  (function initTestimonialShorts() {
    const shortCards = document.querySelectorAll('.lp-short-card');
    if (!shortCards.length) return;

    const players = new Map();

    function turnOnCaptions(player) {
      player.loadModule('captions');
      // O YouTube só preenche a lista de faixas de legenda um instante depois de carregar o módulo
      setTimeout(function () {
        const tracks = player.getOption('captions', 'tracklist') || [];
        if (!tracks.length) return;
        const ptTrack = tracks.find(function (t) { return (t.languageCode || '').startsWith('pt'); });
        player.setOption('captions', 'track', ptTrack || tracks[0]);
      }, 300);
    }

    function createPlayer(card, videoId) {
      const mount = document.createElement('div');
      card.querySelector('.lp-short-frame').appendChild(mount);

      const player = new YT.Player(mount, {
        videoId: videoId,
        playerVars: {
          playsinline: 1,
          rel: 0
        },
        events: {
          onReady: function (event) {
            turnOnCaptions(event.target);
          }
        }
      });

      players.set(card, player);
    }

    function loadVideo(card, videoId) {
      if (card.dataset.loaded === 'true') return;
      card.dataset.loaded = 'true';

      if (youtubeApiReady && window.YT && window.YT.Player) {
        createPlayer(card, videoId);
      } else {
        youtubeApiQueue.push(function () { createPlayer(card, videoId); });
        loadYouTubeIframeApi();
      }
    }

    // Carrega o player um pouco antes do card entrar na tela
    const loadObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        const card = entry.target;
        const index = parseInt(card.getAttribute('data-video-index'), 10);
        const videoId = testimonialVideos[index];
        if (videoId) loadVideo(card, videoId);
      });
    }, { root: null, rootMargin: '400px 0px', threshold: 0 });

    // Pausa o vídeo se o card sair da tela
    const playbackObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        const player = players.get(entry.target);
        if (!player || typeof player.pauseVideo !== 'function') return;
        if (!entry.isIntersecting) {
          player.pauseVideo();
        }
      });
    }, { root: null, threshold: 0 });

    shortCards.forEach(function (card) {
      loadObserver.observe(card);
      playbackObserver.observe(card);
    });
  })();

  // 8. VITRINE DO PORTFÓLIO (celular/tablet): o carrossel avança sozinho, em loop.
  // Os projetos são clonados antes e depois dos originais; quando a rolagem chega
  // num clone, ela volta (sem animação) para o original igual, e o giro nunca acaba.
  // No desktop os clones ficam escondidos pelo CSS e a galeria é uma grade parada.
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const carouselQuery = window.matchMedia('(max-width: 991px)');
  // Tempo (em ms) que cada projeto fica em destaque antes de a vitrine trocar.
  // Vale para a galeria no celular e para o mockup do hero.
  const VITRINE_INTERVALO = 2000;

  $$('.lp-gallery-columns, .lp-gallery-phones').forEach(function (track) {
    const originals = Array.from(track.children);
    const total = originals.length;
    if (total < 2) return;

    [true, false].forEach(function (before) {
      originals.forEach(function (item) {
        const clone = item.cloneNode(true);
        clone.classList.add('lp-gallery-clone');
        clone.setAttribute('aria-hidden', 'true');
        clone.tabIndex = -1;
        track.insertBefore(clone, before ? originals[0] : null);
      });
    });

    const items = Array.from(track.children);
    // Começa no primeiro projeto (o da Dra. Evelyn); o da Agency Dallas vem logo depois, no meio
    const startIndex = total;

    function isCarousel() {
      return track.scrollWidth > track.clientWidth + 1;
    }

    function goTo(index, smooth) {
      const item = items[index];
      const itemLeft = item.getBoundingClientRect().left - track.getBoundingClientRect().left + track.scrollLeft;
      track.scrollTo({
        left: itemLeft - (track.clientWidth - item.offsetWidth) / 2,
        behavior: smooth ? 'smooth' : 'auto'
      });
    }

    // Índice do projeto que está mais perto do centro do carrossel
    function currentIndex() {
      const middle = track.getBoundingClientRect().left + track.clientWidth / 2;
      let best = 0;
      let bestDistance = Infinity;
      items.forEach(function (item, i) {
        const rect = item.getBoundingClientRect();
        const distance = Math.abs(rect.left + rect.width / 2 - middle);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = i;
        }
      });
      return best;
    }

    if (isCarousel()) goTo(startIndex, false);
    if (carouselQuery.addEventListener) {
      carouselQuery.addEventListener('change', function (e) {
        if (e.matches) goTo(startIndex, false);
      });
    }

    if (reduceMotion) return;

    let onScreen = false;
    let pausedUntil = 0;

    new IntersectionObserver(function (entries) {
      onScreen = entries[0].isIntersecting;
    }, { root: null, threshold: 0.3 }).observe(track);

    // Se a pessoa mexer no carrossel, a vitrine espera um pouco antes de voltar a girar
    ['touchstart', 'touchmove', 'pointerdown', 'wheel'].forEach(function (eventName) {
      track.addEventListener(eventName, function () {
        pausedUntil = Date.now() + VITRINE_INTERVALO;
      }, { passive: true });
    });

    setInterval(function () {
      if (!onScreen || document.hidden || !isCarousel() || Date.now() < pausedUntil) return;

      let index = currentIndex();
      if (index < total || index >= total * 2) {
        index = total + (index % total);
        goTo(index, false);
      }
      goTo(index + 1, true);
    }, VITRINE_INTERVALO);
  });

  // 9. ANIMAÇÃO ON SCROLL (INTERSECTION OBSERVER)
  const scrollObserver = new IntersectionObserver(function (entries, observer) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('lp-is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { root: null, rootMargin: '0px', threshold: 0.15 });

  $$('.lp-section-header, .lp-gallery-columns, .lp-gallery-phones, .lp-short-card, .lp-about-card, .lp-steps-grid, .lp-feature-card, .lp-pricing-card, .lp-cta-banner, .lp-faq-accordion').forEach(function (el) {
    el.classList.add('lp-scroll-hidden');
    scrollObserver.observe(el);
  });

  // 10. BARRA FIXA DO TOPO (desktop): aparece quando o hero sai da tela.
  // No celular o CSS mantém a barra escondida, então a classe não muda nada lá.
  const topbar = $('#lp-topbar');
  const hero = $('#topo');
  let heroOnScreen = true;
  if (hero) {
    new IntersectionObserver(function (entries) {
      heroOnScreen = entries[0].isIntersecting;
      if (topbar) topbar.classList.toggle('lp-is-stuck', !heroOnScreen);
    }, { root: null, threshold: 0 }).observe(hero);
  }

  // 11. VITRINE DO HERO: o navegador e o celular do mockup trocam sozinhos de projeto, em loop.
  // Só a primeira imagem de cada tela vem no HTML com "src"; as outras têm "data-src" e são
  // baixadas depois que a página termina de carregar, para não atrasar a primeira tela.
  const heroMockup = $('.lp-hero-mockup');
  if (heroMockup && !reduceMotion) {
    const screens = Array.from(heroMockup.querySelectorAll('.lp-hero-screen')).map(function (screen) {
      return Array.from(screen.querySelectorAll('img'));
    });
    let current = 0;

    function loadHeroImages() {
      heroMockup.querySelectorAll('img[data-src]').forEach(function (img) {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
      });

      setInterval(function () {
        // Parado enquanto o hero está fora da tela ou a pessoa passa o mouse para rolar a página
        if (!heroOnScreen || document.hidden || heroMockup.matches(':hover')) return;

        const next = current + 1;
        const ready = screens.every(function (imgs) {
          const img = imgs[next % imgs.length];
          return img.complete && img.naturalWidth > 0;
        });
        if (!ready) return;

        screens.forEach(function (imgs) {
          imgs[current % imgs.length].classList.remove('lp-is-active');
          imgs[next % imgs.length].classList.add('lp-is-active');
        });
        current = next;
      }, VITRINE_INTERVALO);
    }

    if (document.readyState === 'complete') loadHeroImages();
    else window.addEventListener('load', loadHeroImages);
  }

  // 12. FOTO DE "QUEM SOMOS": se o arquivo da foto não existir, esconde o bloco
  // inteiro para não aparecer imagem quebrada.
  $$('.lp-about-person').forEach(function (person) {
    const img = person.querySelector('img');
    function hidePerson() { person.hidden = true; }
    if (img.complete && img.naturalWidth === 0) hidePerson();
    else img.addEventListener('error', hidePerson);
  });
})();
