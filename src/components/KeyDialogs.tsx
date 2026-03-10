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
  const [confirmStep, setConfirmStep] = useState(false);
  const [confirmKeyName, setConfirmKeyName] = useState('');

  // Reset state when dialog opens
  useEffect(() => {
    if (showDeleteDialog) {
      setConfirmStep(false);
      setConfirmKeyName('');
    }
  }, [showDeleteDialog]);

  const handleDelete = async () => {
    setIsDeleting(true);
    const success = await deleteSelectedKey();
    setIsDeleting(false);
    if (success) {
      setShowDeleteDialog(false);
    }
  };

  const handleBack = () => {
    setConfirmStep(false);
    setConfirmKeyName('');
  };

  const handleProceedToConfirm = () => {
    setConfirmStep(true);
  };

  if (!keyToDelete) return null;

  const isNameMatch = confirmKeyName === keyToDelete.name;

  // Step 2: Confirm by typing key name
  if (confirmStep) {
    return (
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md w-[calc(100%-2rem)] max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-lg flex-shrink-0">
                <Trash2 className="h-6 w-6 text-destructive" />
              </div>
              <div className="min-w-0 overflow-hidden">
                <DialogTitle>Confirm Deletion</DialogTitle>
                <DialogDescription>
                  Type the key name to confirm deletion.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 mt-4 overflow-y-auto flex-1 min-h-0 p-1 -m-1">
            <Alert variant="destructive">
              <AlertOctagon className="h-4 w-4" />
              <AlertDescription>
                You are about to permanently delete <strong className="mx-1">{keyToDelete.name}</strong>.
                This will revoke your access to any servers using this key.
              </AlertDescription>
            </Alert>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="confirmDeleteName">
                Type <code className="bg-muted px-1.5 py-0.5 rounded text-sm">{keyToDelete.name}</code> to confirm:
              </Label>
              <Input
                id="confirmDeleteName"
                value={confirmKeyName}
                onChange={(e) => setConfirmKeyName(e.target.value)}
                placeholder={keyToDelete.name}
                className={isNameMatch ? 'border-green-500 focus-visible:ring-green-500' : ''}
                autoFocus
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={handleBack} className="flex-1 h-9">
              Back
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting || !isNameMatch}
              className="flex-1 h-9"
            >
              {isDeleting ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Step 1: Initial warning
  return (
    <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <DialogContent className="sm:max-w-md w-[calc(100%-2rem)] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-destructive/10 rounded-lg flex-shrink-0">
              <Trash2 className="h-6 w-6 text-destructive" />
            </div>
            <div className="min-w-0 overflow-hidden">
              <DialogTitle>Delete SSH Key?</DialogTitle>
              <DialogDescription>
                This action cannot be undone.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4 overflow-y-auto flex-1 min-h-0 p-1 -m-1">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This will permanently delete both the private and public key files for
              <strong className="mx-1">{keyToDelete.name}</strong>
            </AlertDescription>
          </Alert>

          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium">{keyToDelete.name}</p>
            <p className="text-xs text-muted-foreground">
              {keyToDelete.algorithm.toUpperCase()} • {keyToDelete.publicKeyPath}
            </p>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="flex-1 h-9">
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleProceedToConfirm}
            className="flex-1 h-9"
          >
            Delete Key
          </Button>
        </div>
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
  const [confirmStep, setConfirmStep] = useState(false);
  const [confirmKeyName, setConfirmKeyName] = useState('');

  // Reset state when dialog opens
  useEffect(() => {
    if (showOverwriteDialog) {
      setConfirmStep(false);
      setConfirmKeyName('');
    }
  }, [showOverwriteDialog]);

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

  const handleBack = () => {
    setConfirmStep(false);
    setConfirmKeyName('');
  };

  const handleProceedToConfirm = () => {
    setConfirmStep(true);
  };

  const isNameMatch = confirmKeyName === keyName;

  // Step 2: Confirm by typing key name
  if (confirmStep) {
    return (
      <Dialog open={showOverwriteDialog} onOpenChange={setShowOverwriteDialog}>
        <DialogContent className="sm:max-w-md w-[calc(100%-2rem)] max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-lg flex-shrink-0">
                <Trash2 className="h-6 w-6 text-destructive" />
              </div>
              <div className="min-w-0 overflow-hidden">
                <DialogTitle>Confirm Overwrite</DialogTitle>
                <DialogDescription>
                  Type the key name to confirm deletion.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 mt-4 overflow-y-auto flex-1 min-h-0 p-1 -m-1">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You are about to permanently delete <strong className="mx-1">{keyName}</strong>.
                This will revoke your access to any servers using this key.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="confirmKeyName">
                Type <code className="bg-muted px-1.5 py-0.5 rounded text-sm">{keyName}</code> to confirm:
              </Label>
              <Input
                id="confirmKeyName"
                value={confirmKeyName}
                onChange={(e) => setConfirmKeyName(e.target.value)}
                placeholder={keyName}
                className={isNameMatch ? 'border-green-500 focus-visible:ring-green-500' : ''}
                autoFocus
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={handleBack} className="flex-1 h-9">
              Back
            </Button>
            <Button
              variant="destructive"
              onClick={handleOverwrite}
              disabled={isOverwriting || !isNameMatch}
              className="flex-1 h-9"
            >
              {isOverwriting ? 'Overwriting...' : 'Confirm Overwrite'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Step 1: Initial warning
  return (
    <Dialog open={showOverwriteDialog} onOpenChange={setShowOverwriteDialog}>
      <DialogContent className="sm:max-w-md w-[calc(100%-2rem)] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg flex-shrink-0">
              <AlertOctagon className="h-6 w-6 text-amber-500" />
            </div>
            <div className="min-w-0 overflow-hidden">
              <DialogTitle>Overwrite Existing Key?</DialogTitle>
              <DialogDescription>
                This action cannot be undone.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4 overflow-y-auto flex-1 min-h-0 p-1 -m-1">
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

          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium">New key will be saved to:</p>
            <p className="text-xs text-muted-foreground font-mono truncate">
              {defaultPath}/{keyName}
            </p>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={handleCancel} className="flex-1 h-9">
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleProceedToConfirm}
            className="flex-1 h-9"
          >
            Overwrite Key
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
