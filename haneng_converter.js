// haneng_converter.js
// - styles.css의 공통 UI를 그대로 사용
// - 종성-초성 끌어오기 방지: look-ahead 규칙 적용
// - 자동 인식/수동 모드, 대문자=된소리 ON/OFF 지원

// ===== 옵션 상태 (UI에서 바뀜) =====
const state = {
  upperDoubles: true, // 대문자(Q/W/E/R/T) → ㅃ/ㅉ/ㄸ/ㄲ/ㅆ
};

// ===== 2-벌식 자판 매핑 =====
const L = { r:'ㄱ', s:'ㄴ', e:'ㄷ', f:'ㄹ', a:'ㅁ', q:'ㅂ', t:'ㅅ', d:'ㅇ', w:'ㅈ', c:'ㅊ', z:'ㅋ', x:'ㅌ', v:'ㅍ', g:'ㅎ' };
const L_UP = { Q:'ㅃ', W:'ㅉ', E:'ㄸ', R:'ㄲ', T:'ㅆ' }; // 옵션 적용 시 사용

const V = {
  k:'ㅏ', o:'ㅐ', i:'ㅑ', j:'ㅓ', p:'ㅔ', u:'ㅕ', h:'ㅗ', y:'ㅛ', n:'ㅜ', b:'ㅠ', m:'ㅡ', l:'ㅣ',
  hk:'ㅘ', ho:'ㅙ', hl:'ㅚ', nj:'ㅝ', np:'ㅞ', nl:'ㅟ', ml:'ㅢ'
};

const T_ALL = new Set(['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']);
const T_PAIR = { 'ㄳ':['ㄱ','ㅅ'], 'ㄵ':['ㄴ','ㅈ'], 'ㄶ':['ㄴ','ㅎ'], 'ㄺ':['ㄹ','ㄱ'], 'ㄻ':['ㄹ','ㅁ'], 'ㄼ':['ㄹ','ㅂ'],
                 'ㄽ':['ㄹ','ㅅ'], 'ㄾ':['ㄹ','ㅌ'], 'ㄿ':['ㄹ','ㅍ'], 'ㅀ':['ㄹ','ㅎ'], 'ㅄ':['ㅂ','ㅅ'] };

const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const JUNG = ['ㅏ','ㅐ','ㅑ','ㅓ','ㅔ','ㅕ','ㅗ','ㅛ','ㅜ','ㅠ','ㅡ','ㅣ','ㅘ','ㅙ','ㅚ','ㅝ','ㅞ','ㅟ','ㅢ'];
const JONG = ['', 'ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const SBASE = 0xAC00, VCOUNT = 21, TCOUNT = 28;

const compose = (L1,V1,T1='') =>
  String.fromCharCode(SBASE + (CHO.indexOf(L1)*VCOUNT + JUNG.indexOf(V1))*TCOUNT + JONG.indexOf(T1));
const isHangul = ch => /[가-힣]/.test(ch);

// 모음 look-ahead (복합모음 우선)
function peekVowel(arr, i){
  const two = arr.slice(i, i+2).join('');
  if (V[two]) return [true, 2, V[two]];
  const one = arr[i];
  if (V[one]) return [true, 1, V[one]];
  return [false, 0, null];
}

// ===== 영 → 한 (핵심: look-ahead로 종성 오배치 방지) =====
export function en2ko(input){
  const keys = [...input];
  let out = '';
  let lc=null, vc=null, tc='';

  for(let i=0;i<keys.length;i++){
    const k = keys[i];

    // 공백/개행
    if (k===' '||k==='\n'||k==='\t'){
      if (lc&&vc) out += compose(lc,vc,tc);
      lc=vc=null; tc='';
      out += k; continue;
    }

    const up = state.upperDoubles && L_UP[k] ? L_UP[k] : null;
    const asCon = up || L[k];
    const [isV, step, vChar] = peekVowel(keys, i);

    // 초성 비었고 자음
    if (!lc && asCon){ lc = asCon; continue; }

    // 초성 있고 중성 비었고 모음
    if (lc && !vc && isV){ vc = vChar; i += step-1; continue; }

    // 초성+중성 후 자음 → 종성 후보 (여기서 look-ahead)
    if (lc && vc && asCon){
      const [nextIsV] = peekVowel(keys, i+1);
      if (nextIsV){ // 다음이 모음이면 현재 자음은 "다음 초성"
        out += compose(lc, vc, tc);
        lc = asCon; vc=null; tc='';
        continue;
      }
      if (!tc){ tc = asCon; continue; }
      const pair = tc + asCon;
      if (T_ALL.has(pair)){ tc = pair; continue; }

      // 복합 불가 → 음절 확정 후 새 초성
      out += compose(lc, vc, tc);
      lc = asCon; vc=null; tc='';
      continue;
    }

    // 초성 없이 모음 → ㅇ 자동 초성
    if (!lc && isV){ lc='ㅇ'; vc=vChar; i+=step-1; continue; }

    // 음절 완료 뒤 모음 → 새 음절 시작
    if (lc && vc && isV){
      out += compose(lc, vc, tc);
      lc='ㅇ'; vc=vChar; tc=''; i+=step-1; continue;
    }

    // 그 외(기호 등)
    if (lc&&vc){ out += compose(lc,vc,tc); lc=vc=null; tc=''; }
    out += k;
  }

  if (lc&&vc) out += compose(lc,vc,tc);
  return out;
}

// ===== 한 → 영 (자모 분해 후 역매핑) =====
export function ko2en(input){
  const revL = Object.fromEntries(Object.entries(L).map(([k,v])=>[v,k]));
  const revUp = Object.fromEntries(Object.entries(L_UP).map(([k,v])=>[v,k.toLowerCase()]));
  const revV = Object.fromEntries(Object.entries(V).map(([k,v])=>[v,k]));

  const decompose = (ch)=>{
    const s = ch.charCodeAt(0)-SBASE;
    const li = Math.floor(s/(VCOUNT*TCOUNT));
    const vi = Math.floor((s%(VCOUNT*TCOUNT))/TCOUNT);
    const ti = s%TCOUNT;
    return [CHO[li], JUNG[vi], JONG[ti]];
  };

  let out = '';
  for(const ch of input){
    if(!isHangul(ch)){ out += ch; continue; }
    const [L1,V1,T1] = decompose(ch);
    const l = revL[L1] || revUp[L1] || '';
    const v = revV[V1] || '';
    let t = '';
    if (T1){
      if (T_PAIR[T1]){ // 복합종성은 두 자음으로
        const [a,b] = T_PAIR[T1];
        t = (Object.entries(revL).find(([,k])=>k===a)?.[0] || Object.entries(revUp).find(([,k])=>k===a)?.[0] || '')
          + (Object.entries(revL).find(([,k])=>k===b)?.[0] || Object.entries(revUp).find(([,k])=>k===b)?.[0] || '');
      }else{
        t = (Object.entries(revL).find(([,k])=>k===T1)?.[0] || Object.entries(revUp).find(([,k])=>k===T1)?.[0] || '');
      }
    }
    out += l + v + t;
  }
  return out;
}

// ===== 모드 감지 =====
function detectMode(text){
  const ko = (text.match(/[가-힣]/g)||[]).length;
  const en = (text.match(/[A-Za-z]/g)||[]).length;
  // 영문이 더 많으면 영→한, 아니면 한→영
  return (en >= ko) ? 'en2ko' : 'ko2en';
}

// ===== UI 바인딩 =====
const $ = s => document.querySelector(s);
const src = $('#src');
const modeSel = $('#mode');
const upperSel = $('#upperDoubles');

const outMain = $('#result');
const echoIn = $('#echoIn');
const echoOut = $('#echoOut');
const modeEcho = $('#modeEcho');

function run(){
  const text = src.value || '';
  state.upperDoubles = (upperSel.value === 'on');

  // 모드 결정
  let mode = modeSel.value;
  if (mode === 'auto') mode = detectMode(text);

  // 변환
  const converted = (mode === 'en2ko') ? en2ko(text) : ko2en(text);

  // 렌더
  outMain.textContent = converted || '-';
  echoIn.textContent = text || '-';
  echoOut.textContent = converted || '-';
  modeEcho.textContent = (modeSel.value === 'auto')
    ? `자동 (${mode === 'en2ko' ? '영→한' : '한→영'})`
    : (mode === 'en2ko' ? '영→한' : '한→영');
}
run();

// 이벤트
$('#convertBtn').addEventListener('click', run);
$('#resetBtn').addEventListener('click', ()=>{ src.value=''; run(); });
src.addEventListener('input', run);
modeSel.addEventListener('change', run);
upperSel.addEventListener('change', run);

// 복사
function copyById(id){
  const txt = document.getElementById(id).textContent.trim();
  navigator.clipboard.writeText(txt).then(()=>{
    const btn = id==='result' ? document.getElementById('copyMain') : document.querySelector(`[data-copy="${id}"]`);
    if(btn){ const o=btn.textContent; btn.textContent='✅'; setTimeout(()=>btn.textContent=o,900); }
  });
}
document.getElementById('copyMain').addEventListener('click',()=>copyById('result'));
document.querySelectorAll('[data-copy]').forEach(b=>b.addEventListener('click',()=>copyById(b.dataset.copy)));