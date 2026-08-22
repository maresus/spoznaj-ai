(function () {
  'use strict';
  if (window._saiW) return;
  window._saiW = true;

  /* ── find script tag ── */
  var me = (function () {
    var ss = document.getElementsByTagName('script');
    for (var i = ss.length - 1; i >= 0; i--)
      if (ss[i].src && ss[i].src.indexOf('widget.js') > -1) return ss[i];
    return null;
  }());

  /* ── config from data attributes ── */
  var BASE   = me ? me.src.replace(/\/widget\.js[^]*$/, '') : '';
  var COLOR  = (me && me.getAttribute('data-color'))     || '#0B3149';
  var ACCENT = (me && me.getAttribute('data-accent'))    || '#A6CE39';
  var GRAW   = (me && me.getAttribute('data-greetings')) || 'Pozdravljeni 👋|Sem pomočnik SpoznajAI.|Kako vam lahko pomagam?';
  var GS     = GRAW.split('|').map(function (s) { return s.trim(); }).filter(Boolean);
  GS.push('Feel free to write in any language | Schreiben Sie in jeder Sprache!');
  var EURL   = (me && me.getAttribute('data-url'))       || (BASE + '/embed');
  var NAME   = (me && me.getAttribute('data-name'))      || 'Pomočnik SpoznajAI';
  var BKEY   = 'sai_w_b';

  var isOpen = false;
  var bdis   = sessionStorage.getItem(BKEY) === '1';

  /* ── inject CSS ── */
  var S = document.createElement('style');
  S.textContent =
    /* launch button */
    '#sai-w-btn{position:fixed;bottom:22px;right:22px;width:58px;height:58px;' +
    'border-radius:50%;background:' + COLOR + ';border:3px solid ' + ACCENT + ';' +
    'cursor:pointer;display:flex;align-items:center;justify-content:center;' +
    'box-shadow:0 4px 20px rgba(0,0,0,.28);z-index:2147483640;' +
    'transition:transform .2s,box-shadow .2s;padding:0;}' +
    '#sai-w-btn:hover{transform:scale(1.07);box-shadow:0 6px 28px rgba(0,0,0,.36);}' +
    '#sai-w-btn svg{display:block;pointer-events:none;}' +

    /* bubbles */
    '#sai-w-bub{position:fixed;bottom:90px;right:22px;display:flex;' +
    'flex-direction:column;align-items:flex-end;gap:8px;z-index:2147483639;}' +
    '.sai-w-b{background:#fff;color:#1a2330;' +
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;' +
    'font-size:13px;line-height:1.45;padding:10px 14px;' +
    'border-radius:14px 14px 4px 14px;' +
    'box-shadow:0 4px 16px rgba(0,0,0,.15);max-width:220px;cursor:pointer;' +
    'opacity:0;transform:translateY(8px);transition:opacity .3s,transform .3s;' +
    'border:1px solid rgba(0,0,0,.06);}' +
    '.sai-w-b.on{opacity:1;transform:translateY(0);}' +
    '#sai-w-bx{background:none;border:none;color:#888;cursor:pointer;' +
    'font-size:15px;padding:2px 6px;align-self:flex-end;line-height:1;' +
    'font-family:-apple-system,sans-serif;}' +
    '#sai-w-bx:hover{color:#444;}' +

    /* window */
    '#sai-w-win{position:fixed;bottom:90px;right:22px;width:380px;height:560px;' +
    'border-radius:16px;overflow:hidden;' +
    'box-shadow:0 20px 60px rgba(0,0,0,.35);z-index:2147483641;' +
    'display:none;flex-direction:column;border:1px solid rgba(0,0,0,.08);}' +
    '#sai-w-win.on{display:flex;}' +
    '#sai-w-wh{background:' + COLOR + ';color:#fff;display:flex;align-items:center;' +
    'padding:10px 14px;gap:8px;flex-shrink:0;}' +
    '#sai-w-wd{width:8px;height:8px;background:' + ACCENT + ';border-radius:50%;}' +
    '#sai-w-wn{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;' +
    'font-size:13px;font-weight:600;flex:1;}' +
    '#sai-w-wx{background:rgba(255,255,255,.15);border:none;color:#fff;' +
    'width:26px;height:26px;border-radius:50%;cursor:pointer;font-size:15px;' +
    'display:flex;align-items:center;justify-content:center;line-height:1;}' +
    '#sai-w-wx:hover{background:rgba(255,255,255,.28);}' +
    '#sai-w-if{flex:1;border:none;width:100%;height:100%;}' +

    /* mobile */
    '@media(max-width:480px){' +
    '#sai-w-win{bottom:0;right:0;width:100%;height:75vh;' +
    'border-radius:16px 16px 0 0;border-bottom:none;}' +
    '#sai-w-bub{right:16px;bottom:86px;}' +
    '#sai-w-btn{bottom:16px;right:16px;}}';

  document.head.appendChild(S);

  /* ── icons ── */
  var IC = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  var IX = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

  /* ── launch button ── */
  var btn = document.createElement('button');
  btn.id = 'sai-w-btn';
  btn.title = 'Pogovorite se z nami';
  btn.setAttribute('aria-label', 'Odpri klepet');
  btn.innerHTML = IC;
  document.body.appendChild(btn);

  /* ── greeting bubbles ── */
  var bub = document.createElement('div');
  bub.id = 'sai-w-bub';
  if (bdis) bub.style.display = 'none';

  var bx = document.createElement('button');
  bx.id = 'sai-w-bx';
  bx.textContent = '✕';
  bx.title = 'Zapri';
  bub.appendChild(bx);

  var bels = GS.map(function (txt) {
    var b = document.createElement('div');
    b.className = 'sai-w-b';
    b.textContent = txt;
    bub.appendChild(b);
    return b;
  });
  document.body.appendChild(bub);

  /* ── chat window ── */
  var win = document.createElement('div');
  win.id = 'sai-w-win';
  win.innerHTML =
    '<div id="sai-w-wh">' +
    '<div id="sai-w-wd"></div>' +
    '<div id="sai-w-wn">' + NAME + '</div>' +
    '<button id="sai-w-wx" title="Zapri">&#x2715;</button>' +
    '</div>';
  var ifrm = document.createElement('iframe');
  ifrm.id = 'sai-w-if';
  ifrm.allow = 'clipboard-write';
  win.appendChild(ifrm);
  document.body.appendChild(win);

  /* ── open / close ── */
  function openWin() {
    if (!ifrm.getAttribute('src')) ifrm.setAttribute('src', EURL);
    isOpen = true;
    win.classList.add('on');
    bub.style.display = 'none';
    btn.innerHTML = IX;
    btn.setAttribute('aria-label', 'Zapri klepet');
  }
  function closeWin() {
    isOpen = false;
    win.classList.remove('on');
    if (!bdis) bub.style.display = '';
    btn.innerHTML = IC;
    btn.setAttribute('aria-label', 'Odpri klepet');
  }
  function dismissBubbles() {
    bdis = true;
    sessionStorage.setItem(BKEY, '1');
    bub.style.display = 'none';
  }

  /* ── events ── */
  btn.addEventListener('click', function () { if (isOpen) closeWin(); else openWin(); });
  document.getElementById('sai-w-wx').addEventListener('click', closeWin);
  bx.addEventListener('click', function (e) { e.stopPropagation(); dismissBubbles(); });
  bels.forEach(function (b) {
    b.addEventListener('click', function () { dismissBubbles(); openWin(); });
  });

  /* ── animate bubbles with delay ── */
  if (!bdis) {
    var delays = [900, 1500, 2100];
    bels.forEach(function (b, i) {
      setTimeout(function () {
        if (!bdis) b.classList.add('on');
      }, delays[i] !== undefined ? delays[i] : (i * 600 + 900));
    });
  }

}());
