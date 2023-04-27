import { FileSystemNode, Directory, File } from '../src/FileSystemNode';

describe('FileSystemNode', () => {
  describe('getPath', () => {
    const fsNode = new Directory({parent: null, name: '/'});
    const subNode = new Directory({parent: fsNode, name: 'sub-node'});
    expect(subNode.getPath()).toEqual('/sub-node')
  })
})

describe('Directory', () => {
  describe('update', () => {
    it('updates the name', () => {
      const root = new Directory({name: 'root', parent: null});
      const subDir = new Directory({name: 'new-dir', parent: root});
      subDir.update({name: 'new-name'});
      expect(subDir.name).toEqual('new-name');
    });

    it('updates with the new parent and removes from old parent', () => {
      const root = new Directory({name: 'root', parent: null});
      const subDir = new Directory({name: 'sub-dir', parent: root});
      const subDir2 = new Directory({name: 'sub-dir2', parent: root});
      subDir.update({parent: subDir2});
      expect(subDir.parent?.name).toEqual('sub-dir2');
      expect(root.hasDirectory('subDir')).toEqual(false);
    });
  })

  describe('createAndAddDirectory', () => {
    it('adds a new subdirectory', () => {
      const root = new Directory({name: 'root', parent: null});
      root.createAndAddDirectory('subDir');
      expect(root.hasDirectory('subDir')).toEqual(true)
    });

    it('throws if trying to create a direcotry with name ROOT_PATH', () => {
      const root = new Directory({name: 'root', parent: null});
      expect(() => root.createAndAddDirectory('/')).toThrow();
    })
  })

  describe('hasFile', () => {
    it('returns true if file exists on directory', () => {
      const root = new Directory({name: 'root', parent: null});
      const file = new File({name: 'new-file', parent: root});
      root.addFile(file);
      expect(root.hasFile('new-file')).toEqual(true);
    })

    it('returns false if file is not there', () => {
      const root = new Directory({name: 'root', parent: null});
      expect(root.hasFile('subFile')).toEqual(false);
    })
  })

  describe('hasDirectory', () => {
    it('returns true if sub directory exists', () => {
      const root = new Directory({name: 'root', parent: null});
      const subDir = new Directory({name: 'new-dir', parent: root});
      root.addDirectory(subDir);
      expect(root.hasDirectory('new-dir')).toEqual(true);
    })

    it('returns false if subdirectory is not there', () => {
      const root = new Directory({name: 'root', parent: null});
      expect(root.hasDirectory('subDir')).toEqual(false);
    })
  })

  describe('addFile', () => {
    it('adds a file', () => {
      const root = new Directory({name: 'root', parent: null});
      const subDir = new Directory({name: 'subDir', parent: root});
      const file = new File({name: 'foo', parent: root})
      subDir.addFile(file);
      expect(subDir.hasDirectory)
    })

    it('throws if directory already exists with given name', () => {
      const root = new Directory({name: 'root', parent: null});
      const subDir = new Directory({name: 'subDir', parent: root});
      root.addDirectory(subDir);
      const file = new File({name: 'subDir', parent: root})
      expect(() => root.addFile(file)).toThrow();
    })
  })

  describe('removeFile', () => {
    it('removes a file', () => {
      const root = new Directory({name: 'root', parent: null});
      const file = new File({name: 'new-file', parent: root})
      root.addFile(file);
      expect(root.hasFile('new-file')).toEqual(true);
      root.removeFile('new-file');
      expect(root.hasFile('new-file')).toEqual(false);
    })
  })

  describe('removeDirectory', () => {
    it('removes a directory', () => {
      const root = new Directory({name: 'root', parent: null});
      const dir = new Directory({name: 'new-directory', parent: root})
      root.addDirectory(dir);
      expect(root.hasDirectory('new-directory')).toEqual(true);
      root.removeDirectory('new-directory');
      expect(root.hasDirectory('new-directory')).toEqual(false);
    })
  })

  describe('getTotalByteCount', () => {
    it('returns the total byte count of all files in directory', () => {
      const root = new Directory({name: 'root', parent: null});
      const file1 = new File({name: 'file1', parent: root, content: 'foo'});
      const file2 = new File({name: 'file2', parent: root, content: 'bar'});
      root.addFile(file1);
      root.addFile(file2);
      expect(root.getTotalByteCount()).toEqual(6);
    });

    it('returns the total byte count multiple levels deep', () => {
      const root = new Directory({name: 'root', parent: null});
      const subDir = new Directory({name: 'subDir', parent: root});
      const file1 = new File({name: 'file1', parent: subDir, content: 'foo'});
      const file2 = new File({name: 'file2', parent: subDir, content: 'bar'});
      root.addDirectory(subDir);
      subDir.addFile(file1);
      subDir.addFile(file2);
      expect(root.getTotalByteCount()).toEqual(6);
    });
  });
})

describe('File', () => {
  describe('update', () => {
    it('updates the name', () => {
      const root = new Directory({name: 'root', parent: null});
      const file = new File({name: 'file', parent: root});
      file.update({name: 'new-name'});
      expect(file.name).toEqual('new-name');
    });

    it('updates with the new parent and removes from old parent', () => {
      const root = new Directory({name: 'root', parent: null});
      const subDir = new Directory({name: 'sub-dir', parent: root});
      root.addDirectory(subDir);
      const file = new File({name: 'file', parent: root});
      root.addFile(file);
      file.update({parent: subDir});
      expect(file.parent?.name).toEqual('sub-dir');
      expect(root.hasFile('file')).toEqual(false);
    });

    it('updates content', () => {
      const root = new Directory({name: 'root', parent: null});
      const file = new File({name: 'file', parent: root});
      file.update({content: 'new file content'});
      expect(file.content).toEqual('new file content');
    });

    it('updates with new name, new parent and removes from old parent', () => {
      const root = new Directory({name: 'root', parent: null});
      const subDir = new Directory({name: 'sub-dir', parent: root});
      root.addDirectory(subDir);
      const file = new File({name: 'file', parent: root});
      root.addFile(file);
      file.update({name: 'new-file-name', parent: subDir});
      expect(subDir.hasFile('file')).toEqual(false);
      expect(subDir.hasFile('new-file-name')).toEqual(true);
      expect(root.hasFile('file')).toEqual(false);
      expect(root.hasFile('new-file-name')).toEqual(false);
    });
  })

  describe('setContent', () => {
    it('sets content', () => {
      const root = new Directory({name: 'root', parent: null});
      const subDir = new Directory({name: 'sub-dir', parent: root});
      const file = new File({name: 'file', parent: root});
      subDir.update({name: 'new-file-name', parent: subDir});
    })
  })
})
