import { AlertTriangle, Pencil, Trash2 } from 'lucide-react';
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
import { useState, useEffect } from 'react';

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
