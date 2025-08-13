// haneng_converter.js (수정 버전)
// 입력 하나로 영→한(위), 한→영(아래) 동시 갱신. 옵션 없음.
// 수정 사항:
// 1) 한→영 역변환 매핑 완전히 재구성
// 2) 복합모음 양방향 변환 정상화
// 3) 대문자 모음 역변환 추가
// 4) 종성 복합자음 분해 로직 개선

//////////////////// 2-벌식 매핑 ////////////////////
const L = { r:'ㄱ', s:'ㄴ', e:'ㄷ', f:'ㄹ', a:'ㅁ', q:'ㅂ', t:'ㅅ', d:'ㅇ', w:'ㅈ', c:'ㅊ', z:'ㅋ', x:'ㅌ', v:'ㅍ', g:'ㅎ' };
const L_UP = { Q:'ㅃ', W:'ㅉ', E:'ㄸ', R:'ㄲ', T:'ㅆ' }; // 초성에서만 쌍자음으로 사용
const DOUBLE_TO_PLAIN = { 'ㅃ':'ㅂ', 'ㅉ':'ㅈ', 'ㄸ':'ㄷ', 'ㄲ':'ㄱ', 'ㅆ':'ㅅ' };

const V = {
  // 단모음 (대문자 O/P는 Shift: ㅒ, ㅖ)
  k:'ㅏ', o:'ㅐ', i:'ㅑ', O:'ㅒ', j:'ㅓ', p:'ㅔ', u:'ㅕ', P:'ㅖ',
  h:'ㅗ', y:'ㅛ', n:'ㅜ', b:'ㅠ', m:'ㅡ', l:'ㅣ',
  // 복합모음 (항상 2타로만 인식)
  hk:'ㅘ', ho:'ㅙ', hl:'ㅚ', nj:'ㅝ', np:'ㅞ', nl:'ㅟ', ml:'ㅢ'
};

// 종성 가능 집합 및 분해표
const T_ALL = new Set(['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']);
const T_PAIR = { 'ㄳ':['ㄱ','ㅅ'], 'ㄵ':['ㄴ','ㅈ'], 'ㄶ':['ㄴ','ㅎ'], 'ㄺ':['ㄹ','ㄱ'], 'ㄻ':['ㄹ','ㅁ'], 'ㄼ':['ㄹ','ㅂ'],
                 'ㄽ':['ㄹ','ㅅ'], 'ㄾ':['ㄹ','ㅌ'], 'ㄿ':['ㄹ','ㅍ'], 'ㅀ':['ㄹ','ㅎ'], 'ㅄ':['ㅂ','ㅅ'] };

//////////////////// 조합/분해용 자모 순서 ////////////////////
// 초성(19)
const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
// ★중성(21) — 유니코드 표준 순서★
const JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
// 종성(28)
const JONG = ['', 'ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

const SBASE = 0xAC00, VCOUNT = 21, TCOUNT = 28;

const compose = (L1,V1,T1='') =>
  String.fromCharCode(SBASE + (CHO.indexOf(L1)*VCOUNT + JUNG.indexOf(V1))*TCOUNT + JONG.indexOf(T1));
const isHangul = ch => /[가-힣]/.test(ch);

//////////////////// 모음 look-ahead ////////////////////
function peekVowel(keys, i) {
  // 2글자 복합 먼저
  const two = keys.slice(i, i+2).join('');
  if (V[two]) return [true, 2, V[two]];
  // 1글자 (대소문자 허용)
  const one = keys[i];
  if (V[one]) return [true, 1, V[one]];
  const low = one?.toLowerCase?.();
  if (V[low]) return [true, 1, V[low]];
  return [false, 0, null];
}
const isLetterLike = (ch)=> !!(L[ch] || L_UP[ch] || L[ch?.toLowerCase?.()] || V[ch] || V[ch?.toLowerCase?.()]);

//////////////////// 영타 → 한글 ////////////////////
function en2ko(input){
  const keys = [...input];
  let out = '';
  let Lc=null, Vc=null, Tc='';

  for(let i=0;i<keys.length;i++){
    const k = keys[i];

    // 공백/개행/기호: 현재 음절 플러시 후 통과
    if (!isLetterLike(k) || k===' ' || k==='\n' || k==='\t'){
      if (Lc && Vc) out += compose(Lc, Vc, Tc);
      Lc=Vc=null; Tc='';
      out += k;
      continue;
    }

    // 자음 후보 (대문자 된소리 포함. 단, 종성에 들어갈 땐 평음으로 강등)
    let asCon = L[k] || L_UP[k] || L[k?.toLowerCase?.()] || null;

    // 모음 후보
    let [isV, step, vChar] = peekVowel(keys, i);

    // 1) 초성 비었고 자음 → 초성
    if (!Lc && asCon){
      Lc = asCon;
      continue;
    }

    // 2) 초성 있고 중성 비었고 모음 → 중성
    if (Lc && !Vc && isV){
      Vc = vChar; i += step-1;
      continue;
    }

    // 3) 초성+중성 이후 자음 → 종성 후보 (look-ahead: 다음이 모음이면 다음 초성)
    if (Lc && Vc && asCon){
      // 종성에는 쌍자음 금지 → 평음으로 전환
      if (DOUBLE_TO_PLAIN[asCon]) asCon = DOUBLE_TO_PLAIN[asCon];

      const [nextIsV] = peekVowel(keys, i+1);
      if (nextIsV){
        // 지금 자음은 다음 음절 초성
        out += compose(Lc, Vc, Tc);
        Lc = asCon; Vc=null; Tc='';
        continue;
      }

      if (!Tc){ Tc = asCon; continue; }
      const pair = Tc + asCon;
      if (T_ALL.has(pair)){ Tc = pair; continue; }

      // 복합종성 불가 → 현재 음절 확정, 새 초성 시작
      out += compose(Lc, Vc, Tc);
      Lc = asCon; Vc=null; Tc='';
      continue;
    }

    // 4) 초성이 아직 없고 모음이 먼저 → ㅇ 자동 초성
    if (!Lc && isV){
      Lc='ㅇ'; Vc=vChar; i += step-1;
      continue;
    }

    // 5) (드물게) 음절 완료 상태에서 모음 → 새 음절 시작
    if (Lc && Vc && isV){
      out += compose(Lc, Vc, Tc);
      Lc='ㅇ'; Vc=vChar; Tc=''; i += step-1;
      continue;
    }

    // 그 외 보호
    if (Lc && Vc){ out += compose(Lc, Vc, Tc); Lc=Vc=null; Tc=''; }
    out += k;
  }

  if (Lc && Vc) out += compose(Lc, Vc, Tc);
  return out;
}

//////////////////// 한글 → 영타 (완전히 재구성) ////////////////////
function ko2en(input){
  // 역변환 테이블 구성
  const revL = {};
  Object.entries(L).forEach(([key, jamo]) => {
    revL[jamo] = key;
  });
  
  // 쌍자음 역변환 (대문자)
  const revDouble = { 'ㅃ':'Q','ㅉ':'W','ㄸ':'E','ㄲ':'R','ㅆ':'T' };
  
  // 모음 역변환 테이블 (완전히 재구성)
  const revV = {
    // 단모음
    'ㅏ':'k', 'ㅐ':'o', 'ㅑ':'i', 'ㅒ':'O', 'ㅓ':'j', 'ㅔ':'p', 'ㅕ':'u', 'ㅖ':'P',
    'ㅗ':'h', 'ㅛ':'y', 'ㅜ':'n', 'ㅠ':'b', 'ㅡ':'m', 'ㅣ':'l',
    // 복합모음 (키 시퀀스로 정확히 매핑)
    'ㅘ':'hk', 'ㅙ':'ho', 'ㅚ':'hl', 'ㅝ':'nj', 'ㅞ':'np', 'ㅟ':'nl', 'ㅢ':'ml'
  };

  const decompose = (ch)=>{
    const s = ch.charCodeAt(0) - SBASE;
    const li = Math.floor(s/(VCOUNT*TCOUNT));
    const vi = Math.floor((s%(VCOUNT*TCOUNT))/TCOUNT);
    const ti = s%TCOUNT;
    return [CHO[li], JUNG[vi], JONG[ti]];
  };

  let out = '';
  for (const ch of input){
    if (!isHangul(ch)) { out += ch; continue; }
    const [L1,V1,T1] = decompose(ch);

    // 초성: 쌍자음은 대문자, 평음은 소문자
    const lkey = revDouble[L1] || revL[L1] || '';
    
    // 중성: 복합모음 포함 정확히 매핑
    const vkey = revV[V1] || '';
    
    // 종성: 복합자음 분해 또는 단일자음
    let tkey = '';
    if (T1 && T1 !== '') {
      if (T_PAIR[T1]) {
        // 복합자음 분해
        const [first, second] = T_PAIR[T1];
        const firstKey = revL[DOUBLE_TO_PLAIN[first] || first] || '';
        const secondKey = revL[DOUBLE_TO_PLAIN[second] || second] || '';
        tkey = firstKey + secondKey;
      } else {
        // 단일자음 (쌍자음은 평음으로 변환)
        const plainJong = DOUBLE_TO_PLAIN[T1] || T1;
        tkey = revL[plainJong] || '';
      }
    }
    
    out += lkey + vkey + tkey;
  }
  return out;
}

//////////////////// UI 바인딩 (동시 표시) ////////////////////
const $ = (s)=>document.querySelector(s);
const src   = $('#src');     // 입력 textarea
const koOut = $('#koOut');   // 영→한
const enOut = $('#enOut');   // 한→영
const echo  = $('#echo');    // 원문 에코

function render(){
  const txt = src?.value ?? '';
  echo.textContent  = txt || '-';
  koOut.textContent = txt ? en2ko(txt) : '-';
  enOut.textContent = txt ? ko2en(txt) : '-';
}
render();

src?.addEventListener('input', render);
$('#clearBtn')?.addEventListener('click', ()=>{ if(src){ src.value=''; render(); } });

// 복사 버튼
function copy(elId){
  const s = document.getElementById(elId)?.textContent?.trim() ?? '';
  if (!s) return;
  navigator.clipboard.writeText(s).then(()=>{
    const btn = elId==='koOut' ? $('#copyKo') : elId==='enOut' ? $('#copyEn') : $('#copyEcho');
    if (btn){ const o=btn.textContent; btn.textContent='✅'; setTimeout(()=>btn.textContent=o,900); }
  });
}
$('#copyKo')?.addEventListener('click', ()=>copy('koOut'));
$('#copyEn')?.addEventListener('click', ()=>copy('enOut'));
$('#copyEcho')?.addEventListener('click', ()=>copy('echo'));