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
      <DialogContent className="sm:max-w-md w-[calc(100%-2rem)] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg flex-shrink-0">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            </div>
            <div className="min-w-0 overflow-hidden">
              <DialogTitle>Key Generated Successfully!</DialogTitle>
              <DialogDescription>
                Your SSH key pair has been created and saved.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4 overflow-y-auto flex-1 min-h-0">
          {/* Key Info */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
              <Key className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="font-medium truncate">{generatedKey.keyName}</p>
              <p className="text-sm text-muted-foreground">{algoInfo.name}</p>
            </div>
          </div>

          {/* Public Key */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 flex-shrink-0" />
                Public Key
              </label>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2"
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
            <pre className="text-xs bg-muted/50 p-3 rounded-lg max-h-20 overflow-auto whitespace-pre-wrap break-all font-mono">
              {generatedKey.publicKey}
            </pre>
          </div>

          {/* Fingerprint */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Fingerprint</label>
            <div className="p-3 bg-muted/50 rounded-lg">
              <code className="font-mono text-xs break-all">
                {generatedKey.fingerprint}
              </code>
            </div>
          </div>

          {/* File Locations */}
          <div className="space-y-2">
            <label className="text-sm font-medium">File Locations</label>
            <div className="p-3 bg-muted/50 rounded-lg space-y-2 text-xs">
              <div className="flex gap-2">
                <span className="text-muted-foreground w-14 flex-shrink-0">Private:</span>
                <code className="font-mono break-all flex-1">
                  {privateKeyPath}
                </code>
              </div>
              <div className="flex gap-2">
                <span className="text-muted-foreground w-14 flex-shrink-0">Public:</span>
                <code className="font-mono break-all flex-1">
                  {publicKeyPath}
                </code>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={handleOpenFolder} className="flex-1 h-9">
              <FolderOpen className="h-4 w-4 mr-1.5" />
              Open SSH Folder
            </Button>
            <Button onClick={handleViewKey} className="flex-1 h-9">
              <Key className="h-4 w-4 mr-1.5" />
              View Key
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
