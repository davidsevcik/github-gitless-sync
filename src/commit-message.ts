/**
 * The changes a sync commit applies to the remote repository.
 * The manifest file must not be part of these, it changes in every commit.
 */
export interface CommitChanges {
  added: string[];
  updated: string[];
  deleted: string[];
}

// Max number of files listed in the body of a commit message
const MAX_LISTED_FILES = 20;

/**
 * Builds the message of a sync commit, describing what changed in the
 * remote repository and which device made the change.
 *
 * @param changes Files changed by the commit
 * @param device Name of the device that is syncing
 * @param firstSync Whether this is the first sync of the device
 */
export function buildCommitMessage(
  changes: CommitChanges,
  device: string,
  firstSync: boolean = false,
): string {
  const sections = [
    { verb: "Add", label: "added", files: [...changes.added].sort() },
    { verb: "Update", label: "updated", files: [...changes.updated].sort() },
    { verb: "Delete", label: "deleted", files: [...changes.deleted].sort() },
  ].filter((section) => section.files.length > 0);
  const total = sections.reduce((sum, s) => sum + s.files.length, 0);
  const prefix = firstSync ? "First sync" : "Sync";

  if (total === 0) {
    // Nothing changed in the remote apart from the manifest, this happens
    // when the device only downloaded files.
    return firstSync
      ? `First sync from ${device}`
      : `Sync metadata from ${device}`;
  }

  if (total === 1 && !firstSync) {
    return `${sections[0].verb} ${sections[0].files[0]} (${device})`;
  }

  const counts = sections
    .map((section) => `${section.files.length} ${section.label}`)
    .join(", ");
  const subject = `${prefix} from ${device}: ${counts}`;

  let listed = 0;
  const body: string[] = [];
  for (const section of sections) {
    if (listed >= MAX_LISTED_FILES) {
      break;
    }
    const files = section.files.slice(0, MAX_LISTED_FILES - listed);
    listed += files.length;
    const label = section.label[0].toUpperCase() + section.label.slice(1);
    body.push(`${label}:\n${files.map((f) => `- ${f}`).join("\n")}`);
  }
  if (total > listed) {
    body.push(`...and ${total - listed} more`);
  }
  return `${subject}\n\n${body.join("\n\n")}`;
}

/**
 * The changes a sync applies to the local vault.
 */
export interface LocalChanges {
  downloaded: string[];
  deleted: string[];
}

/**
 * Describes a list of changes in a single line, naming the file
 * if there's only one and counting them otherwise.
 */
function describeChanges(
  sections: { label: string; files: string[] }[],
): string {
  const changed = sections.filter((section) => section.files.length > 0);
  const total = changed.reduce((sum, s) => sum + s.files.length, 0);
  if (total === 1) {
    return `${changed[0].label} ${changed[0].files[0]}`;
  }
  return changed
    .map((section) => `${section.files.length} ${section.label}`)
    .join(", ");
}

/**
 * Builds the text shown to the user when a sync is done, it tells what
 * has been sent to the remote repository and what has been received.
 *
 * @param sent Files changed in the remote repository, same as in the sync commit
 * @param received Files changed in the local vault
 */
export function buildSyncSummary(
  sent: CommitChanges,
  received: LocalChanges,
): string {
  const lines: string[] = [];
  if (sent.added.length + sent.updated.length + sent.deleted.length > 0) {
    lines.push(
      `Sent: ${describeChanges([
        { label: "added", files: sent.added },
        { label: "updated", files: sent.updated },
        { label: "deleted", files: sent.deleted },
      ])}`,
    );
  }
  if (received.downloaded.length + received.deleted.length > 0) {
    lines.push(
      `Received: ${describeChanges([
        { label: "downloaded", files: received.downloaded },
        { label: "deleted", files: received.deleted },
      ])}`,
    );
  }
  if (lines.length === 0) {
    return "Nothing to sync";
  }
  return `Sync successful\n${lines.join("\n")}`;
}
