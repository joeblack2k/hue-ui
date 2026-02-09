/**
 * News room widget (Room screen)
 *
 * Room screen owns the fetching + Gemini generation. This file provides markup + CSS.
 */

import { escapeHtml } from '../ui/helpers2.js?v=3.1.80';

export const NEWS_ROOM_CSS = `
  .newsr-widget {
    border-radius: 18px;
    overflow: hidden;
    box-shadow: var(--hue-shadow-card);
    border: 1px solid rgba(255,255,255,0.10);
    background:
      radial-gradient(ellipse at top, rgba(255,255,255,0.10), rgba(0,0,0,0.22)),
      rgba(0,0,0,0.12);
  }

  .newsr-widget.has-new {
    animation: newsrPulseBlue 3.2s ease-in-out 0s 2;
  }

  @keyframes newsrPulseBlue {
    0%, 100% { box-shadow: var(--hue-shadow-card); }
    45% { box-shadow: 0 0 0 1px rgba(118,185,255,0.20), 0 0 22px rgba(118,185,255,0.22), var(--hue-shadow-card); }
  }

  .newsr-paper {
    position: relative;
    padding: 14px;
    border-radius: 18px;
    background:
      radial-gradient(ellipse at top, rgba(255,255,255,0.10), rgba(0,0,0,0.35)),
      linear-gradient(135deg, rgba(90,74,58,0.55) 0%, rgba(42,30,20,0.45) 40%, rgba(0,0,0,0.12) 100%);
  }

  .newsr-paper::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0.26;
    background:
      repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.03) 1px, transparent 3px, transparent 6px),
      repeating-linear-gradient(90deg, rgba(0,0,0,0.06) 0px, rgba(0,0,0,0.03) 1px, transparent 3px, transparent 7px);
    mix-blend-mode: overlay;
  }

  .newsr-masthead {
    position: relative;
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }

  .newsr-title {
    font-family: Georgia, 'Times New Roman', Times, serif;
    font-weight: 900;
    font-size: 22px;
    letter-spacing: 0.2px;
    color: rgba(255,255,255,0.96);
    text-shadow: 0 2px 10px rgba(0,0,0,0.55);
  }

  .newsr-subtitle {
    margin-top: 2px;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    color: rgba(240, 199, 94, 0.95);
  }

  .newsr-datestamp {
    font-size: 11px;
    color: rgba(255,255,255,0.70);
    font-variant-numeric: tabular-nums;
    text-align: right;
  }

  .newsr-loading {
    position: relative;
    display: none;
    align-items: center;
    gap: 8px;
    margin: 10px 0 12px 0;
    color: rgba(255,255,255,0.75);
    font-size: 12px;
    font-weight: 800;
  }

  .newsr-loading.is-visible {
    display: flex;
  }

  .newsr-dot {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: rgba(240, 199, 94, 0.9);
    box-shadow: 0 0 10px rgba(240, 199, 94, 0.35);
    opacity: 0.45;
    transform: translateY(0);
    animation: newsrDotBounce 0.9s ease-in-out infinite;
  }
  .newsr-dot:nth-child(2) { animation-delay: 0.12s; }
  .newsr-dot:nth-child(3) { animation-delay: 0.24s; }
  @keyframes newsrDotBounce {
    0%, 80%, 100% { transform: translateY(0); opacity: 0.35; }
    40% { transform: translateY(-4px); opacity: 1; }
  }

  .newsr-columns {
    position: relative;
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
  }

  @media (min-width: 680px) {
    .newsr-columns {
      grid-template-columns: 1fr 1fr;
    }
  }

  .newsr-column {
    position: relative;
    border-radius: 16px;
    padding: 12px;
    background: rgba(0,0,0,0.16);
    border: 1px solid rgba(255,255,255,0.08);
  }

  .newsr-colhead {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 10px;
  }

  .newsr-coltitle {
    font-size: 12px;
    font-weight: 950;
    letter-spacing: 0.9px;
    text-transform: uppercase;
    color: rgba(245, 230, 211, 0.95);
  }

  .newsr-colnote {
    font-size: 11px;
    color: rgba(255,255,255,0.60);
    font-variant-numeric: tabular-nums;
    text-align: right;
  }

	  .newsr-item {
	    border-top: 1px solid rgba(255,255,255,0.10);
	    padding-top: 10px;
	    margin-top: 10px;
	  }

  .newsr-item:first-of-type {
    border-top: 0;
    padding-top: 0;
    margin-top: 0;
  }

	  .newsr-strap {
	    display: flex;
	    align-items: center;
	    justify-content: space-between;
	    gap: 10px;
	    padding: 7px 10px;
	    border-radius: 12px;
	    border: 1px solid rgba(255,255,255,0.10);
	    background: rgba(0,0,0,0.16);
	    margin-bottom: 8px;
	  }

	  .newsr-strap-left,
	  .newsr-strap-right {
	    display: inline-flex;
	    align-items: center;
	    gap: 8px;
	    min-width: 0;
	  }

	  .newsr-strap-kicker {
	    font-size: 10px;
	    font-weight: 950;
	    letter-spacing: 0.9px;
	    text-transform: uppercase;
	    color: rgba(240, 199, 94, 0.92);
	    white-space: nowrap;
	  }

	  .newsr-strap-value {
	    font-size: 11px;
	    font-weight: 900;
	    color: rgba(255,255,255,0.85);
	    white-space: nowrap;
	    overflow: hidden;
	    text-overflow: ellipsis;
	    max-width: 180px;
	  }

	  .newsr-strap-date {
	    font-variant-numeric: tabular-nums;
	  }

	  .newsr-headline {
	    font-family: Georgia, 'Times New Roman', Times, serif;
	    font-size: 16px;
	    font-weight: 900;
    line-height: 1.2;
    color: rgba(255,255,255,0.96);
    margin-bottom: 6px;
    word-break: break-word;
  }

	  .newsr-summary {
	    font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
	    font-size: 13px;
	    line-height: 1.55;
	    color: rgba(255,255,255,0.86);
	    white-space: pre-wrap;
	    word-break: break-word;
	    min-height: 42px;
	  }

	  .newsr-meta {
	    margin-top: 8px;
	    display: flex;
	    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
  }

	  .newsr-link {
	    display: inline-flex;
	    align-items: center;
	    justify-content: center;
    gap: 6px;
    padding: 6px 10px;
    border-radius: 999px;
    border: 1px solid rgba(240, 199, 94, 0.35);
    background: rgba(240, 199, 94, 0.12);
    color: rgba(255,255,255,0.92);
    font-size: 11px;
    font-weight: 950;
    text-decoration: none;
    cursor: pointer;
    user-select: none;
  }

  .newsr-link:active { transform: scale(0.98); }

  .newsr-copy {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 6px 10px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.14);
    background: rgba(0,0,0,0.22);
    color: rgba(255,255,255,0.88);
    font-size: 11px;
    font-weight: 950;
    cursor: pointer;
    user-select: none;
  }

  .newsr-copy:active { transform: scale(0.98); }

  .newsr-cal {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 6px 10px;
    border-radius: 999px;
    border: 1px solid rgba(118,185,255,0.35);
    background: rgba(118,185,255,0.12);
    color: rgba(255,255,255,0.92);
    font-size: 11px;
    font-weight: 950;
    cursor: pointer;
    user-select: none;
  }

  .newsr-cal[aria-disabled="true"] {
    opacity: 0.45;
    pointer-events: none;
  }

  .newsr-cal:active { transform: scale(0.98); }

	  .newsr-bottom {
	    position: relative;
	    margin-top: 12px;
	    padding-top: 12px;
	    border-top: 1px solid rgba(255,255,255,0.10);
	  }

	  .newsr-bottom-head {
	    display: flex;
	    align-items: baseline;
	    justify-content: space-between;
	    gap: 10px;
	    margin-bottom: 8px;
	  }

	  .newsr-bottom-title {
	    font-size: 12px;
	    font-weight: 950;
	    letter-spacing: 0.8px;
	    text-transform: uppercase;
	    color: rgba(245, 230, 211, 0.95);
	  }

	  .newsr-bottom-text {
	    font-size: 13px;
	    line-height: 1.55;
	    color: rgba(255,255,255,0.82);
	    white-space: pre-wrap;
	  }

    .newsr-agenda-list {
      display: block;
      border-radius: 16px;
      padding: 12px;
      background: rgba(0,0,0,0.16);
      border: 1px solid rgba(255,255,255,0.08);
    }

  .newsr-status {
    position: relative;
    margin-top: 10px;
    font-size: 11px;
    color: rgba(255,255,255,0.60);
    font-variant-numeric: tabular-nums;
  }
`;

function renderSlot(i, kind) {
  return `
    <div class="newsr-item" data-kind="${escapeHtml(kind)}" data-index="${i}">
      <div class="newsr-strap" role="group" aria-label="Bron en datum">
        <div class="newsr-strap-left">
          <span class="newsr-strap-kicker">Bron</span>
          <span class="newsr-strap-value" data-role="newsr-source">—</span>
        </div>
        <div class="newsr-strap-right">
          <span class="newsr-strap-kicker">Datum</span>
          <span class="newsr-strap-value newsr-strap-date" data-role="newsr-when">—</span>
        </div>
      </div>
      <div class="newsr-headline" data-role="newsr-headline">Kop</div>
      <div class="newsr-summary" data-role="newsr-summary"></div>
      <div class="newsr-meta">
        <a class="newsr-link" data-role="newsr-link" href="#" target="_blank" rel="noopener noreferrer">Lees artikel</a>
        <button class="newsr-copy" type="button" data-news-action="copy">Kopieer</button>
      </div>
    </div>
  `;
}

function renderAgendaSlot(i) {
  return `
    <div class="newsr-item" data-kind="agenda" data-index="${i}">
      <div class="newsr-strap" role="group" aria-label="Bron en datum">
        <div class="newsr-strap-left">
          <span class="newsr-strap-kicker">Bron</span>
          <span class="newsr-strap-value" data-role="newsr-source">—</span>
        </div>
        <div class="newsr-strap-right">
          <span class="newsr-strap-kicker">Datum</span>
          <span class="newsr-strap-value newsr-strap-date" data-role="newsr-when">—</span>
        </div>
      </div>
      <div class="newsr-headline" data-role="newsr-headline">Evenement</div>
      <div class="newsr-summary" data-role="newsr-summary"></div>
      <div class="newsr-meta">
        <a class="newsr-link" data-role="newsr-link" href="#" target="_blank" rel="noopener noreferrer">Lees artikel</a>
        <button class="newsr-cal" type="button" data-news-action="add_calendar" aria-disabled="true">Voeg toe aan kalender</button>
        <button class="newsr-copy" type="button" data-news-action="copy">Kopieer</button>
      </div>
    </div>
  `;
}

export function renderNewsRoomSection(section) {
  const title = String(section?.title || 'Nieuws');
  const locals = new Array(5).fill(0).map((_, i) => renderSlot(i, 'local')).join('');
  const nationals = new Array(5).fill(0).map((_, i) => renderSlot(i + 5, 'national')).join('');
  const agendaSlots = new Array(10).fill(0).map((_, i) => renderAgendaSlot(i)).join('');
  return `
    <div class="newsr-widget" data-title="${escapeHtml(title)}">
      <div class="newsr-paper">
        <div class="newsr-masthead">
          <div>
            <div class="newsr-title" data-role="newsr-title">Weekkrantje</div>
            <div class="newsr-subtitle" data-role="newsr-subtitle">Dit is het nieuws van deze week</div>
          </div>
          <div class="newsr-datestamp" data-role="newsr-datestamp">—</div>
        </div>
        <div class="newsr-loading is-visible" data-role="newsr-loading" aria-hidden="true">
          <span class="newsr-dot"></span><span class="newsr-dot"></span><span class="newsr-dot"></span>
          <span>Nieuws laden…</span>
        </div>
        <div class="newsr-columns">
          <div class="newsr-column" data-role="newsr-local">
            <div class="newsr-colhead">
	              <div class="newsr-coltitle">Lokaal</div>
              <div class="newsr-colnote" data-role="newsr-local-note">5 berichten</div>
            </div>
            ${locals}
          </div>
          <div class="newsr-column" data-role="newsr-national">
            <div class="newsr-colhead">
	              <div class="newsr-coltitle">Nederland</div>
              <div class="newsr-colnote" data-role="newsr-national-note">5 berichten</div>
            </div>
            ${nationals}
          </div>
        </div>
	        <div class="newsr-bottom">
	          <div class="newsr-bottom-head">
	            <div class="newsr-bottom-title">Agenda & open dagen</div>
              <div class="newsr-colnote" data-role="newsr-agenda-note">10 items</div>
            </div>
	          <div class="newsr-agenda-list" data-role="newsr-agenda-list">
              ${agendaSlots}
            </div>
	          <div class="newsr-bottom-text" data-role="newsr-agenda-fallback" style="display:none;">—</div>
	        </div>
	        <div class="newsr-bottom">
	          <div class="newsr-bottom-head">
              <div class="newsr-bottom-title">Bouwen & vergunningen</div>
            </div>
	          <div class="newsr-bottom-text" data-role="newsr-permits">—</div>
	        </div>
	        <div class="newsr-status" data-role="newsr-status">Laden…</div>
	      </div>
	    </div>
	  `;
	}
