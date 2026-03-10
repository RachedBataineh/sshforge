import { useState, useEffect } from 'react';
import { Terminal, Plus, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAppStore } from '@/store/useAppStore';

interface AddServerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  identityFilePath: string;
  keyName: string;
}

export function AddServerDialog({ open, onOpenChange, identityFilePath, keyName }: AddServerDialogProps) {
  const { addServerConnection, error, setError } = useAppStore();
  const [alias, setAlias] = useState('');
  const [hostName, setHostName] = useState('');
  const [user, setUser] = useState('');
  const [port, setPort] = useState('22');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setAlias('');
      setHostName('');
      setUser('');
      setPort('22');
      setError(null);
    }
  }, [open, setError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alias.trim() || !hostName.trim() || !user.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await addServerConnection(identityFilePath, {
        alias: alias.trim(),
        hostName: hostName.trim(),
        user: user.trim(),
        port: port ? parseInt(port, 10) : undefined,
      });

      if (success) {
        onOpenChange(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Add Server Connection
          </DialogTitle>
          <DialogDescription>
            Configure SSH connection for <span className="font-medium text-foreground">{keyName}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Row 1: Alias & Host Name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="alias" className="text-xs">
                Alias <span className="text-destructive">*</span>
              </Label>
              <Input
                id="alias"
                placeholder="my-server"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                disabled={isSubmitting}
                className="h-8"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hostName" className="text-xs">
                Host Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="hostName"
                placeholder="192.168.1.100"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                disabled={isSubmitting}
                className="h-8"
              />
            </div>
          </div>

          {/* Row 2: User & Port */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="user" className="text-xs">
                User <span className="text-destructive">*</span>
              </Label>
              <Input
                id="user"
                placeholder="username"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                disabled={isSubmitting}
                className="h-8"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="port" className="text-xs">Port</Label>
              <Input
                id="port"
                type="number"
                placeholder="22"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                disabled={isSubmitting}
                className="h-8"
              />
            </div>
          </div>

          {/* Row 3: Identity File (full width, compact) */}
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
            <Key className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-xs text-muted-foreground truncate flex-1">
              {identityFilePath}
            </span>
          </div>

          {error && (
            <div className="text-xs text-destructive bg-destructive/10 p-2 rounded-md">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="flex-1 h-8"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1 h-8">
              {isSubmitting ? (
                'Adding...'
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Connection
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
