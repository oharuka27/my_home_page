const canvas = document.querySelector('#orb');
const ctx = canvas.getContext('2d');
let w, h, dpr, t = 0, spin = -0.45, lift = 0, dragging = false, lastX = 0;
let interaction = null, petStrokes = 0, happyUntil = 0, painUntil = 0, pointerX = innerWidth*.68, pointerY = innerHeight*.38;
const ears = [{ stretch:0, bend:0 }, { stretch:0, bend:0 }];
const dots = [];

// Fibonacci sphere: deliberately abstract rather than a copy of the reference object.
for (let i = 0; i < 900; i++) {
  const u = i / 899, phi = Math.acos(1 - 2 * u), theta = Math.PI * (1 + Math.sqrt(5)) * i;
  dots.push({ x:Math.cos(theta)*Math.sin(phi), y:Math.sin(theta)*Math.sin(phi), z:Math.cos(phi), size:.35 + Math.random()*1.6, seed:Math.random()*10 });
}
function resize() { dpr = Math.min(devicePixelRatio, 2); w = innerWidth; h = innerHeight; pointerX=w*(w<650 ? .62 : .68); pointerY=h*(w<650 ? .37 : .38); canvas.width=w*dpr; canvas.height=h*dpr; canvas.style.width=w+'px'; canvas.style.height=h+'px'; ctx.setTransform(dpr,0,0,dpr,0,0); }
addEventListener('resize', resize); resize();
function geometry() {
  const compact = w < 650, r = Math.min(w,h)*(compact ? .285 : .31);
  return { r, cx:w*(compact ? .57 : .63), cy:h*(compact ? .44 : .49)+Math.sin(t*.9)*5+lift };
}
function drawEar(x, y, s, direction, ear) {
  const bend = ear.bend * s, stretch = 1 + ear.stretch;
  ctx.save(); ctx.translate(x, y + s*.5); ctx.transform(1, 0, bend / s, 1, 0, 0); ctx.scale(1, stretch);
  ctx.beginPath(); ctx.moveTo(-s, 0); ctx.lineTo(s, 0); ctx.lineTo(direction*s*.55, -s*1.5); ctx.closePath();
  const g=ctx.createLinearGradient(-s,-s,s,s); g.addColorStop(0,'#ffb06b'); g.addColorStop(.32,'#f2652a'); g.addColorStop(.7,'#c5321c'); g.addColorStop(1,'#651510'); ctx.fillStyle=g; ctx.fill();
  ctx.beginPath(); ctx.moveTo(-s*.58,0); ctx.lineTo(s*.55,0); ctx.lineTo(direction*s*.53,-s*1.17); ctx.closePath();
  const inner=ctx.createLinearGradient(0,-s,0,s); inner.addColorStop(0,'#70201c'); inner.addColorStop(1,'#ee7040'); ctx.fillStyle=inner; ctx.fill();
  ctx.strokeStyle='rgba(255,244,221,.6)'; ctx.lineWidth=1; ctx.stroke(); ctx.restore();
}
function frame(ms) {
  t = ms*.001; ctx.clearRect(0,0,w,h);
  const {r, cx, cy} = geometry();
  // soft ground and colored atmospheric halo
  const halo=ctx.createRadialGradient(cx,cy,r*.1,cx,cy,r*1.55); halo.addColorStop(0,'rgba(255,116,45,.22)'); halo.addColorStop(.52,'rgba(255,161,72,.09)'); halo.addColorStop(1,'rgba(255,161,72,0)'); ctx.fillStyle=halo; ctx.fillRect(cx-r*1.6,cy-r*1.6,r*3.2,r*3.2);
  const breath = Math.sin(t * Math.PI * .55);
  const breathingX = 1 + breath * .025 * .5 * .25 * 1.5;
  const breathingY = 1 + breath * .025 * .5 * .75 * 1.5;
  ctx.save(); ctx.translate(cx,cy); ctx.scale(breathingX, .94 * breathingY);
  const glow=ctx.createRadialGradient(-r*.25,-r*.35,r*.05,0,0,r); glow.addColorStop(0,'#fff1ce'); glow.addColorStop(.18,'#f9b56c'); glow.addColorStop(.64,'#f05a24'); glow.addColorStop(1,'#751812'); ctx.fillStyle=glow; ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill();
  const a=spin+t*.12, ca=Math.cos(a), sa=Math.sin(a); const sorted=[];
  dots.forEach(p=>{ const x=p.x*ca-p.z*sa, z=p.x*sa+p.z*ca; sorted.push({x,y:p.y,z,size:p.size,seed:p.seed}); }); sorted.sort((a,b)=>a.z-b.z);
  for (const p of sorted) { const scale=.72+p.z*.28, x=p.x*r*scale, y=p.y*r*scale; const light=Math.max(0, p.z*.55 - p.y*.2 + .42); ctx.fillStyle=`rgba(255,${Math.round(75+150*light)},${Math.round(32+100*light)},${.22+light*.65})`; ctx.beginPath(); ctx.arc(x,y,p.size*(.5+scale),0,7); ctx.fill(); }
  const earSize = r*.28*1.2;
  drawEar(-r*.48,-r*.86,earSize,-.32,ears[0]); drawEar(r*.48,-r*.86,earSize,.32,ears[1]);
  const happy = t < happyUntil, hurt = t < painUntil;
  const lookX = Math.max(-1, Math.min(1, (pointerX-cx)/(r*1.2))), lookY = Math.max(-1, Math.min(1, (pointerY-cy)/(r*1.2)));
  { ctx.globalAlpha=1; ctx.fillStyle='#261514';
    [-.3,.3].forEach(x=>{ctx.beginPath(); if(happy){ctx.arc(x*r,-.06*r,r*.066,Math.PI,0);ctx.lineWidth=2;ctx.strokeStyle='#261514';ctx.stroke();}else if(hurt){ctx.moveTo((x-.065)*r,-.11*r);ctx.lineTo((x+.065)*r,.01*r);ctx.moveTo((x+.065)*r,-.11*r);ctx.lineTo((x-.065)*r,.01*r);ctx.lineWidth=2.4;ctx.strokeStyle='#261514';ctx.stroke();}else{ctx.fillStyle='#fff0c7';ctx.ellipse(x*r,-.06*r,r*.09, r*.108,0,0,7);ctx.fill();ctx.fillStyle='#261514';ctx.beginPath();ctx.ellipse((x+lookX*.035)*r,(-.06+lookY*.035)*r,r*.042,r*.06,0,0,7);ctx.fill();}});
    ctx.fillStyle='#fff0c7'; ctx.beginPath();ctx.moveTo(0,.1*r);ctx.lineTo(-.045*r,.055*r);ctx.lineTo(.045*r,.055*r);ctx.closePath();ctx.fill(); ctx.strokeStyle='#3f1b17';ctx.lineWidth=1.2;
    if(happy&&!hurt){ctx.beginPath();ctx.arc(0,.07*r,.1*r,0,Math.PI);ctx.stroke();}
    [-1,1].forEach(side=>{for(let q=-.05;q<.12;q+=.08){ctx.beginPath();ctx.moveTo(side*.06*r,.11*r);ctx.lineTo(side*.62*r,(q+.08)*r);ctx.stroke();}})
  }
  ctx.restore(); requestAnimationFrame(frame);
}
function hitTest(x, y) {
  const {r,cx,cy}=geometry(), localX=x-cx, localY=(y-cy)/.94;
  if(Math.hypot(localX,localY)<r*.43) return {type:'pet', distance:0};
  if(localY > -r*1.35 && localY < -r*.64 && Math.abs(localX+r*.48)<r*.4) return {type:'ear', index:0};
  if(localY > -r*1.35 && localY < -r*.64 && Math.abs(localX-r*.48)<r*.4) return {type:'ear', index:1};
  return null;
}
canvas.addEventListener('pointerdown', e=>{ interaction=hitTest(e.clientX,e.clientY); dragging=true; lastX=e.clientX; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', e=>{ pointerX=e.clientX; pointerY=e.clientY; if(!dragging)return; const dx=e.clientX-lastX, dy=e.clientY-(interaction?.lastY ?? e.clientY); lastX=e.clientX;
  if(interaction?.type==='ear'){ const ear=ears[interaction.index]; ear.stretch=Math.max(-.35,Math.min(.7,ear.stretch-dy*.008)); ear.bend=Math.max(-.7,Math.min(.7,ear.bend-dx*.012)); if(Math.abs(ear.stretch)>.38||Math.abs(ear.bend)>.45) painUntil=t+.65; interaction.lastY=e.clientY; }
  else if(interaction?.type==='pet'){ interaction.distance+=Math.hypot(dx,dy); spin+=dx*.004; }
  else spin+=dx*.012;
});
function endInteraction() {
  if(interaction?.type==='pet'&&interaction.distance>=geometry().r*.35){petStrokes++; if(petStrokes>=2) happyUntil=t+3;}
  if(interaction?.type==='ear'){ ears[interaction.index].stretch=0; ears[interaction.index].bend=0; }
  interaction=null; dragging=false;
}
canvas.addEventListener('pointerup', endInteraction);
canvas.addEventListener('pointercancel', endInteraction);
requestAnimationFrame(frame);
