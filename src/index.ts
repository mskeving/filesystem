import pathUtils from 'node:path';
import { Buffer } from 'node:buffer';
import { Directory, File } from './FileSystemNode';

export enum NodeType {
  DIRECTORY = 'directory',
  FILE = 'file',
}
export const ROOT_PATH = '/';
export const MOVE_UP_PATHS = ['..', '../'];
export const CURRENT_DIR_PATHS = ['.', './'];

export enum ErrorMsg {
  AmbiguousPath = 'AmbiguousPath: Directory or File exists with this name',
  CannotUpdateRoot = 'CannotUpdateRoot',
  DirectoryNotFound = 'DirectoryNotFound',
  DirectoryExists = 'DirectoryExists',
  FileNotFound = 'FileNotFound',
  FileExists = 'FileExists: File with this name already exists',
  MissingPath = 'MissingPath',
  NotFound = 'NotFound: Directory or File not found',
  OutOfMemory = 'OutOfMemory: Not enough memory for this operation',
}

export class VirtualFileSystem {
  currentDir: Directory;
  totalFileContentBytes: number; // byte count of all file contents
  maxBytes: number; // max byte count for this file system

  constructor() {
    this.currentDir = new Directory({parent: null, name: ROOT_PATH})
    this.totalFileContentBytes = 0;
    this.maxBytes = 1073741824; // 1GB
  }

  getCurrentDir(): string {
    return this.currentDir.getPath();
  }

  getDirectoryContents(path?: string): string[] {
    const targetDir = path ? this._getTargetDirectory(path) : this.currentDir;
    if (targetDir === undefined) {
      throw new Error(`getContents ${path}: ${ErrorMsg.DirectoryNotFound}`);
    }
    return [
      ...targetDir.directoriesByName.keys(),
      ...targetDir.filesByName.keys()
    ]
  }

  getAvailableSpace() {
    return this.maxBytes - this.totalFileContentBytes;
  }

  changeDirectory(path?: string) {
    path = path ?? ROOT_PATH;
    const targetDir = this._getTargetDirectory(path);
    if (targetDir === undefined) {
      throw new Error(`cd: ${path}: ${ErrorMsg.DirectoryNotFound}`);
    }
    this.currentDir = targetDir;
  }

  makeDirectory(path: string) {
    if (path.length === 0) {
      throw new Error(`makeDirectory: ${path}: ${ErrorMsg.MissingPath}`)
    }
    path = pathUtils.normalize(path);
    const name = pathUtils.basename(path);
    const targetDir = this._getTargetDirectory(pathUtils.dirname(path));

    if (targetDir === undefined) {
      throw new Error(`makeDirectory: ${path}: ${ErrorMsg.DirectoryNotFound}`);
    }

    try {
      targetDir.createAndAddDirectory(name);
    } catch(e) {
      throw new Error(`makeDirectory: ${path}: ${e}`)
    }
  }

  makeFile(path: string) {
    path = pathUtils.normalize(path);
    const name = pathUtils.basename(path);
    const targetDir = this._getTargetDirectory(pathUtils.dirname(path));

    if (targetDir === undefined) {
      throw new Error(`makeFile: ${path}: ${ErrorMsg.DirectoryNotFound}`);
    }

    try {
      targetDir.createAndAddFile(name);
    } catch(e) {
      throw new Error(`makeFile: ${path}: ${e}`)
    }
  }

  removeDirectory(path: string) {
    const dir = this._getTargetDirectory(path);
    if (dir === undefined) {
      throw new Error(`removeDirectory: ${path}: ${ErrorMsg.DirectoryNotFound}`)
    }
    if (dir.parent === null) {
      throw new Error(`removeDirectory: ${path}: ${ErrorMsg.CannotUpdateRoot}`)
    }

    // update byte count for all removed files in directory
    const totalFileContentBytes = dir.getTotalByteCount();
    this.totalFileContentBytes -= totalFileContentBytes;

    dir.parent.removeDirectory(dir.name);
  }

  removeFile(path: string) {
    const file = this._getTargetFile(path);
    if (file === undefined) {
      throw new Error(`removeFile: ${path}: ${ErrorMsg.FileNotFound}`)
    }
    if (file.content) {
      this.totalFileContentBytes -= Buffer.byteLength(file.content);
    }
    file.parent.removeFile(file.name);
  }

  readFile(path: string) {
    const file = this._getTargetFile(path);
    if (file === undefined) {
      throw new Error(`readFile: ${path}: ${ErrorMsg.FileNotFound}`);
    }
    return file.content;
  }

  writeFile(path: string, content: string | Buffer) {
    const file = this._getTargetFile(path);
    if (file === undefined) {
      throw new Error(`writeFile: ${path}: ${ErrorMsg.FileNotFound}`);
    }

    const totalFileContentBytes = Buffer.byteLength(content);
    if (this.totalFileContentBytes + totalFileContentBytes > this.maxBytes) {
      throw new Error(`writeFile ${path}: ${ErrorMsg.OutOfMemory}`)
    }

    file.setContent(content);
    this.totalFileContentBytes += totalFileContentBytes;
  }

  /**
   * Moves file from path to target path and removes from its previous location.
   * If file already exists at targetPath, it is replaced.
   * If targetPath doesn't exist, an error is thrown. If you'd prefer to rename
   * the file, use this.renameFile instead.
   * 
   * @param path Path to existing file
   * @param targetPath Path to file's target location
   */
  moveFile(path: string, targetDirPath: string) {
    const file = this._getTargetFile(path);
    const targetDir = this._getTargetDirectory(targetDirPath);

    if (file === undefined) {
      throw new Error(`moveFile: ${path}: ${ErrorMsg.FileNotFound}`);
    }
    if (targetDir === undefined) {
      throw new Error(`moveFile: ${targetDirPath}: ${ErrorMsg.DirectoryNotFound}`);
    }

    const originalParent = file.parent;
    targetDir.addFile(file);
    originalParent.removeFile(file.name);
  }

  renameFile(path: string, name: string) {
    const file = this._getTargetFile(path);
    const originalName = pathUtils.basename(path);
    if (file === undefined) {
      throw new Error(`moveFile: ${path}: ${ErrorMsg.FileNotFound}`);
    }
    file.update({name});
    file.parent.removeFile(originalName)
  }

  renameDirectory(path: string, name: string) {
    if (pathUtils.normalize(path) === ROOT_PATH) {
      throw new Error(`moveDirectory ${path}: ${ErrorMsg.CannotUpdateRoot}`);
    }
    const directory = this._getTargetDirectory(path);
    const originalName = pathUtils.basename(path);
    if (directory === undefined) {
      throw new Error(`moveDirectory: ${path}: ${ErrorMsg.DirectoryNotFound}`);
    }
    directory.update({name});
    directory.parent?.removeDirectory(originalName)
  }

  /**
   * Moves directory from path to target path and removes from its previous location.
   * If directory already exists at targetPath, it is replaced.
   * If targetPath doesn't exist, an error is thrown. If you'd prefer to rename
   * the directory, use `this.renameDirectory` instead.
   * 
   * @param path Path to existing directory
   * @param targetPath Path to directory's target location
   */
  moveDirectory(path: string, targetDirPath: string) {
    if (pathUtils.normalize(path) === ROOT_PATH) {
      throw new Error(`moveDirectory ${path}: ${ErrorMsg.CannotUpdateRoot}`);
    }

    const directory = this._getTargetDirectory(path);
    const targetDir= this._getTargetDirectory(targetDirPath);

    if (directory === undefined) {
      throw new Error(`moveDirectory ${path}: ${ErrorMsg.DirectoryNotFound}`);
    }
    if (targetDir=== undefined) {
      throw new Error(`moveDirectory ${targetDirPath}: ${ErrorMsg.DirectoryNotFound}`);
    }

    const originalParent = directory.parent;
    targetDir.addDirectory(directory);
    originalParent?.removeDirectory(directory.name);

    // if moving current directory to a new location, update this.currentDir to new location
    if (pathUtils.relative(this.currentDir.getPath(), path) === '') {
      this.currentDir = directory;
    }
  }

  /**
   * Given a filename, find all directories or files with the same name.
   * If `path` is provided, search will start from there. Otherwise it will
   * start from this.currentDir. Return array includes all nested file and directory paths.
   * In future, consider adding options to further specify search, such as levels deep, or
   * excluded paths.
   */
  find(name: string, path?: string): string[] {
    path = path ?? CURRENT_DIR_PATHS[0]; // if no path provided, start search from current directory
    const matches: string[] = [];
    const parentDir = this._getTargetDirectory(path);
    
    if (parentDir === undefined) {
      throw new Error(`find: ${path}: ${ErrorMsg.DirectoryNotFound}`);
    }
    
    const foundFile = parentDir.filesByName.get(name);
    if (foundFile) {
      matches.push(foundFile.getPath());
    }

      parentDir.directoriesByName.forEach(dir => {
        if (dir.name === name) {
          matches.push(dir.getPath());
        }
        matches.push(...this.find(name, dir.getPath()));
      })

    return matches;
  }

  _getRoot(): Directory {
    let dir = this.currentDir;
    while (dir.parent !== null) {
      dir = dir.parent;
    }
    return dir;
  }

  /**
   * Returns the target File or Directory node for a given path.
   * Handles relative and absolute paths. Returns undefined if node is not found.
   * 
   * Depending on usage, this could be made more efficient by taking the relative
   * path from this.currentDir if it's shorter than the path provided
   * `pathUtils.relative(this.currentDir.getPath(), path)`
   */
  _getTarget(path: string, type: NodeType): Directory | File | undefined {
    path = pathUtils.normalize(path);
    if (type === NodeType.DIRECTORY) {
      if (CURRENT_DIR_PATHS.includes(path)) return this.currentDir;
      if (path === ROOT_PATH) return this._getRoot();
      if (MOVE_UP_PATHS.includes(path)) {
        return this.currentDir.parent ? this.currentDir.parent : this.currentDir;
      }
    }

    // split path into directory names. `.filter(Boolean)` ensures no empty strings.
    const pathArray = pathUtils.dirname(path).split('/').filter(Boolean);
    let currDir: Directory | undefined = pathUtils.isAbsolute(path) ? this._getRoot() : this.currentDir;

    // Move through path to get to target node. 
    for (let nextPath of pathArray) {
      if (MOVE_UP_PATHS.includes(nextPath)) {
        if (currDir.parent !== null) currDir = currDir.parent;
      }
      else if (CURRENT_DIR_PATHS.includes(nextPath)) continue;
      else currDir = currDir.directoriesByName.get(nextPath);

      // TODO: return error message with path up to this point
      if (currDir === undefined) return;
    }
    
    const targetName = pathUtils.basename(path); 
    if (type === NodeType.DIRECTORY) return currDir.directoriesByName.get(targetName)
    if (type === NodeType.FILE) return currDir.filesByName.get(targetName);
  }

  _getTargetDirectory(path: string) {
    return this._getTarget(path, NodeType.DIRECTORY) as Directory | undefined;
  }

  _getTargetFile(path: string) {
    return this._getTarget(path, NodeType.FILE) as File | undefined;
  }
}

