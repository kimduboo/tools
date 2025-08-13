/**
 * 한영타 변환 시스템
 * 두벌식 기준 한글 ↔ 영타 변환 라이브러리
 */

// 자음 매핑
const L = { 
    r:'ㄱ', s:'ㄴ', e:'ㄷ', f:'ㄹ', a:'ㅁ', q:'ㅂ', t:'ㅅ', d:'ㅇ', 
    w:'ㅈ', c:'ㅊ', z:'ㅋ', x:'ㅌ', v:'ㅍ', g:'ㅎ' 
  };
  
  // 쌍자음 매핑
  const L_UP = { 
    Q:'ㅃ', W:'ㅉ', E:'ㄸ', R:'ㄲ', T:'ㅆ' 
  };
  
  // 쌍자음을 단자음으로 변환
  const DOUBLE_TO_PLAIN = { 
    'ㅃ':'ㅂ', 'ㅉ':'ㅈ', 'ㄸ':'ㄷ', 'ㄲ':'ㄱ', 'ㅆ':'ㅅ' 
  };
  
  // 모음 매핑
  const V = {
    k:'ㅏ', o:'ㅓ', i:'ㅗ', O:'ㅖ', j:'ㅓ', p:'ㅔ', u:'ㅕ', P:'ㅖ',
    h:'ㅗ', y:'ㅛ', n:'ㅜ', b:'ㅠ', m:'ㅡ', l:'ㅣ',
    hk:'ㅘ', ho:'ㅙ', hl:'ㅚ', nj:'ㅝ', np:'ㅞ', nl:'ㅟ', ml:'ㅢ'
  };
  
  // 종성 집합
  const T_ALL = new Set([
    '','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ',
    'ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'
  ]);
  
  // 복합 종성 분해
  const T_PAIR = { 
    'ㄳ':['ㄱ','ㅅ'], 'ㄵ':['ㄴ','ㅈ'], 'ㄶ':['ㄴ','ㅎ'], 'ㄺ':['ㄹ','ㄱ'], 
    'ㄻ':['ㄹ','ㅁ'], 'ㄼ':['ㄹ','ㅂ'], 'ㄽ':['ㄹ','ㅅ'], 'ㄾ':['ㄹ','ㅌ'], 
    'ㄿ':['ㄹ','ㅍ'], 'ㅀ':['ㄹ','ㅎ'], 'ㅄ':['ㅂ','ㅅ'] 
  };
  
  // 한글 자모 순서
  const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  const JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
  const JONG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  
  // 한글 유니코드 상수
  const SBASE = 0xAC00, VCOUNT = 21, TCOUNT = 28;
  
  /**
   * 자음, 모음, 종성을 조합하여 한글 문자 생성
   */
  const compose = (L1, V1, T1='') =>
    String.fromCharCode(SBASE + (CHO.indexOf(L1)*VCOUNT + JUNG.indexOf(V1))*TCOUNT + JONG.indexOf(T1));
  
  /**
   * 한글 문자인지 확인
   */
  const isHangul = ch => /[가-힣]/.test(ch);
  
  /**
   * 모음 찾기 (복합모음 우선 처리)
   */
  function peekVowel(keys, i) {
    const two = keys.slice(i, i+2).join('');
    if (V[two]) return [true, 2, V[two]];
    const one = keys[i];
    if (V[one]) return [true, 1, V[one]];
    const low = one?.toLowerCase?.();
    if (V[low]) return [true, 1, V[low]];
    return [false, 0, null];
  }
  
  /**
   * 문자가 변환 가능한 문자인지 확인
   */
  const isLetterLike = (ch) => !!(L[ch] || L_UP[ch] || L[ch?.toLowerCase?.()] || V[ch] || V[ch?.toLowerCase?.()]);
  
  /**
   * 영타 → 한글 변환
   */
  function en2ko(input) {
    const keys = [...input];
    let out = '';
    let Lc = null, Vc = null, Tc = '';
  
    for(let i = 0; i < keys.length; i++) {
      const k = keys[i];
  
      // 특수문자, 공백 처리
      if (!isLetterLike(k) || k === ' ' || k === '\n' || k === '\t') {
        if (Lc && Vc) out += compose(Lc, Vc, Tc);
        Lc = Vc = null; Tc = '';
        out += k;
        continue;
      }
  
      let asCon = L[k] || L_UP[k] || L[k?.toLowerCase?.()] || null;
      let [isV, step, vChar] = peekVowel(keys, i);
  
      // 초성 처리
      if (!Lc && asCon) {
        Lc = asCon;
        continue;
      }
  
      // 중성 처리
      if (Lc && !Vc && isV) {
        Vc = vChar; 
        i += step - 1;
        continue;
      }
  
      // 종성 처리
      if (Lc && Vc && asCon) {
        if (DOUBLE_TO_PLAIN[asCon]) asCon = DOUBLE_TO_PLAIN[asCon];
  
        const [nextIsV] = peekVowel(keys, i + 1);
        if (nextIsV) {
          out += compose(Lc, Vc, Tc);
          Lc = asCon; Vc = null; Tc = '';
          continue;
        }
  
        if (!Tc) { 
          Tc = asCon; 
          continue; 
        }
  
        const pair = Tc + asCon;
        if (T_ALL.has(pair)) { 
          Tc = pair; 
          continue; 
        }
  
        out += compose(Lc, Vc, Tc);
        Lc = asCon; Vc = null; Tc = '';
        continue;
      }
  
      // 모음으로 시작하는 경우
      if (!Lc && isV) {
        Lc = 'ㅇ'; Vc = vChar; 
        i += step - 1;
        continue;
      }
  
      // 연속 모음 처리
      if (Lc && Vc && isV) {
        out += compose(Lc, Vc, Tc);
        Lc = 'ㅇ'; Vc = vChar; Tc = ''; 
        i += step - 1;
        continue;
      }
  
      // 기타 문자 처리
      if (Lc && Vc) { 
        out += compose(Lc, Vc, Tc); 
        Lc = Vc = null; Tc = ''; 
      }
      out += k;
    }
  
    if (Lc && Vc) out += compose(Lc, Vc, Tc);
    return out;
  }
  
  /**
   * 한글 → 영타 변환
   */
  function ko2en(input) {
    // 역매핑 테이블 생성
    const revL = {};
    Object.entries(L).forEach(([key, jamo]) => {
      revL[jamo] = key;
    });
    
    const revDouble = { 'ㅃ':'Q','ㅉ':'W','ㄸ':'E','ㄲ':'R','ㅆ':'T' };
    
    const revV = {
      'ㅏ':'k', 'ㅓ':'o', 'ㅗ':'i', 'ㅖ':'O', 'ㅓ':'j', 'ㅔ':'p', 'ㅕ':'u', 'ㅖ':'P',
      'ㅗ':'h', 'ㅛ':'y', 'ㅜ':'n', 'ㅠ':'b', 'ㅡ':'m', 'ㅣ':'l',
      'ㅘ':'hk', 'ㅙ':'ho', 'ㅚ':'hl', 'ㅝ':'nj', 'ㅞ':'np', 'ㅟ':'nl', 'ㅢ':'ml'
    };
  
    /**
     * 한글 문자 분해
     */
    const decompose = (ch) => {
      const s = ch.charCodeAt(0) - SBASE;
      const li = Math.floor(s / (VCOUNT * TCOUNT));
      const vi = Math.floor((s % (VCOUNT * TCOUNT)) / TCOUNT);
      const ti = s % TCOUNT;
      return [CHO[li], JUNG[vi], JONG[ti]];
    };
  
    let out = '';
    for (const ch of input) {
      if (!isHangul(ch)) { 
        out += ch; 
        continue; 
      }
  
      const [L1, V1, T1] = decompose(ch);
  
      // 초성 변환
      const lkey = revDouble[L1] || revL[L1] || '';
      
      // 중성 변환
      const vkey = revV[V1] || '';
      
      // 종성 변환
      let tkey = '';
      if (T1 && T1 !== '') {
        if (T_PAIR[T1]) {
          const [first, second] = T_PAIR[T1];
          const firstKey = revL[DOUBLE_TO_PLAIN[first] || first] || '';
          const secondKey = revL[DOUBLE_TO_PLAIN[second] || second] || '';
          tkey = firstKey + secondKey;
        } else {
          const plainJong = DOUBLE_TO_PLAIN[T1] || T1;
          tkey = revL[plainJong] || '';
        }
      }
      
      out += lkey + vkey + tkey;
    }
    return out;
  }
  
  /**
   * 텍스트 언어 감지 (한글/영문 비율 기준)
   */
  function detectLanguage(text) {
    const hangulCount = (text.match(/[가-힣]/g) || []).length;
    const englishCount = (text.match(/[a-zA-Z]/g) || []).length;
    
    if (hangulCount > englishCount) return 'korean';
    if (englishCount > hangulCount) return 'english';
    return 'mixed';
  }
  
  /**
   * 자동 변환 (언어 감지 후 적절한 방향으로 변환)
   */
  function autoConvert(input) {
    if (!input.trim()) return { ko: '', en: '' };
    
    const lang = detectLanguage(input);
    
    if (lang === 'korean') {
      // 주로 한글이면 영타로 변환
      return { ko: '', en: ko2en(input) };
    } else {
      // 주로 영타이거나 섞여있으면 한글로 변환
      return { ko: en2ko(input), en: '' };
    }
  }
  
  // 모듈 내보내기 (브라우저와 Node.js 환경 모두 지원)
  if (typeof module !== 'undefined' && module.exports) {
    // Node.js 환경
    module.exports = { en2ko, ko2en, autoConvert, detectLanguage };
  } else {
    // 브라우저 환경
    window.HanengConverter = { en2ko, ko2en, autoConvert, detectLanguage };
  }