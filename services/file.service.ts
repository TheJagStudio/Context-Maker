
import type { DirectoryNode, FileNode, FileSystemTree, FileSource } from '../types';

const BINARY_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'bmp', 'ico', 'svg', 'mp4', 'webm', 'mp3', 'wav', 'ogg', 'zip', 'tar', 'gz', '7z', 'rar', 'pdf', 'exe', 'dll', 'so', 'dylib', 'class', 'jar', 'pyc', 'eot', 'ttf', 'woff', 'woff2'
]);

const IGNORED_DIRS = new Set([
  // Source Control
  '.git',
  // Dependencies
  'node_modules', '__pycache__', 
  // Build/Output
  'dist', 'build', '.next', 'out', 'coverage', 'web-build',
  // IDE
  '.vscode', '.idea',
  // Framework Specific
  '.expo', '.kotlin',
  '.venv',"venv"
]);

const IGNORED_FILENAMES = new Set([
  '.DS_Store',
  'expo-env.d.ts',
]);

const IGNORED_EXTENSIONS = new Set([
  'jks', 'p8', 'p12', 'key', 'mobileprovision', 'pem', 'tsbuildinfo'
]);

function isIgnoredFile(filename: string): boolean {
    if (IGNORED_FILENAMES.has(filename)) return true;
    
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext && IGNORED_EXTENSIONS.has(ext)) return true;

    // Prefix patterns
    if (filename.startsWith('npm-debug.') || 
        filename.startsWith('yarn-debug.') || 
        filename.startsWith('yarn-error.') ||
        filename.startsWith('.metro-health-check')) {
        return true;
    }
    
    // .env*.local
    if (filename.startsWith('.env') && filename.endsWith('.local')) {
        return true;
    }

    // *.orig.* (e.g. merge conflicts)
    if (filename.includes('.orig.')) return true;

    return false;
}

function isBinary(file: File): boolean {
    if (file.type.startsWith('image/') || file.type.startsWith('video/') || file.type.startsWith('audio/')) return true;
    const ext = file.name.split('.').pop()?.toLowerCase();
    return ext ? BINARY_EXTENSIONS.has(ext) : false;
}

async function readFileContent(file: File): Promise<string> {
    if (isBinary(file)) {
        return `[Binary content of type ${file.type || 'unknown'} not included]`;
    }
    try {
        return await file.text();
    } catch (e) {
        return `[Error reading file: ${e}]`;
    }
}

async function insertFileIntoTree(tree: FileSystemTree, pathParts: string[], file: File, fullPathPrefix: string) {
    if (pathParts.length === 0) return;
    
    const [currentName, ...rest] = pathParts;
    const currentPath = `${fullPathPrefix}/${currentName}`;
    
    // Directory level check (safety, though handled in processFileSources mostly)
    if (rest.length > 0 && IGNORED_DIRS.has(currentName)) {
        return;
    }

    if (rest.length === 0) {
        // File level check
        if (isIgnoredFile(currentName)) return;

        const content = await readFileContent(file);
        tree.push({ kind: 'file', name: currentName, path: currentPath, content });
    } else {
        // It's a directory
        let dirNode = tree.find(n => n.kind === 'directory' && n.name === currentName) as DirectoryNode;
        if (!dirNode) {
            dirNode = { kind: 'directory', name: currentName, path: currentPath, children: [] };
            tree.push(dirNode);
        }
        await insertFileIntoTree(dirNode.children, rest, file, currentPath);
    }
}

function sortTree(nodes: FileSystemTree) {
  nodes.sort((a, b) => {
    if (a.kind === b.kind) {
      return a.name.localeCompare(b.name);
    }
    return a.kind === 'directory' ? -1 : 1;
  });
  
  // Recursively sort children
  for (const node of nodes) {
      if (node.kind === 'directory') {
          sortTree(node.children);
      }
  }
}

export async function processFileSources(sources: FileSource[]): Promise<FileSystemTree> {
    const tree: FileSystemTree = [];

    for (const source of sources) {
        if (source.kind === 'file') {
            // Single files
            for (const file of source.files) {
                 if (isIgnoredFile(file.name)) continue;
                 const content = await readFileContent(file);
                 tree.push({ kind: 'file', name: file.name, path: file.name, content });
            }
        } else if (source.kind === 'directory') {
            // Directory (flat list of files with webkitRelativePath)
            const dirNode: DirectoryNode = {
                kind: 'directory',
                name: source.name,
                path: source.name,
                children: []
            };
            
            for (const file of source.files) {
                 const parts = file.webkitRelativePath.split('/');
                 
                 // Early filtering: Check if any part of the path is an ignored directory
                 // This handles nested ignored folders efficiently
                 const hasIgnoredDir = parts.some(part => IGNORED_DIRS.has(part));
                 if (hasIgnoredDir) continue;

                 if (isIgnoredFile(file.name)) continue;

                 // If the first part matches the source name, we skip it to avoid nesting Root/Root/...
                 const relativeParts = parts.length > 1 && parts[0] === source.name ? parts.slice(1) : parts;
                 
                 await insertFileIntoTree(dirNode.children, relativeParts, file, source.name);
            }
            sortTree(dirNode.children);
            tree.push(dirNode);
        }
    }
    
    sortTree(tree);
    return tree;
}

// Structure generation strings
function generateStructureStringRecursive(nodes: FileSystemTree, prefix = ''): string {
    let structure = '';
    nodes.forEach((node, index) => {
        const isLast = index === nodes.length - 1;
        const connector = isLast ? '└── ' : '├── ';
        const newPrefix = prefix + (isLast ? '    ' : '│   ');
        structure += `${prefix}${connector}${node.name}\n`;
        if (node.kind === 'directory') {
            structure += generateStructureStringRecursive(node.children, newPrefix);
        }
    });
    return structure;
}

export function generateStructureString(tree: FileSystemTree): string {
    return tree.map(node => `${node.name}\n${node.kind === 'directory' ? generateStructureStringRecursive(node.children, '') : ''}`).join('');
}

function generateContentStringRecursive(nodes: FileSystemTree): string {
    let content = '';
    for (const node of nodes) {
        if (node.kind === 'file') {
            content += `\n\n# -------- FILE: ${node.path} --------\n\n`;
            content += '```\n';
            content += node.content;
            content += '\n```';
        } else if (node.kind === 'directory') {
            content += generateContentStringRecursive(node.children);
        }
    }
    return content;
}

export function generateContentString(tree: FileSystemTree): string {
    const content = generateContentStringRecursive(tree);
    return content.trim();
}
