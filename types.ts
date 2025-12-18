
export interface FileNode {
  kind: 'file';
  name: string;
  path: string;
  content: string;
}

export interface DirectoryNode {
  kind: 'directory';
  name: string;
  path: string;
  children: Array<FileNode | DirectoryNode>;
}

export type FileSystemTree = Array<FileNode | DirectoryNode>;
export type FileSystemNode = FileNode | DirectoryNode;

export interface FileSource {
  id: string;
  name: string;
  kind: 'file' | 'directory';
  files: File[];
}
