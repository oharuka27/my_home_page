// Touch feedback for the hero links: the tapped look is released as soon as the finger lifts.
export function initHeroNav() {
  document.querySelectorAll('.hero-nav a').forEach(link=>{
    // Only touch taps are released and blurred; keyboard activation keeps focus on the link.
    let touchTap=false;
    link.addEventListener('pointerdown', e=>{
      touchTap=e.pointerType==='touch';
      if(touchTap) link.classList.add('is-tapped');
    });
    const releaseTap=()=>{ link.classList.remove('is-tapped'); link.blur(); };
    link.addEventListener('pointerup', ()=>{ if(touchTap) releaseTap(); });
    link.addEventListener('pointercancel', ()=>{ if(touchTap){ touchTap=false; releaseTap(); } });
    link.addEventListener('click', ()=>{ if(touchTap){ touchTap=false; setTimeout(releaseTap, 0); } });
  });
}
