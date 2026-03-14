/**
 * Types for cloud storage public link downloads.
 */

export type CloudProvider = 'dropbox' | 'gdrive' | 'onedrive';

export interface CloudProviderMatch {
  provider: CloudProvider;
  resourceType: 'file' | 'folder';
  /** Provider-specific ID extracted from the URL. */
  resourceId: string;
  /** The original URL, potentially normalized. */
  url: string;
}

export interface CloudDownloadResult {
  /** Local temp directory containing downloaded files. */
  localPath: string;
  /** Number of files downloaded. */
  fileCount: number;
  /** Total bytes downloaded. */
  totalBytes: number;
  /** Provider used. */
  provider: CloudProvider;
  /** Warnings (e.g., "OneDrive may require auth"). */
  warnings: string[];
  /** Cleanup function to remove the temp directory. */
  cleanup: () => void;
}

export interface CloudDownloadOptions {
  /** Request timeout in milliseconds (default: 30000). */
  timeout?: number;
  /** Max total download size in bytes (default: 500MB). */
  maxTotalBytes?: number;
  /** Max single file size in bytes (default: 100MB). */
  maxFileBytes?: number;
}
