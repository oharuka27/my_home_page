const canvas = document.querySelector('#orb');
const ctx = canvas.getContext('2d');
let w, h, dpr, t = 0, spin = -0.45, lift = 0, dragging = false, lastX = 0;
const dots = [];

// Fibonacci sphere: deliberately abstract rather than a copy of the reference object.
for (let i = 0; i < 900; i++) {
  const u = i / 899, phi = Math.acos(1 - 2 * u), theta = Math.PI * (1 + Math.sqrt(5)) * i;
  dots.push({ x:Math.cos(theta)*Math.sin(phi), y:Math.sin(theta)*Math.sin(phi), z:Math.cos(phi), size:.35 + Math.random()*1.6, seed:Math.random()*10 });
}
function resize() { dpr = Math.min(devicePixelRatio, 2); w = innerWidth; h = innerHeight; canvas.width=w*dpr; canvas.height=h*dpr; canvas.style.width=w+'px'; canvas.style.height=h+'px'; ctx.setTransform(dpr,0,0,dpr,0,0); }
addEventListener('resize', resize); resize();
function tri(cx, cy, s, direction) {
  ctx.beginPath(); ctx.moveTo(cx - s, cy + s*.5); ctx.lineTo(cx + s, cy + s*.5); ctx.lineTo(cx + direction*s*.55, cy - s); ctx.closePath();
  const g=ctx.createLinearGradient(cx-s,cy-s,cx+s,cy+s); g.addColorStop(0,'#ff4a17'); g.addColorStop(.55,'#ff7f36'); g.addColorStop(1,'#9b1b11'); ctx.fillStyle=g; ctx.fill();
  ctx.strokeStyle='rgba(255,244,221,.45)'; ctx.lineWidth=1; ctx.stroke();
}
function frame(ms) {
  t = ms*.001; ctx.clearRect(0,0,w,h);
  const compact = w < 650, r = Math.min(w,h)*(compact ? .285 : .31), cx=w*(compact ? .57 : .63), cy=h*(compact ? .44 : .49)+Math.sin(t*.9)*5+lift;
  // soft ground and colored atmospheric halo
  const halo=ctx.createRadialGradient(cx,cy,r*.1,cx,cy,r*1.55); halo.addColorStop(0,'rgba(255,116,45,.22)'); halo.addColorStop(.52,'rgba(255,161,72,.09)'); halo.addColorStop(1,'rgba(255,161,72,0)'); ctx.fillStyle=halo; ctx.fillRect(cx-r*1.6,cy-r*1.6,r*3.2,r*3.2);
  ctx.save(); ctx.translate(cx,cy); ctx.scale(1,.94);
  const glow=ctx.createRadialGradient(-r*.25,-r*.35,r*.05,0,0,r); glow.addColorStop(0,'#fff1ce'); glow.addColorStop(.18,'#f9b56c'); glow.addColorStop(.64,'#f05a24'); glow.addColorStop(1,'#751812'); ctx.fillStyle=glow; ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill();
  const a=spin+t*.12, ca=Math.cos(a), sa=Math.sin(a); const sorted=[];
  dots.forEach(p=>{ const x=p.x*ca-p.z*sa, z=p.x*sa+p.z*ca; sorted.push({x,y:p.y,z,size:p.size,seed:p.seed}); }); sorted.sort((a,b)=>a.z-b.z);
  for (const p of sorted) { const scale=.72+p.z*.28, x=p.x*r*scale, y=p.y*r*scale; const light=Math.max(0, p.z*.55 - p.y*.2 + .42); ctx.fillStyle=`rgba(255,${Math.round(75+150*light)},${Math.round(32+100*light)},${.22+light*.65})`; ctx.beginPath(); ctx.arc(x,y,p.size*(.5+scale),0,7); ctx.fill(); }
  // cat ears are intentionally simple geometric additions.
  tri(-r*.48,-r*.86,r*.28,-.32); tri(r*.48,-r*.86,r*.28,.32);
  // face responds subtly to orbit rotation
  const face=Math.max(.15, ca*.5+.5); if(face>.2){ ctx.globalAlpha=face; ctx.fillStyle='#261514'; [-.3,.3].forEach(x=>{ctx.beginPath();ctx.ellipse(x*r,-.06*r,r*.055,r*.085,0,0,7);ctx.fill();}); ctx.fillStyle='#fff0c7'; ctx.beginPath();ctx.moveTo(0,.1*r);ctx.lineTo(-.045*r,.055*r);ctx.lineTo(.045*r,.055*r);ctx.closePath();ctx.fill(); ctx.strokeStyle='#3f1b17';ctx.lineWidth=1.2; [-1,1].forEach(side=>{for(let q=-.05;q<.12;q+=.08){ctx.beginPath();ctx.moveTo(side*.06*r,.11*r);ctx.lineTo(side*.62*r,(q+.08)*r);ctx.stroke();}}) }
  ctx.restore(); requestAnimationFrame(frame);
}
canvas.addEventListener('pointerdown', e=>{ dragging=true; lastX=e.clientX; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', e=>{ if(!dragging)return; spin+=(e.clientX-lastX)*.012; lastX=e.clientX; });
canvas.addEventListener('pointerup', ()=>dragging=false);
requestAnimationFrame(frame);
