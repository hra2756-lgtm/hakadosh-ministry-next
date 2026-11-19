# Complete Gospel reader datasets

Both editions contain 66 books (39 Old Testament + 27 New Testament) and 1,189
chapters. Sources verified/downloaded November 18, 2026. Archive SHA-256 digests,
edition details, source URLs, and intentional verse gaps are in `manifest.json`.

- **Berean Standard Bible (BSB), 3rd Printing.** The publisher dedicated the
  translation to the public domain on April 30, 2023:
  https://berean.bible/terms.htm . Official USX download:
  https://bereanbible.com/bsb_usx.zip . The downloaded terms page is retained in
  `en-source-license.html`.
- **La Biblia en Español Sencillo (BES), Segunda Edición (2026).** Irma Flores,
  AudioBiblia.org. The publisher explicitly places text and audio in the public
  domain: https://audiobiblia.org/spabes_ab/spabes.htm . Distributed as USFX by
  https://ebible.org/Scriptures/spabes_usfx.zip . Its public-domain notice is
  retained in `es-source-license.html`:
  https://ebible.org/spabes/copyright.htm . This is BES, not NBV, NVI, or RV1909.

## Faithful import and numbering

`scripts/build-bibles.py` uses only Python's standard library. It preserves the
published verse wording and numbering and normalizes XML whitespace. Editorial
book/section headings, cross-references, notes, Strong's metadata, speaker labels,
and alphabetic acrostic headings are not rendered. BSB superscriptions inside
numbered verses are retained; BES's unnumbered Psalm titles are separate in its
source and are not imported as verses. Poetry becomes ordinary verse paragraphs.
No text is translated, paraphrased, or supplied from a different edition.

BSB has **31,086 main-text verses**. Its publisher places 16 traditional positions
in footnotes instead of the main text; these positions are explicitly enumerated
and checked in the importer and manifest. The reader retains those numbering gaps
and does not invent verses to fill them. BES has **31,102 individual verses**.
Neither imported edition combines verse markers into bridges.

Both use matching chapter/verse numbering. The daily pool has **31,086 pairs**,
one complete verse in each language, spanning all 66 books. The previous
KJV/RV1909 chapter-boundary adjustments no longer apply. The Eastern-time daily
seed is unchanged. Each daily card links to exactly the text displayed.

Search, automatic blog quotations, share-page metadata, and generated images all
read the same datasets. Images use edition-specific cache URLs. Highlight storage
keys changed for both languages to prevent old character offsets being applied
to different text. `book-aliases.json` preserves prior edition names/abbreviations
for existing searches and blog references; display names come from the new source.

## Reproduce

Download the two archives and BSB terms page, then run:

```powershell
python scripts/build-bibles.py path/to/bsb_usx.zip path/to/spabes_usfx.zip path/to/bsb-terms.html
npm.cmd run test:bible
```

Both sources are fully validated before either output is written. Future source
changes with new gaps/counts fail validation and require review. Source archives
stay outside Git; there is no runtime Bible API, key, subscription, or new package.

Legacy NT-only KJV/RV1909 datasets and their scripts are retained as historical
inputs. They do not supply the active reader, homepage, blog quotations, or images.
