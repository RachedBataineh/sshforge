import { useState, useEffect } from 'react';
import { Terminal, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="alias">
              Host Alias <span className="text-destructive">*</span>
            </Label>
            <Input
              id="alias"
              placeholder="my-server"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              A short name to identify this server (e.g., "my-server", "prod-1")
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hostName">
              Host Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="hostName"
              placeholder="192.168.1.100 or server.example.com"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              The IP address or domain name of the server
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="user">
              User <span className="text-destructive">*</span>
            </Label>
            <Input
              id="user"
              placeholder="username"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              The SSH username for authentication
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="port">Port</Label>
            <Input
              id="port"
              type="number"
              placeholder="22"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              SSH port (default: 22)
            </p>
          </div>

          <div className="space-y-2">
            <Label>Identity File</Label>
            <div className="text-sm font-mono bg-muted px-3 py-2 rounded-md truncate">
              {identityFilePath}
            </div>
            <p className="text-xs text-muted-foreground">
              This key will be used for authentication
            </p>
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                'Adding...'
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Connection
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
