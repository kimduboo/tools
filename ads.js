// ads.js — AdSense 안전 로더 & 단일 초기화
(() => {
  const CLIENT = 'ca-pub-6022794906780783';
  const SRC = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`;

  // 1) 라이브러리 1회 로드 보장
  if (!document.querySelector(`script[src^="${SRC}"]`)) {
    const s = document.createElement('script');
    s.src = SRC;
    s.async = true;
    s.crossOrigin = 'anonymous';
    document.head.appendChild(s);
  }

  // 2) 아직 초기화되지 않은 슬롯만 초기화
  function initPendingSlots(root = document) {
    const slots = root.querySelectorAll('ins.adsbygoogle:not([data-adsbygoogle-status])');
    if (!slots.length) return;
    window.adsbygoogle = window.adsbygoogle || [];
    for (let i = 0; i < slots.length; i++) {
      window.adsbygoogle.push({});
    }
  }

  // DOM 준비되면 1차 초기화
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initPendingSlots(), { once: true });
  } else {
    initPendingSlots();
  }

  // 3) 동적 추가 대응 (SPA/탭 변경 등)
  const mo = new MutationObserver((muts) => {
    for (const m of muts) {
      m.addedNodes && m.addedNodes.forEach((n) => {
        if (n.nodeType !== 1) return;
        if (n.matches?.('ins.adsbygoogle')) {
          initPendingSlots(n.parentNode || n);
        } else if (n.querySelectorAll) {
          const has = n.querySelector('ins.adsbygoogle:not([data-adsbygoogle-status])');
          if (has) initPendingSlots(n);
        }
      });
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
})();
