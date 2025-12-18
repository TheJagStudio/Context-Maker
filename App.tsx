
import React from 'react';
import PromptContextGenerator from './components/PromptContextGenerator';

const Sparkle = ({ className }: { className?: string }) => (
  <svg className={className} width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 0C20 0 20 15 35 20C20 25 20 40 20 40C20 40 20 25 5 20C20 15 20 0 20 0Z" fill="currentColor"/>
  </svg>
);

function App(): React.ReactNode {
  return (
    <div className="min-h-screen relative overflow-hidden pb-12">
      {/* Decorative Background Elements */}
      <Sparkle className="absolute top-10 left-[10%] text-rose-400 rotate-12 opacity-80" />
      <Sparkle className="absolute top-20 right-[15%] text-emerald-400 -rotate-12 scale-125 opacity-80" />
      <Sparkle className="absolute bottom-20 left-[5%] text-amber-400 rotate-45 scale-75 opacity-80" />
      
      <main className="container mx-auto p-4 sm:p-6 md:p-8 max-w-6xl relative z-10">
        <header className="text-center mb-12 md:mb-16">
          <div className="inline-block relative">
             <h1 className="text-5xl md:text-7xl font-black text-black tracking-tighter uppercase italic leading-none">
              Context <br/>
              <span className="text-sky-400 drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]">Maker</span>
            </h1>
          </div>
          <p className="text-black font-bold mt-6 text-xl max-w-2xl mx-auto uppercase tracking-wide">
            Turn your local files into <br/> 
            <span className="bg-emerald-300 px-2 py-1 border-2 border-black inline-block mt-2">LLM-ready text digests</span>
          </p>
        </header>
        
        <PromptContextGenerator />

        <footer className="text-center mt-16">
          <div className="inline-block bg-white border-2 border-black px-6 py-2 neubrutal-shadow-sm rotate-1">
            <p className="font-bold text-sm uppercase">100% Local • Zero Latency • Pure Context</p>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default App;
