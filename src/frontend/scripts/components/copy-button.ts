export class CopyButton extends HTMLElement {
  connectedCallback() {
    const button = this.querySelector('a');
    const toast = this.querySelector('.toast');
    const textToCopy = this.getAttribute('data-text') || '';
    
    if (!button || !toast) return;
    
    // Cleanup previous listener
    button.onclick = async (e) => {
      e.preventDefault();
      
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(textToCopy);
        } else {
          const textArea = document.createElement('textarea');
          textArea.value = textToCopy;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          textArea.style.top = '-999999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          try {
            document.execCommand('copy');
          } catch (err) {
            console.error('複製失敗:', err);
          }
          document.body.removeChild(textArea);
        }
        
        toast.classList.remove('opacity-0', 'pointer-events-none');
        toast.classList.add('opacity-100');
        
        setTimeout(() => {
          toast.classList.remove('opacity-100');
          toast.classList.add('opacity-0', 'pointer-events-none');
        }, 1500);
      } catch (err) {
        console.error('複製失敗:', err);
        alert('複製失敗，請手動複製');
      }
    };
  }
}

if (!customElements.get('copy-button')) {
  customElements.define('copy-button', CopyButton);
}
