export class ColorInput extends HTMLElement {
    connectedCallback() {
        const picker = this.querySelector('.color-picker') as HTMLInputElement;
        const hexInput = this.querySelector('.hex-input') as HTMLInputElement;
        const alphaInput = this.querySelector('.alpha-input') as HTMLInputElement;
        const alphaDisplay = this.querySelector('.alpha-display') as HTMLElement;

        if (!picker || !hexInput || !alphaInput || !alphaDisplay) return;

        // Sync Picker -> Hex
        const onPickerInput = () => {
            hexInput.value = picker.value.replace('#', '');
            hexInput.dispatchEvent(new Event('input', { bubbles: true }));
        };
        picker.removeEventListener('input', onPickerInput);
        picker.addEventListener('input', onPickerInput);

        // Sync Hex -> Picker
        const onHexInput = () => {
            let val = hexInput.value;
            if (!val.startsWith('#')) val = '#' + val;
            if (/^#[0-9A-F]{6}$/i.test(val)) {
                picker.value = val;
            }
        };
        hexInput.removeEventListener('input', onHexInput);
        hexInput.addEventListener('input', onHexInput);

        // Update Alpha Display
        const updateAlpha = () => {
            const val = parseInt(alphaInput.value || '255');
            alphaDisplay.textContent = `${Math.round((val / 255) * 100)}%`;
        };
        alphaInput.removeEventListener('input', updateAlpha);
        alphaInput.addEventListener('input', updateAlpha);
        updateAlpha(); // Init
    }
}

if (!customElements.get('color-input')) {
    customElements.define('color-input', ColorInput);
}
