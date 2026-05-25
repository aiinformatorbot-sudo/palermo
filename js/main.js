const onReady = (callback) => {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback, { once: true });
    return;
  }

  callback();
};

// Включаем CSS-анимации появления только когда работает JavaScript.
// Если скрипт не загрузился — контент остаётся видимым, без opacity:0.
document.documentElement.classList.add('js');

onReady(() => {
  const body = document.body;
  const menuToggle = document.querySelector('[data-menu-toggle]');
  const menu = document.querySelector('[data-menu]');
  const progressBar = document.querySelector('[data-scroll-progress]');
  const revealItems = document.querySelectorAll('[data-reveal]');
  const year = document.querySelector('[data-current-year]');
  const lightbox = document.querySelector('[data-lightbox]');
  const lightboxImage = lightbox?.querySelector('[data-lightbox-image]');
  const lightboxCaption = lightbox?.querySelector('[data-lightbox-caption]');
  const lightboxClose = lightbox?.querySelector('[data-lightbox-close]');
  const galleryButtons = document.querySelectorAll('[data-gallery-trigger]');

  if (year) {
    year.textContent = new Date().getFullYear();
  }

  if (menuToggle && menu) {
    menuToggle.addEventListener('click', () => {
      const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
      menuToggle.setAttribute('aria-expanded', String(!expanded));
      body.classList.toggle('menu-open', !expanded);
      menu.classList.toggle('is-open', !expanded);
    });

    menu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        menuToggle.setAttribute('aria-expanded', 'false');
        body.classList.remove('menu-open');
        menu.classList.remove('is-open');
      });
    });
  }

  const updateProgress = () => {
    if (!progressBar) return;

    const scrollTop = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const progress = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0;
    progressBar.style.transform = `scaleX(${Math.min(progress, 100) / 100})`;
  };

  updateProgress();
  window.addEventListener('scroll', updateProgress, { passive: true });

  if (revealItems.length) {
    // Порог 0 + небольшой отрицательный rootMargin: элемент проявляется,
    // как только хотя бы краешек попал в верхние 92% экрана. Это критично
    // для длинных статей в блоге: при threshold 0.15 у элементов высотой
    // больше ~6.7 экранов условие никогда не достигалось и текст оставался
    // невидимым.
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '0px 0px -8% 0px',
        threshold: 0,
      }
    );

    revealItems.forEach((item) => observer.observe(item));

    // Страховка: если по какой-то причине IntersectionObserver не успел
    // отметить блоки (например, нестабильные iOS-браузеры или мгновенный
    // переход по якорю в середину длинной статьи), через 1.2 секунды после
    // загрузки принудительно показываем всё, что ещё прозрачно.
    window.setTimeout(() => {
      revealItems.forEach((item) => item.classList.add('is-visible'));
    }, 1200);
  }

  if (lightbox && lightboxImage && lightboxCaption && lightboxClose) {
    const closeLightbox = () => {
      lightbox.hidden = true;
      body.classList.remove('lightbox-open');
      lightboxImage.src = '';
      lightboxImage.srcset = '';
      lightboxImage.alt = '';
      lightboxCaption.textContent = '';
    };

    galleryButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const src = button.dataset.gallerySrc || '';
        const srcset = button.dataset.gallerySrcset || '';
        const alt = button.dataset.galleryAlt || '';
        const caption = button.dataset.galleryCaption || alt;

        lightboxImage.src = src;
        lightboxImage.srcset = srcset;
        lightboxImage.alt = alt;
        lightboxCaption.textContent = caption;
        lightbox.hidden = false;
        body.classList.add('lightbox-open');
      });
    });

    lightbox.addEventListener('click', (event) => {
      if (event.target === lightbox || event.target === lightboxClose) {
        closeLightbox();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !lightbox.hidden) {
        closeLightbox();
      }
    });
  }

  // Promo popup — show once per session (localStorage)
  const promoPopup = document.getElementById('promoPopup');
  if (promoPopup) {
    const PROMO_KEY = 'palermo_promo_seen';
    const alreadySeen = localStorage.getItem(PROMO_KEY);

    if (!alreadySeen) {
      setTimeout(() => {
        promoPopup.hidden = false;
        body.classList.add('lightbox-open');
      }, 1500);
    }

    const closePromo = () => {
      promoPopup.hidden = true;
      body.classList.remove('lightbox-open');
      localStorage.setItem(PROMO_KEY, '1');
    };

    promoPopup.querySelectorAll('[data-promo-close]').forEach((el) => {
      el.addEventListener('click', closePromo);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !promoPopup.hidden) {
        closePromo();
      }
    });
  }

  // MaxiBooking iframe — auto-resize, force full width and observe injected iframes
  const mbWrappers = document.querySelectorAll('#mbh-form-wrapper, #mbh-results-wrapper');
  if (mbWrappers.length) {
    const tuneIframe = (iframe) => {
      if (!iframe || iframe.dataset.mbhTuned) return;
      iframe.dataset.mbhTuned = '1';
      iframe.setAttribute('width', '100%');
      iframe.style.width = '100%';
      iframe.style.maxWidth = '100%';
      iframe.style.border = '0';
      iframe.style.display = 'block';
    };

    mbWrappers.forEach((wrapper) => {
      wrapper.querySelectorAll('iframe').forEach(tuneIframe);
      const observer = new MutationObserver(() => {
        wrapper.querySelectorAll('iframe').forEach(tuneIframe);
      });
      observer.observe(wrapper, { childList: true, subtree: true });
    });

    window.addEventListener('message', (event) => {
      const data = event.data;
      if (!data || data.type !== 'mbh') return;
      const target = document.querySelector('#mbh-form-wrapper iframe, #mbh-results-wrapper iframe');
      if (!target) return;
      if (typeof data.height === 'number' && data.height > 0) {
        target.style.height = data.height + 'px';
      }
    });
  }
});
