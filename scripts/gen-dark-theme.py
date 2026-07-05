#!/usr/bin/env python3
"""Generate the dark-theme override block for src/css/styles.css.

Parses the app stylesheet, classifies each rule's colors by lightness, and
emits a `@media (prefers-color-scheme: dark)` block containing ONLY the
declarations that need to change:

  - rules with a light background (L > 0.65): background/border darkened
    (hue kept, saturation capped), dark text inside them lightened
  - rules with no background: dark text lightened, light borders darkened
  - rules that already sit on dark/mid surfaces: left untouched, so the
    dark-green hero cards and their light text survive as-is

Run after any CSS change, then rebuild:
    python3 scripts/gen-dark-theme.py && node scripts/build.mjs
The output replaces everything between the GENERATED-DARK markers in
src/css/styles.css (appended at the end if the markers don't exist yet).
"""
import re, colorsys, sys, os

PATH = os.path.join(os.path.dirname(__file__), '..', 'src', 'css', 'styles.css')
MARK_A = '  /* ===== GENERATED-DARK: auto dark theme — edit scripts/gen-dark-theme.py, not this block ===== */'
MARK_B = '  /* ===== /GENERATED-DARK ===== */'

HEX = re.compile(r'#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b')

def to_rgb(h):
    if len(h) == 3: h = ''.join(c*2 for c in h)
    return tuple(int(h[i:i+2], 16)/255 for i in (0, 2, 4))

def to_hex(rgb):
    return '#%02x%02x%02x' % tuple(round(c*255) for c in rgb)

def hls(h):
    return colorsys.rgb_to_hls(*to_rgb(h))  # (h, l, s)

def darken_surface(hexv):
    h, l, s = hls(hexv)
    nl = min(0.22, max(0.10, 0.11 + (0.95 - l) * 0.5))
    ns = min(s, 0.30)
    return to_hex(colorsys.hls_to_rgb(h, nl, ns))

def lighten_text(hexv):
    h, l, s = hls(hexv)
    nl = min(0.90, max(0.74, 0.86 - l * 0.15))
    ns = min(s, 0.35)
    return to_hex(colorsys.hls_to_rgb(h, nl, ns))

def darken_border(hexv):
    h, l, s = hls(hexv)
    nl = min(0.30, max(0.16, 0.18 + (0.95 - l) * 0.35))
    ns = min(s, 0.28)
    return to_hex(colorsys.hls_to_rgb(h, nl, ns))

def max_l(value):
    ls = [hls(m.group(1))[1] for m in HEX.finditer(value)]
    return max(ls) if ls else None

def map_hexes(value, fn, pred):
    def rep(m):
        v = m.group(1)
        return fn(v) if pred(hls(v)[1]) else '#' + v if False else (fn(v) if pred(hls(v)[1]) else m.group(0))
    return HEX.sub(lambda m: fn(m.group(1)) if pred(hls(m.group(1))[1]) else m.group(0), value)

def parse_rules(css):
    """Yield (media_prefix, selector, declarations) for every rule."""
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    out, i, media = [], 0, None
    stack = []
    while i < len(css):
        m = re.match(r'\s*@media([^{]+)\{', css[i:])
        if m:
            media = m.group(1).strip(); i += m.end(); stack.append('media'); continue
        m = re.match(r'\s*@[^{;]+;', css[i:])  # @import etc.
        if m: i += m.end(); continue
        m = re.match(r'\s*@(keyframes|font-face)[^{]*\{', css[i:])
        if m:  # skip whole block
            depth = 1; j = i + m.end()
            while depth and j < len(css):
                if css[j] == '{': depth += 1
                elif css[j] == '}': depth -= 1
                j += 1
            i = j; continue
        m = re.match(r'\s*\}', css[i:])
        if m:
            i += m.end()
            if stack: stack.pop(); media = None
            continue
        m = re.match(r'\s*([^{}]+?)\s*\{([^{}]*)\}', css[i:], re.S)
        if not m: break
        out.append((media, ' '.join(m.group(1).split()), m.group(2)))
        i += m.end()
    return out

def transform_rule(decls):
    """Return list of changed declarations for dark mode, or []."""
    ds = [d.strip() for d in decls.split(';') if d.strip()]
    props = []
    for d in ds:
        if ':' not in d: continue
        k, v = d.split(':', 1)
        props.append((k.strip().lower(), v.strip()))
    bg_vals = [v for k, v in props if k in ('background', 'background-color', 'background-image')]
    bg_l = max((max_l(v) for v in bg_vals if max_l(v) is not None), default=None)
    has_bg_hex = bg_l is not None
    light_bg = has_bg_hex and bg_l > 0.65
    if has_bg_hex and not light_bg:
        return []  # dark/mid surface — leave the whole rule alone
    changed = []
    for k, v in props:
        nv = v
        if k in ('background', 'background-color', 'background-image') and light_bg:
            nv = map_hexes(v, darken_surface, lambda l: l > 0.65)
        elif k.startswith('border') and 'radius' not in k:
            nv = map_hexes(v, darken_border, lambda l: l > 0.55)
        elif k in ('color', '-webkit-text-fill-color'):
            nv = map_hexes(v, lighten_text, lambda l: l < 0.45)
        elif k == 'box-shadow' and light_bg:
            continue
        if nv != v:
            changed.append(f'{k}:{nv}')
    return changed

# Hand-maintained dark pins the mechanical transform can't derive:
#  - token overrides (--green-800/--green-700 are text-only in light mode;
#    --sand/--sand-dark back the amber nutrient-timing surfaces)
#  - rgba()/var()-backed surfaces the parser skips (mobile tab bar)
#  - the two rules that use --green-700 as a button BACKGROUND keep light-mode green
CORE = [
    (':root',
     '--paper:#0d1712; --card:#141f18; --ink:#e4efe6; --muted:#96ab9d; --line:#28402f; '
     '--green-800:#a5dcb8; --green-700:#7ccd9c; --sand:#332c18; --sand-dark:#584c28; '
     '--shadow:0 12px 34px rgba(0,0,0,.45); --shadow-sm:0 2px 8px rgba(0,0,0,.35); color-scheme:dark;'),
    ('input, select, textarea', 'background:#101b14; color:var(--ink);'),
    ('.logbtn:hover', 'background:#15803d;'),
    ('.modal-foot button', 'background:#15803d;'),
    ('.mobile-tabbar', 'background:rgba(16,24,19,.94); border-top:1px solid #28402f; box-shadow:0 -4px 20px rgba(0,0,0,.45);'),
]

def prefix_sel(sel, wrapper):
    """Prefix each comma-part of a selector; :root itself becomes the wrapper."""
    parts = [p.strip() for p in sel.split(',')]
    out = []
    for p in parts:
        if p == ':root': out.append(wrapper)
        else: out.append(wrapper + ' ' + p)
    return ', '.join(out)

def main():
    src = open(PATH).read()
    css = src
    # never re-process our own generated block
    if MARK_A in css:
        css = css.split(MARK_A)[0]
    rules = parse_rules(css)
    top, medias = [], {}
    for media, sel, decls in rules:
        if sel.startswith(':root'): continue
        ch = transform_rule(decls)
        if not ch: continue
        if media: medias.setdefault(media, []).append((sel, '; '.join(ch) + ';'))
        else: top.append((sel, '; '.join(ch) + ';'))
    all_top = CORE + top

    def emit(wrapper):
        return '\n'.join(f'  {prefix_sel(sel, wrapper)}{{ {decls} }}' for sel, decls in all_top)

    # Two variants of the same rules:
    #  1. system dark, unless the user forced light:  @media + html:not([data-theme="light"])
    #  2. user forced dark:                            html[data-theme="dark"]
    block = MARK_A + '\n'
    block += '  @media (prefers-color-scheme: dark){\n' + emit('html:not([data-theme="light"])') + '\n  }\n'
    block += emit('html[data-theme="dark"]') + '\n'
    W_AUTO = 'html:not([data-theme="light"])'
    W_FORCED = 'html[data-theme="dark"]'
    for media, pairs in medias.items():
        inner_auto = '\n'.join(f'  {prefix_sel(sel, W_AUTO)}{{ {d} }}' for sel, d in pairs)
        inner_forced = '\n'.join(f'  {prefix_sel(sel, W_FORCED)}{{ {d} }}' for sel, d in pairs)
        block += f'  @media (prefers-color-scheme: dark) and {media.strip()}{{\n' + inner_auto + '\n  }\n'
        block += f'  @media {media.strip()}{{\n' + inner_forced + '\n  }\n'
    block += MARK_B + '\n'
    if MARK_A in src:
        src = re.sub(re.escape(MARK_A) + r'.*?' + re.escape(MARK_B) + r'\n?', block, src, flags=re.S)
    else:
        src = src.rstrip() + '\n' + block
    open(PATH, 'w').write(src)
    print(f'dark theme: {len(all_top)} rules x2 variants, {sum(len(v) for v in medias.values())} media-scoped')

if __name__ == '__main__':
    main()
