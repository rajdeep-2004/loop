/** Limits shared by the API (enforcement) and the app (form hints). */
export const LIMITS = {
  nameMax: 60,
  usernameMin: 3,
  usernameMax: 24,
  passwordMin: 8,
  passwordMax: 72,
  bioMax: 200,
  tagMax: 30,
  tagsMax: 12,
  messageMax: 4000,
  /** How much of a message is shown when another message quotes it. */
  replyPreviewMax: 120,
  groupNameMax: 60,
  descriptionMax: 500,
  clubTextMax: 1000,
  announcementTitleMax: 120,
  announcementBodyMax: 2000,
  pageSizeDefault: 30,
  pageSizeMax: 50,
  groupMembersMax: 256,
  imageMaxBytes: 5 * 1024 * 1024,
  fileMaxBytes: 20 * 1024 * 1024,
  maxYear: 6,
} as const;

export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const FILE_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/zip',
] as const;
