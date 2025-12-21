export interface WorkspaceFS {
  /**
   * Opens the system folder picker and returns a handle to the selected folder via `openFolder`.
   * Note: In Tauri, this might just return the path string wrapped in a handle.
   */
  openFolder(): Promise<FolderHandle | null>;

  /**
   * Opens the system save file picker and returns the selected path.
   */
  saveFile(defaultName?: string): Promise<string | null>;

  /**
   * Reads a file as a string.
   */
  readFile(path: string): Promise<string>;

  /**
   * Writes content to a file.
   */
  writeFile(path: string, content: string): Promise<void>;

  /**
   * Writes content atomically (e.g. via temp file + rename) if supported.
   */
  writeFileAtomic(path: string, content: string): Promise<void>;

  /**
   * Deletes a file or directory.
   */
  deletePath(path: string): Promise<void>; // using deletePath to be generic

  /**
   * Lists contents of a directory.
   */
  listDirectory(path: string): Promise<Entry[]>;

  /**
   * Checks if a path exists.
   */
  exists(path: string): Promise<boolean>;

  /**
   * Renames a file or directory.
   */
  renamePath(oldPath: string, newPath: string): Promise<void>;

  /**
   * Creates a directory.
   */
  /**
   * Creates a directory.
   */
  createDirectory(path: string): Promise<void>;

  /**
   * Returns the path to the system Documents directory.
   */
  getDocumentsDir(): Promise<string>;
}

export interface FolderHandle {
  path: string;
  name: string;
}

export interface Entry {
  name: string;
  path: string;
  type: 'file' | 'directory';
}

export interface FSEvent {
  type: 'create' | 'modify' | 'delete';
  path: string;
}

export type Unsubscribe = () => void;
