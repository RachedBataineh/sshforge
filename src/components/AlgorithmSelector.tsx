import { useKeyStore } from '@/store/useKeyStore';
import { ALGORITHM_INFO } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { KeyAlgorithm } from '@/types';

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
            </button>
          );
        })}
      </div>
    </div>
  );
}
