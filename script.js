const EMOJI_POOL=['👾','🚀','🔮','🎧','⚡','💎','🎨','🛸','🎯','🍕','🐱‍👓','🤖','👑','🌈','🔥','🏆','🌙','🍀','🎸','🦊','🍩','🌟','🎲','🧩','🦄','🍉','🐼','🎮','🚁','🌋','🍔','🐸','🪐','🎈','🦋'];
const CONFIG={easy:{pairs:8,size:4,label:'Easy'},medium:{pairs:10,size:5,label:'Medium'},hard:{pairs:18,size:6,label:'Hard'}};
let mode='easy',cards=[],flipped=[],matches=0,moves=0,seconds=0,timer=null,active=false,locked=false,muted=false,audio=null,token=0;
const $=id=>document.getElementById(id);
const grid=$('game-grid'),select=$('difficulty-select'),moveEl=$('moves-count'),timeEl=$('timer-display'),matchEl=$('matches-count'),bestEl=$('best-score-display'),status=$('status-text'),win=$('victory-modal'),lbModal=$('leaderboard-modal');
function fmt(s){return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}
function shuffle(a){for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function initAudio(){if(!audio){const C=window.AudioContext||window.webkitAudioContext;if(!C)return;audio=new C()}if(audio.state==='suspended')audio.resume()}
function tone(f,d,t='sine',v=.05,delay=0,end=f){if(muted||!audio)return;const n=audio.currentTime+delay,o=audio.createOscillator(),g=audio.createGain();o.type=t;o.frequency.setValueAtTime(f,n);if(end!==f)o.frequency.exponentialRampToValueAtTime(end,n+d);g.gain.setValueAtTime(.0001,n);g.gain.exponentialRampToValueAtTime(v,n+.008);g.gain.exponentialRampToValueAtTime(.0001,n+d);o.connect(g);g.connect(audio.destination);o.start(n);o.stop(n+d+.02)}
function sfx(type){if(muted)return;initAudio();if(!audio)return;if(type==='flip')tone(520,.065,'sine',.045,0,240);if(type==='match'){tone(523,.18,'triangle',.065);tone(659,.2,'triangle',.06,.06);tone(784,.25,'triangle',.055,.12)}if(type==='wrong'){tone(170,.13,'sine',.045,0,110);tone(125,.15,'sine',.035,.06,90)}if(type==='win')[392,523,659,784,1047].forEach((f,i)=>tone(f,.3,'triangle',.06,i*.08))}
function scores(modeName=mode){try{return JSON.parse(localStorage.getItem('memoriza_scores_'+modeName))||[]}catch{return[]}}
function saveScores(modeName,data){localStorage.setItem('memoriza_scores_'+modeName,JSON.stringify(data));}
function rankSort(a,b){return a.moves-b.moves||a.seconds-b.seconds||a.date-b.date}
function renderLeaderboard(modeName=mode,target=$('leaderboard-list')){const list=scores(modeName).sort(rankSort);target.innerHTML=list.length?list.slice(0,10).map((x,i)=>'<div class="lb-row '+(i===0?'first':'')+'"><b class="rank">'+(i+1)+'</b><span class="medal">'+(i===0?'👑':i===1?'🥈':i===2?'🥉':'')+'</span><span class="lb-date">'+new Date(x.date).toLocaleDateString()+'</span><strong>'+x.moves+' moves</strong><span>'+fmt(x.seconds)+'</span></div>').join(''):'<div class="empty-lb"><i class="fa-solid fa-inbox"></i><span>No scores yet</span><small>Finish a game to record it.</small></div>'}
function renderAllLB(){renderLeaderboard(mode,$('leaderboard-list'));renderLeaderboard(document.querySelector('#leaderboard-modal .lb-tab.active')?.dataset.mode||mode,$('mobile-leaderboard-list'))}
function stop(){clearInterval(timer);timer=null}
function start(){if(timer)return;active=true;status.textContent='Playing';timer=setInterval(()=>{seconds++;timeEl.textContent=fmt(seconds)},1000)}
function reset(){token++;stop();seconds=0;moves=0;matches=0;flipped=[];active=false;locked=false;moveEl.textContent='0';timeEl.textContent='00:00';const c=CONFIG[mode];matchEl.textContent='0 / '+c.pairs;status.textContent='Ready';const list=scores(mode).sort(rankSort);bestEl.textContent=list[0]?list[0].moves+'m':'—';win.classList.add('hidden');build()}
function build(){const c=CONFIG[mode];grid.className='game-grid size-'+c.size;const icons=shuffle([...EMOJI_POOL]).slice(0,c.pairs);cards=shuffle([...icons,...icons]).map((emoji,id)=>({id,emoji,flipped:false,matched:false}));const f=document.createDocumentFragment();cards.forEach(card=>{const e=document.createElement('button');e.className='card-item';e.type='button';e.setAttribute('aria-label','Hidden memory card');e.innerHTML='<span class="card-inner"><span class="card-face card-back"><span class="card-logo">M</span></span><span class="card-face card-front"><span class="card-glow"></span><span class="emoji">'+card.emoji+'</span></span></span>';e.onclick=()=>flip(card,e);f.appendChild(e)});grid.replaceChildren(f)}
function flip(card,e){if(locked||card.flipped||card.matched)return;if(!active)start();card.flipped=true;e.classList.add('flipped');e.setAttribute('aria-label','Memory card '+card.emoji);sfx('flip');flipped.push({card,e});if(flipped.length===2){moves++;moveEl.textContent=moves;check()}}
function check(){locked=true;const[a,b]=flipped,t=token;if(a.card.emoji===b.card.emoji)setTimeout(()=>{if(t!==token)return;a.card.matched=b.card.matched=true;a.e.classList.add('matched');b.e.classList.add('matched');matches++;matchEl.textContent=matches+' / '+CONFIG[mode].pairs;flipped=[];locked=false;status.textContent='Match!';sfx('match');if(matches===CONFIG[mode].pairs)victory()},300);else setTimeout(()=>{if(t!==token)return;a.card.flipped=b.card.flipped=false;a.e.classList.remove('flipped');b.e.classList.remove('flipped');a.e.setAttribute('aria-label','Hidden memory card');b.e.setAttribute('aria-label','Hidden memory card');flipped=[];locked=false;status.textContent='Keep looking';sfx('wrong')},700)}
function victory(){stop();active=false;status.textContent='Complete!';sfx('win');const entry={moves,seconds,date:Date.now()};const list=scores(mode);list.push(entry);list.sort(rankSort);saveScores(mode,list);renderAllLB();saveScoresFile();const best=list[0];bestEl.textContent=best.moves+'m';$('modal-time').textContent=fmt(seconds);$('modal-moves').textContent=moves;$('modal-best').textContent=best.moves+' moves · '+fmt(best.seconds);const p=CONFIG[mode].pairs,stars=moves<=p*1.3?3:moves<=p*1.8?2:1;$('star-rating').innerHTML=[1,2,3].map(i=>'<i class="'+(i<=stars?'fa-solid':'fa-regular')+' fa-star"></i>').join('');setTimeout(()=>win.classList.remove('hidden'),400)}
async function saveScoresFile(){
  const data={app:'MeMoRiZa',version:1,exportedAt:new Date().toISOString(),scores:{easy:scores('easy'),medium:scores('medium'),hard:scores('hard')}};
  try{
    const response=await fetch('/api/scores',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    if(!response.ok) throw new Error('Save failed');
  }catch(err){
    console.warn('Could not save scores to memoriza-scores.json:',err);
  }
}
async function loadScoresFile(){
  try{
    const response=await fetch('/api/scores',{cache:'no-store'});
    if(!response.ok) return;
    const data=await response.json();
    if(!data.scores) return;
    ['easy','medium','hard'].forEach(m=>{
      if(Array.isArray(data.scores[m])){
        const clean=data.scores[m].filter(x=>Number.isFinite(x.moves)&&Number.isFinite(x.seconds)&&Number.isFinite(x.date));
        saveScores(m,clean);
      }
    });
  }catch(err){
    console.warn('Running without local score file:',err);
  }
}
function importScores(file){const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);if(!d.scores)throw Error();['easy','medium','hard'].forEach(m=>{if(Array.isArray(d.scores[m]))saveScores(m,d.scores[m].filter(x=>Number.isFinite(x.moves)&&Number.isFinite(x.seconds)&&Number.isFinite(x.date)))});renderAllLB();reset();alert('Scores imported successfully.')}catch{alert('Invalid MeMoRiZa score file.')}};r.readAsText(file)}
select.onchange=e=>{mode=e.target.value;reset();document.querySelectorAll('.lb-tab').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));renderLeaderboard(mode)}
$('restart-btn').onclick=()=>{sfx('flip');reset()};
$('sound-toggle-btn').onclick=()=>{muted=!muted;$('sound-icon').className=muted?'fa-solid fa-volume-xmark':'fa-solid fa-volume-high';if(!muted){initAudio();tone(660,.12,'sine',.05)}};
document.querySelectorAll('.lb-tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.lb-tab').forEach(x=>x.classList.toggle('active',x.dataset.mode===b.dataset.mode));renderLeaderboard(b.dataset.mode,$('leaderboard-list'));renderLeaderboard(b.dataset.mode,$('mobile-leaderboard-list'))});
$('export-btn').onclick=saveScoresFile;$('mobile-export-btn').onclick=saveScoresFile;
$('import-btn').onclick=()=>$('import-file').click();$('mobile-import-btn').onclick=()=>$('import-file').click();$('import-file').onchange=e=>{if(e.target.files[0])importScores(e.target.files[0]);e.target.value=''};
$('leaderboard-btn').onclick=()=>{renderLeaderboard(mode,$('leaderboard-list'));$('leaderboard-shell').classList.remove('hidden-lb')};$('leaderboard-close-btn').onclick=()=>$('leaderboard-shell').classList.add('hidden-lb');$('leaderboard-modal-close').onclick=()=>lbModal.classList.add('hidden');
$('modal-close-btn').onclick=()=>win.classList.add('hidden');$('modal-play-again-btn').onclick=reset;
document.addEventListener('keydown',e=>{if(e.key==='Escape'){win.classList.add('hidden');lbModal.classList.add('hidden');$('leaderboard-shell').classList.add('hidden-lb')}if(e.key.toLowerCase()==='r'&&!e.ctrlKey&&!e.metaKey)reset()});
loadScoresFile().then(()=>{reset();renderLeaderboard('easy');});