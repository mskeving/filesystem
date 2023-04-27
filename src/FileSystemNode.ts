import pathUtils from 'node:path';
import { Buffer } from 'node:buffer';
import { NodeType, ErrorMsg, ROOT_PATH } from './index';


export class FileSystemNode {
  parent: Directory | null;
  name: string;

  constructor({parent, name}: {parent: Directory | null, name: string}) {
    this.parent = parent;
    this.name = name;
  }

  /**
   * Builds absolute path from root recursively via parents
   */
  getPath(): string {
    if (this.parent === null) {
      return this.name; // reached root directory
    }
    return pathUtils.normalize(this.parent.getPath() + '/' + this.name);
  }
}

export class Directory extends FileSystemNode {
  filesByName: Map<string, File>
  directoriesByName: Map<string, Directory>
  type: NodeType;

  constructor({parent, name}: {parent: Directory | null, name: string}) {
    super({ parent, name });
    this.type = NodeType.DIRECTORY;

    // `filesByName` and `directoriesByName` are any directories and files
    // stored within this directory. Separate maps are used to remove need for type
    // checking throughout the code. To prevent ambiguous paths with files and directories
    // with the same name, checks are made in create and update methods.
    this.filesByName = new Map();
    this.directoriesByName = new Map();
  }

  update({name, parent}: {name?: string, parent?: Directory}) {
    if (this.parent === null) {
      throw new Error(ErrorMsg.CannotUpdateRoot);
    }
    const originalParent = this.parent;
    const originalName = this.name;
    name = name ?? this.name;
    parent = parent ?? this.parent;

    if (parent.filesByName.get(name)) {
      // if file already exists cannot create directory with same name
      throw new Error(ErrorMsg.AmbiguousPath);
    }

    this.name = name;
    this.parent = parent;

    this.parent.addDirectory(this);
    originalParent.removeDirectory(originalName);
  }

  createAndAddDirectory(name: string) {
    if (name === ROOT_PATH) {
      throw new Error(ErrorMsg.DirectoryExists)
    }

    this.addDirectory(new Directory({parent: this, name}));
  }

  /**
   * Adds directory to this.directoriesByName.
   * If directory already exists with same name, it is replaced.
   */
  addDirectory(dir: Directory) {
    if (this.hasFile(dir.name)) {
      // Cannot create directory with same name.
      // If directory exists, it is replaced with this directory.
      throw new Error(ErrorMsg.AmbiguousPath);
    }
    dir.parent = this;
    this.directoriesByName.set(dir.name, dir);
  }

  /**
   * Returns true if name is a subdirectory of `this`.
   * Only checks one level deep.
   */
  hasDirectory(name: string) {
    return !!this.directoriesByName.get(name);
  }

  /**
   * Returns true `this` has file.
   * Only checks one level deep.
   */
  hasFile(name: string) {
    return !!this.filesByName.get(name);
  }

  createAndAddFile(name: string, content?: string | Buffer) {
    this.addFile(new File({parent: this, name, content}));
  }

  /**
   * If file already exists with same name, it is replaced
   */
  addFile(file: File) {
    if (this.hasDirectory(file.name)) {
      // if directory already exists cannot create directory with same name
      throw new Error(ErrorMsg.AmbiguousPath);
    }
    file.parent = this;
    this.filesByName.set(file.name, file);
  }

  removeDirectory(name: string) {
    if (name === ROOT_PATH) {
      throw new Error(ErrorMsg.CannotUpdateRoot);
    }
    this.directoriesByName.delete(name);
  }

  removeFile(name: string) {
    this.filesByName.delete(name);
  }

  getTotalByteCount(): number {
    let totalByteCount = 0;
    for (const file of this.filesByName.values()) {
      totalByteCount += file.contentByteCount ?? 0;
    }
    for (const directory of this.directoriesByName.values()) {
      totalByteCount += directory.getTotalByteCount();
    }
    return totalByteCount;
  }
}

export class File extends FileSystemNode {
  type: NodeType;
  parent: Directory;
  content?:string | Buffer;
  contentByteCount?: number;

  constructor({parent, name, content}: {parent: Directory, name: string, content?: string | Buffer}) {
    super({ parent, name });
    this.parent = parent;
    this.type = NodeType.FILE;
    if (content) {
      this.content = content;
      this.contentByteCount = Buffer.byteLength(content);
    }
  }

  update({name, parent, content}: {name?: string, parent?: Directory, content?: string | Buffer}) {
    const originalName = this.name;
    const originalParent = this.parent;
    name = name ?? this.name;
    parent = parent ?? this.parent;
    content = content ?? this.content;
    this.name = name;
    this.content = content;
    parent.addFile(this);
    originalParent.removeFile(originalName);
  }

  setContent(content: string | Buffer) {
    this.contentByteCount = Buffer.byteLength(content);
    this.content = content;
  }
}
