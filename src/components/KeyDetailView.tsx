import { Copy, Check, Eye, EyeOff, KeyRound, Lock, Calendar, FileText, Pencil, Trash2, Key, MinusCircle, CheckCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import { ServerConnectionsSection } from './ServerConnectionsSection';
import { AddToAgentDialog } from './AddToAgentDialog';

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
  const {
    selectedKey,
    publicKeyContent,
    privateKeyContent,
    showPrivateKey,
    setShowPrivateKey,
    setKeyToDelete,
    setShowDeleteDialog,
    setKeyToRename,
    setShowRenameDialog,
    setRenameValue,
    isKeyInAgent,
    checkKeyInAgent,
    removeKeyFromAgent,
  } = useAppStore();
  const [copiedPublic, setCopiedPublic] = useState(false);
  const [copiedPrivate, setCopiedPrivate] = useState(false);
  const [showAddToAgentDialog, setShowAddToAgentDialog] = useState(false);
  const [isRemovingFromAgent, setIsRemovingFromAgent] = useState(false);

  // Check if key is in agent when selected key changes
  useEffect(() => {
    if (selectedKey) {
      checkKeyInAgent(selectedKey.privateKeyPath);
    }
  }, [selectedKey, checkKeyInAgent]);

  if (!selectedKey) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center flex flex-col items-center">
          <KeyRound className="h-16 w-16 text-muted-foreground/30 mb-4" />
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

  const handleRemoveFromAgent = async () => {
    if (!selectedKey) return;
    setIsRemovingFromAgent(true);
    try {
      await removeKeyFromAgent(selectedKey.privateKeyPath);
    } finally {
      setIsRemovingFromAgent(false);
    }
  };

  const keyInAgent = selectedKey ? isKeyInAgent(selectedKey.privateKeyPath) : false;

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Key Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">{selectedKey.name}</h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                setKeyToRename(selectedKey);
                setRenameValue(selectedKey.name);
                setShowRenameDialog(true);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
            onClick={() => {
              setKeyToDelete(selectedKey);
              setShowDeleteDialog(true);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground -mt-2">
          {algorithmLabels[selectedKey.algorithm] || 'Unknown Algorithm'}
        </p>

        {/* Key Info Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="py-3">
              <div className="flex items-center gap-2 text-muted-foreground mb-0.5">
                <Calendar className="h-3.5 w-3.5" />
                <span className="text-xs uppercase tracking-wider">Created</span>
              </div>
              <p className="font-medium text-sm">{formatDate(selectedKey.created)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-3">
              <div className="flex items-center gap-2 text-muted-foreground mb-0.5">
                <FileText className="h-3.5 w-3.5" />
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
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  <KeyRound className="h-4 w-4" />
                  Public Key
                </CardTitle>
                <CardDescription className="text-xs">
                  Safe to share. Add this to servers and services.
                </CardDescription>
              </div>
              <Button variant="secondary" size="sm" onClick={handleCopyPublic}>
                {copiedPublic ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1 text-green-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <pre className="key-preview text-xs max-h-20 overflow-auto">
              {publicKeyContent || 'Unable to load public key'}
            </pre>
            <p className="text-xs text-muted-foreground mt-1.5 font-mono truncate">
              {selectedKey.publicKeyPath}
            </p>
          </CardContent>
        </Card>

        {/* Private Key */}
        <Card className="border-amber-500/30">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Lock className="h-4 w-4 text-amber-500" />
                  Private Key
                  <span className="text-xs bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded-full">
                    Confidential
                  </span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Never share this. Keep it secure.
                </CardDescription>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPrivateKey(!showPrivateKey)}
                >
                  {showPrivateKey ? (
                    <>
                      <EyeOff className="h-3.5 w-3.5 mr-1" />
                      Hide
                    </>
                  ) : (
                    <>
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      Show
                    </>
                  )}
                </Button>
                <Button variant="secondary" size="sm" onClick={handleCopyPrivate}>
                  {copiedPrivate ? (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1 text-green-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="relative">
              <pre className={cn(
                'key-preview text-xs max-h-32 overflow-auto transition-all',
                !showPrivateKey && 'blur-sm select-none'
              )}>
                {privateKeyContent || 'Unable to load private key'}
              </pre>
              {!showPrivateKey && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-lg">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowPrivateKey(true)}
                    className="gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Reveal Private Key
                  </Button>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 font-mono truncate">
              {selectedKey.privateKeyPath}
            </p>
          </CardContent>
        </Card>

        {/* SSH Agent Section */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  SSH Agent
                </CardTitle>
                <CardDescription className="text-xs">
                  Load key into agent to avoid typing passphrase
                </CardDescription>
              </div>
              {keyInAgent ? (
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  <span className="text-xs text-green-600 font-medium">Loaded</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <MinusCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Not loaded</span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex gap-2">
              {keyInAgent ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveFromAgent}
                  disabled={isRemovingFromAgent}
                  className="flex-1"
                >
                  {isRemovingFromAgent ? (
                    <>
                      <span className="animate-spin mr-1">⏳</span>
                      Removing...
                    </>
                  ) : (
                    <>
                      <MinusCircle className="h-3.5 w-3.5 mr-1" />
                      Remove from Agent
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowAddToAgentDialog(true)}
                  className="flex-1"
                >
                  <Key className="h-3.5 w-3.5 mr-1" />
                  Add to Agent
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {keyInAgent
                ? 'Key is loaded. SSH connections will use it automatically.'
                : 'Add key to agent to avoid entering passphrase for each connection.'}
            </p>
          </CardContent>
        </Card>

        {/* Server Connections */}
        <ServerConnectionsSection
          identityFilePath={selectedKey.privateKeyPath}
          keyName={selectedKey.name}
        />
      </div>

      {/* Add to Agent Dialog */}
      {selectedKey && (
        <AddToAgentDialog
          open={showAddToAgentDialog}
          onOpenChange={setShowAddToAgentDialog}
          privateKeyPath={selectedKey.privateKeyPath}
          keyName={selectedKey.name}
        />
      )}
    </div>
  );
}
