import { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, Loader2 } from 'lucide-react';
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

interface AddToAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  privateKeyPath: string;
  keyName: string;
}

export function AddToAgentDialog({ open, onOpenChange, privateKeyPath, keyName }: AddToAgentDialogProps) {
  const { addKeyToAgent, error, setError } = useAppStore();
  const [passphrase, setPassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setPassphrase('');
      setShowPassphrase(false);
      setError(null);
    }
  }, [open, setError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphrase) {
      setError('Please enter the passphrase');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await addKeyToAgent(privateKeyPath, passphrase);
      if (success) {
        onOpenChange(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Add to SSH Agent
          </DialogTitle>
          <DialogDescription>
            Enter the passphrase for <span className="font-medium text-foreground">{keyName}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="passphrase" className="text-xs">Passphrase</Label>
            <div className="relative">
              <Input
                id="passphrase"
                type={showPassphrase ? 'text' : 'password'}
                placeholder="Enter passphrase"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                disabled={isSubmitting}
                className="h-8 pr-10"
                autoFocus
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-8 w-8 px-0"
                onClick={() => setShowPassphrase(!showPassphrase)}
              >
                {showPassphrase ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>

          {error && (
            <div className="text-xs text-destructive bg-destructive/10 p-2 rounded-md">
              {error}
            </div>
          )}

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
            <Button type="submit" disabled={isSubmitting || !passphrase} className="flex-1 h-8">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Key className="h-3.5 w-3.5 mr-1" />
                  Add to Agent
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
