import { Copy, Check, Fingerprint } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useKeyStore } from '@/store/useKeyStore';

export function KeyPreview() {
  const { generatedKey } = useKeyStore();
  const [copied, setCopied] = useState(false);

  if (!generatedKey) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedKey.publicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Fingerprint className="h-4 w-4 text-primary" />
        Public Key
      </div>
      <div className="relative group">
        <pre className="key-preview text-muted-foreground">
          {generatedKey.publicKey}
        </pre>
        <Button
          size="sm"
          variant="secondary"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 mr-1 text-green-500" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3 mr-1" />
              Copy
            </>
          )}
        </Button>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium">Fingerprint:</span>
        <code className="font-mono bg-muted px-2 py-0.5 rounded">
          {generatedKey.fingerprint}
        </code>
      </div>
    </div>
  );
}
