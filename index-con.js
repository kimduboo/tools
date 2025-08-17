// index-con.js
(() => {
  'use strict';

  // ===== 데이터 =====
  const tools = [
    {
      id: 'age-now',
      name: '만나이 계산기',
      emoji: '🎂',
      desc: '세/개월/4;1',
      href: '/age.html',
      keywords: [
        '나이','개월수','연령','생활','만나이','age','연나이','만 나이',
        '나이 계산','birthday','만나이계산기','aksskdl','todghkf','dusfud','skdl'
      ],
    },
    {
      id: 'dday',
      name: 'D-Day 계산기',
      emoji: '📅',
      desc: '남은 날(절대값)/주,개월,평일(근사치)',
      href: '/dday.html',
      keywords: [
        '날짜','카운트다운','디데이','디데이','dday','카운트다운',
        'countdown','남은날','dday calc','d-day','elepdl'
      ],
    },
    {
      id: 'han-eng-converter',
      name: '한영타 변환기',
      emoji: '🔤',
      desc: '잘못 입력된 영문/한글을 자동 변환',
      href: '/haneng.html',
      keywords: [
        '한글','영어','변환','입력기','한영변환','영한변환',
        '키보드','오타','자판','han/eng','gksrmf','gksdud','rkskek','tmvpffld','스펠링'
      ],
    },
  ];

  // ===== 유틸 =====
  const $ = (sel) => document.querySelector(sel);
  const grid  = $('#grid');
  const empty = $('#empty');
  const searchInput = $('#q');
  const shareBtn = $('#share');
  const yearEl  = $('#year');

  // ===== 카드 템플릿 (중첩 a 방지: 내부는 span으로) =====
  function card(t) {
    const link = document.createElement('a');
    link.href = t.href;
    link.style.textDecoration = 'none';
    link.setAttribute('aria-label', t.name);

    link.innerHTML = `
      <article class="card">
        <div class="head" style="display:flex;align-items:center;">
          <div class="emoji" aria-hidden="true">${t.emoji}</div>
          <h3 style="margin:0 8px 0 6px;flex:1;">${t.name}</h3>
          <span class="circle-btn" aria-hidden="true">▶</span>
        </div>
        <p>${t.desc}</p>
      </article>
    `;
    return link;
  }

  // ===== 렌더/필터 =====
  function render(list) {
    if (!grid) return;
    grid.innerHTML = '';
    list.forEach(t => grid.appendChild(card(t)));
    if (empty) empty.style.display = list.length ? 'none' : 'flex';
  }

  function filter(q) {
    q = (q || '').trim().toLowerCase();
    if (!q) return tools;
    return tools.filter(t =>
      (t.name + ' ' + t.desc + ' ' + (t.keywords || []).join(' '))
        .toLowerCase()
        .includes(q)
    );
  }

  // ===== 이벤트 =====
  if (searchInput && grid) {
    searchInput.addEventListener('input', e => render(filter(e.target.value)));
  }

  if (shareBtn) {
    shareBtn.addEventListener('click', (e) => {
      e.preventDefault();
      navigator.clipboard.writeText(location.href).then(() => {
        const old = shareBtn.textContent;
        shareBtn.textContent = '✅';
        setTimeout(() => (shareBtn.textContent = old), 900);
      });
    });
  }

  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // ===== 초기 렌더 =====
  if (grid) render(tools);
})();
