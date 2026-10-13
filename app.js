/* PEREMENA+ interaction layer. Static by design. No tracking or data submission. */
(() => {
 'use strict';
 const $=(s,root=document)=>root.querySelector(s), $$=(s,root=document)=>[...root.querySelectorAll(s)];
 const root=document.documentElement,body=document.body;
 const prefersMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
 let reduced=prefersMotion.matches,model=null,modelView='3d',modelFailed=false;
 let introTimers=[],introRun=0,toastTimer=0;
 const hero=$('#start'),caption=$('#intro-caption'),seats=$$('.hero-room .pouf-in-room');
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const currency=n=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0}).format(n)+' €';
 function toast(text){const el=$('#toast');el.textContent=text;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),4300);}
 function setMotion(value){reduced=!!value;root.classList.toggle('reduced-motion',reduced);$$('.motion-toggle').forEach(b=>{b.setAttribute('aria-pressed',String(reduced));b.setAttribute('aria-label',reduced?'Включить движение':'Уменьшить движение');b.title=reduced?'Включить движение':'Уменьшить движение';});model?.setReducedMotion(reduced);if(reduced)finishIntro();}
 function clearIntro(){introTimers.forEach(clearTimeout);introTimers=[];introRun++;}
 function finishIntro(){clearIntro();hero.classList.add('intro-text','intro-complete');seats.forEach(el=>el.classList.add('arrived'));caption.textContent='Два пуфа здесь. Десять новых мест в школе.';}
 function startIntro(){
  clearIntro();if(reduced){finishIntro();return;}
  const run=introRun;hero.classList.remove('intro-text','intro-complete');seats.forEach(el=>el.classList.remove('arrived'));caption.textContent='Знакомый коридор. Пока без новых пуфов.';
  void hero.offsetWidth;
  const after=(ms,fn)=>introTimers.push(setTimeout(()=>{if(run===introRun)fn();},ms));
  after(620,()=>{caption.textContent='А теперь добавим немного заботы.';$('.hero-room .pouf-back').classList.add('arrived');});
  after(1180,()=>{$('.hero-room .pouf-front').classList.add('arrived');hero.classList.add('intro-text');});
  after(2250,()=>{hero.classList.add('intro-complete');caption.textContent='Два пуфа здесь. Десять новых мест в школе.';});
 }
 $('#replay-intro').addEventListener('click',startIntro);$('#skip-intro').addEventListener('click',finishIntro);
 $('#restart-bottom').addEventListener('click',()=>{window.scrollTo({top:0,behavior:reduced?'instant':'smooth'});setTimeout(startIntro,reduced?0:550);});
 $$('.motion-toggle').forEach(b=>b.addEventListener('click',()=>setMotion(!reduced)));
 prefersMotion.addEventListener?.('change',e=>setMotion(e.matches));setMotion(reduced);
 // Decode only the two opening images, with a non-blocking fallback deadline.
 const criticalImages=$$('.hero-room img');
 Promise.race([Promise.all(criticalImages.map(img=>typeof img.decode==='function'?img.decode().catch(()=>{}):Promise.resolve())),new Promise(resolve=>setTimeout(resolve,900))]).then(startIntro);
 // Reveal content once; without IntersectionObserver, fail open.
 if('IntersectionObserver' in window){const obs=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in-view');obs.unobserve(e.target);}});},{threshold:.08});$$('.reveal').forEach(e=>obs.observe(e));}else{$$('.reveal').forEach(e=>e.classList.add('in-view'));}
 const chapters=$$('section.chapter'),rail=$$('.chapter-rail a');
 let scrollQueued=false;
 function updateScroll(){scrollQueued=false;$('#header').classList.toggle('scrolled',window.scrollY>40);const focusLine=window.innerHeight*.36;let active=0;chapters.forEach((el,i)=>{if(el.getBoundingClientRect().top<=focusLine)active=i;});rail.forEach((a,i)=>{a.classList.toggle('active',i===active);if(i===active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});}
 window.addEventListener('scroll',()=>{if(!scrollQueued){scrollQueued=true;requestAnimationFrame(updateScroll);}},{passive:true});updateScroll();
 const needDescriptions=[
 'Перемена короткая. Пусть возможность спокойно присесть будет рядом.',
 'Разговор не обязательно заканчивать на ходу. Можно сесть рядом и договорить.',
 'Общее место — не только для нашего класса. Пусть им пользуются разные ученики.'
 ];
 $$('.need-card').forEach(b=>b.addEventListener('click',()=>{$$('.need-card').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));$('#need-description').textContent=needDescriptions[Number(b.dataset.need)];}));
 // The photo fallback remains available if the browser cannot run WebGL.
 function failModel(){modelFailed=true;modelView='photo';model?.setEnabled(false);$('#pouf-canvas').hidden=true;$('#product-photo').hidden=false;$('#model-hint').textContent='Фото товара. Этот браузер не запустил 3D-эскиз.';$$('[data-model-view]').forEach(b=>{b.classList.toggle('active',b.dataset.modelView==='photo');b.setAttribute('aria-pressed',String(b.dataset.modelView==='photo'));if(b.dataset.modelView==='3d')b.disabled=true;});$('.model-controls').hidden=true;}
 function initModel(){try{model=window.Pouf3D.create($('#pouf-canvas'),{onError:failModel});model.setReducedMotion(reduced);}catch(error){console.info('3D fallback:',error.message);failModel();}}
 if('requestIdleCallback' in window)requestIdleCallback(initModel,{timeout:1800});else setTimeout(initModel,350);
 function setModelView(view){if(view==='3d'&&modelFailed){toast('3D недоступно в этом браузере. Показываем фото товара.');return;}modelView=view;$('#pouf-canvas').hidden=view!=='3d';$('#product-photo').hidden=view==='3d';$('.model-controls').hidden=view!=='3d';$('#model-hint').innerHTML=view==='3d'?'<svg class="icon" aria-hidden="true"><use href="#i-hand"/></svg> Вращайте. Рассмотрите со всех сторон.':'Фотография товара из материалов проекта.';model?.setEnabled(view==='3d');$$('[data-model-view]').forEach(b=>{const active=b.dataset.modelView===view;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});}
 $$('[data-model-view]').forEach(b=>b.addEventListener('click',()=>setModelView(b.dataset.modelView)));
 const colorNames={grey:'Серый',sand:'Песочный',light:'Светло-серый'};
 $$('.swatch').forEach(b=>b.addEventListener('click',()=>{$$('.swatch').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});model?.setColor(b.dataset.color);$('#model-color-name').textContent=colorNames[b.dataset.color];}));
 $('#model-reset').addEventListener('click',()=>model?.reset());
 // Before and after share the exact background and framing.
 let compareAnimation=0;
 function setCompare(value){const n=clamp(Number(value)||0,0,100);$('#comparison').style.setProperty('--split',n+'%');$('#compare-range').value=String(n);$('#compare-range').setAttribute('aria-valuetext',n===0?'Без новых пуфов':n===100?'С новыми пуфами':`Вариант с пуфами занимает ${Math.round(n)} процентов изображения`);$$('[data-compare]').forEach(b=>b.classList.toggle('active',Number(b.dataset.compare)===n));}
 function animateCompare(to){cancelAnimationFrame(compareAnimation);if(reduced){setCompare(to);return;}const from=Number($('#compare-range').value),beg=performance.now();const tick=t=>{const p=Math.min((t-beg)/620,1),ease=1-Math.pow(1-p,3);setCompare(from+(to-from)*ease);if(p<1)compareAnimation=requestAnimationFrame(tick);else setCompare(to);};compareAnimation=requestAnimationFrame(tick);}
 $('#compare-range').addEventListener('input',e=>{cancelAnimationFrame(compareAnimation);setCompare(e.target.value);});$$('[data-compare]').forEach(b=>b.addEventListener('click',()=>animateCompare(Number(b.dataset.compare))));setCompare(57);
 // Honest budget: quantity 1..10, fixed draft price 75 EUR, limit 800 EUR.
 const PRICE=75,LIMIT=800,MAX_QTY=10;
 const mini=$('#mini-seats');for(let i=0;i<MAX_QTY;i++){const seat=document.createElement('div');seat.className='mini-seat';seat.innerHTML=`<span>${String(i+1).padStart(2,'0')}</span><img src="assets/pouf.webp" alt="" width="100" height="80" loading="lazy">`;mini.append(seat);}
 function setQuantity(value){const n=clamp(Math.round(Number(value)||1),1,MAX_QTY),total=n*PRICE,reserve=LIMIT-total;$('#quantity').value=String(n);$('#qty-output').value=String(n);$('#budget-total').value=String(total);$('#reserve').textContent=currency(reserve);$('#equation').textContent=`${n} × ${PRICE} €*`;$('#budget-fill').style.width=(total/LIMIT*100)+'%';$('.budget-bar').setAttribute('aria-valuenow',String(total));$('.budget-bar').setAttribute('aria-valuetext',`${total} евро из ${LIMIT}`);$('#seats-caption-count').textContent=String(n);$('#qty-minus').disabled=n<=1;$('#qty-plus').disabled=n>=MAX_QTY;$$('.mini-seat').forEach((e,i)=>e.classList.toggle('inactive',i>=n));return {quantity:n,total,reserve};}
 $('#quantity').addEventListener('input',e=>setQuantity(e.target.value));$('#qty-minus').addEventListener('click',()=>setQuantity(Number($('#quantity').value)-1));$('#qty-plus').addEventListener('click',()=>setQuantity(Number($('#quantity').value)+1));$('#reset-budget').addEventListener('click',()=>setQuantity(10));setQuantity(10);
 const dialog=$('#source-dialog');$('#open-source').addEventListener('click',()=>{if(typeof dialog.showModal==='function')dialog.showModal();else window.open('assets/price-source.webp','_blank','noopener');});$('#close-source').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
 // Six-chapter presentation, with gentle pan for sections taller than the screen.
 const show={active:false,playing:false,index:0,started:0,elapsed:0,duration:11500,raf:0,hasPanned:false};
 const durations=[8000,12500,14000,13500,13500,14000];
 function showUI(){$('#show-page').textContent=`${show.index+1} / ${chapters.length}`;$('#show-play').innerHTML=`<svg class="icon" aria-hidden="true"><use href="#i-${show.playing?'pause':'play'}"/></svg>`;$('#show-play').setAttribute('aria-label',show.playing?'Приостановить автоматический показ':'Продолжить автоматический показ');}
 function stopTick(){if(show.raf)cancelAnimationFrame(show.raf);show.raf=0;}
 function goShow(index){show.index=clamp(index,0,chapters.length-1);show.started=performance.now();show.elapsed=0;show.duration=durations[show.index];show.hasPanned=false;chapters[show.index].scrollIntoView({behavior:reduced?'instant':'smooth',block:'start'});if(show.index===0)startIntro();if(show.index===3){setCompare(0);setTimeout(()=>{if(show.active&&show.index===3)animateCompare(72);},1100);}if(show.index===4)setQuantity(10);showUI();}
 function showTick(now){show.raf=0;if(!show.active||!show.playing||document.hidden)return;show.elapsed=now-show.started;const progress=clamp(show.elapsed/show.duration,0,1);$('#show-progress-fill').style.width=progress*100+'%';
  if(progress>.52&&!show.hasPanned){show.hasPanned=true;const el=chapters[show.index],extra=el.getBoundingClientRect().height-window.innerHeight+85;if(extra>65){const top=window.scrollY+el.getBoundingClientRect().top+extra;window.scrollTo({top,behavior:reduced?'instant':'smooth'});}}
  if(progress>=1){if(show.index===chapters.length-1){show.playing=false;showUI();toast('Это и есть «ПЕРЕМЕНА+». Давайте дадим перемене своё место.');return;}goShow(show.index+1);}
  show.raf=requestAnimationFrame(showTick);
 }
 function startShow(){show.active=true;show.playing=true;body.classList.add('presenting');$('#show-controls').hidden=false;goShow(0);stopTick();show.raf=requestAnimationFrame(showTick);toast('6 разделов · стрелки — вперёд и назад · Esc — завершить');}
 function exitShow(){show.active=false;show.playing=false;stopTick();body.classList.remove('presenting');$('#show-controls').hidden=true;if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});$('#start-show').focus({preventScroll:true});}
 function toggleShow(){show.playing=!show.playing;if(show.playing){show.started=performance.now()-show.elapsed;show.raf=requestAnimationFrame(showTick);}else stopTick();showUI();}
 $('#start-show').addEventListener('click',startShow);$('#show-again').addEventListener('click',startShow);$('#show-exit').addEventListener('click',exitShow);$('#show-play').addEventListener('click',toggleShow);$('#show-next').addEventListener('click',()=>goShow(show.index+1));$('#show-prev').addEventListener('click',()=>goShow(show.index-1));
 $('#show-fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(root.requestFullscreen)await root.requestFullscreen();else toast('Полноэкранный режим недоступен в этом браузере.');}catch{toast('Браузер не разрешил полноэкранный режим.');}});
 document.addEventListener('keydown',e=>{if(!show.active||dialog.open)return;if(['INPUT','TEXTAREA','SELECT','CANVAS'].includes(e.target.tagName))return;if(e.key==='Escape'){exitShow();return;}if(e.key==='ArrowRight'||e.key==='PageDown'){e.preventDefault();goShow(show.index+1);}if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();goShow(show.index-1);}if(e.key===' '&&e.target===body){e.preventDefault();toggleShow();}});
 document.addEventListener('visibilitychange',()=>{if(!show.active||!show.playing)return;if(document.hidden){show.elapsed=performance.now()-show.started;stopTick();}else{show.started=performance.now()-show.elapsed;show.raf=requestAnimationFrame(showTick);}});
 $$('a[href^="#"]').forEach(a=>a.addEventListener('click',()=>{if(show.active)exitShow();}));
 // Celebration is an animation, not a vote or a stored endorsement.
 function confetti(){if(reduced)return;const colors=['#d8ff5f','#ff784f','#4055ff','#f6f3eb'];for(let i=0;i<36;i++){const bit=document.createElement('i');const x=45+Math.random()*15,dx=(Math.random()-.5)*650,dy=80+Math.random()*330;bit.style.cssText=`position:fixed;left:${x}%;top:45%;width:${4+Math.random()*7}px;height:${4+Math.random()*10}px;background:${colors[i%4]};z-index:95;pointer-events:none;border-radius:2px;`;body.append(bit);const animation=bit.animate([{transform:'translate(0,0) rotate(0deg)',opacity:1},{transform:`translate(${dx}px,${dy}px) rotate(${Math.random()*900}deg)`,opacity:0}],{duration:1000+Math.random()*900,easing:'cubic-bezier(.1,.5,.5,1)'});animation.onfinish=()=>bit.remove();}}
 $('.final-button').addEventListener('click',confetti);
 $('#share-project').addEventListener('click',async()=>{if(location.protocol==='file:'){toast('Это локальная копия. Ссылкой можно поделиться после публикации на GitHub Pages.');return;}const url=location.href.split('#')[0];try{if(navigator.share){await navigator.share({title:'ПЕРЕМЕНА+ — у перемены будет своё место',text:'10 новых мест для отдыха между уроками. Школьный проект до 800 €.',url});}else if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(url);toast('Ссылка на проект скопирована.');}else{toast('Скопируйте адрес страницы из адресной строки браузера.');}}catch(error){if(error.name!=='AbortError')toast('Не удалось поделиться автоматически. Скопируйте адрес из адресной строки.');}});
 // Small public API for repeatable browser QA and future Codex edits.
 window.PEREMENA={setQuantity,setCompare,setMotion,startIntro,startShow,exitShow,setModelView,get state(){return {reducedMotion:reduced,modelAvailable:!modelFailed&&!!model,modelView,quantity:Number($('#quantity').value),showing:show.active,chapter:show.index+1};}};
})();
