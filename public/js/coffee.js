// Coffee cup that tips over and spills across the skills list, and refills on the next press.
export function initCoffee() {
  document.querySelectorAll('.coffee-button').forEach(button=>{
    const caption=button.closest('figure').querySelector('figcaption');
    button.addEventListener('click', ()=>{
      const spilled=button.classList.toggle('is-spilled');
      button.setAttribute('aria-pressed', String(spilled));
      button.setAttribute('aria-label', spilled ? 'こぼれたコーヒーカップ（押すと元に戻ります）' : 'コーヒーカップ（押すと倒れます）');
      caption.textContent=spilled ? 'OOPS! CLICK TO REFILL' : 'COFFEE BREAK';
    });
  });
}
