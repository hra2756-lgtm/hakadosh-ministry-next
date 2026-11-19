"""Import the complete BSB (USX) and BES (USFX) using Python's standard library.

Usage: python scripts/build-bibles.py bsb_usx.zip spabes_usfx.zip bsb-terms.html
Sources, licensing, and verse-numbering details: src/data/bible/README.md.
Both editions are validated before writing. Never fill source gaps with another
translation, renumber verses, or include editorial headings/footnotes as Scripture.
"""
import hashlib
import io
import json
from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'src/data/bible'
CANON = 'GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB PSA PRO ECC SNG ISA JER LAM EZK DAN HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV'.split()
# Traditional positions not present in the BSB main text. They remain footnotes
# in the publisher's source; do not manufacture main-text verses for these.
BSB_GAPS = {'MAT.17.21', 'MAT.18.11', 'MAT.23.14', 'MRK.7.16', 'MRK.9.44', 'MRK.9.46', 'MRK.11.26', 'MRK.15.28', 'LUK.17.36', 'LUK.23.17', 'JHN.5.4', 'ACT.8.37', 'ACT.15.34', 'ACT.24.7', 'ACT.28.29', 'ROM.16.24'}


def convert(path, usfx=False):
    raw = Path(path).read_bytes()
    archive = zipfile.ZipFile(io.BytesIO(raw))
    if usfx:
        names = {b.get('code'): b.attrib for b in ET.fromstring(archive.read('BookNames.xml'))}
        roots = ET.fromstring(archive.read('spabes_usfx.xml')).findall('book')
    else:
        roots = [ET.fromstring(archive.read(f)) for f in archive.namelist() if f.endswith('.usx')]
    books = {}
    for root in roots:
        code = root.get('id') if usfx else root.find('book').get('code')
        if code not in CANON:
            continue
        assert code not in books, ('Duplicate book', code)
        if usfx:
            name, abbr = names[code]['short'], names[code]['abbr']
        else:
            name = ''.join(root.find("para[@style='toc2']").itertext()).strip()
            abbr = ''.join(root.find("para[@style='toc3']").itertext()).strip()
        chapters, parts = [], []
        chapter, verse = None, None

        def finish():
            nonlocal verse, parts
            if verse is not None:
                text = re.sub(r'\s+', ' ', ''.join(parts)).strip()
                text = re.sub(r'\s+([,.;:!?])', r'\1', text)
                assert text and verse.isdigit(), (code, chapter, verse)
                assert not any(c in text for c in '<>\ufffd'), (code, chapter, verse)
                number = int(verse)
                previous = chapters[chapter - 1]
                assert 1 <= number <= 176 and (not previous or previous[-1]['end'] < number), (code, chapter, verse)
                previous.append({'verse': verse, 'start': number, 'end': number, 'text': text})
            verse, parts = None, []

        def walk(node):
            nonlocal chapter, verse
            style = node.get('style', '')
            if usfx:
                if node.tag in {'f', 'fe', 'x', 's', 'sr', 'r', 'd', 'h', 'id', 'toc', 'cl', 'cp', 'ca', 'va', 'vp', 'fig', 'rem'}:
                    return
                if node.tag == 'p' and (node.get('sfm', '').startswith(('mt', 'imt', 'is', 'ip')) or style in {'sp', 'qa'}):
                    return
            elif node.tag in {'book', 'note'} or style in {'ca', 'va', 'vp', 'fm', 'qa', 'sp'} or (node.tag == 'para' and style.startswith(('h', 'toc', 'mt', 's', 'r', 'rem', 'ms', 'mr'))):
                return
            chapter_number = node.get('id') if node.tag == 'c' else node.get('number') if node.tag == 'chapter' else None
            if chapter_number:
                finish()
                chapter = int(chapter_number)
                assert chapter == len(chapters) + 1, (code, chapter)
                chapters.append([])
            elif node.tag in {'v', 'verse', 've'}:
                finish()
                verse = node.get('id') if node.tag == 'v' else node.get('number') if node.tag == 'verse' else None
            if node.tag in {'para', 'p', 'q'} and verse is not None:
                parts.append(' ')
            if node.text and verse is not None:
                parts.append(node.text)
            for child in node:
                walk(child)
                if child.tail and verse is not None:
                    parts.append(child.tail)

        walk(root)
        finish()
        assert chapters and all(chapters), code
        books[code] = {'id': code, 'name': name, 'abbr': abbr, 'chapters': chapters}
    assert set(books) == set(CANON)
    ordered = [books[code] for code in CANON]
    assert sum(len(b['chapters']) for b in ordered) == 1189
    gaps = {f"{b['id']}.{i + 1}.{n}" for b in ordered for i, c in enumerate(b['chapters']) for n in range(1, c[-1]['end'] + 1) if not any(v['start'] == n for v in c)}
    assert gaps == (set() if usfx else BSB_GAPS), ('Unexpected source gaps', gaps)
    count = sum(len(c) for b in ordered for c in b['chapters'])
    assert count == (31102 if usfx else 31086), count
    manifest = {'sha256': hashlib.sha256(raw).hexdigest(), 'books': 66, 'chapters': 1189, 'segments': count, 'omittedMainTextPositions': sorted(gaps)}
    return ordered, manifest, archive.read('copr.htm') if usfx else None


if __name__ == '__main__':
    assert len(sys.argv) == 4, 'Supply BSB USX, BES USFX, and the downloaded official BSB terms page.'
    en, en_meta, _ = convert(sys.argv[1])
    es, es_meta, es_license = convert(sys.argv[2], usfx=True)
    en_license = Path(sys.argv[3]).read_bytes()
    assert b'public domain' in en_license.lower()
    assert b'public domain' in es_license.lower()
    en_meta.update(edition='Berean Standard Bible', abbreviation='BSB', revision='3rd Printing', source='https://berean.bible/downloads.htm', download='https://bereanbible.com/bsb_usx.zip', license='Public domain', licenseUrl='https://berean.bible/terms.htm')
    es_meta.update(edition='La Biblia en Español Sencillo', abbreviation='BES', revision='Segunda Edición (2026)', source='https://audiobiblia.org/spabes_ab/spabes.htm', download='https://ebible.org/Scriptures/spabes_usfx.zip', license='Public domain', licenseUrl='https://ebible.org/spabes/copyright.htm')
    OUT.mkdir(parents=True, exist_ok=True)
    for language, books, license_text in [('en', en, en_license), ('es', es, es_license)]:
        (OUT / f'{language}.json').write_text(json.dumps(books, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
        notice = '\n'.join(line.rstrip() for line in license_text.decode('utf-8-sig').splitlines()).rstrip() + '\n'
        (OUT / f'{language}-source-license.html').write_text(notice, encoding='utf-8')
    (OUT / 'manifest.json').write_text(json.dumps({'en': en_meta, 'es': es_meta}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Imported BSB: {en_meta["segments"]} verses; BES: {es_meta["segments"]} verses. Both: 66 books / 1189 chapters.')
