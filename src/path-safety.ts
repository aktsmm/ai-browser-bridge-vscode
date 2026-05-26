import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { isSafeRelativePath } from "./relative-path";

export { isSafeRelativePath } from "./relative-path";

export function isWithinWorkspace(
  workspaceUri: vscode.Uri,
  targetUri: vscode.Uri,
): boolean {
  const workspacePath = normalizeForComparison(
    resolveExistingAncestorPath(path.resolve(workspaceUri.fsPath)),
  );

  const targetPath = normalizeForComparison(
    resolveExistingAncestorPath(path.resolve(targetUri.fsPath)),
  );

  return (
    targetPath === workspacePath ||
    targetPath.startsWith(`${workspacePath}${path.sep}`)
  );
}

function normalizeForComparison(filePath: string): string {
  const resolved = path.resolve(filePath);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function resolveExistingAncestorPath(filePath: string): string {
  let currentPath = path.resolve(filePath);

  while (true) {
    if (fs.existsSync(currentPath)) {
      try {
        return fs.realpathSync.native(currentPath);
      } catch {
        return currentPath;
      }
    }

    const parentPath = path.dirname(currentPath);
    if (parentPath === currentPath) {
      return currentPath;
    }

    currentPath = parentPath;
  }
}

export function toWorkspaceFileUri(
  workspaceUri: vscode.Uri,
  relativePath: string,
): vscode.Uri | null {
  if (!isSafeRelativePath(relativePath)) {
    return null;
  }

  const segments = relativePath.replace(/\\/g, "/").split("/").filter(Boolean);
  const fileUri = vscode.Uri.joinPath(workspaceUri, ...segments);

  return isWithinWorkspace(workspaceUri, fileUri) ? fileUri : null;
}
