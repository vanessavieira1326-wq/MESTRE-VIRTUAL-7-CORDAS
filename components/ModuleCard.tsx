
import React from 'react';
import { Module } from '../types';
import { ChevronRight, PlayCircle } from 'lucide-react';

interface ModuleCardProps {
  module: Module;
  onClick: (module: Module) => void;
}

const ModuleCard: React.FC<ModuleCardProps> = ({ module, onClick }) => {
  return (
    <div 
      onClick={() => onClick(module)}
      className="group bg-slate-900 border border-slate-800 p-6 rounded-3xl hover:border-amber-600/50 transition-all cursor-pointer relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <span className="text-6xl">{module.icon}</span>
      </div>
      
      <div className="relative z-10">
        <div className="text-3xl mb-4">{module.icon}</div>
        <h3 className="text-xl font-bold text-slate-100 mb-2 group-hover:text-amber-500 transition-colors">
          {module.title}
        </h3>
        <p className="text-sm text-slate-400 mb-6 line-clamp-2">
          {module.description}
        </p>
        
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-800 text-slate-300 rounded-full">
            {module.lessons.length} Aulas
          </span>
          <div className="flex items-center text-amber-500 gap-1 text-sm font-bold group-hover:translate-x-1 transition-transform">
            Ver Módulo <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModuleCard;
