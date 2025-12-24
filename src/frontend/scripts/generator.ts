import { PUBLIC_BASE_URL } from 'astro:env/client';
import { splitUrl } from '../../core/utils/splitUrl';

export function genEurl(result: {
        canvas: string | null;
        bg: {
            parts: (string | null)[];
            padding?: string | null;
            shadow?: string | null;
            radius?: string | null;
            bgcolor?: string | null;
        };
        content: {
            type: string | null;
            parts: (string | null)[];
            size?: string | null;
            bgcolor?: string | null;
            fgcolor?: string | null;
        };
        query: Record<string, string>;
    },
    baseUrl = PUBLIC_BASE_URL
): string {

    // ------------------------------------------------------------
    // 1. canvasGroup（若有 canvas） → 顏色 indigo、class inline
    // ------------------------------------------------------------
    const canvasGroup = result.canvas
        ? `<span class="eurl-group hover:bg-indigo-600/30 inline">/` +
        `<span class="eurl-part" data-url-ptitle="Canvas Size">${result.canvas}</span>` +
        `</span>`
        : '';

    // ------------------------------------------------------------
    // 2. bgGroup
    // ------------------------------------------------------------
    const bgTitles: Record<string, string> = {
        padding: 'Padding',
        shadow: 'Shadow',
        radius: 'Radius',
        bgcolor: 'Color',
    };
    const bgGroup = result.bg &&
        (result.bg.padding ||
            result.bg.shadow ||
            result.bg.radius ||
            result.bg.bgcolor)
        ? `<span class="eurl-group hover:bg-cyan-600/30">/bg/` +
        [
            result.bg.padding,
            result.bg.shadow,
            result.bg.radius,
            result.bg.bgcolor,
        ]
            .filter(Boolean)
            .map((v, i) => {
                const key = Object.keys(bgTitles)[i];
                return `<span class="eurl-part" data-url-ptitle="${bgTitles[key]}">${v}</span>`;
            })
            .join('/') +
        `/</span>`
        : '';

    // ------------------------------------------------------------
    // 3. contentGroup（目前僅支援 ph） → 顏色 yellow
    // ------------------------------------------------------------
    const contentType = result.content.type;
    let contentGroup = '';
    if (contentType) {
        const contentTitles: Record<string, string> = {
            size: 'Block Size',
            bgcolor: 'bgcolor',
            fgcolor: 'fgcolor',
        };

        const partsMap: Record<string, string | null> = {
            size: result.content.size,
            bgcolor: result.content.bgcolor,
            fgcolor: result.content.fgcolor,
        };

        const partsHtml = Object.entries(partsMap)
            .filter(([, v]) => v != null)
            .map(([k, v]) => {
                const title = (contentTitles as any)[k] ?? k;
                return `<span class="eurl-part" data-url-ptitle="${title}">${v}</span>`;
            })
            .join('/');

        const queryStr = new URLSearchParams(result.query).toString();
        const queryHtml = queryStr
            ? `/?<span class="eurl-part">${queryStr.replace(/&/g, '&amp;<wbr>')}</span>`
            : '';

        contentGroup = `<span class="eurl-group hover:bg-yellow-600/30">/${contentType}/${partsHtml}${queryHtml}</span>`;
    }

    // ------------------------------------------------------------
    // 4. 合併所有片段
    // ------------------------------------------------------------
    return `
    <span class="eurl-base" data-astro-cid-dfafzuvk="">
    <span class="eurl-group" data-astro-cid-dfafzuvk="">${baseUrl}</span>
    </span>
    <span class="eurl-content" id="eurl-content" data-astro-cid-dfafzuvk="">
    ${canvasGroup}${bgGroup}${contentGroup}
    </span>`.trim();
}


export function initGenerator() {
    const form = document.getElementById('generator-form') as HTMLFormElement | null;
    if (!form) return;

    // Configuration & Defaults
    const configData = form.dataset.config;
    const CONFIG = configData ? JSON.parse(configData) : {
        debounceDelay: 1000,
        defaults: {
            default_alpha: '255',
            default_scale: '1',
            bg_shadow: '',
            bg_radius: '',
            bg_padding: '',
            canvas_width: '',
            canvas_height: '',
            ph_width: '300',
            ph_height: '',
            embed_alt: 'Image'
        }
    };

    function isIOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
               (navigator.userAgent.includes('Mac') && navigator.maxTouchPoints > 1);
    }

    const forcePngPreview = isIOS();

    // Helper to get element by ID with type safety
    function getEl<T extends HTMLElement>(id: string): T | null {
        return document.getElementById(id) as T | null;
    }

    function getInputs(containerId: string): NodeListOf<HTMLInputElement | HTMLSelectElement> {
        const container = getEl(containerId);
        return (container
            ? container.querySelectorAll('input, select')
            : document.querySelectorAll('should-not-match')) as unknown as NodeListOf<HTMLInputElement | HTMLSelectElement>;
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

    // Dynamic Sticky Top Calculation
    const eurlSticky = getEl<HTMLElement>('eurl-sticky');
    const previewSticky = getEl<HTMLElement>('preview-sticky-container');

    if (eurlSticky && previewSticky) {
        const updateStickyTop = () => {
            const height = eurlSticky.offsetHeight;
            // Add a small gap (8px) for better visual spacing, or just use height
            previewSticky.style.top = `${height + 12}px`;
        };

        const resizeObserver = new ResizeObserver(() => {
            updateStickyTop();
        });

        resizeObserver.observe(eurlSticky);
        updateStickyTop(); // Initial call
    }

    function updateUIState() {
        if (sections.canvasSize.toggle && sections.canvasSize.content) {
            const isCanvasSizeEnabled = sections.canvasSize.toggle.checked;
            sections.canvasSize.content.classList.toggle('is-open', isCanvasSizeEnabled);

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
            sections.edgeBg.content.classList.toggle('is-open', isEdgeBgEnabled);
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
            if (alpha && alpha !== '255') return `${hex},${alpha}`;
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
        const canvasW = ((data.canvas_width as string) || CONFIG.defaults.canvas_width)?.trim();
        const canvasH = ((data.canvas_height as string) || CONFIG.defaults.canvas_height)?.trim();
        const isCanvasSizeEnabled = sections.canvasSize.toggle?.checked && (canvasW || canvasH);

        if (isCanvasSizeEnabled) {
            let val = '';
            if (canvasW && canvasH) val = `${canvasW}x${canvasH}`;
            else if (canvasW) val = canvasW;
            else if (canvasH) val = canvasH;

            if (val) {
                urlParts.push(val);
                canvasHtml = `<span class="eurl-group hover:bg-indigo-600/30 inline">/<span class="eurl-part" data-url-ptitle="Canvas Size">${val}</span></span>`;
            }
        }

        // 2. Edge Background
        let edgeBgHtml = '';
        if (sections.edgeBg.toggle?.checked) {
            const pw = ((data.bg_padding_w as string) || CONFIG.defaults.padding)?.trim();
            const ph = ((data.bg_padding_h as string) || '')?.trim();
            let padding = '';

            if (pw && ph) padding = (pw === ph) ? pw : `${pw}x${ph}`;
            else if (pw) padding = pw;
            else if (ph) padding = `0x${ph}`;

            const shadow = (data.bg_shadow === CONFIG.defaults.bgShadow || data.bg_shadow === '') ? '' : data.bg_shadow as string;
            const radius = (data.bg_radius === CONFIG.defaults.radius || data.bg_radius === '') ? '' : data.bg_radius as string;

            let color = '';
            if (data.bg_type === 'color') color = getColor('bg_color');
            else if (data.bg_type === 'tpl' && data.bg_tpl) color = `tpl(${data.bg_tpl})`;

            const processed = processSegments([
                { value: padding, title: 'Padding' },
                { value: shadow, title: 'Shadow' },
                { value: radius, title: 'Radius' },
                { value: color, title: 'Color' }
            ]);

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
        const phSegments: {value: string, title: string}[] = [];
        if (!isCanvasSizeEnabled) {
            const w = ((data.ph_width as string) || CONFIG.defaults.ph_width)?.trim();
            const h = ((data.ph_height as string) || CONFIG.defaults.ph_height)?.trim();
            const val = (w && h) ? `${w}x${h}` : (w || h || '');
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
        const isPhFirst = urlParts.length === 0;

        if (!isPhFirst) {
            urlParts.push('ph');
        }
        processedPh.forEach(p => urlParts.push(p.value));

        let phHtml = `<span class="eurl-group hover:bg-yellow-600/30">${isPhFirst ? '' : '/ph'}`;
        processedPh.forEach(p => {
            phHtml += `/<span class="eurl-part" data-url-ptitle="${p.title}">${p.value}</span>`;
        });

        const params = new URLSearchParams();
        if (data.text) params.append('text', data.text as string);
        if (data.font) params.append('font', data.font as string);
        if (data.scale && data.scale !== '1') params.append('scale', data.scale as string);
        if (data.debug) params.append('debug', '1');

        const filetype = data.filetype as string;
        if (filetype && filetype !== 'null') params.append('filetype', filetype);

        const queryString = params.toString();
        if (queryString) {
            phHtml += `/?<span class="eurl-part">${queryString.replace(/&/g, '&<wbr>')}</span>`;
        }
        phHtml += `</span>`;

        const fullPath = "/" + urlParts.join("/") + (queryString ? `/?${queryString}` : "");
        const fullUrl = `${PUBLIC_BASE_URL}${fullPath}`;

        // UI Updates
        if (eurlContent) {
            eurlContent.innerHTML = canvasHtml + edgeBgHtml + phHtml;
        }

        const previewParams = new URLSearchParams(params);
        previewParams.set('filetype', forcePngPreview ? 'png' : 'svg');
        const previewUrl = `/${urlParts.join("/")}/?${previewParams.toString()}`;

        if (previewImage && previewImage.src !== previewUrl) {
            previewLoading?.classList.remove('hidden');
            previewImage.src = previewUrl;
        }
        if (previewUrlDisplay) previewUrlDisplay.textContent = fullUrl;

        if (embedHtml) embedHtml.innerText = `<img src="${fullUrl}">`;
        if (embedMarkdown) embedMarkdown.innerText = `![${data.text || CONFIG.defaults.embedAlt}](${fullUrl})`;

        const buildDownloadUrl = (type: string) => {
            const downloadParams = new URLSearchParams(params);
            downloadParams.set('filetype', type);
            return `/${urlParts.join("/")}/?${downloadParams.toString()}`;
        };

        if (downloadLinks.svg) downloadLinks.svg.href = buildDownloadUrl('svg');
        if (downloadLinks.png) downloadLinks.png.href = buildDownloadUrl('png');
        if (downloadLinks.ico) downloadLinks.ico.href = buildDownloadUrl('ico');
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
            'canvas_width': CONFIG.defaults.canvas_width,
            'canvas_height': CONFIG.defaults.canvas_height,
            'ph_width': CONFIG.defaults.ph_width,
            'ph_height': CONFIG.defaults.ph_height,
            'bg_padding_w': CONFIG.defaults.bg_padding,
            'bg_shadow': CONFIG.defaults.bg_shadow,
            'bg_radius': CONFIG.defaults.bg_radius,
            'bg_color_alpha': CONFIG.defaults.default_alpha,
            'ph_bg_color_alpha': CONFIG.defaults.default_alpha,
            'ph_fg_color_alpha': CONFIG.defaults.default_alpha,
            'scale': CONFIG.defaults.default_scale,
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

    // -------------------------------------------------------------------------
    // URL Pre-filling Logic
    // -------------------------------------------------------------------------
    const pathname = window.location.pathname;
    // Check if we are on a valid generator path with parameters (e.g. /generator/...)
    // Simple check: must start with /generator/ and have more chars
    if (pathname.startsWith('/generator/') && pathname.length > 11) {
        // Remove '/generator' prefix to get the "standard" fimg URL part
        // e.g. /generator/bg/20... -> /bg/20...
        const subPath = pathname.substring(10);

        // Use the core utility to parse it
        // We simulate the full URL for the util logic if needed, but splitUrl mostly cares about path + query
        const fullSubUrl = subPath + window.location.search;
        const parsed = splitUrl(fullSubUrl);

        // Map parsed data to form inputs
        // Helper to set value safely
        const setVal = (name: string, val: string | number | undefined | null) => {
            if (val === undefined || val === null) return;
            const input = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement;
            if (input) {
                input.value = String(val);
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
        };

        const setHexAlpha = (prefix: string, colorStr: string | null | undefined) => {
            if (!colorStr) return;
            // Expected formats: "hex" or "hex,alpha"
            const parts = colorStr.split(',');
            setVal(`${prefix}_hex`, parts[0]);
            if (parts.length > 1) {
                setVal(`${prefix}_alpha`, parts[1]);
            } else {
                setVal(`${prefix}_alpha`, '255');
            }
        };


        // 1. Canvas Size
        if (parsed.canvas) {
           const [w, h] = parsed.canvas.split('x');
           if (sections.canvasSize.toggle) {
               sections.canvasSize.toggle.checked = true;
               sections.canvasSize.toggle.dispatchEvent(new Event('change'));
           }
           setVal('canvas_width', w);
           if (h) setVal('canvas_height', h);
           else setVal('canvas_height', w); // If only one number? Usually splitUrl handles logical split?
           // Actually splitUrl returns string "300x200" or "300".
           // If "300", it might mean width=300, height=null in the final logic,
           // but here we just fill what we have.
        }

        // 2. Background (Edge)
        if (parsed.bg) {
            const hasBg = parsed.bg.parts.length > 0;
            if (hasBg && sections.edgeBg.toggle) {
                sections.edgeBg.toggle.checked = true;
                sections.edgeBg.toggle.dispatchEvent(new Event('change'));
            }

            // Padding
            if (parsed.bg.padding) {
                const [pw, ph] = parsed.bg.padding.split('x');
                setVal('bg_padding_w', pw);
                setVal('bg_padding_h', ph ?? pw);
            }
            // Shadow / Radius
            if (parsed.bg.shadow) setVal('bg_shadow', parsed.bg.shadow);
            if (parsed.bg.radius) setVal('bg_radius', parsed.bg.radius);

            // Color / Template
            // bg.bgcolor stores the *value* part (e.g. "ff0000,128" or "tpl(...) path?")
            // Wait, splitUrl's bg.bgcolor is from parts[3].
            // Let's check how splitUrl parses "bg/..."
            // It puts color into `bgcolor` field.
            if (parsed.bg.bgcolor) {
                const val = parsed.bg.bgcolor;
                if (val.startsWith('tpl(')) {
                     // handling tpl(name)
                     const tplName = val.slice(4, -1);
                     const radioTpl = form.querySelector('input[name="bg_type"][value="tpl"]') as HTMLInputElement;
                     if (radioTpl) radioTpl.checked = true;
                     setVal('bg_tpl', tplName);
                } else {
                     // handling color
                     const radioColor = form.querySelector('input[name="bg_type"][value="color"]') as HTMLInputElement;
                     if (radioColor) radioColor.checked = true;
                     setHexAlpha('bg_color', val);
                }
            }
        }

        // 3. Content (Placeholder)
        if (parsed.content) {
             // Size
             if (parsed.content.size) {
                 const [cw, ch] = parsed.content.size.split('x');
                 setVal('ph_width', cw);
                 setVal('ph_height', ch ?? cw);
             }

             // Content Bg Color
             const cBg = parsed.content.bgcolor;
             if (cBg) {
                 if (cBg.startsWith('tpl(')) {
                     const name = cBg.slice(4, -1);
                     const r = form.querySelector('input[name="ph_bg_type"][value="tpl"]') as HTMLInputElement;
                     if (r) r.checked = true;
                     setVal('ph_bg_tpl', name);
                 } else {
                     const r = form.querySelector('input[name="ph_bg_type"][value="color"]') as HTMLInputElement;
                     if (r) r.checked = true;
                     setHexAlpha('ph_bg_color', cBg);
                 }
             }

             // Content Fg Color
             const cFg = parsed.content.fgcolor;
             if (cFg) {
                 setHexAlpha('ph_fg_color', cFg);
             }
        }

        // 4. Query Params
        if (parsed.query) {
            if (parsed.query.text) setVal('text', parsed.query.text);
            if (parsed.query.font) setVal('font', parsed.query.font);
            if (parsed.query.scale) setVal('scale', parsed.query.scale);
            if (parsed.query.debug) {
                 const dbg = form.elements.namedItem('debug') as HTMLInputElement;
                 if (dbg) dbg.checked = true;
            }

            // filetype is not in parsed.query usually (splitUrl might not extract it into query object specifically if not key-value?)
            // parseUrl.ts `splitUrl` does: const query = Object.fromEntries(new URLSearchParams(rawQuery));
            // So ?filetype=png IS in parsed.query
             if (parsed.query.filetype) {
                const ft = parsed.query.filetype;
                const r = form.querySelector(`input[name="filetype"][value="${ft}"]`) as HTMLInputElement;
                if (r) r.checked = true;
            }
        }

    }

    updateUIState();
    generateURL();
}
