"""Extract the public-domain RV1909 New Testament from eBible.org USFX.

Usage: python scripts/build-rv1909-nt.py /path/to/spaRV1909_usfx.xml
Only Python's standard library is required; no network access occurs here.
"""

import json
from pathlib import Path
import sys
import xml.etree.ElementTree as ET

BOOKS = [
    ('MAT', 'Matthew', 'Mateo'), ('MRK', 'Mark', 'Marcos'),
    ('LUK', 'Luke', 'Lucas'), ('JHN', 'John', 'Juan'),
    ('ACT', 'Acts', 'Hechos'), ('ROM', 'Romans', 'Romanos'),
    ('1CO', '1Corinthians', '1 Corintios'), ('2CO', '2Corinthians', '2 Corintios'),
    ('GAL', 'Galatians', 'Gálatas'), ('EPH', 'Ephesians', 'Efesios'),
    ('PHP', 'Philippians', 'Filipenses'), ('COL', 'Colossians', 'Colosenses'),
    ('1TH', '1Thessalonians', '1 Tesalonicenses'),
    ('2TH', '2Thessalonians', '2 Tesalonicenses'),
    ('1TI', '1Timothy', '1 Timoteo'), ('2TI', '2Timothy', '2 Timoteo'),
    ('TIT', 'Titus', 'Tito'), ('PHM', 'Philemon', 'Filemón'),
    ('HEB', 'Hebrews', 'Hebreos'), ('JAS', 'James', 'Santiago'),
    ('1PE', '1Peter', '1 Pedro'), ('2PE', '2Peter', '2 Pedro'),
    ('1JN', '1John', '1 Juan'), ('2JN', '2John', '2 Juan'),
    ('3JN', '3John', '3 Juan'), ('JUD', 'Jude', 'Judas'),
    ('REV', 'Revelation', 'Apocalipsis'),
]


def extract_book(element, book, spanish_name):
    chapter = None
    verse = None
    parts = []
    result = []

    def flush():
        nonlocal verse, parts
        if verse is not None:
            text = ' '.join(''.join(parts).split())
            result.append(dict(book=book, chapter=chapter, verse=verse,
                               reference=f'{spanish_name} {chapter}:{verse}', text=text))
        verse, parts = None, []

    def walk(node):
        nonlocal chapter, verse
        if node.tag in {'f', 'fe', 'x', 'h', 'toc', 'id', 's', 'r', 'rem'}:
            return  # Footnotes, cross references, and editorial headings are not verse text.
        if node.tag == 'c':
            flush()
            chapter = int(node.attrib['id'])
        elif node.tag == 'v':
            flush()
            verse = int(node.attrib['id'])
        elif node.tag == 've':
            flush()
        if verse is not None and node.text:
            parts.append(node.text)
        for child in node:
            walk(child)
            if verse is not None and child.tail:
                parts.append(child.tail)

    walk(element)
    flush()
    return result


def main():
    root = ET.parse(sys.argv[1]).getroot()
    source_books = {element.attrib['id']: element for element in root.findall('book')}
    verses = []
    for code, book, name in BOOKS:
        verses.extend(extract_book(source_books[code], book, name))

    # RV1909 combines these passages differently from KJV. Split only at the
    # verified sentence boundaries, retaining the Spanish source references.
    # See ACT19.htm and 2CO13.htm at https://ebible.org/spaRV1909/.
    by_key = {(v['book'], v['chapter'], v['verse']): v for v in verses}
    acts40 = by_key['Acts', 19, 40]
    acts41 = by_key['Acts', 19, 41]
    ending = 'Y habiendo dicho esto, despidió la concurrencia.'
    if acts41['text'] or not acts40['text'].endswith(ending):
        raise ValueError('Unexpected source for Acts 19:40-41; review alignment')
    acts40['text'] = acts40['text'][:-len(ending)].rstrip()
    acts41.update(text=ending, reference='Hechos 19:40', kjvReference='Hechos 19:41')

    cor12 = by_key['2Corinthians', 13, 12]
    cor13 = by_key['2Corinthians', 13, 13]
    cor14 = by_key['2Corinthians', 13, 14]
    greeting = 'Todos los santos os saludan.'
    if cor14['text'] or not cor12['text'].endswith(greeting):
        raise ValueError('Unexpected source for 2 Corinthians 13:12-14; review alignment')
    cor14.update(text=cor13['text'], reference='2 Corintios 13:13',
                 kjvReference='2 Corintios 13:14')
    cor13.update(text=greeting, reference='2 Corintios 13:12',
                 kjvReference='2 Corintios 13:13')
    cor12['text'] = cor12['text'][:-len(greeting)].rstrip()

    project = Path(__file__).resolve().parents[1]
    english = json.loads((project / 'src/data/kjv-nt.json').read_text(encoding='utf-8'))
    key = lambda item: (item['book'], item['chapter'], item['verse'])
    spanish_keys = {key(item) for item in verses}
    empty = [item['reference'] for item in verses if not item['text']]
    if empty:
        raise ValueError(f'Empty source verses: {empty}')
    if len(spanish_keys) != len(verses):
        raise ValueError('Duplicate Spanish references')
    if spanish_keys != {key(item) for item in english}:
        english_keys = {key(item) for item in english}
        raise ValueError(f'References differ: missing={english_keys - spanish_keys}, extra={spanish_keys - english_keys}')
    output = project / 'src/data/rv1909-nt.json'
    output.write_text(json.dumps(verses, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Wrote {len(verses)} verses from {len(BOOKS)} books to {output}')


if __name__ == '__main__':
    main()
