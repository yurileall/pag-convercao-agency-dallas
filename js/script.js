/**
 * Agency Dallas - Conversion Page Scripts
 * Tooling: jQuery & Pure Vanilla JS
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

$(document).ready(function () {
  const WHATSAPP_PHONE = "557191840986"; // Configure o WhatsApp oficial da Dallas aqui

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

  $('#form-utm-source').val(utmData.utm_source);
  $('#form-utm-medium').val(utmData.utm_medium);
  $('#form-utm-campaign').val(utmData.utm_campaign);
  $('#form-utm-content').val(utmData.utm_content);
  $('#form-utm-term').val(utmData.utm_term);
  $('#form-fbclid').val(utmData.fbclid);
  $('#form-gclid').val(utmData.gclid);
  $('#form-debug-url').val(window.location.href);
  $('#form-creation-time').val(Math.floor(Date.now() / 1000));

  // 2. MÁSCARA DINÂMICA DE TELEFONE (DDD + 8 ou 9 DÍGITOS)
  $('#form-field-telefone').on('input', function () {
    let v = $(this).val().replace(/\D/g, '');
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
    $(this).val(v);
  });

  // 3. MÁSCARA DE CNPJ
  $('#form-field-cnpj').on('input', function () {
    let v = $(this).val().replace(/\D/g, '');
    if (v.length > 14) v = v.slice(0, 14);
    if (v.length > 2) v = v.replace(/^(\d{2})(\d)/, '$1.$2');
    if (v.length > 5) v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
    if (v.length > 8) v = v.replace(/\.(\d{3})(\d)/, '.$1/$2');
    if (v.length > 12) v = v.replace(/(\d{4})(\d)/, '$1-$2');
    $(this).val(v);
  });

  // 6. ENVIO E CONVERSÃO DO FORMULÁRIO
  $('#conversion-form').on('submit', function (e) {
    e.preventDefault();

    const nome = $('#form-field-nome').val().trim();
    const email = $('#form-field-email').val().trim();
    const telefone = $('#form-field-telefone').val().trim();
    const segmento = $('#form-field-segmento').val();
    const servico = $('#form-field-servico').val();

    // Feedback visual no botão
    const $submitBtn = $(this).find('button[type="submit"]');
    const textoOriginal = $submitBtn.html();
    $submitBtn.html('<span>ENVIANDO...</span>').prop('disabled', true);

    // Monta texto formatado para envio para WhatsApp
    let msg = `Olá! Fiquei interessado nos serviços da Agency Dallas e gostaria de mais informações.\n\n`;
    msg += `*Nome:* ${nome}\n`;
    msg += `*E-mail:* ${email}\n`;
    msg += `*Telefone:* ${telefone}\n`;
    msg += `*Segmento:* ${segmento}\n`;
    msg += `*Interesse:* ${servico}\n`;

    if (utmData.utm_source) {
      msg += `\n*Origem:* ${utmData.utm_source} | Campanha: ${utmData.utm_campaign || 'N/A'}`;
    }

    const encodedMsg = encodeURIComponent(msg);
    const waUrl = `https://api.whatsapp.com/send?phone=${WHATSAPP_PHONE}&text=${encodedMsg}`;

    setTimeout(function () {
      window.location.href = waUrl;
    }, 400);
  });

  // 7. ACCORDION FAQ
  $('.lp-faq-header').on('click', function () {
    const $item = $(this).closest('.lp-faq-item');
    const $body = $item.find('.lp-faq-body');

    if ($item.hasClass('active')) {
      $body.slideUp(200);
      $item.removeClass('active');
    } else {
      $('.lp-faq-item.active').removeClass('active').find('.lp-faq-body').slideUp(200);
      $item.addClass('active');
      $body.slideDown(250);
    }
  });

  // 8. ROLAGEM SUAVE PARA FORMULÁRIO NOS BOTÕES ÂNCORA
  $('a[href="#formulario-conversao"]').on('click', function (e) {
    e.preventDefault();
    const target = $('#formulario-conversao');
    if (target.length) {
      $('html, body').animate({
        scrollTop: target.offset().top - 40
      }, 600);
      $('#form-field-nome').focus();
    }
  });

  // 9. BOTÕES DE COMBOS PREENCHEM AUTOMATICAMENTE O CAMPO DO FORMULÁRIO
  $('[data-combo-select]').on('click', function (e) {
    e.preventDefault();
    const comboValue = $(this).data('combo-select');
    $('#form-field-servico').val(comboValue);
    
    $('html, body').animate({
      scrollTop: $('#formulario-conversao').offset().top - 40
    }, 600);
    $('#form-field-nome').focus();
  });

  // 10. CARROSSEL CENTRALIZADO SWIPER (ALPHA STYLE COM CARDS LATERAIS VISÍVEIS)
  if (typeof Swiper !== 'undefined' && $('.lp-swiper').length > 0) {
    const dallasSwiper = new Swiper('.lp-swiper', {
      slidesPerView: 'auto',
      centeredSlides: true,
      spaceBetween: 28,
      loop: true,
      speed: 600,
      grabCursor: true,
      autoplay: {
        delay: 5000,
        disableOnInteraction: false,
        pauseOnMouseEnter: true,
      },
      navigation: {
        nextEl: '.lp-swiper-next',
        prevEl: '.lp-swiper-prev',
      },
      pagination: {
        el: '.lp-swiper-pagination',
        clickable: true,
      },
      breakpoints: {
        320: {
          spaceBetween: 16,
        },
        768: {
          spaceBetween: 24,
        },
        1200: {
          spaceBetween: 32,
        }
      }
    });
  }

  // 11. DEPOIMENTOS - VÍDEOS SHORTS DO YOUTUBE
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

    // Pausa o vídeo já em reprodução quando o card sai significativamente da tela
    const playbackObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        const player = players.get(entry.target);
        if (!player || typeof player.pauseVideo !== 'function') return;
        if (entry.intersectionRatio >= 0.4) {
          player.playVideo();
        } else {
          player.pauseVideo();
        }
      });
    }, { root: null, threshold: [0, 0.4] });

    shortCards.forEach(function (card) {
      loadObserver.observe(card);
      playbackObserver.observe(card);
    });
  })();

  // 12. ANIMAÇÃO ON SCROLL (INTERSECTION OBSERVER)
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.15
  };

  const scrollObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('lp-is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Seleciona os elementos para animar
  const elementsToAnimate = document.querySelectorAll('.lp-section-header, .lp-short-card, .lp-about-card, .lp-method-container, .lp-feature-card, .lp-pricing-card, .lp-cta-banner, .lp-faq-accordion');
  
  elementsToAnimate.forEach(el => {
    el.classList.add('lp-scroll-hidden');
    scrollObserver.observe(el);
  });
});


