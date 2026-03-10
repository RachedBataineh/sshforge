import { AlertTriangle, Pencil, Trash2, AlertOctagon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAppStore } from '@/store/useAppStore';
import { useKeyStore } from '@/store/useKeyStore';
import { useState, useEffect } from 'react';
import { pendingKeyRef } from './KeyGeneratorForm';

export function DeleteKeyDialog() {
  const {
    showDeleteDialog,
    setShowDeleteDialog,
    keyToDelete,
    deleteSelectedKey,
    error,
  } = useAppStore();

  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const success = await deleteSelectedKey();
    setIsDeleting(false);
    if (success) {
      setShowDeleteDialog(false);
    }
  };

  if (!keyToDelete) return null;

  return (
    <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-destructive/10 rounded-lg">
              <Trash2 className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <DialogTitle>Delete SSH Key?</DialogTitle>
              <DialogDescription>
                This action cannot be undone.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This will permanently delete both the private and public key files for
              <strong className="mx-1">{keyToDelete.name}</strong>
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium">{keyToDelete.name}</p>
            <p className="text-xs text-muted-foreground">
              {keyToDelete.algorithm.toUpperCase()} • {keyToDelete.publicKeyPath}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Key'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RenameKeyDialog() {
  const {
    showRenameDialog,
    setShowRenameDialog,
    keyToRename,
    renameValue,
    setRenameValue,
    renameSelectedKey,
    error,
  } = useAppStore();

  const [isRenaming, setIsRenaming] = useState(false);

  useEffect(() => {
    if (keyToRename) {
      setRenameValue(keyToRename.name);
    }
  }, [keyToRename, setRenameValue]);

  const handleRename = async () => {
    if (!renameValue.trim()) return;
    setIsRenaming(true);
    const success = await renameSelectedKey(renameValue.trim());
    setIsRenaming(false);
    if (success) {
      setShowRenameDialog(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename();
    }
  };

  if (!keyToRename) return null;

  return (
    <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Pencil className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Rename SSH Key</DialogTitle>
              <DialogDescription>
                Enter a new name for this key.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="keyName">Key Name</Label>
            <Input
              id="keyName"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., github_key"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              The key files will be renamed to <code className="bg-muted px-1 rounded">{renameValue || 'key_name'}</code> and <code className="bg-muted px-1 rounded">{renameValue || 'key_name'}.pub</code>
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleRename}
            disabled={isRenaming || !renameValue.trim()}
          >
            {isRenaming ? 'Renaming...' : 'Rename Key'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function OverwriteKeyDialog() {
  const {
    showOverwriteDialog,
    setShowOverwriteDialog,
    keyName,
    defaultPath,
    setShowSuccess,
    setGeneratedKey,
    setPrivateKeyPath,
    setPublicKeyPath,
    setError,
    setIsGenerating,
  } = useKeyStore();

  const [isOverwriting, setIsOverwriting] = useState(false);

  const handleOverwrite = async () => {
    if (!pendingKeyRef.current) return;

    setIsOverwriting(true);

    try {
      const saveResult = await window.electronAPI.saveKey({
        privateKey: pendingKeyRef.current.privateKey,
        publicKey: pendingKeyRef.current.publicKey,
        keyName,
        savePath: defaultPath,
        overwrite: true,
      });

      if (!saveResult.success) {
        setError(saveResult.error || 'Failed to save key');
        setShowOverwriteDialog(false);
        return;
      }

      // Now set the generated key in store so KeyPreview will show it
      setGeneratedKey({
        privateKey: pendingKeyRef.current.privateKey,
        publicKey: pendingKeyRef.current.publicKey,
        fingerprint: pendingKeyRef.current.fingerprint,
        algorithm: pendingKeyRef.current.algorithm as any,
        keyName: pendingKeyRef.current.keyName,
      });
      setPrivateKeyPath(saveResult.privateKeyPath);
      setPublicKeyPath(saveResult.publicKeyPath);
      setShowOverwriteDialog(false);
      pendingKeyRef.current = null;
      setShowSuccess(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(message);
      setShowOverwriteDialog(false);
    } finally {
      setIsOverwriting(false);
      setIsGenerating(false);
    }
  };

  const handleCancel = () => {
    setShowOverwriteDialog(false);
    setIsGenerating(false);
    // Clear the pending key when canceling
    pendingKeyRef.current = null;
  };

  return (
    <Dialog open={showOverwriteDialog} onOpenChange={setShowOverwriteDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <AlertOctagon className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <DialogTitle>Overwrite Existing Key?</DialogTitle>
              <DialogDescription>
                This action cannot be undone.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <Alert className="border-amber-500/50 bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-amber-700 dark:text-amber-400">
              A key named <strong className="mx-1">{keyName}</strong> already exists.
              Overwriting it will permanently delete the existing key pair.
            </AlertDescription>
          </Alert>

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> You will lose access to any servers or services
              that use the existing key. Make sure you have a backup or alternative
              access method before proceeding.
            </AlertDescription>
          </Alert>

          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium">New key will be saved to:</p>
            <p className="text-xs text-muted-foreground font-mono truncate">
              {defaultPath}/{keyName}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleOverwrite}
            disabled={isOverwriting}
          >
            {isOverwriting ? 'Overwriting...' : 'Overwrite Key'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
