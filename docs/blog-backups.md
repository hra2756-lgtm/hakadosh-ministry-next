# Production blog backups

This is a manual export workflow for Sanity project `2a3jhsqe`, dataset
`production`. It does not change or publish any Sanity documents. It does not
include Upstash likes, website secrets, external YouTube videos, or Git history.

## Run a backup

Install the Studio dependencies first (`npm.cmd --prefix studio ci`). Sign into
the local Sanity CLI with the same owner account used in Studio:

```powershell
npm.cmd --prefix studio run login
```

From the repository directory, configure an existing private Google Drive desktop
folder on the first run. Pass an absolute folder path:

```powershell
npm.cmd run backup:blog -- --destination "<absolute path to your private backup folder>"
```

The destination is saved in ignored `backups/settings.json`. Later runs only need:

```powershell
npm.cmd run backup:blog
```

The CLI uses the owner's existing local sign-in. No token is added to Vercel,
source code, settings.json, or the archive. Keep the Google Drive folder Restricted
to your own account: archives include private drafts as well as published content.

## What the command checks

1. Export with the installed Sanity CLI, explicitly choosing Production. Include
   all documents, drafts and uploaded asset binaries; keep strict asset verification.
2. Reject a failed export or reported missing/skipped assets.
3. Read the gzip/tar archive without extracting it. Parse documents, reject duplicate
   IDs, verify referenced asset files are present, and check their content hashes.
4. Retain a dated local archive under ignored `backups/`.
5. Copy the archive to the selected folder, compare SHA-256 hashes, then finalize
   the filename and write a JSON report containing counts/checksum, not post text.

Date stamps in filenames are UTC. A random suffix prevents collisions. Incomplete
work retains a `.partial` name. The script does not overwrite older backups or
delete archives automatically. Finished `.tar.gz` and `.tar.gz.json` files go together.

**Google Drive sync is separate.** A matching local checksum confirms only the
copied bytes on this PC. Wait for Drive's upload to finish and verify the dated
archive is visible at drive.google.com. The report initially records
`cloudUploadVerified: false`, because this script cannot verify Google's cloud state.
Sync is bidirectional; deleting the Drive copy may also delete the cloud copy.
The separate repository-local archive is not deleted by the backup command.

Run a backup after publishing or major edits, while avoiding simultaneous edits
if you need a consistent snapshot. No scheduled task or automatic export is installed.
Retain separate dated backups and monitor PC/Drive storage; any pruning is manual.

## Verify a downloaded copy / recovery

Download an archive from Google Drive to a local folder, then run:

```powershell
npm.cmd run backup:blog -- --verify "<absolute archive path>"
```

Compare the displayed SHA-256 with its matching JSON report. This checks the
archive's data and asset bytes, **not a completed Sanity restore**. A full recovery
drill still requires importing into a separate empty test dataset/project, inspecting
the restored text, formatting and images, and comparing counts. Never test recovery
against `production` or overwrite existing development posts. No restore is performed
by this backup command; the report records `sanityRestoreTested: false`.

The archive can be imported with the Sanity CLI when a deliberate recovery is needed.
It is also readable offline as NDJSON and media files. It is not a website outage
fallback: serving backup content during a Sanity outage needs separate implementation.

Tests: `npm.cmd run test:backup` (requires Studio dependencies). Tests use synthetic
archives and make no Sanity or Google Drive requests.

Reference: https://www.sanity.io/docs/content-lake/exporting-data
