// 현재 연도 표시
document.addEventListener('DOMContentLoaded', () => {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
});

// 한영 변환 매핑 테이블 (표준 두벌식)
const keyMap = {
  // 소문자
  'q':'ㅂ','w':'ㅈ','e':'ㄷ','r':'ㄱ','t':'ㅅ','y':'ㅛ','u':'ㅕ','i':'ㅑ','o':'ㅐ','p':'ㅔ',
  'a':'ㅁ','s':'ㄴ','d':'ㅇ','f':'ㄹ','g':'ㅎ','h':'ㅗ','j':'ㅓ','k':'ㅏ','l':'ㅣ',
  'z':'ㅋ','x':'ㅌ','c':'ㅊ','v':'ㅍ','b':'ㅠ','n':'ㅜ','m':'ㅡ',
  // 대문자 (쌍자음/복합모음)
  'Q':'ㅃ','W':'ㅉ','E':'ㄸ','R':'ㄲ','T':'ㅆ','O':'ㅒ','P':'ㅖ'
};

// 역방향 매핑 (한글 → 영어)
const reverseKeyMap = {}; Object.entries(keyMap).forEach(([en, ko]) => { reverseKeyMap[ko] = en; });

// 문자 판별
const isHangul = ch => /[가-힣]/.test(ch);
const isHangulJamo = ch => /[ㄱ-ㅎㅏ-ㅣ]/.test(ch);
const isEnglish = ch => /[a-zA-Z]/.test(ch);

// 한글 조합 상수
const CHOSUNG = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const JUNGSUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
const JONGSUNG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const HANGUL_BASE = 0xAC00;

// 복합모음/겹받침 규칙
const VOWEL_COMBINATIONS = {
  'ㅗㅏ':'ㅘ','ㅗㅐ':'ㅙ','ㅗㅣ':'ㅚ', 'ㅜㅓ':'ㅝ','ㅜㅔ':'ㅞ','ㅜㅣ':'ㅟ', 'ㅡㅣ':'ㅢ'
};
const CONSONANT_COMBINATIONS = {
  'ㄱㅅ':'ㄳ','ㄴㅈ':'ㄵ','ㄴㅎ':'ㄶ','ㄹㄱ':'ㄺ','ㄹㅁ':'ㄻ','ㄹㅂ':'ㄼ','ㄹㅅ':'ㄽ','ㄹㅌ':'ㄾ','ㄹㅍ':'ㄿ','ㄹㅎ':'ㅀ','ㅂㅅ':'ㅄ'
};

// 한글 분해
function decomposeHangul(ch){
  if(!isHangul(ch)) return null;
  const code = ch.charCodeAt(0) - HANGUL_BASE;
  const jong = code % 28;
  const jung = (code - jong) / 28 % 21;
  const cho  = ((code - jong) / 28 - jung) / 21;
  return { cho: CHOSUNG[cho], jung: JUNGSUNG[jung], jong: jong===0 ? '' : JONGSUNG[jong] };
}

// 한글 조합
function composeHangul(cho, jung, jong=''){
  const ci = CHOSUNG.indexOf(cho), ji = JUNGSUNG.indexOf(jung), ki = JONGSUNG.indexOf(jong);
  if(ci<0 || ji<0 || ki<0) return null;
  return String.fromCharCode(HANGUL_BASE + (ci*21 + ji)*28 + ki);
}

// 영타 → 한글
function engToKor(text){
  let out = '', i = 0;
  while(i < text.length){
    const ch = text[i];
    if(!isEnglish(ch)) { out += ch; i++; continue; }
    const s = assembleSyllable(text, i);
    if(s.success){ out += s.char; i += s.consumed; }
    else { out += (keyMap[ch] || ch); i++; }
  }
  return out;
}

function assembleSyllable(text, start){
  let pos = start, cho='', jung='', jong='';
  // 초성
  if(pos < text.length){ const j = keyMap[text[pos]]; if(j && CHOSUNG.includes(j)){ cho=j; pos++; } else { return {success:false}; } }
  // 중성
  if(pos < text.length){ const f = findJungsung(text, pos); if(f.found){ jung=f.jamo; pos += f.consumed; } else { return {success:false}; } }
  // 종성
  if(pos < text.length){ const r = findJongsung(text, pos); if(r.found){ jong=r.jamo; pos += r.consumed; } }
  const c = composeHangul(cho, jung, jong); if(c) return { success:true, char:c, consumed: pos-start };
  return { success:false };
}

function findJungsung(text, start){
  let pos=start, v=[];
  while(pos<text.length){ const jm = keyMap[text[pos]]; if(jm && /[ㅏ-ㅣ]/.test(jm)){ v.push(jm); pos++; if(v.length===2){ const comb = VOWEL_COMBINATIONS[v.join('')]; return comb ? {found:true,jamo:comb,consumed:2} : {found:true,jamo:v[0],consumed:1}; } } else break; }
  return v.length===1 ? {found:true,jamo:v[0],consumed:1} : {found:false};
}

function findJongsung(text, start){
  let pos=start, c=[];
  while(pos<text.length && c.length<2){ const jm = keyMap[text[pos]]; if(jm && /[ㄱ-ㅎ]/.test(jm)){ c.push(jm); pos++; } else break; }
  if(c.length===2){
    const comb = CONSONANT_COMBINATIONS[c.join('')];
    if(comb && JONGSUNG.includes(comb)){
      const nextJ = (pos<text.length) ? keyMap[text[pos]] : null;
      const nextNext = (pos+1<text.length) ? keyMap[text[pos+1]] : null;
      if(nextJ && /[ㅏ-ㅣ]/.test(nextJ)) { return JONGSUNG.includes(c[0]) ? {found:true,jamo:c[0],consumed:1} : {found:false}; }
      if(nextJ==='ㅇ' && nextNext && /[ㅏ-ㅣ]/.test(nextNext)) return {found:true,jamo:comb,consumed:2};
      return {found:true,jamo:comb,consumed:2};
    } else {
      return JONGSUNG.includes(c[0]) ? {found:true,jamo:c[0],consumed:1} : {found:false};
    }
  } else if(c.length===1){
    const nextJ = keyMap[text[pos]]; if(nextJ && /[ㅏ-ㅣ]/.test(nextJ)) return {found:false};
    return JONGSUNG.includes(c[0]) ? {found:true,jamo:c[0],consumed:1} : {found:false};
  }
  return {found:false};
}

// 한글 → 영타
function korToEng(text){
  let out='';
  for(const ch of text){
    if(isHangul(ch)){
      const d = decomposeHangul(ch); if(d){
        out += (reverseKeyMap[d.cho]||'');
        const jungKey = reverseKeyMap[d.jung];
        out += jungKey ? jungKey : decomposeComplexVowel(d.jung);
        if(d.jong) out += decomposeComplexConsonant(d.jong);
      }
    } else if(isHangulJamo(ch)) { out += (reverseKeyMap[ch]||ch); }
    else { out += ch; }
  }
  return out;
}

function decomposeComplexVowel(v){
  const map = { 'ㅘ':'hk','ㅙ':'ho','ㅚ':'hl','ㅝ':'nj','ㅞ':'np','ㅟ':'nl','ㅢ':'ml' }; return map[v] || (reverseKeyMap[v]||'');
}
function decomposeComplexConsonant(c){
  const map = { 'ㄳ':'rt','ㄵ':'sw','ㄶ':'sg','ㄺ':'fr','ㄻ':'fa','ㄼ':'fq','ㄽ':'ft','ㄾ':'fx','ㄿ':'fv','ㅀ':'fg','ㅄ':'qt' }; return map[c] || (reverseKeyMap[c]||'');
}

// 언어 감지 및 자동 변환
function detectLanguage(text){
  const h = (text.match(/[가-힣ㄱ-ㅎㅏ-ㅣ]/g)||[]).length;
  const e = (text.match(/[a-zA-Z]/g)||[]).length;
  if(h>e) return 'korean'; if(e>h) return 'english'; return 'mixed';
}
function autoConvert(input){ if(!input.trim()) return ''; return (detectLanguage(input)==='korean') ? korToEng(input) : engToKor(input); }

// UI 업데이트
function updateResults(){
  const input = document.getElementById('mainInput').value;
  const mode = document.querySelector('input[name="mode"]:checked').value;
  const out = document.getElementById('resultOutput');
  const cnt = document.getElementById('resultCharCount');
  const btn = document.getElementById('copyResult');

  if(!input.trim()){ out.value=''; out.placeholder='변환 결과가 여기에 표시됩니다'; out.classList.add('empty'); cnt.textContent='0자'; btn.disabled=true; return; }

  let result='';
  if(mode==='auto') result = autoConvert(input);
  else if(mode==='en2ko') result = engToKor(input);
  else if(mode==='ko2en') result = korToEng(input);

  out.value = result; out.classList.toggle('empty', !result); cnt.textContent = result.length + '자'; btn.disabled = !result;
}

function copyToClipboard(text, button){
  if(!text) return;
  navigator.clipboard.writeText(text).then(()=>{
    const t = button.textContent; button.textContent='✅'; button.classList.add('success'); setTimeout(()=>{button.textContent=t; button.classList.remove('success');},1500);
  }).catch(()=>{
    const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    const t = button.textContent; button.textContent='✅'; button.classList.add('success'); setTimeout(()=>{button.textContent=t; button.classList.remove('success');},1500);
  });
}

// 이벤트 연결
const mainInput = document.getElementById('mainInput');
if(mainInput) mainInput.addEventListener('input', updateResults);

document.querySelectorAll('input[name="mode"]').forEach(r => {
  r.addEventListener('change', (ev) => {
    const autoInfo = document.getElementById('autoInfo');
    if(autoInfo) autoInfo.style.display = (ev.target.value === 'auto') ? 'block' : 'none';
    updateResults();
  });
});

const clearBtn = document.getElementById('clearBtn');
if(clearBtn) clearBtn.addEventListener('click', () => { const el = document.getElementById('mainInput'); el.value=''; el.focus(); updateResults(); });

const copyBtn = document.getElementById('copyResult');
if(copyBtn) copyBtn.addEventListener('click', () => { copyToClipboard(document.getElementById('resultOutput').value, copyBtn); });

// 더블클릭 복사
const resultArea = document.getElementById('resultOutput');
if(resultArea) resultArea.addEventListener('dblclick', () => { const t = resultArea.value; if(t){ resultArea.select(); copyToClipboard(t, document.getElementById('copyResult')); } });
