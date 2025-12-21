import { PUBLIC_BASE_URL } from 'astro:env/client';

export function initGenerator() {
    const form = document.getElementById('generator-form') as HTMLFormElement | null;
    if (!form) return;

    // Configuration & Defaults
    const CONFIG = {
        debounceDelay: 1000,
        defaults: {
            alpha: '255',
            scale: '1',
            shadow: '',
            radius: '',
            padding: '',
            canvasWidth: '',
            canvasHeight: '',
            blockWidth: '300',
            blockHeight: '',
            embedAlt: 'Image'
        }
    };

    // Helper to get element by ID with type safety
    function getEl<T extends HTMLElement>(id: string): T | null {
        return document.getElementById(id) as T | null;
    }

    function getInputs(containerId: string): NodeListOf<HTMLInputElement | HTMLSelectElement> {
        const container = getEl(containerId);
        return container ? container.querySelectorAll('input, select') : document.querySelectorAll('should-not-match');
    }

    const sections = {
        canvasSize: {
            toggle: getEl<HTMLInputElement>('toggle-canvas-size'),
            content: getEl<HTMLElement>('content-canvas-size'),
            inputs: getInputs('content-canvas-size')
        },
        edgeBg: {
            toggle: getEl<HTMLInputElement>('toggle-edge-bg'),
            content: getEl<HTMLElement>('content-edge-bg'),
            inputs: getInputs('content-edge-bg')
        },
        blockSize: {
            fieldset: getEl<HTMLFieldSetElement>('block-size-fieldset'),
            inputs: getEl<HTMLFieldSetElement>('block-size-fieldset')?.querySelectorAll('input')
        }
    };

    const previewImage = getEl<HTMLImageElement>('preview-image');
    const previewLoading = getEl<HTMLElement>('preview-loading');
    const previewUrlDisplay = getEl<HTMLElement>('preview-url-display');
    const eurlContent = getEl<HTMLElement>('eurl-content');
    const embedHtml = getEl<HTMLElement>('embed-html');
    const embedMarkdown = getEl<HTMLElement>('embed-markdown');
    const downloadLinks = {
        svg: getEl<HTMLAnchorElement>('download-svg'),
        png: getEl<HTMLAnchorElement>('download-png'),
        ico: getEl<HTMLAnchorElement>('download-ico')
    };

    function updateUIState() {
        if (sections.canvasSize.toggle && sections.canvasSize.content) {
            const isCanvasSizeEnabled = sections.canvasSize.toggle.checked;
            sections.canvasSize.content.style.display = isCanvasSizeEnabled ? 'block' : 'none';

            let hasCanvasValues = false;
            if (isCanvasSizeEnabled) {
                const w = (form?.elements.namedItem('canvas_width') as HTMLInputElement)?.value || CONFIG.defaults.canvasWidth;
                const h = (form?.elements.namedItem('canvas_height') as HTMLInputElement)?.value || CONFIG.defaults.canvasHeight;
                if (w || h) hasCanvasValues = true;
            }

            if (sections.blockSize.fieldset && sections.blockSize.inputs) {
                const shouldDisableBlockSize = isCanvasSizeEnabled && hasCanvasValues;
                sections.blockSize.fieldset.disabled = shouldDisableBlockSize;
                sections.blockSize.fieldset.style.opacity = shouldDisableBlockSize ? '0.5' : '1';

                if (!shouldDisableBlockSize && sections.blockSize.fieldset.disabled) {
                     sections.blockSize.fieldset.disabled = false;
                }
            }
        }

        if (sections.edgeBg.toggle && sections.edgeBg.content) {
            const isEdgeBgEnabled = sections.edgeBg.toggle.checked;
            sections.edgeBg.content.style.display = isEdgeBgEnabled ? 'block' : 'none';
        }
    }

    function generateURL() {
        if (!form) return;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        let urlParts: string[] = [];

        const getColor = (prefix: string) => {
            const hex = (data[`${prefix}_hex`] as string)?.trim();
            const alpha = data[`${prefix}_alpha`] as string;
            if (!hex) return '';
            if (alpha && alpha !== CONFIG.defaults.alpha) return `${hex},${alpha}`;
            return hex;
        };

        const processSegments = (items: {value: string, title: string}[]) => {
            let end = items.length - 1;
            while (end >= 0 && !items[end].value) {
                end--;
            }
            if (end < 0) return [];

            const result = [];
            for (let i = 0; i <= end; i++) {
                const item = items[i];
                if (item.value) {
                    result.push(item);
                } else {
                    result.push({ value: 'null', title: item.title });
                }
            }
            return result;
        };

        // 1. Canvas Size
        let canvasHtml = '';
        const isCanvasSizeEnabled = sections.canvasSize.toggle?.checked;
        const canvasW = ((data.canvas_width as string) || CONFIG.defaults.canvasWidth)?.trim();
        const canvasH = ((data.canvas_height as string) || CONFIG.defaults.canvasHeight)?.trim();
        const hasCanvasValues = canvasW || canvasH;

        if (isCanvasSizeEnabled && hasCanvasValues) {
            let val = '';
            if (canvasW && canvasH) {
                 val = `${canvasW}x${canvasH}`;
            } else if (canvasW) {
                 val = canvasW;
            } else if (canvasH) {
                 val = canvasH;
            }

            if (val) {
                 urlParts.push(val);
                 canvasHtml = `<span class="eurl-group hover:bg-indigo-600/30 inline">/<span class="eurl-part" data-url-ptitle="Canvas Size">${val}</span></span>`;
            }
        }

        // 2. Edge Background
        let edgeBgHtml = '';
        const isEdgeBgEnabled = sections.edgeBg.toggle?.checked;
        if (isEdgeBgEnabled) {
             const pw = ((data.bg_padding_w as string) || CONFIG.defaults.padding)?.trim();
             const ph = ((data.bg_padding_h as string) || '')?.trim();
             let padding = '';

             if (pw && ph) {
                 padding = (pw === ph) ? pw : `${pw}x${ph}`;
             } else if (pw) {
                 padding = pw;
             } else if (ph) {
                 padding = `0x${ph}`;
             }

             const shadow = (data.bg_shadow === CONFIG.defaults.shadow || data.bg_shadow === '') ? '' : data.bg_shadow as string;
             const radius = (data.bg_radius === CONFIG.defaults.radius || data.bg_radius === '') ? '' : data.bg_radius as string;

             let color = '';
             if (data.bg_type === 'color') color = getColor('bg_color');
             else if (data.bg_type === 'tpl' && data.bg_tpl) color = `tpl(${data.bg_tpl})`;

             const segments = [
                 { value: padding, title: 'Padding' },
                 { value: shadow, title: 'Shadow' },
                 { value: radius, title: 'Radius' },
                 { value: color, title: 'Color' }
             ];

             const processed = processSegments(segments);

             if (processed.length > 0) {
                 urlParts.push('bg');
                 processed.forEach(p => urlParts.push(p.value));

                 edgeBgHtml = `<span class="eurl-group hover:bg-cyan-600/30">/bg`;
                 processed.forEach(p => {
                     edgeBgHtml += `/<span class="eurl-part" data-url-ptitle="${p.title}">${p.value}</span>`;
                 });
                 edgeBgHtml += `</span>`;
             }
        }

        // 3. Main Content (Placeholder)
        let phHtml = '';
        const phSegments: {value: string, title: string}[] = [];

        if (!(isCanvasSizeEnabled && hasCanvasValues)) {
            const w = ((data.ph_width as string) || CONFIG.defaults.blockWidth)?.trim();
            const h = ((data.ph_height as string) || CONFIG.defaults.blockHeight)?.trim();
            let val = '';

            if (w && h) val = `${w}x${h}`;
            else if (w) val = w;
            else if (h) val = h;

            phSegments.push({ value: val, title: 'Block Size' });
        }

        let phBg = '';
        if (data.ph_bg_type === 'color') phBg = getColor('ph_bg_color');
        else if (data.ph_bg_type === 'tpl' && data.ph_bg_tpl) phBg = `tpl(${data.ph_bg_tpl})`;
        
        phSegments.push({ value: phBg, title: 'bgcolor' });

        let phFg = '';
        if (data.ph_fg_type === 'color') phFg = getColor('ph_fg_color');
        phSegments.push({ value: phFg, title: 'fgcolor' });

        const processedPh = processSegments(phSegments);

        urlParts.push('ph');
        processedPh.forEach(p => urlParts.push(p.value));

        phHtml = `<span class="eurl-group hover:bg-yellow-600/30">/ph`;
        processedPh.forEach(p => {
            phHtml += `/<span class="eurl-part" data-url-ptitle="${p.title}">${p.value}</span>`;
        });

        const params = new URLSearchParams();
        if (data.text) params.append('text', data.text as string);
        if (data.font) params.append('font', data.font as string);
        if (data.scale && data.scale !== CONFIG.defaults.scale) params.append('scale', data.scale as string);
        if (data.debug) params.append('debug', '1');

        let filetype = data.filetype as string;
        if (filetype && filetype !== 'null') {
             params.append('filetype', filetype);
        }

        const queryString = params.toString();
        if (queryString) {
            phHtml += `/?<span class="eurl-part">${queryString.replace(/&/g, '&<wbr>')}</span>`;
        }
        phHtml += `</span>`;

        const fullPath = "/" + urlParts.join("/") + (queryString ? `/?${queryString}` : "");
        const fullUrl = `${PUBLIC_BASE_URL}${fullPath}`;

        if (eurlContent) {
           let html = '';
           html += canvasHtml;
           html += edgeBgHtml;
           html += phHtml;
           eurlContent.innerHTML = html;
        }

        const previewParams = new URLSearchParams(params);
        previewParams.set('filetype', 'svg');
        const previewUrl = `/${urlParts.join("/")}/?${previewParams.toString()}`;

        if (previewImage) {
            if (previewImage.src !== previewUrl) {
                previewLoading?.classList.remove('hidden');
                previewImage.src = previewUrl;
            }
        }
        if (previewUrlDisplay) previewUrlDisplay.textContent = fullUrl;

        if (embedHtml) embedHtml.innerText = `<img src="${fullUrl}">`;
        if (embedMarkdown) embedMarkdown.innerText = `![${data.text || CONFIG.defaults.embedAlt}](${fullUrl})`;

        if (downloadLinks.svg) downloadLinks.svg.href = fullPath.replace(/filetype=[^&]+/, 'filetype=svg').replace(/\?$/, '') + (fullPath.includes('?') ? '&' : '?') + 'filetype=svg';
        if (downloadLinks.png) downloadLinks.png.href = fullPath.replace(/filetype=[^&]+/, 'filetype=png').replace(/\?$/, '') + (fullPath.includes('?') ? '&' : '?') + 'filetype=png';
        if (downloadLinks.ico) downloadLinks.ico.href = fullPath.replace(/filetype=[^&]+/, 'filetype=ico').replace(/\?$/, '') + (fullPath.includes('?') ? '&' : '?') + 'filetype=ico';
    }

    if (previewImage) {
        previewImage.addEventListener('load', () => {
            previewLoading?.classList.add('hidden');
        });
        previewImage.addEventListener('error', () => {
            previewLoading?.classList.add('hidden');
        });
    }

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    function runPending() {
       if (debounceTimer) {
           clearTimeout(debounceTimer);
           debounceTimer = null;
       }
       generateURL();
    }

    function scheduleRun() {
       if (debounceTimer) clearTimeout(debounceTimer);
       debounceTimer = setTimeout(() => {
           generateURL();
           debounceTimer = null;
       }, CONFIG.debounceDelay);
    }

    const showLoader = () => previewLoading?.classList.remove('hidden');
    form.addEventListener('change', () => {
        showLoader();
        runPending();
    });
    form.addEventListener('input', () => {
        showLoader();
        scheduleRun();
        updateUIState();
    });

    if (sections.canvasSize.toggle) {
        sections.canvasSize.toggle.addEventListener('change', () => {
            updateUIState();
            runPending();
        });
    }

    if (sections.edgeBg.toggle) {
        sections.edgeBg.toggle.addEventListener('change', () => {
            updateUIState();
            runPending();
        });
    }

    function applyDefaultsToForm() {
        if (!form) return;
        const mapping: Record<string, string> = {
            'canvas_width': CONFIG.defaults.canvasWidth,
            'canvas_height': CONFIG.defaults.canvasHeight,
            'ph_width': CONFIG.defaults.blockWidth,
            'ph_height': CONFIG.defaults.blockHeight,
            'bg_padding_w': CONFIG.defaults.padding,
            'bg_shadow': CONFIG.defaults.shadow,
            'bg_radius': CONFIG.defaults.radius,
            'scale': CONFIG.defaults.scale,
            'bg_color_alpha': CONFIG.defaults.alpha,
            'ph_bg_color_alpha': CONFIG.defaults.alpha,
            'ph_fg_color_alpha': CONFIG.defaults.alpha
        };

        for (const [name, val] of Object.entries(mapping)) {
            const input = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement;
            if (input && val !== undefined && val !== '') {
                input.value = val;
                
                // Trigger change event so any custom component listeners can update their UI
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
    }

    applyDefaultsToForm();
    updateUIState();
    generateURL();
}
