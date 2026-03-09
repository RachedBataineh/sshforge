import { Copy, Check, Eye, EyeOff, Key, ShieldCheck, Lock, Calendar, FileText } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

const algorithmLabels: Record<string, string> = {
  'ed25519': 'Ed25519',
  'rsa': 'RSA',
  'ecdsa-p256': 'ECDSA P-256',
  'ecdsa-p384': 'ECDSA P-384',
  'ecdsa-p521': 'ECDSA P-521',
  'sk-ed25519': 'Security Key Ed25519',
  'sk-ecdsa': 'Security Key ECDSA',
  'unknown': 'Unknown',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Unknown';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function KeyDetailView() {
  const { selectedKey, publicKeyContent, privateKeyContent, showPrivateKey, setShowPrivateKey } = useAppStore();
  const [copiedPublic, setCopiedPublic] = useState(false);
  const [copiedPrivate, setCopiedPrivate] = useState(false);

  if (!selectedKey) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Key className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No Key Selected</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Select a key from the sidebar to view its details
          </p>
        </div>
      </div>
    );
  }

  const handleCopyPublic = async () => {
    if (publicKeyContent) {
      await navigator.clipboard.writeText(publicKeyContent);
      setCopiedPublic(true);
      setTimeout(() => setCopiedPublic(false), 2000);
    }
  };

  const handleCopyPrivate = async () => {
    if (privateKeyContent) {
      await navigator.clipboard.writeText(privateKeyContent);
      setCopiedPrivate(true);
      setTimeout(() => setCopiedPrivate(false), 2000);
    }
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Key Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className={cn(
              'p-3 rounded-xl',
              selectedKey.algorithm === 'ed25519' ? 'bg-green-500/10 text-green-500' :
              selectedKey.algorithm === 'rsa' ? 'bg-blue-500/10 text-blue-500' :
              'bg-purple-500/10 text-purple-500'
            )}>
              {selectedKey.algorithm === 'ed25519' ? <ShieldCheck className="h-6 w-6" /> :
               selectedKey.algorithm === 'rsa' ? <Lock className="h-6 w-6" /> :
               <Key className="h-6 w-6" />}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{selectedKey.name}</h2>
              <p className="text-muted-foreground">
                {algorithmLabels[selectedKey.algorithm] || 'Unknown Algorithm'}
              </p>
            </div>
          </div>
        </div>

        {/* Key Info Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wider">Created</span>
              </div>
              <p className="font-medium text-sm">{formatDate(selectedKey.created)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <FileText className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wider">Modified</span>
              </div>
              <p className="font-medium text-sm">{formatDate(selectedKey.modified)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Key className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wider">Comment</span>
              </div>
              <p className="font-medium text-sm truncate" title={selectedKey.comment || 'None'}>
                {selectedKey.comment || 'No comment'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Public Key */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Public Key
                </CardTitle>
                <CardDescription>
                  Safe to share. Add this to servers and services.
                </CardDescription>
              </div>
              <Button variant="secondary" size="sm" onClick={handleCopyPublic}>
                {copiedPublic ? (
                  <>
                    <Check className="h-4 w-4 mr-1 text-green-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="key-preview text-xs max-h-32 overflow-auto">
              {publicKeyContent || 'Unable to load public key'}
            </pre>
            <p className="text-xs text-muted-foreground mt-2 font-mono truncate">
              {selectedKey.publicKeyPath}
            </p>
          </CardContent>
        </Card>

        {/* Private Key */}
        <Card className="border-amber-500/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Lock className="h-4 w-4 text-amber-500" />
                  Private Key
                  <span className="text-xs bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full">
                    Confidential
                  </span>
                </CardTitle>
                <CardDescription>
                  Never share this. Keep it secure.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPrivateKey(!showPrivateKey)}
                >
                  {showPrivateKey ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-1" />
                      Hide
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-1" />
                      Show
                    </>
                  )}
                </Button>
                <Button variant="secondary" size="sm" onClick={handleCopyPrivate}>
                  {copiedPrivate ? (
                    <>
                      <Check className="h-4 w-4 mr-1 text-green-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <pre className={cn(
                'key-preview text-xs max-h-48 overflow-auto transition-all',
                !showPrivateKey && 'blur-sm select-none'
              )}>
                {privateKeyContent || 'Unable to load private key'}
              </pre>
              {!showPrivateKey && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-lg">
                  <Button
                    variant="secondary"
                    onClick={() => setShowPrivateKey(true)}
                    className="gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Reveal Private Key
                  </Button>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-mono truncate">
              {selectedKey.privateKeyPath}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
