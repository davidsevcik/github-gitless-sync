import { Vault } from "obsidian";
import ignore, { Ignore } from "ignore";
import { MANIFEST_FILE_NAME } from "./metadata-store";

export const GITIGNORE_FILE_NAME = ".gitignore" as const;

/**
 * Tells which files must not be synced according to the rules in the
 * .gitignore file in the vault root.
 * Rules follow the same syntax git uses.
 */
export default class GitIgnore {
  private matcher: Ignore = ignore();

  constructor(private vault: Vault) {}

  /**
   * Loads the rules from the .gitignore file in the vault root.
   * If the file doesn't exist no file is ignored.
   */
  async load() {
    if (await this.vault.adapter.exists(GITIGNORE_FILE_NAME)) {
      this.setRules(await this.vault.adapter.read(GITIGNORE_FILE_NAME));
    } else {
      this.setRules("");
    }
  }

  /**
   * Replaces the current rules.
   * @param content Content of a .gitignore file
   */
  setRules(content: string) {
    this.matcher = ignore().add(content);
  }

  /**
   * Returns true if the file must not be synced.
   * @param filePath Path relative to the vault root, folders must end with "/"
   */
  ignores(filePath: string): boolean {
    if (
      filePath === GITIGNORE_FILE_NAME ||
      filePath === `${this.vault.configDir}/${MANIFEST_FILE_NAME}`
    ) {
      // These must always be synced, no matter the rules, or
      // syncing would break.
      return false;
    }
    try {
      return this.matcher.ignores(filePath);
    } catch {
      // The path is not one the rules can be applied to, e.g. the vault root
      return false;
    }
  }
}
