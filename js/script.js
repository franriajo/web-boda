/* =========================================================
   DayNight — Boda María José & Francisco — interacciones
   ========================================================= */

/* ---------- 0. Login gate (solo en producción, no en localhost) ---------- */
(function () {
  const gate = document.getElementById('login-gate');
  if (!gate) return;
  const isLocal = ['localhost', '127.0.0.1', ''].includes(window.location.hostname);
  if (isLocal || localStorage.getItem('boda-auth') === 'ok') {
    gate.classList.add('is-hidden');
    return;
  }
  document.getElementById('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const user = document.getElementById('loginUser').value.trim().toLowerCase();
    const pass = document.getElementById('loginPass').value.trim();
    if (user === 'mj&fran' && pass === '28112026') {
      localStorage.setItem('boda-auth', 'ok');
      gate.classList.add('is-hidden');
    } else {
      document.getElementById('loginError').hidden = false;
    }
  });
})();

/* ---------- 1. Intro: clic -> reproduce el vídeo del sobre -> aparece la web ---------- */
const intro = document.getElementById('intro');
if (intro) {
  const vid = document.getElementById('introVideo');
  let opened = false;

  const reveal = () => {
    intro.classList.add('is-hidden');
    document.body.style.overflow = '';
    setTimeout(() => intro.remove(), 1100);
  };

  const open = () => {
    if (opened) return;
    opened = true;
    intro.classList.add('is-opening');           // oculta el "toca para abrir"
    if (vid && vid.canPlayType) {
      vid.play().catch(() => {});
      // cuando el vídeo termina (en negro), se funde a la web
      vid.addEventListener('ended', reveal, { once: true });
      // red de seguridad por si 'ended' no se dispara
      setTimeout(reveal, 4500);
    } else {
      setTimeout(reveal, 300);                   // fallback sin vídeo
    }
  };

  intro.addEventListener('click', open);
  // bloquea el scroll de la web mientras está la intro
  document.body.style.overflow = 'hidden';

  /* Coloca el lacre rojo en la PUNTA del sobre, teniendo en cuenta el recorte
     object-fit:cover del vídeo (así queda clavado en móvil y en escritorio). */
  const waxseal = intro.querySelector('.intro__waxseal');
  const positionWaxSeal = () => {
    if (!waxseal) return;
    const AX = 0.49, AY = 0.55, SEAL_W = 0.26;     // CENTRO del lacre justo en el PICO de la solapa -> lo cubre y se ve entero
    const videoW = 1080, videoH = 1920;
    const vw = window.innerWidth, vh = window.innerHeight;
    const scale = Math.max(vw / videoW, vh / videoH);   // object-fit: cover
    const dW = videoW * scale, dH = videoH * scale;
    const offX = (vw - dW) / 2, offY = (vh - dH) / 2;
    waxseal.style.left  = (offX + AX * dW) + 'px';
    waxseal.style.top   = (offY + AY * dH) + 'px';
    waxseal.style.width = (SEAL_W * dW) + 'px';
  };
  positionWaxSeal();
  requestAnimationFrame(positionWaxSeal);          // recalcula tras el layout
  window.addEventListener('resize', positionWaxSeal);
  window.addEventListener('load', positionWaxSeal);
  if (vid) vid.addEventListener('loadedmetadata', positionWaxSeal);
}

/* ---------- 2. Countdown to the wedding ---------- */
const WEDDING_DATE = new Date('2026-11-28T17:30:00+01:00'); // fecha y hora de la ceremonia

function updateCountdown() {
  const timer = document.getElementById('timer');
  if (!timer) return;

  const now = new Date();
  let diff = Math.max(0, WEDDING_DATE - now);

  const day = 1000 * 60 * 60 * 24;
  const hour = 1000 * 60 * 60;
  const minute = 1000 * 60;

  const days = Math.floor(diff / day);   diff -= days * day;
  const hours = Math.floor(diff / hour); diff -= hours * hour;
  const minutes = Math.floor(diff / minute);

  const pad = (n) => String(n).padStart(2, '0');
  timer.querySelector('[data-unit="days"]').textContent = pad(days);
  timer.querySelector('[data-unit="hours"]').textContent = pad(hours);
  timer.querySelector('[data-unit="minutes"]').textContent = pad(minutes);
}
updateCountdown();
setInterval(updateCountdown, 1000 * 30);

/* ---------- 3a. Topbar: aparece al salir de la portada ---------- */
const topbar = document.querySelector('.topbar');
const heroFinca = document.querySelector('.hero--finca');
if (topbar && heroFinca && 'IntersectionObserver' in window) {
  const topbarIO = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      topbar.classList.toggle('is-visible', !entry.isIntersecting);
    });
  }, { threshold: 0 });
  topbarIO.observe(heroFinca);
} else if (topbar) {
  topbar.classList.add('is-visible');
}

/* ---------- 3. Scroll reveal ---------- */
const revealEls = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealEls.forEach((el) => io.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add('is-visible'));
}

/* ---------- 4. RSVP form → Google Sheets ---------- */
function closeModal(modal) {
  modal.classList.remove('is-open');
  setTimeout(() => { modal.hidden = true; }, 400);
}

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxa6qEeKrRfVng2vmPjecpNjHdYn8zx-vsGOZ6cD5lR14NdQN8zR8_Iaddy8v23hwGx/exec';

const rsvpForm = document.getElementById('rsvpForm');
if (rsvpForm) {
  rsvpForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = rsvpForm.querySelector('.btn-submit');
    const status = document.getElementById('rsvpStatus');

    btn.disabled = true;
    btn.textContent = 'Enviando…';

    const fd = new FormData(rsvpForm);
    const checked = fd.getAll('alergia');
    const otrasAlergias = fd.get('alergias-otras') || '';
    const LABELS = {
      'sin-gluten':  'Sin gluten / Celíaco',
      'sin-lactosa': 'Sin lactosa',
      'vegetariano': 'Vegetariano',
      'frutos-secos':'Frutos secos',
      'mariscos':    'Mariscos',
    };
    const resumenParts = [
      ...checked.map(v => LABELS[v] || v),
      ...(otrasAlergias ? [otrasAlergias] : []),
    ];
    const data = {
      asistencia:           fd.get('asistencia') || '',
      nombre:               fd.get('nombre') || '',
      acompanantes:         fd.get('acompanantes') || '',
      'sin-gluten':         checked.includes('sin-gluten')   ? 'Sí' : 'No',
      'sin-lactosa':        checked.includes('sin-lactosa')  ? 'Sí' : 'No',
      'vegetariano':        checked.includes('vegetariano')  ? 'Sí' : 'No',
      'frutos-secos':       checked.includes('frutos-secos') ? 'Sí' : 'No',
      'mariscos':           checked.includes('mariscos')     ? 'Sí' : 'No',
      'alergias-otras':     otrasAlergias,
      'alergias-resumen':   resumenParts.length ? resumenParts.join(', ') : 'Ninguna',
      telefono:             fd.get('telefono') || '',
      transporte:           fd.get('transporte')        ? 'Sí' : 'No',
      'transporte-vuelta':  fd.get('transporte-vuelta') ? 'Sí' : 'No',
      mensaje:              fd.get('mensaje') || '',
    };

    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify(data),
      });
      btn.textContent = 'Enviado';
      const asistencia = data.asistencia;
      rsvpForm.reset();
      const modal = document.getElementById('rsvp-modal');
      if (modal) {
        const pitu = modal.querySelector('.rsvp-modal__pitu');
        const msg = modal.querySelector('.rsvp-modal__msg');
        if (asistencia === 'si') {
          pitu.style.display = '';
          msg.innerHTML = '¡Gracias por confirmar!<br>Nos vemos el 28 de noviembre. 💛';
        } else {
          pitu.style.display = 'none';
          msg.innerHTML = 'Nos encantaría que hubieras podido acompañarnos, pero lo celebraremos a nuestro regreso con un vino. 🍷';
        }
        modal.hidden = false;
        requestAnimationFrame(() => requestAnimationFrame(() => modal.classList.add('is-open')));
        modal.querySelector('.rsvp-modal__backdrop').addEventListener('click', () => closeModal(modal));
        modal.querySelector('.rsvp-modal__close').addEventListener('click', () => closeModal(modal));
      }
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'Enviar confirmación';
      alert('Ha habido un error. Por favor inténtalo de nuevo.');
    }
  });
}

/* ---------- 5. Añadir al calendario (descarga .ics) ---------- */
const CAL_EVENTS = {
  ceremonia: {
    title: 'Boda María José & Francisco — Ceremonia',
    start: '20261128T163000Z',
    end: '20261128T170000Z',
    location: 'Santa Bárbara'
  },
  coctel: {
    title: 'Boda María José & Francisco — Cóctel',
    start: '20261128T170000Z',
    end: '20261129T010000Z',
    location: 'El Pendolero'
  }
};

document.querySelectorAll('[data-cal]').forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const ev = CAL_EVENTS[link.dataset.cal];
    if (!ev) return;
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT',
      `SUMMARY:${ev.title}`,
      `DTSTART:${ev.start}`,
      `DTEND:${ev.end}`,
      `LOCATION:${ev.location}`,
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${link.dataset.cal}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  });
});
