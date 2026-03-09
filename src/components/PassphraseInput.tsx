import { useState } from 'react';
import { Eye, EyeOff, Lock, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useKeyStore } from '@/store/useKeyStore';
import { cn } from '@/lib/utils';

export function PassphraseInput() {
  const { passphrase, confirmPassphrase, setPassphrase, setConfirmPassphrase } = useKeyStore();
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const passMatch = passphrase === confirmPassphrase;
  const showMatchIndicator = confirmPassphrase.length > 0;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="passphrase">Passphrase (optional)</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="passphrase"
            type={showPassphrase ? 'text' : 'password'}
            placeholder="Enter passphrase for extra security"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            className="pl-10 pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassphrase(!showPassphrase)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassphrase ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          A passphrase adds an extra layer of security to your private key.
        </p>
      </div>

      {passphrase && (
        <div className="space-y-2 animate-fade-in">
          <Label htmlFor="confirm-passphrase">Confirm Passphrase</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="confirm-passphrase"
              type={showConfirm ? 'text' : 'password'}
              placeholder="Confirm your passphrase"
              value={confirmPassphrase}
              onChange={(e) => setConfirmPassphrase(e.target.value)}
              className={cn(
                'pl-10 pr-10',
                showMatchIndicator && (passMatch ? 'border-green-500' : 'border-red-500')
              )}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {showMatchIndicator && (
                passMatch ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <X className="h-4 w-4 text-red-500" />
                )
              )}
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {showMatchIndicator && !passMatch && (
            <p className="text-xs text-red-500">Passphrases do not match</p>
          )}
        </div>
      )}
    </div>
  );
}
