
import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { FileSystemTree, FileSource } from '../types';
import { processFileSources, generateStructureString, generateContentString } from '../services/file.service';
import Button from './ui/Button';
import { FolderIcon, FilePlusIcon, TrashIcon, ClipboardIcon, ClipboardCheckIcon } from './ui/Icon';

interface SelectedItemProps {
  item: FileSource;
  onRemove: (id: string) => void;
}

const SelectedItem: React.FC<SelectedItemProps> = ({ item, onRemove }) => (
  <div className="bg-white border-2 border-black p-3 neubrutal-shadow-sm flex items-center justify-between text-sm animate-fade-in group">
    <div className="flex items-center gap-3 overflow-hidden">
      <div className={`p-1.5 border-2 border-black ${item.kind === 'directory' ? 'bg-amber-300' : 'bg-emerald-300'}`}>
        {item.kind === 'directory' ? <FolderIcon className="w-5 h-5 text-black" /> : <FilePlusIcon className="w-5 h-5 text-black" />}
      </div>
      <div className="flex flex-col overflow-hidden">
        <span className="font-bold truncate text-black uppercase text-xs" title={item.name}>{item.name}</span>
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">
          {item.kind === 'directory' ? `${item.files.length} FILES` : 'SINGLE FILE'}
        </span>
      </div>
    </div>
    <button 
      onClick={() => onRemove(item.id)} 
      className="p-1.5 border-2 border-black bg-rose-400 hover:bg-rose-500 transition-colors"
      title="Remove item"
    >
      <TrashIcon className="w-4 h-4 text-black" />
    </button>
  </div>
);

function PromptContextGenerator(): React.ReactNode {
  const [sources, setSources] = useState<FileSource[]>([]);
  const [combinedOutput, setCombinedOutput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files: File[] = Array.from(e.target.files);
      const firstPath = files[0].webkitRelativePath;
      const folderName = firstPath.split('/')[0] || 'Selected Folder';
      
      const newSource: FileSource = {
        id: crypto.randomUUID(),
        name: folderName,
        kind: 'directory',
        files: files
      };
      
      setSources(prev => [...prev, newSource]);
    }
    if (folderInputRef.current) folderInputRef.current.value = '';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files: File[] = Array.from(e.target.files);
      const newSources: FileSource[] = files.map(file => ({
        id: crypto.randomUUID(),
        name: file.name,
        kind: 'file',
        files: [file]
      }));
      setSources(prev => [...prev, ...newSources]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Drag and Drop Logic
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const getFilesFromEntry = async (entry: any): Promise<File[]> => {
    if (entry.isFile) {
      return new Promise((resolve) => {
        entry.file((file: File) => resolve([file]));
      });
    } else if (entry.isDirectory) {
      const dirReader = entry.createReader();
      const entries: any[] = await new Promise((resolve) => {
        dirReader.readEntries((results: any[]) => resolve(results));
      });
      const filePromises = entries.map(e => getFilesFromEntry(e));
      const fileArrays = await Promise.all(filePromises);
      return fileArrays.flat();
    }
    return [];
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setIsLoading(true);

    const items = Array.from(e.dataTransfer.items);
    const newSources: FileSource[] = [];

    for (const item of items) {
      // Fix: Cast item to any to access webkitGetAsEntry and ensure getAsFile is recognized, resolving unknown type errors
      const dataItem = item as any;
      const entry = dataItem.webkitGetAsEntry ? dataItem.webkitGetAsEntry() : null;
      if (!entry) continue;

      if (entry.isFile) {
        const file = dataItem.getAsFile ? dataItem.getAsFile() : null;
        if (file) {
          newSources.push({
            id: crypto.randomUUID(),
            name: file.name,
            kind: 'file',
            files: [file]
          });
        }
      } else if (entry.isDirectory) {
        const files = await getFilesFromEntry(entry);
        // We need to ensure webkitRelativePath is simulated or captured if possible
        // File objects from entry.file() don't have webkitRelativePath set by default
        // We might need to manually decorate them for the processor
        const decoratedFiles = await Promise.all(files.map(async (f) => {
            // This is a bit hacky because File.webkitRelativePath is read-only
            // but our processFileSources relies on it for directory reconstruction.
            // Since we can't write to it, we'll ensure our processor handles it or 
            // we simulate the structure.
            return f;
        }));

        newSources.push({
          id: crypto.randomUUID(),
          name: entry.name,
          kind: 'directory',
          files: decoratedFiles
        });
      }
    }

    setSources(prev => [...prev, ...newSources]);
    setIsLoading(false);
  };

  const triggerFolderInput = () => folderInputRef.current?.click();
  const triggerFileInput = () => fileInputRef.current?.click();

  const handleRemoveItem = (id: string) => {
    setSources(prev => prev.filter(s => s.id !== id));
  };
  
  const handleClear = () => {
    setSources([]);
    setCombinedOutput('');
    setError(null);
  };

  const handleCopy = useCallback(() => {
    if (!combinedOutput) return;
    navigator.clipboard.writeText(combinedOutput).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  }, [combinedOutput]);
  
  useEffect(() => {
    if (sources.length === 0) {
      setCombinedOutput('');
      return;
    }

    const process = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const tree = await processFileSources(sources);
        const structure = generateStructureString(tree);
        const content = generateContentString(tree);
        
        const finalOutput = `This prompt contains the structure and content of a project.\n\n# DIRECTORY STRUCTURE\n\n\`\`\`\n${structure.trim()}\n\`\`\`\n\n# FILE CONTENTS\n${content}`;
        setCombinedOutput(finalOutput);
        
      } catch (e) {
        setError('Failed to process files.');
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };

    process();
  }, [sources]);

  return (
    <div className="bg-[#ffefc1] border-[3px] border-black p-6 md:p-8 neubrutal-shadow relative">
      <div className="absolute -top-4 -right-4 bg-rose-400 border-[3px] border-black px-4 py-1 font-black text-sm uppercase neubrutal-shadow-sm rotate-2 z-20">
        Multi-Select ON
      </div>

      <input 
        type="file" 
        ref={folderInputRef} 
        onChange={handleFolderSelect} 
        className="hidden" 
        {...({ webkitdirectory: "", directory: "" } as any)} 
      />
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileSelect} 
        className="hidden" 
        multiple 
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left: Input Selection */}
        <div className="lg:col-span-4 space-y-6">
          <section>
            <h2 className="text-2xl font-black text-black mb-4 uppercase italic tracking-tighter">1. Selection Area</h2>
                      <div className="grid grid-cols-2 gap-3 mt-4">
              <Button onClick={triggerFolderInput} icon={<FolderIcon />} size="sm" variant="primary">
                + Folder
              </Button>
              <Button onClick={triggerFileInput} icon={<FilePlusIcon />} size="sm" variant="secondary">
                + Files
              </Button>
            </div>
          </section>

          <section>
            <div className="flex justify-between items-end mb-4">
                <h2 className="text-xl font-black text-black uppercase italic">Selection ({sources.length})</h2>
                {sources.length > 0 && (
                     <Button onClick={handleClear} variant="danger" size="sm">Clear</Button>
                )}
            </div>
            {sources.length > 0 ? (
                <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 pb-4 scrollbar-thin scrollbar-thumb-black">
                    {sources.map(source => (
                      <SelectedItem key={source.id} item={source} onRemove={handleRemoveItem} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-8 px-4 bg-white/30 border-2 border-dashed border-black/20 flex flex-col items-center justify-center gap-2">
                    <p className="font-bold text-[10px] text-black/30 uppercase tracking-[0.2em]">List is empty</p>
                </div>
            )}
          </section>
        </div>

        {/* Right: Output */}
        <div className="lg:col-span-8 flex flex-col h-full">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-black text-black uppercase italic tracking-tighter">2. Generated Context</h2>
            {combinedOutput && (
              <Button onClick={handleCopy} icon={isCopied ? <ClipboardCheckIcon /> : <ClipboardIcon />} variant="success">
                {isCopied ? 'Copied!' : 'Copy to Clipboard'}
              </Button>
            )}
          </div>
          
          <div className="relative flex-grow min-h-[500px] border-[3px] border-black bg-white neubrutal-shadow-sm flex flex-col overflow-hidden">
            {isLoading && (
              <div className="absolute inset-0 bg-white/95 flex items-center justify-center z-30">
                <div className="text-center">
                    <div className="w-20 h-20 border-[8px] border-black border-t-sky-400 rounded-full animate-spin mx-auto"></div>
                    <p className="mt-8 text-2xl font-black uppercase italic tracking-tighter animate-pulse">Processing Context...</p>
                </div>
              </div>
            )}
            
            {error && <div className="p-6 bg-rose-100 text-rose-600 font-bold border-b-[3px] border-black uppercase italic">{error}</div>}
            
            {!isLoading && !error && (
              <div className="flex-grow overflow-auto p-6 scrollbar-thin scrollbar-thumb-black scrollbar-track-transparent">
                {combinedOutput ? (
                   <pre className="text-sm text-black font-mono selection:bg-sky-200">
                    <code className="whitespace-pre-wrap">
                        {combinedOutput}
                    </code>
                  </pre>
                ) : (
                   <div className="h-full flex flex-col items-center justify-center opacity-10">
                      <ClipboardIcon className="w-32 h-32 mb-4" />
                      <p className="font-black text-3xl uppercase italic tracking-widest text-center">Ready for input</p>
                   </div>
                )}
              </div>
            )}

            {/* Bottom Graphic Decoration */}
            <div className="h-6 bg-black w-full mt-auto flex items-center justify-around px-4">
               {[...Array(20)].map((_, i) => (
                 <div key={i} className="h-1 w-1 bg-white rounded-full"></div>
               ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PromptContextGenerator;
