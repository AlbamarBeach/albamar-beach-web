/*
 * Sincronización de disponibilidad vía iCalendar.
 *
 * Cómo activarlo:
 * 1. Airbnb: panel de anfitrión > Calendario > Disponibilidad > Sincronizar calendarios > "Exportar calendario" (copia esa URL .ics)
 * 2. Booking.com: extranet > Tarifas y disponibilidad > Sincronización de calendarios > "Exportar calendario"
 * 3. Pega cada URL en el array ICAL_FEEDS de abajo.
 *
 * Importante (CORS): los navegadores no dejan leer un .ics de otro dominio
 * directamente por seguridad. Para que la sincronización automática funcione
 * en producción hace falta un pequeño intermediario que descargue el .ics
 * por ti, por ejemplo:
 *   - Una función serverless (Vercel/Netlify Functions, Cloudflare Workers)
 *     que haga fetch() al .ics y lo devuelva.
 *   - Un servicio ya hecho para esto (p. ej. un proxy CORS de confianza).
 * Mientras tanto, este archivo intenta usar un proxy público como último
 * recurso y, si falla, cae automáticamente en MANUAL_BLOCKED_RANGES para que
 * el calendario nunca se quede sin datos.
 */

const ICAL_FEEDS = [
  // { name: 'Airbnb', url: 'https://www.airbnb.com/calendar/ical/XXXXXXX.ics?s=XXXXXXXXXXXXXXXX' },
  // { name: 'Booking.com', url: 'https://admin.booking.com/hotel/hoteladmin/ical.html?t=XXXXXXXXXXXXXXXX' },
  // { name: 'Reservas directas', url: '' },
];

// Proxy CORS temporal de solo lectura, para desarrollo/pruebas.
// Sustitúyelo por tu propio backend antes de depender de esto en producción.
const CORS_PROXY = 'https://corsproxy.io/?url=';

// Fechas bloqueadas manualmente (formato 'YYYY-MM-DD', inicio inclusive / fin exclusivo, como en iCal).
// Útil mientras no haya feeds de Airbnb/Booking conectados, o para bloquear fechas a mano.
const MANUAL_BLOCKED_RANGES = [
  { start: '2026-07-29', end: '2026-08-08' }, // ocupado: hoy - 7 de agosto
  { start: '2026-08-16', end: '2026-08-30' }, // ocupado: 16 - 29 de agosto (30 libre)
];

function parseICalDate(value) {
  const digits = value.replace(/[^0-9]/g, '').slice(0, 8);
  const year = digits.slice(0, 4), month = digits.slice(4, 6), day = digits.slice(6, 8);
  return `${year}-${month}-${day}`;
}

function parseICalEvents(icsText) {
  const ranges = [];
  const events = icsText.split('BEGIN:VEVENT').slice(1);
  events.forEach(block => {
    const startMatch = block.match(/DTSTART[^:]*:(\d{8})/);
    const endMatch = block.match(/DTEND[^:]*:(\d{8})/);
    if (startMatch && endMatch) {
      ranges.push({ start: parseICalDate(startMatch[1]), end: parseICalDate(endMatch[1]) });
    }
  });
  return ranges;
}

function expandRangeToDates(range) {
  const dates = [];
  let current = new Date(range.start + 'T00:00:00');
  const end = new Date(range.end + 'T00:00:00');
  while (current < end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

async function fetchFeedRanges(feed) {
  try {
    const res = await fetch(CORS_PROXY + encodeURIComponent(feed.url));
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    return parseICalEvents(text);
  } catch (err) {
    console.warn(`No se pudo sincronizar el calendario de ${feed.name}:`, err.message);
    return null;
  }
}

async function getBlockedDates() {
  const blocked = new Set();
  MANUAL_BLOCKED_RANGES.forEach(range => expandRangeToDates(range).forEach(d => blocked.add(d)));

  let anyFeedFailed = false;
  const activeFeeds = ICAL_FEEDS.filter(f => f.url);

  await Promise.all(activeFeeds.map(async feed => {
    const ranges = await fetchFeedRanges(feed);
    if (ranges === null) {
      anyFeedFailed = true;
      return;
    }
    ranges.forEach(range => expandRangeToDates(range).forEach(d => blocked.add(d)));
  }));

  return {
    blocked,
    feedsConfigured: activeFeeds.length,
    feedsFailed: anyFeedFailed,
  };
}

window.AlbamarICalSync = { getBlockedDates };
