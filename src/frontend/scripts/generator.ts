import { PUBLIC_BASE_URL } from 'astro:env/client';
import { type SplitUrlProps, splitUrl } from '../../core/utils/splitUrl';

// --- Type Definitions for Form Elements ---
interface GeneratorElements {
    form: HTMLFormElement;
    canvasSize: {
        toggle: HTMLInputElement;
        content: HTMLElement;
    };
    edgeBg: {
        toggle: HTMLInputElement;
        content: HTMLElement;
    };
    preview: {
        image: HTMLImageElement;
        loading: HTMLElement;
        urlDisplay: HTMLElement;
        eurlContent: HTMLElement;
        embedHtml: HTMLElement;
        embedMarkdown: HTMLElement;
    };
    download: {
        svg: HTMLAnchorElement;
        png: HTMLAnchorElement;
        ico: HTMLAnchorElement;
    };
}

// --- Helper Functions ---
function getEl<T extends HTMLElement>(id: string): T | null {
    return document.getElementById(id) as T | null;
}

function getVal(form: HTMLFormElement, name: string): string {
    const el = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement;
    return el ? el.value.trim() : '';
}

function setVal(form: HTMLFormElement, name: string, value: string | null | undefined) {
    const el = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement;
    if (el) {
        el.value = value ?? '';
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

function getColor(form: HTMLFormElement, prefix: string): string | null {
    const type = getVal(form, `${prefix}_type`); // 'color', 'tpl', 'default'/'none'

    if (type === 'tpl') {
        const tpl = getVal(form, `${prefix}_tpl`);
        return tpl ? `tpl(${tpl})` : null;
    }

    if (type === 'color') {
        const hex = getVal(form, `${prefix}_color_hex`);
        const alpha = getVal(form, `${prefix}_color_alpha`);
        if (!hex) return null;
        if (alpha && alpha !== '255') return `${hex},${alpha}`;
        return hex;
    }

    return null;
}

// --- Mapping Functions ---

export function formToSplitUrlProps(form: HTMLFormElement): SplitUrlProps {
    // 1. Canvas
    const isCanvasEnabled = (getEl('toggle-canvas-size') as HTMLInputElement)?.checked ?? false;
    let canvas: string | null = null;
    if (isCanvasEnabled) {
        const w = getVal(form, 'canvas_width');
        const h = getVal(form, 'canvas_height');
        if (w && h) canvas = `${w}x${h}`;
        else if (w) canvas = w;
        else if (h) canvas = h; // Fallback
    }

    // 2. Background
    const isBgEnabled = (getEl('toggle-edge-bg') as HTMLInputElement)?.checked ?? false;
    let bgPadding: string | null = null;
    let bgShadow: string | null = null;
    let bgRadius: string | null = null;
    let bgBgcolor: string | null = null;

    if (isBgEnabled) {
        const pw = getVal(form, 'bg_padding_w');
        const ph = getVal(form, 'bg_padding_h');
        if (pw && ph) bgPadding = (pw === ph) ? pw : `${pw}x${ph}`;
        else if (pw) bgPadding = pw;
        else if (ph) bgPadding = `0x${ph}`;

        const shadow = getVal(form, 'bg_shadow');
        if (shadow) bgShadow = shadow;

        const radius = getVal(form, 'bg_radius');
        if (radius) bgRadius = radius;

        bgBgcolor = getColor(form, 'bg');
    }

    // Construct bg parts: [padding, shadow, radius, bgcolor]
    // Valid parts array should support intermediate nulls if subsequent parts exist.
    const rawBgParts = [bgPadding, bgShadow, bgRadius, bgBgcolor];
    const lastBgIndex = rawBgParts.findLastIndex(p => p !== null);
    const bgParts = lastBgIndex === -1 ? [] : rawBgParts.slice(0, lastBgIndex + 1);

    // 3. Content (ph)
    let contentSize: string | null = null;
    if (!canvas) {
         const w = getVal(form, 'ph_width');
         const h = getVal(form, 'ph_height');
         if (w && h) contentSize = `${w}x${h}`;
         else if (w) contentSize = w;
         else if (h) contentSize = h;
    }

    const contentBgcolor = getColor(form, 'ph_bg');
    const contentFgcolor = getColor(form, 'ph_fg');

    // Content parts:
    // If canvas exists: [bgcolor, fgcolor]
    // If no canvas: [size, bgcolor, fgcolor]
    let rawContentParts: (string | null)[];
    if (canvas) {
        rawContentParts = [contentBgcolor, contentFgcolor];
    } else {
        rawContentParts = [contentSize, contentBgcolor, contentFgcolor];
    }
    const lastContentIndex = rawContentParts.findLastIndex(p => p !== null);
    const contentParts = lastContentIndex === -1 ? [] : rawContentParts.slice(0, lastContentIndex + 1);

    // 4. Query
    const query: Record<string, string> = {};
    const cQuery: Record<string, string> = {};
    const exQuery: Record<string, string> = {};
    const EX_KEYS = ['scale', 'debug', 'filetype', 'retina'];

    const addToBoth = (k: string, v: string) => {
        query[k] = v;
        if (EX_KEYS.includes(k)) exQuery[k] = v;
        else cQuery[k] = v;
    };

    const text = getVal(form, 'text');
    if (text) addToBoth('text', text);

    const font = getVal(form, 'font');
    if (font) addToBoth('font', font);

    const scale = getVal(form, 'scale');
    if (scale && scale !== '1') addToBoth('scale', scale);

    const debug = (form.elements.namedItem('debug') as HTMLInputElement)?.checked;
    if (debug) addToBoth('debug', '1');

    const filetype = getVal(form, 'filetype');
    if (filetype && filetype !== 'null') addToBoth('filetype', filetype);

    return {
        canvas,
        bg: {
            parts: bgParts,
            padding: bgPadding,
            shadow: bgShadow,
            radius: bgRadius,
            bgcolor: bgBgcolor
        },
        content: {
            type: 'ph',
            parts: contentParts,
            size: contentSize,
            bgcolor: contentBgcolor,
            fgcolor: contentFgcolor
        },
        ext: null,
        query,
        cQuery,
        exQuery
    };
}

export function splitUrlPropsToForm(props: SplitUrlProps, form: HTMLFormElement) {
    // 1. Canvas
    if (props.canvas) {
        const toggle = getEl<HTMLInputElement>('toggle-canvas-size');
        if (toggle) {
            toggle.checked = true;
            toggle.dispatchEvent(new Event('change'));
        }
        const [w, h] = props.canvas.split('x');
        setVal(form, 'canvas_width', w);
        setVal(form, 'canvas_height', h ?? w);
    } else {
        // If no canvas in props, maybe uncheck toggle?
        // Or keep user state? Usually if we are importing URL, we likely want to match it.
        // But for pre-filling logic, we want to reflect the URL exactly.
        const toggle = getEl<HTMLInputElement>('toggle-canvas-size');
        // Only uncheck if we are strictly updating from URL, which we are.
        if (toggle) toggle.checked = false;
        // Also clear values? Maybe better not to destructive?
        // Given existing logic, we just set values.
    }

    // 2. Background
    const hasBg = props.bg.parts.length > 0;
    const bgToggle = getEl<HTMLInputElement>('toggle-edge-bg');
    if (bgToggle) {
        bgToggle.checked = hasBg;
        bgToggle.dispatchEvent(new Event('change'));
    }

    if (props.bg.padding) {
        const [pw, ph] = props.bg.padding.split('x');
        setVal(form, 'bg_padding_w', pw);
        setVal(form, 'bg_padding_h', ph ?? pw);
    }
    if (props.bg.shadow) setVal(form, 'bg_shadow', props.bg.shadow);
    if (props.bg.radius) setVal(form, 'bg_radius', props.bg.radius);

    if (props.bg.bgcolor) {
        const val = props.bg.bgcolor;
        if (val.startsWith('tpl(')) {
            const tplName = val.slice(4, -1);
            const r = form.querySelector(`input[name="bg_type"][value="tpl"]`) as HTMLInputElement;
            if (r) r.checked = true;
            setVal(form, 'bg_tpl', tplName);
        } else {
            const r = form.querySelector(`input[name="bg_type"][value="color"]`) as HTMLInputElement;
            if (r) r.checked = true;
            const  [hex, alpha] = val.split(',');
            setVal(form, 'bg_color_hex', hex);
            setVal(form, 'bg_color_alpha', alpha ?? '255');
        }
    } else {
         // Default to None or keep as is?
    }

    // 3. Content
    if (props.content.size) {
        const [cw, ch] = props.content.size.split('x');
        setVal(form, 'ph_width', cw);
        setVal(form, 'ph_height', ch ?? cw);
    }

    const setContentColor = (prefix: string, val: string | null | undefined) => {
        if (!val) return;
        if (val.startsWith('tpl(')) {
            const name = val.slice(4, -1);
            const r = form.querySelector(`input[name="${prefix}_type"][value="tpl"]`) as HTMLInputElement;
            if (r) r.checked = true;
            setVal(form, `${prefix}_tpl`, name);
        } else {
             // Try color
             const r = form.querySelector(`input[name="${prefix}_type"][value="color"]`) as HTMLInputElement;
             if (r) r.checked = true;
             const [hex, alpha] = val.split(',');
             setVal(form, `${prefix}_color_hex`, hex);
             setVal(form, `${prefix}_color_alpha`, alpha ?? '255');
        }
    };

    setContentColor('ph_bg', props.content.bgcolor);
    setContentColor('ph_fg', props.content.fgcolor);

    // 4. Query
    if (props.query.text) setVal(form, 'text', props.query.text);
    if (props.query.font) setVal(form, 'font', props.query.font);
    if (props.query.scale) setVal(form, 'scale', props.query.scale);

    const debugBox = form.elements.namedItem('debug') as HTMLInputElement;
    if (debugBox) debugBox.checked = props.query.debug === '1';

    const ft = props.query.filetype || (props.ext ? props.ext.replace(/^\./, '').toLowerCase() : null);
    if (ft) {
         const r = form.querySelector(`input[name="filetype"][value="${ft}"]`) as HTMLInputElement;
         if (r) r.checked = true;
    }
}

// --- URL Construction Shared Logic ---

function getUrlSegments(result: SplitUrlProps) {
    const cleanParts = (parts: (string | null)[]) => {
        const lastIdx = parts.findLastIndex(p => p !== null);
        if (lastIdx === -1) return [];
        return parts.slice(0, lastIdx + 1);
    };

    const canvas = result.canvas;
    const bgParts = cleanParts(result.bg.parts);
    const contentParts = cleanParts(result.content.parts);
    const type = result.content.type;
    const query = result.query;
    const cQuery = result.cQuery;
    const exQuery = result.exQuery;
    const ext = result.ext;

    const hasCanvas = !!canvas;
    const hasBg = bgParts.length > 0;

    // Omit /ph if first segment
    let omitType = false;
    if (type === 'ph' && !hasCanvas && !hasBg) {
        omitType = true;
    }

    return { canvas, bgParts, contentParts, type, omitType, query, cQuery, exQuery, ext, hasCanvas, hasBg };
}

export function genEurl(result: SplitUrlProps): string {
    const { canvas, bgParts, contentParts, type, omitType, cQuery, exQuery, ext } = getUrlSegments(result);

    // 1. canvasGroup
    const canvasGroup = canvas
        ? `<span class="eurl-group hover:bg-indigo-600/30 inline">/` +
        `<span class="eurl-part" data-url-ptitle="Canvas Size">${canvas}</span>` +
        `</span>`
        : '';

    // 2. bgGroup
    const bgTitles = ['Padding', 'Shadow', 'Radius', 'Color'];
    let bgGroup = '';
    if (bgParts.length > 0) {
        const partsHtml = bgParts.map((p, i) => {
             const title = bgTitles[i] || 'Unknown';
             const val = p === null ? '' : p;
             return `<span class="eurl-part" data-url-ptitle="${title}">${val}</span>`;
        }).join('/');
        bgGroup = `<span class="eurl-group hover:bg-cyan-600/30">/bg/${partsHtml}</span>`;
    }

    // 3. contentGroup
    let contentGroup = '';
    const contentTitles = canvas ? ['bgcolor', 'fgcolor'] : ['Block Size', 'bgcolor', 'fgcolor'];
    const hasContentParts = contentParts.length > 0;
    const cQueryStr = new URLSearchParams(cQuery).toString();
    const queryHtml = cQueryStr
        ? `/?<span class="eurl-part">${cQueryStr.replace(/&/g, '&amp;<wbr>')}</span>`
        : '';

    if (hasContentParts || type || cQueryStr || ext) {
          let partsHtml = '';
          if (hasContentParts) {
              partsHtml = contentParts.map((p, i) => {
                   const title = contentTitles[i] || 'Unknown';
                   const val = p === null ? '' : p;
                   return `<span class="eurl-part" data-url-ptitle="${title}">${val}</span>`;
              }).join('/');
          }

          const prefix = (type && !omitType) ? `/${type}` : '';
          const middle = partsHtml ? `/${partsHtml}` : '';
          const extHtml = ext ? `<span class="eurl-part" data-url-ptitle="Extension">${ext}</span>` : '';
          contentGroup = `<span class="eurl-group hover:bg-yellow-600/30">${prefix}${middle}${extHtml}${queryHtml}</span>`;
    }

    // 4. exGroup
    let exGroup = '';
    const exQueryStr = new URLSearchParams(exQuery).toString();
    if (exQueryStr) {
        const exPrefix = cQueryStr ? '&amp;' : '?';
        exGroup = `<span class="eurl-group hover:bg-green-600/30" data-url-gtitle="">${exPrefix}` +
        `<span class="eurl-part">${exQueryStr.replace(/&/g, '&amp;<wbr>')}</span>` +
        `</span>`;
    }

    return `${canvasGroup}${bgGroup}${contentGroup}${exGroup}`;
}

function localBuildUrl(result: SplitUrlProps, baseUrl: string = ''): string {
    const { canvas, bgParts, contentParts, type, omitType, query, ext } = getUrlSegments(result);
    const pathParts: string[] = [];

    if (canvas) pathParts.push(canvas);

    if (bgParts.length > 0) {
        pathParts.push('bg');
        bgParts.forEach(p => pathParts.push(p === null ? 'null' : p));
    }

    if (type) {
        if (!omitType) pathParts.push(type);
        contentParts.forEach(p => pathParts.push(p === null ? 'null' : p));
    }

    const queryStr = new URLSearchParams(query).toString();
    let path = '/' + pathParts.join('/');
    if (ext && path !== '/') {
        path += ext;
    }
    return `${baseUrl.replace(/\/$/, '')}${path}${queryStr ? `?${queryStr}` : ''}`;
}

export function initGenerator() {
    const form = document.getElementById('generator-form') as HTMLFormElement | null;
    if (!form) return;

    const configData = form.dataset.config;
    const CONFIG = configData ? JSON.parse(configData) : {}; // Should have defaults

    // Define Sections for UI toggling
    const sections = {
        canvasSize: {
             toggle: getEl<HTMLInputElement>('toggle-canvas-size'),
             content: getEl<HTMLElement>('content-canvas-size'),
        },
        edgeBg: {
             toggle: getEl<HTMLInputElement>('toggle-edge-bg'),
             content: getEl<HTMLElement>('content-edge-bg'),
        },
        blockSize: {
             fieldset: getEl<HTMLFieldSetElement>('block-size-fieldset'),
        }
    };

    // UI Update Logic
    function updateUIState() {
         if (sections.canvasSize.toggle && sections.canvasSize.content) {
            const isCanvasSizeEnabled = sections.canvasSize.toggle.checked;
            sections.canvasSize.content.classList.toggle('is-open', isCanvasSizeEnabled);

            const hasCanvasValues = getVal(form!, 'canvas_width') || getVal(form!, 'canvas_height'); // simple check

            if (sections.blockSize.fieldset) {
                 // If Canvas Size is active and has values, Block Size (part of content) is likely invalid/ignored?
                 // In our logic: if canvas exists, content.size is NULL.
                 // So we disable the fieldset to indicate this.
                 const shouldDisable = isCanvasSizeEnabled && !!hasCanvasValues;
                 sections.blockSize.fieldset.disabled = shouldDisable;
                 sections.blockSize.fieldset.style.opacity = shouldDisable ? '0.5' : '1';
            }
         }

         if (sections.edgeBg.toggle && sections.edgeBg.content) {
            const isEdgeBgEnabled = sections.edgeBg.toggle.checked;
            sections.edgeBg.content.classList.toggle('is-open', isEdgeBgEnabled);
         }
    }

    // Main Update Loop
    function update() {
        const props = formToSplitUrlProps(form!);

        // 1. Generate URLs
        const fullUrl = localBuildUrl(props, PUBLIC_BASE_URL);
        const relativeUrl = localBuildUrl(props, '');

        // 2. Update Eurl Display
        const eurlContent = getEl('eurl-content');
        if (eurlContent) {
            eurlContent.innerHTML = genEurl(props); // Use strict genEurl
        }

        // 3. Update Preview
        const previewImage = getEl<HTMLImageElement>('preview-image');
        // Modern iPadOS (13+) reports as Macintosh. We check for touch points to distinguish from Mac.
        const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isIpadOS = navigator.userAgent.includes('Mac') && navigator.maxTouchPoints > 1;
        const forcePng = isIos || isIpadOS;

        // Construct preview URL (might need diff filetype)
        const previewProps = JSON.parse(JSON.stringify(props)); // deep copy
        previewProps.query.filetype = forcePng ? 'png' : 'svg';
        // Ensure debug is off for preview? Optional.

        const previewUrl = localBuildUrl(previewProps, ''); // relative

        if (previewImage && previewImage.getAttribute('src') !== previewUrl) {
             const loader = getEl('preview-loading');
             loader?.classList.remove('hidden');
             previewImage.src = previewUrl;
        }

        // 4. Update Display Text
        const urlDisplay = getEl('preview-url-display');
        if (urlDisplay) urlDisplay.textContent = fullUrl;

        // 5. Embeds
        const embedHtml = getEl('embed-html');
        if (embedHtml) embedHtml.innerText = `<img src="${fullUrl}">`;

        const embedMarkdown = getEl('embed-markdown');
        const alt = props.query.text || CONFIG.defaults?.embed_alt || 'Image';
        if (embedMarkdown) embedMarkdown.innerText = `![${alt}](${fullUrl})`;

        // 6. Downloads
        const setDl = (id: string, ft: string) => {
            const temp = JSON.parse(JSON.stringify(props));
            temp.query.filetype = ft;
            const a = getEl<HTMLAnchorElement>(id);
            if (a) a.href = localBuildUrl(temp, '');
        };
        setDl('download-svg', 'svg');
        setDl('download-png', 'png');
        setDl('download-ico', 'ico');
    }

    // Event Listeners
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    function scheduleUpdate() {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            update();
            debounceTimer = null;
        }, CONFIG.debounceDelay || 1000); // default 1000
    }

    // Immediate update for toggles
    form.addEventListener('change', (e) => {
        updateUIState();
        // If it's a toggle change, update immediately? Or use debounce?
        // User expects fast feedback on toggles usually?
        update();
    });

    form.addEventListener('input', () => {
        updateUIState();
        scheduleUpdate();
        const loader = getEl('preview-loading');
        loader?.classList.remove('hidden');
    });

    if (sections.canvasSize.toggle) {
         sections.canvasSize.toggle.addEventListener('change', () => {
             updateUIState(); update();
         });
    }
    if (sections.edgeBg.toggle) {
         sections.edgeBg.toggle.addEventListener('change', () => {
             updateUIState(); update();
         });
    }

    // Preview Image Handlers
    const previewImage = getEl<HTMLImageElement>('preview-image');
    if (previewImage) {
        previewImage.addEventListener('load', () => getEl('preview-loading')?.classList.add('hidden'));
        previewImage.addEventListener('error', () => getEl('preview-loading')?.classList.add('hidden'));
    }

    // Dynamic Sticky calculation (preserve existing logic)
    const eurlSticky = getEl<HTMLElement>('eurl-sticky');
    const previewSticky = getEl<HTMLElement>('preview-sticky-container');
    if (eurlSticky && previewSticky) {
        const obs = new ResizeObserver(() => {
            previewSticky.style.top = `${eurlSticky.offsetHeight + 12}px`;
        });
        obs.observe(eurlSticky);
    }

    // Apply defaults logic
    function applyDefaults() {
         // Logic to set form defaults from CONFIG.defaults
         // This is a one-time setup usually.
         // ... implementation same as before ...
         const defaults = CONFIG.defaults;
         if (!defaults) return;

         const map: Record<string, string> = {
            'canvas_width': defaults.canvas_width,
            'canvas_height': defaults.canvas_height,
            'ph_width': defaults.ph_width,
            'ph_height': defaults.ph_height,
            'bg_padding_w': defaults.bg_padding,
            'bg_shadow': defaults.bg_shadow,
            'bg_radius': defaults.bg_radius,
            'bg_color_alpha': defaults.default_alpha,
            'ph_bg_color_alpha': defaults.default_alpha,
            'ph_fg_color_alpha': defaults.default_alpha,
            'scale': defaults.default_scale,
         };

         for (const [k, v] of Object.entries(map)) {
             const el = form!.elements.namedItem(k) as HTMLInputElement;
             if (el && !el.value && v) {
                 el.value = v;
             }
         }
    }

    applyDefaults();

    // Check URL for pre-fill
    const pathname = window.location.pathname;
    if (pathname.startsWith('/generator/') && pathname.length > 11) {
         const subPath = pathname.substring(10);
         const fullSubUrl = subPath + window.location.search;
         const parsed = splitUrl(fullSubUrl);

         splitUrlPropsToForm(parsed, form);
         // After setting from URL, update UI
         updateUIState();
         // Trigger update to sync everything
         update();
    } else {
         // Initial update
         updateUIState();
         update();
    }
}
