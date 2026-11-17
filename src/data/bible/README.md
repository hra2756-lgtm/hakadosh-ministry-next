# Complete Gospel reader datasets

66 books (39 Old Testament + 27 New Testament), 1,189 chapters per language.
Downloaded 2026-11-17. Archive URLs and SHA-256 digests are in `manifest.json`.

- English: King James Version, supplied by eBible.org / CrossWire Bible Society.
  https://ebible.org/eng-kjv/copyright.htm
  Public domain outside the UK; Crown rights apply in the UK. Original source
  notice retained in `en-source-license.html`.
- Spanish: **Reina-Valera 1909 (RV1909)**, public domain.
  United Bible Societies, revision 10, supplied through Open.Bible:
  https://open.bible/bibles/reina-valera-1909
  The source archive's license metadata is retained in `es-source-license.xml`.
  This is RV1909, not RVA-2015. Original Spanish spelling is retained.

## Reader formatting and license scope

English USFX and Spanish USX sources are converted to JSON by
`scripts/build-bibles.py` (Python stdlib).
The reader preserves verse wording and individual numbering, normalizes XML whitespace,
and omits paragraph symbols, notes, book/section headings, Psalm titles, cross-references, Strong's
annotations, and typography. These are reader-formatting changes, not a new
translation. Footnote callers are also removed, including the source's inline
`fm` marker in 3 John 1:14. Spanish public-domain text has no license fee.
Source archives are kept outside the repository; there is no runtime API call.

Rebuild from downloaded archives:

```powershell
python scripts/build-bibles.py path/to/eng-kjv.zip path/to/rv1909-usx.zip
```

KJV source also contains apocrypha; the converter selects the 66-book canon
shared with RV1909. Both have 31,102 individually numbered verses, although
some chapter/verse boundaries differ. `src/lib/bible-alignment.mjs` maps these
differences without changing either text or the reader's original numbering.
The daily pool contains 31,084 complete one-to-one verse pairs from all 66 books.
Unequal groups (one English verse corresponding to two Spanish verses, or vice
versa) remain in the reader but are excluded from daily selection to avoid joining
verses. The existing Eastern-time date seed is preserved.

The earlier eBible RV1909 export joins some original verse endings and contains
empty padding markers. It is not used for this complete reader; the UBS USX
preserves those individual verses, e.g. all 38 verses in RV1909 Job 39.

Legacy NT-only KJV/RV1909 files and verification scripts are retained as historical
inputs; the homepage and reader now use these complete datasets.
