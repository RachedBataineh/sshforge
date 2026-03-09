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
import { useAppStore } from '@/store/useAppStore';
import { ALGORITHM_INFO } from '@/lib/constants';

export function SuccessDialog() {
  const { showSuccess, setShowSuccess, generatedKey, privateKeyPath, publicKeyPath, reset } = useKeyStore();
  const { loadKeys, selectKey, setCurrentView } = useAppStore();
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

  const handleClose = async () => {
    setShowSuccess(false);
    reset();
    // Refresh the key list and navigate to list view
    await loadKeys();
    setCurrentView('list');
  };

  const handleViewKey = async () => {
    setShowSuccess(false);
    reset();
    // Refresh the key list
    await loadKeys();
    // Find the newly created key and select it
    setTimeout(async () => {
      const allKeys = await window.electronAPI.listKeys();
      const newKey = allKeys.find(k => k.privateKeyPath === privateKeyPath);
      if (newKey) {
        await selectKey(newKey);
      }
    }, 100);
    setCurrentView('list');
  };

  const algoInfo = ALGORITHM_INFO[generatedKey.algorithm];

  return (
    <Dialog open={showSuccess} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg flex-shrink-0">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            </div>
            <div className="min-w-0">
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
            <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
              <Key className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">{generatedKey.keyName}</p>
              <p className="text-sm text-muted-foreground">{algoInfo.name}</p>
            </div>
          </div>

          {/* Public Key */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 flex-shrink-0" />
              Public Key
            </label>
            <div className="relative group">
              <pre className="key-preview text-xs max-h-24 overflow-auto break-all">
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
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <span className="text-muted-foreground flex-shrink-0">Fingerprint:</span>
            <code className="font-mono text-xs bg-muted px-2 py-1 rounded break-all">
              {generatedKey.fingerprint}
            </code>
          </div>

          {/* File Locations */}
          <div className="space-y-2">
            <label className="text-sm font-medium">File Locations</label>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground w-14 flex-shrink-0 pt-0.5">Private:</span>
                <code className="font-mono text-xs bg-muted px-2 py-1 rounded flex-1 break-all">
                  {privateKeyPath}
                </code>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground w-14 flex-shrink-0 pt-0.5">Public:</span>
                <code className="font-mono text-xs bg-muted px-2 py-1 rounded flex-1 break-all">
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
            <Button onClick={handleViewKey} className="flex-1">
              <Key className="h-4 w-4 mr-2" />
              View Key
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
