"""Build the 66-book reader from eBible USFX archives, using only Python's stdlib.

Usage: python scripts/build-bibles.py /path/to/eng-kjv.zip /path/to/rv1909-usx.zip
Downloads and license details are documented in src/data/bible/README.md.
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
SKIP = {'f', 'fe', 'x', 's', 'sr', 'r', 'd', 'h', 'id', 'toc', 'cl', 'cp', 'ca', 'va', 'vp', 'fig', 'rem'}


def convert(archive_path, source, language):
    raw = Path(archive_path).read_bytes()
    archive = zipfile.ZipFile(io.BytesIO(raw))
    names = {b.attrib['code']: b.attrib for b in ET.fromstring(archive.read('BookNames.xml'))}
    root = ET.fromstring(archive.read(source + '_usfx.xml'))
    books = {}
    for book in root.findall('book'):
        code = book.attrib['id']
        if code not in CANON:
            continue
        chapters = []
        chapter = None
        current = None
        parts = []

        def finish():
            nonlocal current, parts
            if current is not None:
                text = re.sub(r'\s+', ' ', ''.join(parts).replace('¶', '')).strip()
                # XML wraps Strong's words onto new lines, including before punctuation.
                text = re.sub(r'\s+([,.;:!?])', r'\1', text)
                assert text, (code, chapter, current)
                span = current.split('-')
                assert all(n.isdigit() for n in span) and len(span) <= 2, current
                start, end = int(span[0]), int(span[-1])
                assert 1 <= start <= end <= 200
                chapters[chapter - 1].append({'verse': current, 'start': start, 'end': end, 'text': text})
            current, parts = None, []

        def walk(element):
            nonlocal chapter, current
            if element.tag in SKIP or (element.tag == 'p' and element.get('sfm', '').startswith(('mt', 'imt', 'is', 'ip'))):
                return
            if element.tag == 'c':
                finish()
                chapter = int(element.attrib['id'])
                assert chapter == len(chapters) + 1, (code, chapter)
                chapters.append([])
            elif element.tag == 'v':
                finish()
                current = element.attrib['id']
            elif element.tag == 've':
                finish()
            if element.text and current is not None:
                parts.append(element.text)
            for child in element:
                walk(child)
                if child.tail and current is not None:
                    parts.append(child.tail)

        walk(book)
        finish()
        assert chapters and all(chapters), code
        for verses in chapters:
            assert all(a['end'] < b['start'] for a, b in zip(verses, verses[1:])), code
        books[code] = {'id': code, 'name': names[code]['short'], 'abbr': names[code]['abbr'], 'chapters': chapters}
    assert set(books) == set(CANON)
    ordered = [books[code] for code in CANON]
    assert sum(len(b['chapters']) for b in ordered) == 1189
    (OUT / (language + '.json')).write_text(json.dumps(ordered, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    (OUT / (language + '-source-license.html')).write_bytes(archive.read('copr.htm'))
    return {'source': f'https://ebible.org/Scriptures/{source}_usfx.zip', 'sha256': hashlib.sha256(raw).hexdigest(), 'books': 66, 'chapters': 1189, 'segments': sum(len(c) for b in ordered for c in b['chapters']), 'coveredVerses': sum(v['end'] - v['start'] + 1 for b in ordered for c in b['chapters'] for v in c)}


def convert_rv1909(archive_path):
    raw = Path(archive_path).read_bytes()
    archive = zipfile.ZipFile(io.BytesIO(raw))
    books = {}
    for filename in archive.namelist():
        if not filename.endswith('.usx'):
            continue
        root = ET.fromstring(archive.read(filename))
        code = root.find('book').attrib['code']
        if code not in CANON:
            continue
        name = ''.join(root.find("para[@style='toc2']").itertext()).strip()
        abbr = ''.join(root.find("para[@style='toc3']").itertext()).strip()
        chapters, parts = [], []
        chapter, verse = None, None

        def finish():
            nonlocal verse, parts
            if verse is not None:
                text = re.sub(r'\s+', ' ', ''.join(parts)).strip()
                assert text and verse.isdigit(), (code, chapter, verse)
                number = int(verse)
                assert number == len(chapters[chapter - 1]) + 1, (code, chapter, number)
                chapters[chapter - 1].append({'verse': verse, 'start': number, 'end': number, 'text': text})
            verse, parts = None, []

        def walk(node):
            nonlocal chapter, verse
            style = node.get('style', '')
            if node.tag in {'book', 'note'} or style in {'ca', 'va', 'vp', 'd', 'fm'} or (node.tag == 'para' and style.startswith(('h', 'toc', 'mt', 's', 'r', 'rem'))):
                return
            if node.tag == 'chapter' and node.get('number'):
                finish()
                chapter = int(node.get('number'))
                assert chapter == len(chapters) + 1
                chapters.append([])
            elif node.tag == 'verse':
                finish()
                verse = node.get('number')
            if node.tag == 'para' and verse is not None:
                parts.append(' ')
            if node.text and verse is not None:
                parts.append(node.text)
            for child in node:
                walk(child)
                if child.tail and verse is not None:
                    parts.append(child.tail)

        walk(root)
        finish()
        assert all(chapters)
        books[code] = {'id': code, 'name': name, 'abbr': abbr, 'chapters': chapters}
    assert set(books) == set(CANON)
    ordered = [books[code] for code in CANON]
    assert sum(len(b['chapters']) for b in ordered) == 1189
    (OUT / 'es.json').write_text(json.dumps(ordered, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    (OUT / 'es-source-license.xml').write_bytes(archive.read('license.xml'))
    return {'source': 'https://open.bible/bibles/reina-valera-1909', 'download': 'https://api.open.bible/artifactContent/67c4a8cf-fa7c-487d-aa83-a9ba5bac4f4d', 'provider': 'United Bible Societies', 'revision': 10, 'sha256': hashlib.sha256(raw).hexdigest(), 'books': 66, 'chapters': 1189, 'segments': sum(len(c) for b in ordered for c in b['chapters'])}


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    assert len(sys.argv) == 3, 'Supply both source archives.'
    manifest = {'en': convert(sys.argv[1], 'eng-kjv', 'en'), 'es': convert_rv1909(sys.argv[2])}
    (OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(manifest, indent=2))
