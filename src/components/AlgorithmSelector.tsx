import { ShieldCheck, Zap, Lock, Key } from 'lucide-react';
import { useKeyStore } from '@/store/useKeyStore';
import { ALGORITHM_INFO } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { KeyAlgorithm } from '@/types';

const algorithmIcons: Record<KeyAlgorithm, React.ReactNode> = {
  'ed25519': <Zap className="h-5 w-5" />,
  'rsa-4096': <ShieldCheck className="h-5 w-5" />,
  'ecdsa-p256': <Lock className="h-5 w-5" />,
  'ecdsa-p384': <Lock className="h-5 w-5" />,
  'ecdsa-p521': <Key className="h-5 w-5" />,
};

export function AlgorithmSelector() {
  const { algorithm, setAlgorithm } = useKeyStore();

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Algorithm</label>
      <div className="grid grid-cols-1 gap-3">
        {(Object.keys(ALGORITHM_INFO) as KeyAlgorithm[]).map((algo) => {
          const info = ALGORITHM_INFO[algo];
          const isSelected = algorithm === algo;

          return (
            <button
              key={algo}
              type="button"
              onClick={() => setAlgorithm(algo)}
              className={cn(
                'algorithm-card',
                isSelected && 'selected'
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  'mt-0.5 p-2 rounded-lg transition-colors',
                  isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                )}>
                  {algorithmIcons[algo]}
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{info.name}</span>
                    {info.recommended && (
                      <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {info.description}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>Key size: {info.keySize}</span>
                    <span className="capitalize">Speed: {info.speed}</span>
                  </div>
                </div>
                <div className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                  isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                )}>
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
