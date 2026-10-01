
import type { FC } from 'react';
import { Prediction } from '../types';

interface PredictorModalProps {
  prediction: Prediction | null;
  isLoading: boolean;
  onClose: () => void;
}

const PredictorModal: FC<PredictorModalProps> = ({ prediction, isLoading, onClose }) => {
  if (!prediction && !isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-emerald-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            AI Race Intelligence
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">✕</button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
              <p className="text-slate-400 animate-pulse">Analyzing jockey stats & internet sentiment...</p>
            </div>
          ) : prediction && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/50 p-4 rounded-xl border border-emerald-500/20">
                  <p className="text-xs text-slate-500 uppercase font-bold mb-1">Top Pick</p>
                  <p className="text-2xl font-serif text-white">{prediction.winner}</p>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                  <p className="text-xs text-slate-500 uppercase font-bold mb-1">Confidence</p>
                  <p className="text-2xl font-bold text-emerald-400">{prediction.confidence}%</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase mb-2">Predicted Placing</h3>
                <div className="flex gap-2">
                  {prediction.placed.map((horse, i) => (
                    <span key={i} className="px-3 py-1 bg-slate-700 rounded-full text-xs font-medium text-slate-200">
                      {i + 1}. {horse}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase mb-2">Deep Reasoning</h3>
                <p className="text-slate-300 leading-relaxed text-sm bg-slate-900/40 p-4 rounded-lg">
                  {prediction.reasoning}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase mb-2">Social/Market Sentiment</h3>
                <p className="text-slate-300 leading-relaxed text-sm bg-slate-900/40 p-4 rounded-lg italic border-l-2 border-emerald-500">
                  "{prediction.sentimentSummary}"
                </p>
              </div>
            </div>
          )}
        </div>
        
        <div className="p-4 bg-slate-900/80 border-t border-slate-700 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition"
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
};

export default PredictorModal;
