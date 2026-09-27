// Hero canvas: a slime-like cat whose face and ears can be pulled, fed by dragging falling fish onto it.

// Keep in sync with the @media (max-width: 700px) layout in style.css.
const compactLayout = matchMedia('(max-width: 700px)');
const MAX_FPS = 35, MAX_DT = .033;
// The face is drawn squashed vertically; hit tests undo the squash to work in circle space.
const FACE_SQUASH_Y = .94;
const FACE_HIT_RADIUS = .92, FEED_RADIUS = .9, MAX_FACE_PULL = .78;
const FACE_SPRING = 52, FACE_DAMPING = 6;
// A more damped spring than the face gives the ears a small, soft bounce.
const EAR_SPRING = 85, EAR_DAMPING = 11;
const EAR_OFFSET_X = .48, EAR_OFFSET_Y = .86;
const MAX_FISH = 2, FISH_INTERVAL = 5.5;

let canvas, catDragZone, ctx;
let w, h, dpr, t = 0, lift = 0, dragging = false, lastX = 0, lastY = 0, lastFrameMs = 0, lastRenderedMs = 0;
let canvasVisible = true, animationRunning = false;
let facePullX = 0, facePullY = 0, faceVelocityX = 0, faceVelocityY = 0;
let particleAngle = -.45;
let interaction = null, painUntil = 0, pointerX = innerWidth*.68, pointerY = innerHeight*.38;
let feedStartedAt = -Infinity, happyUntil = 0, chewUntil = 0, nextFishAt = 1.2, fishCount = 0;
const fish = [];
const ears = Array.from({length:2},()=>({stretch:0, bend:0, stretchVelocity:0, bendVelocity:0}));
const dots = [];

export function initHeroCat() {
  canvas = document.querySelector('#orb');
  catDragZone = document.querySelector('.cat-drag-zone');
  ctx = canvas.getContext('2d');
  createDots();
  addEventListener('resize', resize);
  resize();
  const visibilityObserver = new IntersectionObserver(entries => {
    canvasVisible = entries[0].isIntersecting;
    if (canvasVisible) startAnimation();
  });
  visibilityObserver.observe(canvas);
  document.addEventListener('visibilitychange', startAnimation);
  [canvas, catDragZone].forEach(source=>{
    source.addEventListener('pointerdown', startInteraction);
    source.addEventListener('pointermove', moveInteraction);
    source.addEventListener('pointerup', endInteraction);
    source.addEventListener('pointercancel', endInteraction);
  });
  startAnimation();
}

// Fibonacci sphere: deliberately abstract rather than a copy of the reference object.
function createDots() {
  for (let i = 0; i < 360; i++) {
    const u = i / 359, phi = Math.acos(1 - 2 * u), theta = Math.PI * (1 + Math.sqrt(5)) * i;
    dots.push({
      x:Math.cos(theta)*Math.sin(phi), y:Math.sin(theta)*Math.sin(phi), z:Math.cos(phi),
      size:.35 + Math.random()*1.6, seed:Math.random()*10,
    });
  }
}
function resize() {
  const rect=canvas.getBoundingClientRect(), compact=compactLayout.matches;
  dpr = Math.min(devicePixelRatio, 1.5); w = rect.width; h = rect.height;
  pointerX=w*(compact ? .62 : .68); pointerY=h*(compact ? .37 : .38);
  canvas.width=w*dpr; canvas.height=h*dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
}
function geometry() {
  const compact = compactLayout.matches, r = Math.min(w,h)*(compact ? .22 : .31);
  return { r, cx:w*(compact ? .57 : .63), cy:h*(compact ? .27 : .49)+Math.sin(t*.9)*5+lift };
}
function fishSize(r) {
  return Math.max(25,Math.min(40,r*.2));
}

// ---- animation loop ----

function startAnimation() {
  if (animationRunning || document.hidden || !canvasVisible) return;
  lastFrameMs = 0;
  lastRenderedMs = 0;
  animationRunning = true;
  requestAnimationFrame(frame);
}
function frame(ms) {
  if (document.hidden || !canvasVisible) {
    animationRunning = false;
    return;
  }
  requestAnimationFrame(frame);
  if (ms - lastRenderedMs < 1000 / MAX_FPS) return;
  lastRenderedMs = ms;
  const dt = Math.min((ms - (lastFrameMs || ms)) * .001, MAX_DT);
  lastFrameMs = ms; t = ms*.001;
  updateEars(dt);
  updateFace(dt);
  // Accumulate only idle time so resuming never jumps ahead in the rotation.
  if(!isDeforming()) particleAngle=(particleAngle+dt*.12)%(Math.PI*2);
  const geo = geometry();
  updateFish(dt, geo);
  draw(geo);
}
function updateEars(dt) {
  ears.forEach((ear,index)=>{
    if(interaction?.type==='ear' && interaction.index===index) return;
    ear.stretchVelocity+=(-EAR_SPRING*ear.stretch-EAR_DAMPING*ear.stretchVelocity)*dt;
    ear.bendVelocity+=(-EAR_SPRING*ear.bend-EAR_DAMPING*ear.bendVelocity)*dt;
    ear.stretch+=ear.stretchVelocity*dt;
    ear.bend+=ear.bendVelocity*dt;
    if(Math.hypot(ear.stretch,ear.bend)<.001 && Math.hypot(ear.stretchVelocity,ear.bendVelocity)<.01){
      ear.stretch=0; ear.bend=0; ear.stretchVelocity=0; ear.bendVelocity=0;
    }
  });
}
function updateFace(dt) {
  if (interaction?.type === 'face' || !(facePullX || facePullY || faceVelocityX || faceVelocityY)) return;
  faceVelocityX += (-FACE_SPRING*facePullX - FACE_DAMPING*faceVelocityX)*dt;
  faceVelocityY += (-FACE_SPRING*facePullY - FACE_DAMPING*faceVelocityY)*dt;
  facePullX += faceVelocityX*dt; facePullY += faceVelocityY*dt;
  if (Math.hypot(facePullX,facePullY)<.002 && Math.hypot(faceVelocityX,faceVelocityY)<.015) {
    facePullX=0; facePullY=0; faceVelocityX=0; faceVelocityY=0;
  }
}
function isDeforming() {
  return interaction!==null || facePullX!==0 || facePullY!==0 || faceVelocityX!==0 || faceVelocityY!==0
    || ears.some(ear=>ear.stretch!==0 || ear.bend!==0 || ear.stretchVelocity!==0 || ear.bendVelocity!==0);
}
function updateFish(dt, {r, cy}) {
  if(t>=nextFishAt && fish.length<MAX_FISH){spawnFish(); nextFishAt=t+FISH_INTERVAL;}
  for(let i=fish.length-1;i>=0;i--){
    if(interaction?.type==='fish' && interaction.item===fish[i]) continue;
    fish[i].y+=dt*Math.max(30,r*.16);
    const bottom=compactLayout.matches ? Math.min(h*.39,cy+r*1.25) : Math.min(h-35,cy+r*1.7);
    if(fish[i].y>bottom) fish.splice(i,1);
  }
}

// ---- drawing ----

function draw({r, cx, cy}) {
  ctx.clearRect(0,0,w,h);
  drawHalo(cx,cy,r);
  const breath = Math.sin(t * Math.PI * .55);
  const breathingX = 1 + breath * .025 * .5 * .25 * 1.5;
  const breathingY = 1 + breath * .025 * .5 * .75 * 1.5;
  ctx.save(); ctx.translate(cx,cy); ctx.scale(breathingX, FACE_SQUASH_Y * breathingY);
  const lightingTransform=ctx.getTransform();
  const pull = Math.hypot(facePullX,facePullY);
  const pullAngle = pull ? Math.atan2(facePullY,facePullX) : 0;
  // Stretch the whole head, so the ears and features follow the pulled face.
  if (pull) {
    ctx.translate(facePullX*r*.12,facePullY*r*.12); ctx.rotate(pullAngle);
    ctx.scale(1+pull*.18,1-pull*.05); ctx.rotate(-pullAngle);
  }
  drawFaceBody(r, pull, pullAngle, lightingTransform);
  const earSize = r*.28*1.2;
  const expression=feedingExpression();
  const earWiggle=expression.joy*(expression.chew*.025*expression.side+.015*Math.sin((t-feedStartedAt)*7));
  drawEar(-r*EAR_OFFSET_X,-r*EAR_OFFSET_Y,earSize,-.32,ears[0],-earWiggle);
  drawEar(r*EAR_OFFSET_X,-r*EAR_OFFSET_Y,earSize,.32,ears[1],earWiggle);
  const faceDeforming = interaction?.type==='face' || pull>.002 || Math.hypot(faceVelocityX,faceVelocityY)>.015;
  const hurt = t < painUntil || faceDeforming;
  const lookX = Math.max(-1, Math.min(1, (pointerX-cx)/(r*1.2))), lookY = Math.max(-1, Math.min(1, (pointerY-cy)/(r*1.2)));
  drawFaceFeatures(r,hurt,lookX,lookY,expression);
  ctx.restore();
  drawJoySparkles(cx,cy,r,expression);
  fish.forEach(drawFish);
}
// Soft ground and colored atmospheric halo.
function drawHalo(cx, cy, r) {
  const halo=ctx.createRadialGradient(cx,cy,r*.1,cx,cy,r*1.55);
  halo.addColorStop(0,'rgba(255,116,45,.22)');
  halo.addColorStop(.52,'rgba(255,161,72,.09)');
  halo.addColorStop(1,'rgba(255,161,72,0)');
  ctx.fillStyle=halo; ctx.fillRect(cx-r*1.6,cy-r*1.6,r*3.2,r*3.2);
}
// Expects the context centered on the face; leaves the transform as it found it.
function drawFaceBody(r, pull, pullAngle, lightingTransform) {
  ctx.save();
  ctx.rotate(pullAngle); traceSlimeFace(r,pull); ctx.rotate(-pullAngle);
  // Keep the light near its resting position, independent of pull direction.
  // The path retains its deformation while the gradient follows only breathing.
  ctx.save(); ctx.setTransform(lightingTransform);
  const glow=ctx.createRadialGradient(-r*.25,-r*.35,r*.05,0,0,r);
  glow.addColorStop(0,'#fff1ce'); glow.addColorStop(.18,'#f9b56c'); glow.addColorStop(.64,'#f05a24'); glow.addColorStop(1,'#751812');
  ctx.fillStyle=glow; ctx.fill(); ctx.restore();
  ctx.clip();
  drawDots(r);
  ctx.restore();
}
function drawDots(r) {
  const ca=Math.cos(particleAngle), sa=Math.sin(particleAngle), dotSizeScale=compactLayout.matches ? .52 : 1;
  const sorted=dots.map(p=>({x:p.x*ca-p.z*sa, y:p.y, z:p.x*sa+p.z*ca, size:p.size}));
  sorted.sort((a,b)=>a.z-b.z);
  for (const p of sorted) {
    const scale=.72+p.z*.28, x=p.x*r*scale, y=p.y*r*scale;
    const light=Math.max(0, p.z*.55 - p.y*.2 + .42);
    ctx.fillStyle=`rgba(255,${Math.round(75+150*light)},${Math.round(32+100*light)},${.22+light*.65})`;
    ctx.beginPath(); ctx.arc(x,y,p.size*(.5+scale)*dotSizeScale,0,7); ctx.fill();
  }
}
function drawEar(x, y, s, direction, ear, expressionBend=0) {
  const bend = (ear.bend + expressionBend) * s, stretch = 1 + ear.stretch;
  // Gently narrow the sides under tension, while keeping the root anchored.
  const waist=.12*Math.tanh(Math.hypot(Math.max(0,ear.stretch),ear.bend*.5)*2);
  ctx.save(); ctx.translate(x, y + s*.5); ctx.transform(1, 0, bend / s, 1, 0, 0); ctx.scale(1, stretch);
  const tipX = direction*s*.55;
  ctx.beginPath(); ctx.moveTo(-s, 0);
  ctx.bezierCurveTo(-s*(.9-waist),-s*.38,tipX-s*(.22-waist*.25),-s*1.42,tipX,-s*1.5);
  ctx.bezierCurveTo(tipX+s*(.22-waist*.25),-s*1.42,s*(.9-waist),-s*.38,s,0);
  ctx.quadraticCurveTo(0,s*.16,-s,0); ctx.closePath();
  const g=ctx.createLinearGradient(-s,-s,s,s); g.addColorStop(0,'#ffb06b'); g.addColorStop(.32,'#f2652a'); g.addColorStop(.7,'#c5321c'); g.addColorStop(1,'#651510'); ctx.fillStyle=g; ctx.fill();
  const innerTipX = direction*s*.5;
  ctx.beginPath(); ctx.moveTo(-s*.58,-s*.04);
  ctx.bezierCurveTo(-s*(.48-waist*.6),-s*.3,innerTipX-s*(.15-waist*.15),-s*1.08,innerTipX,-s*1.17);
  ctx.bezierCurveTo(innerTipX+s*(.15-waist*.15),-s*1.08,s*(.48-waist*.6),-s*.3,s*.55,-s*.04);
  ctx.quadraticCurveTo(0,s*.06,-s*.58,-s*.04); ctx.closePath();
  const inner=ctx.createLinearGradient(0,-s,0,s); inner.addColorStop(0,'#70201c'); inner.addColorStop(1,'#ee7040'); ctx.fillStyle=inner; ctx.fill();
  ctx.strokeStyle='rgba(255,244,221,.6)'; ctx.lineWidth=1; ctx.stroke(); ctx.restore();
}
function traceSlimeFace(r, pull) {
  const amount=Math.tanh(pull/MAX_FACE_PULL);
  ctx.beginPath();
  // Deform a periodic circle continuously, with a broad, shallow waist.
  const points=Array.from({length:128},(_,i)=>{
    const angle=i*Math.PI*2/128, x=Math.cos(angle), y=Math.sin(angle);
    const front=(x+1)*.5;
    const waist=Math.exp(-(((x-.4)/.48)**2));
    return {x:r*(x+amount*.28*front**3), y:r*y*(1-amount*.12*waist)};
  });
  const first=points[0], last=points[points.length-1];
  ctx.moveTo((last.x+first.x)*.5,(last.y+first.y)*.5);
  points.forEach((point,i)=>{
    const next=points[(i+1)%points.length];
    ctx.quadraticCurveTo(point.x,point.y,(point.x+next.x)*.5,(point.y+next.y)*.5);
  });
  ctx.closePath();
}
function spawnFish() {
  const {r,cx,cy}=geometry(), compact=compactLayout.matches, side=compact && fishCount%2 ? -1 : 1;
  fish.push({x:cx+side*r*(compact ? 1.17 : 1.35), y:cy-r*1.18,
    side, kind:fishCount++%2 ? 'saba' : 'aji', phase:Math.random()*Math.PI*2});
}
function drawFish(item) {
  const size=fishSize(geometry().r);
  ctx.save(); ctx.translate(item.x,item.y); ctx.scale(-item.side*size,size);
  ctx.rotate(Math.sin(t*3+item.phase)*.08);
  const mackerel=item.kind==='saba';
  ctx.fillStyle=mackerel ? '#577d99' : '#8dada7';
  ctx.beginPath(); ctx.moveTo(.65,0); ctx.lineTo(1.12,-.38); ctx.lineTo(.98,0);
  ctx.lineTo(1.12,.38); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(.15,-.27); ctx.lineTo(.45,-.55); ctx.lineTo(.5,-.22); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(.2,.25); ctx.lineTo(.48,.48); ctx.lineTo(.48,.2); ctx.closePath(); ctx.fill();
  const body=ctx.createLinearGradient(0,-.4,0,.42);
  body.addColorStop(0,mackerel ? '#365c83' : '#638e85');
  body.addColorStop(.48,mackerel ? '#83b2c8' : '#b1c8ae');
  body.addColorStop(1,'#edf1dc');
  ctx.fillStyle=body; ctx.beginPath(); ctx.moveTo(-1,0);
  ctx.bezierCurveTo(-.65,-.42,.35,-.43,.84,0);
  ctx.bezierCurveTo(.35,.43,-.65,.42,-1,0); ctx.fill();
  ctx.strokeStyle=mackerel ? '#385c77' : '#dedaa4'; ctx.lineWidth=.045;
  ctx.beginPath(); ctx.moveTo(-.72,.04); ctx.quadraticCurveTo(0,.13,.72,.03); ctx.stroke();
  if(mackerel){
    for(let i=-.48;i<.55;i+=.2){
      ctx.beginPath(); ctx.moveTo(i,-.31); ctx.lineTo(i+.16,-.08); ctx.stroke();
    }
  } else {
    ctx.fillStyle='#f3e3a3'; ctx.beginPath(); ctx.arc(-.47,.1,.09,0,Math.PI*2); ctx.fill();
  }
  ctx.fillStyle='#182c37'; ctx.beginPath(); ctx.arc(-.7,-.09,.075,0,Math.PI*2); ctx.fill();
  ctx.restore();
}
function smoothstep(value) {
  const x=Math.max(0,Math.min(1,value));
  return x*x*(3-2*x);
}
function feedingExpression() {
  const elapsed=t-feedStartedAt;
  if(elapsed<0 || t>=happyUntil) return {joy:0,chew:0,side:0};
  const joy=smoothstep(elapsed/.28)*smoothstep((happyUntil-t)/.55);
  const chew=smoothstep((elapsed-.12)/.2)*smoothstep((chewUntil-t)/.24);
  return {joy,chew,side:Math.sin(elapsed*16)};
}
function drawFaceFeatures(r, hurt, lookX, lookY, expression) {
  const {joy}=expression;
  for(const x of [-.3,.3]){
    if(hurt){
      ctx.beginPath();ctx.moveTo((x-.065)*r,-.11*r);ctx.lineTo((x+.065)*r,.01*r);
      ctx.moveTo((x+.065)*r,-.11*r);ctx.lineTo((x-.065)*r,.01*r);
      ctx.lineWidth=2.4;ctx.strokeStyle='#261514';ctx.stroke();
      continue;
    }
    ctx.globalAlpha=1-joy;
    ctx.fillStyle='#fff0c7';ctx.beginPath();ctx.ellipse(x*r,-.06*r,r*.09,r*.108,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#261514';ctx.beginPath();ctx.ellipse((x+lookX*.035)*r,(-.06+lookY*.035)*r,r*.042,r*.06,0,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=joy;
    ctx.beginPath();ctx.moveTo((x-.09)*r,-.018*r);
    ctx.bezierCurveTo((x-.065)*r,-.13*r,(x+.05)*r,-.13*r,(x+.09)*r,-.018*r);
    ctx.lineWidth=Math.max(2,r*.011);ctx.lineCap='round';ctx.strokeStyle='#261514';ctx.stroke();
    ctx.beginPath();ctx.moveTo((x+.075)*r,-.035*r);
    ctx.lineTo((x+.105)*r,-.055*r);ctx.lineWidth=Math.max(1.5,r*.006);ctx.stroke();
    ctx.globalAlpha=1;
  }
  ctx.fillStyle='#fff0c7';ctx.beginPath();ctx.moveTo(0,.1*r);
  ctx.lineTo(-.045*r,.055*r);ctx.lineTo(.045*r,.055*r);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#3f1b17';ctx.lineWidth=1.2;
  for(const direction of [-1,1]){
    for(let q=-.05;q<.12;q+=.08){
      ctx.beginPath();ctx.moveTo(direction*.06*r,.11*r);
      ctx.lineTo(direction*(.62+joy*.015)*r,(q+.08)*r);ctx.stroke();
    }
  }
}
function drawJoySparkles(cx, cy, r, expression) {
  if(expression.joy<=0) return;
  const positions=[[-1.16,-.55,1],[1.18,-.52,.8],[-1.23,.24,.65],[1.23,.28,1.1],[-.9,.91,.7],[.96,.87,.85]];
  positions.forEach(([px,py,scale],i)=>{
    const twinkle=.74+.26*Math.sin((t-feedStartedAt)*6+i*1.7);
    const alpha=expression.joy*twinkle;
    const size=r*.055*scale*(.9+.12*Math.sin((t-feedStartedAt)*5+i));
    const x=cx+px*r, y=cy+py*r;
    const glow=ctx.createRadialGradient(x,y,0,x,y,size*2.8);
    glow.addColorStop(0,`rgba(255,234,164,${alpha*.38})`);
    glow.addColorStop(1,'rgba(255,234,164,0)');
    ctx.fillStyle=glow;ctx.beginPath();ctx.arc(x,y,size*2.8,0,Math.PI*2);ctx.fill();
    ctx.save();ctx.translate(x,y);ctx.rotate(i*.33);
    ctx.globalAlpha=alpha;ctx.fillStyle=i%2 ? '#fff0c7' : '#ffce7a';
    ctx.beginPath();ctx.moveTo(0,-size);
    ctx.quadraticCurveTo(size*.19,-size*.2,size,0);
    ctx.quadraticCurveTo(size*.19,size*.2,0,size);
    ctx.quadraticCurveTo(-size*.19,size*.2,-size,0);
    ctx.quadraticCurveTo(-size*.19,-size*.2,0,-size);
    ctx.fill();ctx.restore();
  });
}

// ---- pointer interaction ----

function pointerPosition(e) {
  const rect=canvas.getBoundingClientRect();
  return { x:e.clientX-rect.left, y:e.clientY-rect.top };
}
function hitTest(x, y) {
  for(let i=fish.length-1;i>=0;i--){
    const item=fish[i], size=fishSize(geometry().r);
    if(Math.hypot((x-item.x)/1.2,y-item.y)<Math.max(24,size)) return {type:'fish',item};
  }
  const {r,cx,cy}=geometry(), localX=x-cx, localY=(y-cy)/FACE_SQUASH_Y;
  const inEarBand=localY > -r*1.35 && localY < -r*.64;
  if(inEarBand && Math.abs(localX+r*EAR_OFFSET_X)<r*.4) return {type:'ear', index:0};
  if(inEarBand && Math.abs(localX-r*EAR_OFFSET_X)<r*.4) return {type:'ear', index:1};
  if(Math.hypot(localX,localY)<r*FACE_HIT_RADIUS) return {type:'face'};
  return null;
}
function startInteraction(e) {
  const {x,y}=pointerPosition(e);
  interaction=hitTest(x,y); dragging=Boolean(interaction); lastX=x; lastY=y;
  if(!dragging) return;
  if(interaction.type==='ear'){
    const ear=ears[interaction.index];
    ear.stretchVelocity=0; ear.bendVelocity=0;
  } else if(interaction.type==='face'){
    faceVelocityX=0; faceVelocityY=0;
  }
  e.currentTarget.classList.add('is-dragging');
  e.currentTarget.setPointerCapture(e.pointerId);
}
function moveInteraction(e) {
  const {x,y}=pointerPosition(e); pointerX=x; pointerY=y;
  if(!dragging) return;
  const dx=x-lastX, dy=y-lastY; lastX=x; lastY=y;
  if(interaction?.type==='ear'){
    const ear=ears[interaction.index];
    ear.stretch=Math.max(-.35,Math.min(.7,ear.stretch-dy*.008));
    ear.bend=Math.max(-.7,Math.min(.7,ear.bend-dx*.012));
    if(Math.abs(ear.stretch)>.38||Math.abs(ear.bend)>.45) painUntil=t+.65;
  } else if(interaction?.type==='face'){
    const r=geometry().r;
    facePullX+=dx/r; facePullY+=dy/r;
    const pull=Math.hypot(facePullX,facePullY);
    if(pull>MAX_FACE_PULL){ facePullX*=MAX_FACE_PULL/pull; facePullY*=MAX_FACE_PULL/pull; }
    faceVelocityX=Math.max(-4,Math.min(4,dx/r*18));
    faceVelocityY=Math.max(-4,Math.min(4,dy/r*18));
  } else if(interaction?.type==='fish'){
    interaction.item.x+=dx; interaction.item.y+=dy;
  }
}
// A cancelled gesture (e.g. the browser took over to scroll) never counts as feeding.
function endInteraction(e) {
  if(interaction?.type==='fish' && e.type!=='pointercancel'){
    const item=interaction.item, {r,cx,cy}=geometry();
    if(Math.hypot(item.x-cx,(item.y-cy)/FACE_SQUASH_Y)<r*FEED_RADIUS){
      fish.splice(fish.indexOf(item),1);
      feedStartedAt=t; chewUntil=t+1.55; happyUntil=t+3.9;
    }
  }
  interaction=null; dragging=false;
  canvas.classList.remove('is-dragging'); catDragZone.classList.remove('is-dragging');
}
