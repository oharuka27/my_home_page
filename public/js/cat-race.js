// Three orbiting cats race across the profile to the fish, leaving paw prints; any click calls them back.
export function initCatRace(){
  const catButton=document.querySelector('.cat-button');
  if(!catButton) return;
  const profile=catButton.closest('.profile');
  const caption=catButton.closest('figure').querySelector('figcaption');
  const fishes=[...document.querySelectorAll('.profile-fish .fish')];
  const catInfo={sabatora:{name:'SABATORA',paw:'#5e5b57'},chatora:{name:'CHATORA',paw:'#b35b22'},mugi:{name:'MUGI',paw:'#6a5238'}};
  const pawSvg='<svg viewBox="0 0 20 20"><ellipse cx="10" cy="13" rx="5" ry="4.2"/><ellipse cx="4.2" cy="7.6" rx="1.9" ry="2.4"/><ellipse cx="8" cy="4.6" rx="1.9" ry="2.5"/><ellipse cx="12" cy="4.6" rx="1.9" ry="2.5"/><ellipse cx="15.8" cy="7.6" rx="1.9" ry="2.4"/></svg>';
  const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
  let raceState='idle', layer=null;
  const bezier=(p,t)=>{const u=1-t;return{x:u*u*u*p[0].x+3*u*u*t*p[1].x+3*u*t*t*p[2].x+t*t*t*p[3].x,y:u*u*u*p[0].y+3*u*u*t*p[1].y+3*u*t*t*p[2].y+t*t*t*p[3].y};};
  const ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
  const setCaption=(text,label)=>{caption.textContent=text;catButton.setAttribute('aria-label',label);};
  // Keep in sync with the @media (max-width: 1000px) rule that hides .profile-fish.
  const noFishLayout=matchMedia('(max-width: 1000px)');
  const idleLabel=()=>noFishLayout.matches ? 'ぐるぐる回る3匹の猫' : 'ぐるぐる回る3匹の猫（押すと魚を捕りに走ります）';

  const startRace=()=>{
    if(!fishes.length||!fishes[0].getClientRects().length) return;
    raceState='running';
    profile.classList.add('is-racing');
    catButton.classList.add('is-away');
    catButton.setAttribute('aria-pressed','true');
    setCaption('GO!','3匹の猫が魚を捕りに走っています');
    const base=profile.getBoundingClientRect();
    const body=profile.querySelector('.profile-body').getBoundingClientRect();
    const scale=catButton.querySelector('.cat-circle').getBoundingClientRect().width/240;
    const center=r=>({x:r.left+r.width/2-base.left,y:r.top+r.height/2-base.top});
    layer=document.createElement('div');
    layer.className='race-layer';
    layer.addEventListener('click',callBack);
    profile.appendChild(layer);
    const cats=[...catButton.querySelectorAll('.cat-orbit .cat')].map(cat=>({cat,start:center(cat.getBoundingClientRect())}));
    for(let i=cats.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [cats[i],cats[j]]=[cats[j],cats[i]];
    }
    const fishTargets=fishes.map(f=>{const r=f.getBoundingClientRect();return{fish:f,x:r.right-base.left-14*scale,y:r.top+r.height/2-base.top};});
    let finished=0, winner=null;
    cats.forEach((c,i)=>{
      const key=Object.keys(catInfo).find(k=>c.cat.classList.contains('cat-'+k));
      const info=catInfo[key];
      const late=i===2;
      const goal=late?fishTargets[0]:fishTargets[i%fishTargets.length];
      const head=40*scale;
      const end=late?{x:goal.x+head+70*scale,y:goal.y+46*scale}:{x:goal.x+head,y:goal.y};
      const ry=()=>body.top-base.top+Math.random()*body.height;
      const pts=[c.start,{x:c.start.x-(c.start.x-end.x)*.3,y:ry()},{x:end.x+(170+Math.random()*60)*scale,y:end.y+(Math.random()-.5)*30*scale},end];
      const sprite=document.createElement('div');
      sprite.className='race-cat is-running';
      const w=100*scale*1.2, h=56*scale*1.2;
      sprite.style.width=w+'px'; sprite.style.height=h+'px';
      const clone=c.cat.cloneNode(true);
      clone.setAttribute('transform','scale(1.2)');
      clone.style.opacity='1';
      sprite.innerHTML='<svg viewBox="-60 -28 120 56"></svg>';
      sprite.firstChild.appendChild(clone);
      layer.appendChild(sprite);
      const duration=2300+i*420+Math.random()*250;
      let last=pts[0], travelled=0, side=1, startTime=null;
      const place=(pos,angle)=>{sprite.style.transform=`translate(${pos.x-w/2}px,${pos.y-h/2}px) rotate(${angle}rad)`;};
      const dropPaws=pos=>{
        const dx=pos.x-last.x, dy=pos.y-last.y, dist=Math.hypot(dx,dy);
        if(!dist) return Math.PI;
        const angle=Math.atan2(dy,dx);
        travelled+=dist;
        const step=22*scale;
        while(travelled>=step){
          travelled-=step;
          const paw=document.createElement('span');
          paw.className='paw';
          paw.innerHTML=pawSvg;
          paw.style.left=(pos.x-Math.sin(angle)*side*8*scale)+'px';
          paw.style.top=(pos.y+Math.cos(angle)*side*8*scale)+'px';
          paw.style.color=info.paw;
          paw.style.setProperty('--r',`rotate(${angle+Math.PI/2}rad)`);
          paw.style.setProperty('--o',(.7+Math.random()*.25).toFixed(2));
          paw.style.transform=`rotate(${angle+Math.PI/2}rad)`;
          paw.style.opacity=paw.style.getPropertyValue('--o');
          layer.insertBefore(paw,layer.firstChild);
          side=-side;
        }
        last=pos;
        return angle;
      };
      const arrive=()=>{
        sprite.classList.remove('is-running');
        if(late){sprite.classList.add('is-late');}
        else{goal.fish.classList.add('is-eaten'); if(!winner) winner=info.name;}
        finished++;
        if(finished===cats.length){
          raceState='done';
          setCaption(`WINNER: ${winner}! CLICK TO CALL BACK`,`${winner}の勝ち。猫・足跡・魚のどこを押しても猫たちが戻ってきます`);
        }
      };
      if(reduceMotion.matches){
        for(let t=0;t<=1;t+=.01) place(bezier(pts,t),dropPaws(bezier(pts,t)));
        place(end,Math.PI); arrive(); return;
      }
      place(pts[0],Math.PI);
      const frame=now=>{
        if(!layer||!layer.contains(sprite)) return;
        if(startTime===null) startTime=now;
        const t=Math.min(1,(now-startTime)/duration);
        const pos=bezier(pts,ease(t));
        const angle=dropPaws(pos);
        place(pos,angle);
        if(t<1) requestAnimationFrame(frame); else arrive();
      };
      requestAnimationFrame(frame);
    });
  };

  function callBack(){
    if(raceState==='idle') return;
    raceState='idle';
    profile.classList.remove('is-racing');
    const old=layer; layer=null;
    old.classList.add('is-clearing');
    setTimeout(()=>old.remove(),500);
    fishes.forEach(f=>f.classList.remove('is-eaten'));
    catButton.classList.remove('is-away');
    catButton.setAttribute('aria-pressed','false');
    setCaption('3 RESCUED CATS',idleLabel());
  }
  const syncRaceAvailability=()=>{
    if(noFishLayout.matches) callBack();
    catButton.disabled=noFishLayout.matches;
    catButton.setAttribute('aria-label',idleLabel());
  };
  noFishLayout.addEventListener('change',syncRaceAvailability);
  syncRaceAvailability();

  catButton.addEventListener('click',()=>{
    if(raceState==='idle') startRace(); else callBack();
  });
  fishes.forEach(f=>f.addEventListener('click',callBack));
}
