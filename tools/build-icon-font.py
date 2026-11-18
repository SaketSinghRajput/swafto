#!/usr/bin/env python3
"""
Build apps/mobile/assets/fonts/SwaftoIcons.ttf: a subset of the Lucide icon font.

REPRODUCIBLE. The input is a PINNED release (apps/mobile/src/ui/icons.json,
"source"): the lucide-static tarball is downloaded, its SHA-256 is checked
against the pin, and so is the SHA-256 of font/lucide.ttf inside it. The glyph
list is the "icons" table of the same file; every codepoint recorded there is
re-checked against that release's codepoints.json, so a release bump that moves
a glyph fails here instead of drawing the wrong picture.

USAGE (from the repo root)
    python -m pip install --target <dir> fonttools==4.55.3
    PYTHONPATH=<dir> python tools/build-icon-font.py        # or: --tarball <path>
Add `--check` to build into memory and compare against the committed TTF
(exit 1 on any difference) without writing anything.

WHY GSUB IS DELETED FIRST. Lucide's stock GSUB table has a coverage table
pyftsubset cannot parse and crashes on. Icons need no substitution (one
codepoint, one glyph, Private Use Area), so it is dropped, then the font is
subset with no layout features, no hinting and no DSIG. Codepoints are kept as
Lucide ships them. The family is renamed SwaftoIcons; the copyright (name id 0)
is kept, and the licence text ships beside the font as ISC-Lucide.txt.

Only fontTools is needed, and only to BUILD. The built TTF is committed;
nothing at run time or in CI needs Python.
"""
import hashlib
import io
import json
import sys
import tarfile
import urllib.request
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
SPEC = ROOT / 'apps/mobile/src/ui/icons.json'
OUT_DIR = ROOT / 'apps/mobile/assets/fonts'


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def fail(msg: str) -> None:
    print('x    ' + msg, file=sys.stderr)
    sys.exit(1)


def main() -> None:
    check = '--check' in sys.argv
    spec = json.loads(SPEC.read_text(encoding='utf8'))
    src, icons, family = spec['source'], spec['icons'], spec['font']['family']

    if '--tarball' in sys.argv:
        tgz = Path(sys.argv[sys.argv.index('--tarball') + 1]).read_bytes()
    else:
        with urllib.request.urlopen(src['tarballUrl']) as r:  # noqa: S310 - pinned https URL
            tgz = r.read()
    if sha256(tgz) != src['tarballSha256']:
        fail('tarball sha256 %s does not match the pin %s' % (sha256(tgz), src['tarballSha256']))

    with tarfile.open(fileobj=io.BytesIO(tgz), mode='r:gz') as tar:
        def member(name: str) -> bytes:
            f = tar.extractfile('package/' + name)
            if f is None:
                fail('package/%s is not in the tarball' % name)
            return f.read()

        stock = member('font/lucide.ttf')
        codepoints = json.loads(member('font/codepoints.json'))
        licence = member('LICENSE')

    if sha256(stock) != src['fontSha256']:
        fail('font/lucide.ttf sha256 %s does not match the pin %s' % (sha256(stock), src['fontSha256']))

    # The committed licence text must be the release's own, byte for byte.
    committed = (OUT_DIR / 'ISC-Lucide.txt').read_bytes()
    if committed.replace(b'\r\n', b'\n') != licence.replace(b'\r\n', b'\n'):
        fail('apps/mobile/assets/fonts/ISC-Lucide.txt is not the LICENSE of the pinned release')

    unicodes = []
    for name, entry in icons.items():
        want = codepoints.get(entry['lucide'])
        if want is None:
            fail('%s: Lucide has no glyph called %s in this release' % (name, entry['lucide']))
        if want != int(entry['codepoint'], 16):
            fail('%s: %s is U+%X in this release but icons.json says U+%s'
                 % (name, entry['lucide'], want, entry['codepoint']))
        unicodes.append(want)
    if len(set(unicodes)) != len(unicodes):
        fail('two icon names point at the same glyph; one name per glyph')

    font = TTFont(io.BytesIO(stock), recalcTimestamp=False)
    if 'GSUB' in font:
        del font['GSUB']
    opts = subset.Options()
    opts.layout_features = []
    opts.hinting = False
    opts.drop_tables += ['DSIG']
    opts.notdef_outline = True
    opts.recalc_timestamp = False
    opts.name_IDs = [0, 1, 2, 3, 4, 5, 6]
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=unicodes)
    sub.subset(font)

    # Rename: the family is ours, the copyright (id 0) is Lucide's and stays.
    for rec in font['name'].names:
        if rec.nameID in (1, 16):
            rec.string = family
        elif rec.nameID == 3:
            rec.string = family + ';subset-of-lucide-' + src['version']
        elif rec.nameID == 4:
            rec.string = family
        elif rec.nameID == 6:
            rec.string = family + '-Regular'
    # Stable output: no timestamp drift between builds.
    font['head'].modified = font['head'].created

    buf = io.BytesIO()
    font.save(buf)
    built = buf.getvalue()

    out = OUT_DIR / spec['font']['file']
    if check:
        if not out.exists() or out.read_bytes() != built:
            fail('%s differs from a fresh build (sha256 built %s)' % (out, sha256(built)))
        print('ok   %s reproduces: %d bytes, sha256 %s' % (out.name, len(built), sha256(built)))
        return
    out.write_bytes(built)
    print('wrote %s: %d bytes, %d glyphs, sha256 %s' % (out, len(built), len(unicodes), sha256(built)))


main()
