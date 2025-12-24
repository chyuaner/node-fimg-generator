export class DropdownSelect extends HTMLElement {
  connectedCallback() {
    // Enable Custom UI by adding class
    this.classList.add('is-js');

    const nativeSelect = this.querySelector('.native-select') as unknown as HTMLSelectElement;
    const label = this.querySelector('.selected-label') as HTMLElement;
    const selectedImg = this.querySelector('.selected-img') as HTMLImageElement;
    const buttons = this.querySelectorAll('ul button') as NodeListOf<HTMLButtonElement>;

    if (!nativeSelect) return;

    const updateUI = (val: string) => {
      const match = Array.from(buttons).find(b => b.dataset.value === val);
      buttons.forEach(b => b.classList.remove('menu-active'));
      if (match) {
        match.classList.add('menu-active');
        if (label) label.textContent = match.dataset.label || '';

        const optionImg = match.querySelector('.option-img') as HTMLImageElement;
        if (selectedImg) {
          if (optionImg && optionImg.src) {
            selectedImg.src = optionImg.src;
            selectedImg.classList.remove('hidden');
          } else {
            selectedImg.classList.add('hidden');
            selectedImg.src = '';
          }
        }
      } else if (!val && label) {
         label.textContent = this.getAttribute('data-placeholder') || 'Select option...';
         if (selectedImg) selectedImg.classList.add('hidden');
      }
    };

    // Handle item selection - use a shared handler
    const handleButtonClick = (e: MouseEvent) => {
      e.preventDefault();
      const btn = e.currentTarget as HTMLButtonElement;
      const val = btn.dataset.value || '';

      if (nativeSelect.value !== val) {
        nativeSelect.value = val;
        updateUI(val);
        // Dispatch events on the REAL select so form listeners react
        nativeSelect.dispatchEvent(new Event('input', { bubbles: true }));
        nativeSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // Close dropdown via blur
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    };

    buttons.forEach(btn => {
      // Remove old listener if re-connecting
      btn.removeEventListener('click', handleButtonClick as any);
      btn.addEventListener('click', handleButtonClick as any);
    });

    // Handle programmatic changes to the native select
    nativeSelect.onchange = () => {
       updateUI(nativeSelect.value);
    };

    // Initial sync
    updateUI(nativeSelect.value);
  }
}

if (!customElements.get('dropdown-select')) {
  customElements.define('dropdown-select', DropdownSelect);
}
