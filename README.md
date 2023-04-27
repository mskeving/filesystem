# In-Memory Filesystem

This is an in-memory filesystem that supports both files and directories. The following operations are supported on both absolute and relative paths:

 - Make
 - Remove
 - Move
 - Find
 - Change directory
 - Write file
 - Rename file / directory

A `FileSystem` class is defined in `src/index.ts` with `Directory` and `File` in `src/FileSystemNode.ts`.  Unit tests are in `/test/`.

### Instructions
To install
```
$ npm install
$ npm run build
```
Test:
```
npm run test
```
Interact via Node:
```
$ node
> const { VirtualFileSystem } = require('./dist/src/index.js')
> const vfs = new VirtualFileSystem()
> vfs.makeDirectory('school')
> vfs.changeDirectory('school)
> vfs.getCurrentDir()
> vfs.makeDirectory('homework')
> vfs.removeDirectory('homework')
> ....
```
