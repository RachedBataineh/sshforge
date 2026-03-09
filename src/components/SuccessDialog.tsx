import { CheckCircle2, Copy, Check, FolderOpen, Key, FileText } from 'lucide-react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useKeyStore } from '@/store/useKeyStore';
import { ALGORITHM_INFO } from '@/lib/constants';

export function SuccessDialog() {
  const { showSuccess, setShowSuccess, generatedKey, privateKeyPath, publicKeyPath, reset } = useKeyStore();
  const [copied, setCopied] = useState(false);

  if (!generatedKey) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedKey.publicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenFolder = async () => {
    await window.electronAPI.openInFileManager(privateKeyPath);
  };

  const handleClose = () => {
    setShowSuccess(false);
    reset();
  };

  const algoInfo = ALGORITHM_INFO[generatedKey.algorithm];

  return (
    <Dialog open={showSuccess} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <DialogTitle>Key Generated Successfully!</DialogTitle>
              <DialogDescription>
                Your SSH key pair has been created and saved.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Key Info */}
          <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Key className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">{generatedKey.keyName}</p>
              <p className="text-sm text-muted-foreground">{algoInfo.name}</p>
            </div>
          </div>

          {/* Public Key */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Public Key
            </label>
            <div className="relative group">
              <pre className="key-preview text-xs max-h-24 overflow-y-auto">
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
          </div>

          {/* Fingerprint */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Fingerprint:</span>
            <code className="font-mono text-xs bg-muted px-2 py-1 rounded">
              {generatedKey.fingerprint}
            </code>
          </div>

          {/* File Locations */}
          <div className="space-y-2">
            <label className="text-sm font-medium">File Locations</label>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-16">Private:</span>
                <code className="font-mono text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                  {privateKeyPath}
                </code>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-16">Public:</span>
                <code className="font-mono text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                  {publicKeyPath}
                </code>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={handleOpenFolder} className="flex-1">
              <FolderOpen className="h-4 w-4 mr-2" />
              Open in Finder
            </Button>
            <Button onClick={handleClose} className="flex-1">
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
