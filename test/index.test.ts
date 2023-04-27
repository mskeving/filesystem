import { VirtualFileSystem, NodeType } from '../src/index';

describe('VirtualFileSystem', () => {
  describe('makeDirectory', () => {
    it('creates a directory', () => {
      const vfs = new VirtualFileSystem();
      vfs.makeDirectory('foo');
      expect(vfs.currentDir.directoriesByName.get('foo')?.getPath()).toEqual('/foo')
    });

    it('creates a directory with trailing slash', () => {
      const vfs = new VirtualFileSystem();
      vfs.makeDirectory('foo/');
      expect(vfs.currentDir.directoriesByName.get('foo')?.getPath()).toEqual('/foo');
    });

    it('creates new directories multiple levels deep', () => {
      const vfs = new VirtualFileSystem();
      vfs.makeDirectory('foo')
      expect(vfs.currentDir.directoriesByName.get('foo')?.getPath()).toEqual('/foo');
      vfs.makeDirectory('foo/bar');
      vfs.changeDirectory('foo')
      expect(vfs.currentDir.directoriesByName.get('bar')?.getPath()).toEqual('/foo/bar');
    })

    it("throws if subpath doesn't exist", () => {
      const vfs = new VirtualFileSystem();
      expect(() => vfs.makeDirectory('foo/bar')).toThrow();
    })

    it('throws if no directory name provided', () => {
      const vfs = new VirtualFileSystem();
      expect(() => vfs.makeDirectory('')).toThrow();
    })

  });

  describe('makeFile', () => {
    it('creates a new file', () => {
      const vfs = new VirtualFileSystem();
      vfs.makeFile('foo');
      expect(vfs.currentDir.filesByName.get('foo')?.getPath()).toEqual('/foo');
    })

    it('does not create a new file if path is not valid', () => {
      const vfs = new VirtualFileSystem();
      expect(() => vfs.makeFile('foo/bar')).toThrow();
    })
  })

  describe('changeDirectory', () => {
    it('moves into directory', () => {
      const vfs = new VirtualFileSystem();
      vfs.makeDirectory('test');
      vfs.changeDirectory('test');
      expect(vfs.currentDir.getPath()).toEqual('/test');
    })

    it('goes to root if no path provided', () => {
      const vfs = new VirtualFileSystem();
      vfs.makeDirectory('test');
      vfs.changeDirectory('test');
      expect(vfs.currentDir.getPath()).toBe('/test');
      vfs.changeDirectory();
      expect(vfs.currentDir.getPath()).toBe('/');
    });

    it('goes back to root if path is \'/\'', () => {
      const vfs = new VirtualFileSystem();
      vfs.makeDirectory('test');
      vfs.changeDirectory('test');
      expect(vfs.currentDir.getPath()).toBe('/test');
      vfs.changeDirectory('/');
      expect(vfs.currentDir.getPath()).toBe('/');
    });

    it('throws if directory is not found', () => {
      const vfs = new VirtualFileSystem();
      expect(() => vfs.changeDirectory('imaginary-folder')).toThrowError();
    })

    it('throws if target is a file', () => {
      const vfs = new VirtualFileSystem();
      vfs.makeFile('foo');
      expect(() => vfs.changeDirectory('foo')).toThrow();
    })
  })

  describe('getDirectoryContents', () => {
    it('returns a list of directory contents', () => {
      const vfs = new VirtualFileSystem();
      vfs.makeFile('newFile');
      vfs.makeDirectory('newDir');
      expect(vfs.getDirectoryContents()).toEqual(['newDir', 'newFile']);
    })

    it('returns an empty array if no contents', () => {
      const vfs = new VirtualFileSystem();
      expect(vfs.getDirectoryContents()).toEqual([]);
    })

    it('returns contents for current directory only', () => {
      const vfs = new VirtualFileSystem();
      vfs.makeDirectory('foo');
      vfs.changeDirectory('foo');
      vfs.makeDirectory('bar');
      vfs.changeDirectory();
      expect(vfs.getDirectoryContents()).toEqual(['foo']);
    })
  })

  describe('readFile', () => {
    it('reads a file', () => {
      const vfs = new VirtualFileSystem();
      vfs.makeDirectory('foo');
      vfs.makeFile('foo/barFile');
      vfs.writeFile('foo/barFile', 'barFile content');
      expect(vfs.readFile('foo/barFile')).toEqual('barFile content');
    })
  });

  describe('writeFile', () => {
    it('writes to a file', () => {
      const vfs = new VirtualFileSystem();
      vfs.makeDirectory('foo');
      vfs.makeFile('foo/barFile');
      vfs.writeFile('foo/barFile', 'barFile content');
      expect(vfs.readFile('foo/barFile')).toEqual('barFile content');
    })

    it('throws if file is not found', () => {
      const vfs = new VirtualFileSystem();
      expect(() => vfs.writeFile('foo', 'bar')).toThrow();
    })

    it('updates available space filesystem space', () => {
      const vfs = new VirtualFileSystem();
      vfs.maxBytes = 10;
      expect(vfs.totalFileContentBytes).toEqual(0);
      vfs.makeFile('foo');
      vfs.writeFile('foo', 'content'); // 7 bytes
      expect(vfs.totalFileContentBytes).toEqual(7);
    });

    it('does not write file if content size exceeds available space', () => {
      const vfs = new VirtualFileSystem();
      vfs.maxBytes = 1;
      vfs.makeFile('foo');
      expect(() => vfs.writeFile('foo', 'content')).toThrow();
    });
  })


  describe('moveFile', () => { 
    it('moves a file', () => {
      const vfs = new VirtualFileSystem();
      vfs.makeFile('foo');
      vfs.makeDirectory('bar');
      vfs.moveFile('foo', 'bar');
      expect(vfs.getDirectoryContents('bar')).toEqual(['foo']);
      expect(vfs.getDirectoryContents('.')).toEqual(['bar']);
    })

    it('moves a file from relative path', () => {
      const vfs = new VirtualFileSystem();
      vfs.makeFile('fooFile');
      vfs.makeDirectory('bar');
      vfs.makeDirectory('bar/baz');
      vfs.changeDirectory('bar');
      vfs.moveFile('../fooFile', 'baz');
      expect(vfs.getDirectoryContents('/bar/baz')).toEqual(['fooFile']);
    })
    
    it('moves a file from absolute path', () => {
      const vfs = new VirtualFileSystem();
      vfs.makeFile('fooFile');
      vfs.makeDirectory('bar');
      vfs.changeDirectory('bar');
      vfs.moveFile('/fooFile', '/bar');
      expect(vfs.getDirectoryContents('/bar/')).toEqual(['fooFile']);
    })

    it('throws if file is not found', () => {
      const vfs = new VirtualFileSystem();
      expect(() => vfs.moveFile('foo', 'bar')).toThrow();
    })

    it('replaces file if one already exists', () => {
      const vfs = new VirtualFileSystem();
      vfs.makeFile('fooFile');
      vfs.writeFile('fooFile', 'fooFile content');

      vfs.makeDirectory('bar');
      vfs.makeFile('bar/fooFile')
      vfs.writeFile('bar/fooFile', 'bar/fooFile content');

      vfs.moveFile('fooFile', 'bar/');
      expect(vfs.readFile('bar/fooFile')).toEqual('fooFile content');
    })
  })
  
  describe('moveDirectory', () => {
    it('moves a directory to an existing path', () => {
      const vfs = new VirtualFileSystem();
      vfs.makeDirectory('foo');
      vfs.makeDirectory('bar');
      vfs.moveDirectory('foo', 'bar');
      expect(vfs.getDirectoryContents('bar')).toEqual(['foo']);
    })

    it('updates the current location if directory is moved', () => {
      const vfs = new VirtualFileSystem();
      vfs.makeDirectory('foo');
      vfs.makeDirectory('bar');
      vfs.changeDirectory('foo');
      expect(vfs.currentDir.name).toEqual('foo');
      vfs.moveDirectory('/foo', '/bar');
      expect(vfs.currentDir.getPath()).toEqual('/bar/foo');
    })

    it('throws if directory is not found', () => {
      const vfs = new VirtualFileSystem();
      expect(() => vfs.moveDirectory('foo', 'bar')).toThrow();
    })
  })

  describe('renameFile', () => {
    it('renames a file', () => {
      const vfs = new VirtualFileSystem();
      vfs.makeFile('foo');
      vfs.renameFile('foo', 'bar');
      expect(vfs.getDirectoryContents()).toEqual(['bar']);
    })

    it('throws if file is not found', () => {
      const vfs = new VirtualFileSystem();
      expect(() => vfs.renameFile('foo', 'bar')).toThrow();
    })
  });

  describe('renameDirectory', () => {
    it('renames a directory', () => {
      const vfs = new VirtualFileSystem();
      vfs.makeDirectory('foo');
      vfs.renameDirectory('foo', 'bar');
      expect(vfs.getDirectoryContents()).toEqual(['bar']);
    })
  });

  describe('removeFile', () => {
    it('removes a file', () => {
      const vfs = new VirtualFileSystem();
      vfs.makeFile('foo');
      expect(vfs.currentDir.filesByName.get('foo')?.getPath()).toEqual('/foo');
      vfs.removeFile('foo');
      expect(vfs.currentDir.filesByName.get('foo')).toBeUndefined();
    })

    it('throws if file is not found', () => {
      const vfs = new VirtualFileSystem();
      expect(() => vfs.removeFile('foo')).toThrow();
    })

    it('removes a file from relative path', () => {
      const vfs = new VirtualFileSystem();
      vfs.makeFile('foo');
      vfs.makeDirectory('bar');
      vfs.changeDirectory('bar');
      vfs.removeFile('../foo');
      vfs.changeDirectory();
      expect(vfs.currentDir.filesByName.get('foo')).toBeUndefined();
    })

    it('removes a file from absolute path', () => {
      const vfs = new VirtualFileSystem();
      vfs.makeFile('foo');
      vfs.makeDirectory('bar');
      vfs.changeDirectory('bar');
      vfs.removeFile('/foo');
      expect(vfs.currentDir.filesByName.get('foo')).toBeUndefined();
    })

    it('free up space when file is removed', () => {
      const vfs = new VirtualFileSystem();
      vfs.maxBytes = 10;
      vfs.makeFile('foo');
      vfs.writeFile('foo', 'content');  // 7 bytes
      expect(vfs.totalFileContentBytes).toEqual(7);
      vfs.removeFile('foo');
      expect(vfs.totalFileContentBytes).toEqual(0);
    });
  })

  describe('removeDirectory', () => {
    it('removes a directory', () => {
      const vfs = new VirtualFileSystem();
      vfs.makeDirectory('foo');
      expect(vfs.currentDir.directoriesByName.get('foo')?.getPath()).toEqual('/foo');
      vfs.removeDirectory('foo');;
      expect(vfs.currentDir.directoriesByName.get('foo')).toBeUndefined();
    })

    it('throws if directory is not found', () => {
      const vfs = new VirtualFileSystem();
      expect(() => vfs.removeDirectory('foo')).toThrow();
    })

    it('removes a directory from relative path', () => {
      const vfs = new VirtualFileSystem();
      vfs.makeDirectory('foo');
      vfs.changeDirectory('foo');
      vfs.makeDirectory('bar');
      vfs.changeDirectory('/');
      vfs.removeDirectory('foo/bar');
      expect(vfs.currentDir.directoriesByName.get('foo')?.getPath()).toEqual('/foo');
      vfs.changeDirectory('foo');
      expect(vfs.currentDir.directoriesByName.get('bar')).toBeUndefined();
    })

    it('removes a directory from absolute path', () => {
      const vfs = new VirtualFileSystem();
      vfs.makeDirectory('foo');
      vfs.changeDirectory('foo');
      vfs.makeDirectory('bar');
      vfs.removeDirectory('/foo/bar');
      expect(vfs.currentDir.getPath()).toEqual('/foo');
      expect(vfs.currentDir.directoriesByName.get('bar')).toBeUndefined();
    })
  })

  describe('find', () => {
    it('finds a file from current directory', () => {
      const vfs = new VirtualFileSystem();
      vfs.makeFile('foo');
      expect(vfs.find('foo')).toEqual(['/foo'])
    })

    it('finds a directory from current directory', () => {
      const vfs = new VirtualFileSystem();
      vfs.makeDirectory('foo');
      expect(vfs.find('foo')).toEqual(['/foo'])
    })

    it('finds a file multiple levels deep', () => {
      const vfs = new VirtualFileSystem();
      vfs.makeDirectory('foo');
      vfs.makeDirectory('foo/bar');
      vfs.makeFile('foo/bar/foo');
      expect(vfs.find('foo')).toEqual(['/foo', '/foo/bar/foo'])
    })

    it('finds a file multiple levels deep from a starting path', () => {
      const vfs = new VirtualFileSystem();
      vfs.makeDirectory('foo');
      vfs.makeDirectory('foo/bar');
      vfs.makeFile('foo/bar/foo');
      expect(vfs.find('foo', 'foo/bar/')).toEqual(['/foo/bar/foo'])
    })
  })

  describe('_getTarget', () => {
    it('returns from a relative path', () => {
      const vfs = new VirtualFileSystem();
      vfs.makeDirectory('foo');
      vfs.makeDirectory('foo/bar');
      const expected = vfs.currentDir.directoriesByName.get('foo')?.directoriesByName.get('bar');
      const actual = vfs._getTarget('foo/bar', NodeType.DIRECTORY);
      expect(actual).toEqual(expected);
    })

    it('returns from an absolute path', () => {
      const vfs = new VirtualFileSystem();
      vfs.makeDirectory('foo');
      vfs.makeDirectory('foo/bar');
      vfs.changeDirectory('foo');
      const expected = vfs.currentDir.directoriesByName.get('bar');
      const actual = vfs._getTarget('/foo/bar', NodeType.DIRECTORY);
      expect(actual).toEqual(expected);
    })

    it('returns undefined if path does not exist', () => {
      const vfs = new VirtualFileSystem();
      const actual = vfs._getTarget('/non-exisitent', NodeType.DIRECTORY);
      expect(actual).toBeUndefined();
    })

    it('returns the root directory if path is MOVE_UP_PATH and currentDir is root', () => {
      const vfs = new VirtualFileSystem();
      const actual = vfs._getTarget('../', NodeType.DIRECTORY);
      expect(actual?.name).toEqual('/');
    })

    it('returns the current dir if path is CURRENT_DIR_PATH', () => {
      const vfs = new VirtualFileSystem();
      vfs.makeDirectory('foo');
      vfs.changeDirectory('foo');
      const actual = vfs._getTarget('./', NodeType.DIRECTORY);
      expect(actual?.name).toEqual('foo');
    })
  })
})
