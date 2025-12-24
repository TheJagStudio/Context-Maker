
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
        <div className="lg:col-span-4 space-y-8">
          <section>
            <h2 className="text-2xl font-black text-black mb-6 uppercase italic tracking-tighter">1. Selection Area</h2>
            
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={triggerFolderInput} icon={<FolderIcon />} size="md" variant="primary" className="flex-1">
                + Folder
              </Button>
              <Button onClick={triggerFileInput} icon={<FilePlusIcon />} size="md" variant="secondary" className="flex-1">
                + Files
              </Button>
            </div>
            <p className="mt-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">
              Add multiple items sequentially
            </p>
          </section>

          <section>
            <div className="flex justify-between items-end mb-4 border-b-2 border-black pb-2">
                <h2 className="text-xl font-black text-black uppercase italic">Selection ({sources.length})</h2>
                {sources.length > 0 && (
                     <Button onClick={handleClear} variant="danger" size="sm">Clear All</Button>
                )}
            </div>
            {sources.length > 0 ? (
                <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-2 pb-4 scrollbar-thin scrollbar-thumb-black">
                    {sources.map(source => (
                      <SelectedItem key={source.id} item={source} onRemove={handleRemoveItem} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-10 px-4 bg-white/20 border-2 border-dashed border-black/20 flex flex-col items-center justify-center gap-2">
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
              <Button 
                onClick={handleCopy} 
                icon={isCopied ? <ClipboardCheckIcon /> : <ClipboardIcon />} 
                variant="success"
                disabled={isLoading}
              >
                {isLoading ? 'Updating...' : (isCopied ? 'Copied!' : 'Copy to Clipboard')}
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
