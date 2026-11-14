# TODOS

## Parked ideas (need approval before building)
- Announcement reach preview: show "this will reach N students" before sending, and "seen by X%" after. Not in the idea doc.

## Open review notes (from the spec review of docs/designs/campus-v1.md)
- Android APK via EAS Build for demo day (needs an Expo account; not done in the unattended build).
- Device smoke test once an emulator or simulator is installed.
- Run `/review` and `/cso` on `main` after the unattended build (skipped, see decisions D-004).

## Known debt
- M8 (attachments): deleting a message must also remove its attachment files from disk and clear `attachments` (D-008). Today delete erases text and reactions only; chat attachments do not exist yet.
