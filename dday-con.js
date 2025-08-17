const KST='Asia/Seoul';
const fmtNow=new Intl.DateTimeFormat('ko-KR',{timeZone:KST,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
const fmtYMD=new Intl.DateTimeFormat('en-CA',{timeZone:KST,year:'numeric',month:'2-digit',day:'2-digit'});
function zonedYMD(d){ const [y,m,dd]=fmtYMD.format(new Date(d)).split('-').map(Number); return {y, m, d: dd}; }

// 누락된 fmtSigned 함수 추가
function fmtSigned(num) {
  const rounded = Math.round(num * 10) / 10;
  return rounded;
}

const dateInput=document.getElementById('date');
function formatYMD(v){ v=(v||'').replace(/\D/g,'').slice(0,8); if(v.length>4)v=v.slice(0,4)+'-'+v.slice(4); if(v.length>7)v=v.slice(0,7)+'-'+v.slice(7,9); return v; }
dateInput.addEventListener('input',(e)=>{ e.target.value=formatYMD(e.target.value); syncCalendarFromInput(); });
dateInput.addEventListener('blur',(e)=>{ e.target.value=formatYMD(e.target.value); });

// ===== 달력 위젯 =====
const picker=document.getElementById('picker');
function getInputYMDOrToday(){ 
  const v=dateInput.value; 
  if(/^\d{4}-\d{2}-\d{2}$/.test(v)){
    const [y,m,d]=v.split('-').map(Number); 
    return {y,m,d};
  } 
  return zonedYMD(new Date()); 
}

function openPicker(){
  const {y,m} = getInputYMDOrToday(); 
  buildCalendar(y, m-1);
  const box = document.querySelector('.datebox'); 
  const rect = box.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom; 
  const spaceAbove = rect.top;
  picker.classList.toggle('above', spaceBelow < 320 && spaceAbove > spaceBelow);
  picker.style.display = 'block';
}

function closePicker(){ picker.style.display = 'none'; }

function syncCalendarFromInput(){ 
  if(picker.style.display === 'block'){ 
    const {y,m} = getInputYMDOrToday(); 
    buildCalendar(y, m-1); 
  } 
}

function buildCalendar(y, m0){
  picker.innerHTML='';
  const header=document.createElement('div'); header.className='cal-header';

  const yearSelect=document.createElement('select');
  for(let yy=y-50; yy<=y+50; yy++){
    const o=document.createElement('option');
    o.value=yy; o.textContent=yy; if(yy===y)o.selected=true;
    yearSelect.appendChild(o);
  }

  const monthSelect=document.createElement('select');
  for(let mm=0; mm<12; mm++){
    const o=document.createElement('option');
    o.value=mm; o.textContent=mm+1; if(mm===m0)o.selected=true;
    monthSelect.appendChild(o);
  }

  const left=document.createElement('div'); left.style.display='flex'; left.style.gap='6px';
  left.appendChild(yearSelect); left.appendChild(monthSelect);

  const mid=document.createElement('div'); mid.style.display='flex'; mid.style.alignItems='center';
  mid.style.gap='8px'; mid.style.justifyContent='center'; mid.style.flex='1';
  const title=document.createElement('div'); title.className='cal-title';
  title.textContent=`${y}년 ${String(m0+1).padStart(2,'0')}월`;
  const prevBtn=document.createElement('button'); prevBtn.type='button'; prevBtn.className='navbtn'; prevBtn.textContent='◀';
  const nextBtn=document.createElement('button'); nextBtn.type='button'; nextBtn.className='navbtn'; nextBtn.textContent='▶';
  mid.appendChild(prevBtn); mid.appendChild(title); mid.appendChild(nextBtn);

  header.appendChild(left); header.appendChild(mid);
  picker.appendChild(header);

  const table=document.createElement('table');
  const thead=document.createElement('thead'); const tr=document.createElement('tr');
  ['일','월','화','수','목','금','토'].forEach(d=>{
    const th=document.createElement('th'); th.textContent=d; tr.appendChild(th);
  });
  thead.appendChild(tr); table.appendChild(thead);

  const tbody=document.createElement('tbody'); let row=document.createElement('tr');
  const first = new Date(y, m0, 1).getDay();
  const last  = new Date(y, m0+1, 0).getDate();
  const prevLast = new Date(y, m0, 0).getDate();
  let col = 0;

  function selectDate(offset, day){
    let yy = y, mm = m0 + offset;
    if(mm < 0){ mm = 11; yy--; }
    if(mm > 11){ mm = 0; yy++; }
    const mmStr = String(mm+1).padStart(2,'0');
    const ddStr = String(day).padStart(2,'0');
    dateInput.value = `${yy}-${mmStr}-${ddStr}`;
    dateInput.dispatchEvent(new Event('input', { bubbles: true }));
    setTimeout(() => { closePicker(); }, 50);
  }

  function addCell(text, offset, day){
    const td = document.createElement('td');
    td.textContent = text;
    if(offset !== 0) td.classList.add('other-month');
    td.addEventListener('click', (ev) => {
      ev.preventDefault(); ev.stopPropagation(); selectDate(offset, day);
    }, { passive: false });
    row.appendChild(td); col++;
    if(col === 7){ tbody.appendChild(row); row = document.createElement('tr'); col = 0; }
  }

  for(let i=first-1; i>=0; i--){ const d = prevLast - i; addCell(d, -1, d); }
  for(let d=1; d<=last; d++){ addCell(d, 0, d); }
  const tail = (7 - col) % 7;
  for(let d=1; d<=tail; d++){ addCell(d, +1, d); }

  table.appendChild(tbody); picker.appendChild(table);

  const rerender = () => buildCalendar(parseInt(yearSelect.value,10), parseInt(monthSelect.value,10));
  yearSelect.addEventListener('change', rerender);
  monthSelect.addEventListener('change', rerender);

  prevBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation();
    let yy = parseInt(yearSelect.value,10), mm = parseInt(monthSelect.value,10);
    mm--; if(mm < 0){ mm = 11; yy--; } 
    yearSelect.value = yy; monthSelect.value = mm; buildCalendar(yy, mm);
  });

  nextBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation();
    let yy = parseInt(yearSelect.value,10), mm = parseInt(monthSelect.value,10);
    mm++; if(mm > 11){ mm = 0; yy++; } 
    yearSelect.value = yy; monthSelect.value = mm; buildCalendar(yy, mm);
  });

  picker.addEventListener('click', (e) => { e.stopPropagation(); }, { passive: true });
}

document.getElementById('openCal').addEventListener('click', (e) => { 
  e.stopPropagation(); 
  if(picker.style.display === 'block') closePicker(); else openPicker();
});

document.addEventListener('click', (e) => {
  const box = document.querySelector('.datebox');
  if (picker.style.display !== 'block') return;
  if (picker && picker.contains(e.target)) return;
  if (!box.contains(e.target)) closePicker();
});

// ===== 계산 로직 =====
function diffDaysKST(targetStr){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(targetStr)) return null;
  const {y:cy,m:cm,d:cd}=zonedYMD(new Date());
  const todayUTC=new Date(Date.UTC(cy,cm-1,cd));
  const [ty,tm,td]=targetStr.split('-').map(Number);
  const targetUTC=new Date(Date.UTC(ty,tm-1,td));
  const diff=Math.ceil((targetUTC - todayUTC)/86400000);
  return { diff, todayUTC, targetUTC };
}

function countBizForward(startUTC,endUTC){
  let c=0,one=86400000,t=new Date(startUTC.getTime()+one);
  while(t<=endUTC){ const d=t.getUTCDay(); if(d!==0&&d!==6)c++; t=new Date(t.getTime()+one); }
  return c;
}

function render(){
  const date=dateInput.value.trim();
  const label=document.getElementById('label').value.trim();
  const r=diffDaysKST(date);
  if(!r){ alert('목표 날짜를 YYYY-MM-DD 형식으로 입력하세요.'); return; }
  const {diff,todayUTC,targetUTC}=r;

  const head = diff===0 ? 'D-0 (D-day)' : (diff>0 ? `D-${diff}` : `D+${Math.abs(diff)}`);
  document.getElementById('headline').textContent=head;

  const combined = label ? `${date} (${label})` : date;
  document.getElementById('subline').textContent = combined;

  const weeks = fmtSigned(diff/7)+'주';
  const months = fmtSigned(diff/30)+'개월';
  const biz   = diff>=0 ? countBizForward(todayUTC,targetUTC) : -countBizForward(targetUTC,todayUTC);

  document.getElementById('daysAbs').textContent = `${diff}일`;
  document.getElementById('weeks').textContent   = weeks;
  document.getElementById('months').textContent  = months;
  document.getElementById('bizdays').textContent = `${biz}일`;

  document.getElementById('now').textContent=`기준 시각: ${fmtNow.format(new Date())} (KST)`;
  document.getElementById('resultWrap').style.display='block';
}

function copyTextById(id){
  const txt=document.getElementById(id).textContent.trim();
  navigator.clipboard.writeText(txt).then(()=>{
    const map={ headline:'copyHeadline', subline:'copySubline' };
    const btn = document.getElementById(map[id]) || document.querySelector(`[data-copy="${id}"]`);
    if(btn){ const o=btn.textContent; btn.textContent='✅'; btn.classList.add('success'); setTimeout(()=>{btn.textContent=o; btn.classList.remove('success')},900); }
  });
}

document.getElementById('calcBtn').addEventListener('click',render);
document.getElementById('resetBtn').addEventListener('click',()=>{
  document.getElementById('label').value=''; dateInput.value='';
  document.getElementById('resultWrap').style.display='none'; closePicker();
});
document.getElementById('copyHeadline').addEventListener('click',()=>copyTextById('headline'));
document.getElementById('copySubline').addEventListener('click',()=>copyTextById('subline'));
document.querySelectorAll('[data-copy]').forEach(b=>b.addEventListener('click',()=>copyTextById(b.dataset.copy)));

document.getElementById('year').textContent=new Date().getFullYear();
document.getElementById('now').textContent=`기준 시각: ${fmtNow.format(new Date())} (KST)`;
