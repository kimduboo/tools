// haneng_converter.js
// 옵션 없음: 입력 변화 → 두 가지 결과(영→한, 한→영) 동시 갱신

/* === 두벌식 매핑 === */
const L = { r:'ㄱ', s:'ㄴ', e:'ㄷ', f:'ㄹ', a:'ㅁ', q:'ㅂ', t:'ㅅ', d:'ㅇ', w:'ㅈ', c:'ㅊ', z:'ㅋ', x:'ㅌ', v:'ㅍ', g:'ㅎ' };
const L_UP = { Q:'ㅃ', W:'ㅉ', E:'ㄸ', R:'ㄲ', T:'ㅆ' }; // 영타→한글 시 사용(된소리)
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

/* === 모음 look-ahead (복합 우선) === */
function peekVowel(arr, i){
  const two = arr.slice(i, i+2).join('');
  if (V[two]) return [true, 2, V[two]];
  const one = arr[i];
  if (V[one]) return [true, 1, V[one]];
  return [false, 0, null];
}

/* === 영타 → 한글 ===
   - 대문자 Q/W/E/R/T는 된소리(ㅃ/ㅉ/ㄸ/ㄲ/ㅆ)
   - 종성 끌어오기 방지: 다음 키가 모음이면 현재 자음은 다음 초성
*/
function en2ko(input){
  const raw = [...input];
  let out = '';
  let lc=null, vc=null, tc='';

  for(let i=0;i<raw.length;i++){
    let key = raw[i];

    // 공백/개행/기호 → 플러시 후 그대로 출력
    if (key===' '||key==='\n'||key==='\t'||(!L[key]&&!L_UP[key]&&!V[key]&&!V[key.toLowerCase()])){
      if (lc&&vc) out += compose(lc,vc,tc);
      lc=vc=null; tc='';
      out += key;
      continue;
    }

    // 자음(대문자 된소리 포함)
    const asCon = L[key] || L_UP[key] || L[key.toLowerCase()] || null;

    // 모음 판정 (복합 우선)
    let [isV, step, vChar] = peekVowel(raw, i);
    if (!isV && V[key.toLowerCase()]){ // 대문자 모음은 소문자로 허용
      isV = true; step = 1; vChar = V[key.toLowerCase()];
    }

    // 1) 초성 비었고 자음
    if (!lc && asCon){ lc = asCon; continue; }

    // 2) 초성 있고 중성 비었고 모음
    if (lc && !vc && isV){ vc = vChar; i += step-1; continue; }

    // 3) 초성+중성 이후 자음 → 종성 후보 (look-ahead)
    if (lc && vc && asCon){
      const [nextIsV] = peekVowel(raw, i+1);
      if (nextIsV){ // 다음이 모음이면 현재 자음은 다음 초성
        out += compose(lc, vc, tc);
        lc = asCon; vc=null; tc='';
        continue;
      }
      if (!tc){ tc = asCon; continue; }
      const pair = tc + asCon;
      if (T_ALL.has(pair)){ tc = pair; continue; }

      // 복합 불가 → 현재 음절 확정 후 새 초성
      out += compose(lc, vc, tc);
      lc = asCon; vc=null; tc='';
      continue;
    }

    // 4) 초성 없이 모음 → ㅇ 자동 초성
    if (!lc && isV){ lc='ㅇ'; vc=vChar; i+=step-1; continue; }

    // 5) 음절 완료 뒤 모음 → 새 음절 시작
    if (lc && vc && isV){
      out += compose(lc, vc, tc);
      lc='ㅇ'; vc=vChar; tc=''; i+=step-1; continue;
    }
  }

  if (lc&&vc) out += compose(lc,vc,tc);
  return out;
}

/* === 한글 → 영타 ===
   - 단자음은 소문자(qwerty)
   - 된소리는 대문자(Q/W/E/R/T)
   - 복합종성은 두 자음으로 분해(ㄳ→rt 등)
*/
function ko2en(input){
  const revL = Object.fromEntries(Object.entries(L).map(([k,v])=>[v,k]));
  const revDouble = { 'ㅃ':'Q','ㅉ':'W','ㄸ':'E','ㄲ':'R','ㅆ':'T' };
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

    // 초성
    const lkey = revL[L1] || revDouble[L1] || '';
    // 중성
    const vkey = revV[V1] || '';
    // 종성
    let tkey = '';
    if (T1){
      if (T_PAIR[T1]){
        const [a,b] = T_PAIR[T1];
        const aKey = revL[a] || revDouble[a] || '';
        const bKey = revL[b] || revDouble[b] || '';
        tkey = aKey + bKey;
      }else{
        tkey = revL[T1] || revDouble[T1] || '';
      }
    }
    out += lkey + vkey + tkey;
  }
  return out;
}

/* === UI === */
const $ = s => document.querySelector(s);
const src = $('#src');
const koOut = $('#koOut');
const enOut = $('#enOut');
const echo = $('#echo');

function render(){
  const txt = src.value || '';
  echo.textContent = txt || '-';
  koOut.textContent = txt ? en2ko(txt) : '-';
  enOut.textContent = txt ? ko2en(txt) : '-';
}
render();

src.addEventListener('input', render);
$('#clearBtn').addEventListener('click', ()=>{ src.value=''; render(); });

// 복사
function copy(elId){
  const s = document.getElementById(elId).textContent.trim();
  navigator.clipboard.writeText(s).then(()=>{
    const btn = elId==='koOut'?$('#copyKo'):elId==='enOut'?$('#copyEn'):$('#copyEcho');
    if(btn){ const o=btn.textContent; btn.textContent='✅'; setTimeout(()=>btn.textContent=o,900); }
  });
}
$('#copyKo').addEventListener('click', ()=>copy('koOut'));
$('#copyEn').addEventListener('click', ()=>copy('enOut'));
$('#copyEcho').addEventListener('click', ()=>copy('echo'));