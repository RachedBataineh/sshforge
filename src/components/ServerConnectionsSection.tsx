import { useState, useEffect } from 'react';
import { Server, Terminal, Trash2, RefreshCw, Plus, ExternalLink, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/store/useAppStore';
import { AddServerDialog } from './AddServerDialog';
import type { SSHServerConnection } from '@/types';

interface ServerConnectionsSectionProps {
  identityFilePath: string;
  keyName: string;
}

export function ServerConnectionsSection({ identityFilePath, keyName }: ServerConnectionsSectionProps) {
  const {
    serverConnections,
    loadServerConnections,
    removeServerConnection,
    connectToServer,
    forgetServer,
    showAddServerDialog,
    setShowAddServerDialog,
  } = useAppStore();

  const [forgettingServer, setForgettingServer] = useState<string | null>(null);
  const [connectingServer, setConnectingServer] = useState<string | null>(null);

  // Delete dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [serverToDelete, setServerToDelete] = useState<SSHServerConnection | null>(null);
  const [alsoForget, setAlsoForget] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmStep, setConfirmStep] = useState(false);
  const [confirmAlias, setConfirmAlias] = useState('');

  // Load server connections on mount
  useEffect(() => {
    loadServerConnections();
  }, [loadServerConnections]);

  // Filter connections for this specific key
  const keyConnections = serverConnections.filter(
    (conn) => conn.identityFilePath === identityFilePath
  );

  const handleConnect = async (connection: SSHServerConnection) => {
    setConnectingServer(connection.alias);
    try {
      await connectToServer(connection);
    } finally {
      setConnectingServer(null);
    }
  };

  const handleForget = async (connection: SSHServerConnection) => {
    setForgettingServer(connection.alias);
    try {
      await forgetServer(connection.hostName);
    } finally {
      setForgettingServer(null);
    }
  };

  const handleDeleteClick = (connection: SSHServerConnection) => {
    setServerToDelete(connection);
    setAlsoForget(false);
    setConfirmStep(false);
    setConfirmAlias('');
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!serverToDelete) return;

    setIsDeleting(true);
    try {
      // If also forget is checked, remove from known_hosts first
      if (alsoForget) {
        await forgetServer(serverToDelete.hostName);
      }
      // Then remove from SSH config
      await removeServerConnection(serverToDelete.alias);
      setShowDeleteDialog(false);
      setServerToDelete(null);
      setConfirmStep(false);
      setConfirmAlias('');
    } finally {
      setIsDeleting(false);
    }
  };

  const isAliasMatch = confirmAlias === serverToDelete?.alias;

  // Step 2: Confirm by typing alias
  if (confirmStep && serverToDelete) {
    return (
      <>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  Server Connections
                </CardTitle>
                <CardDescription className="text-xs">
                  Servers configured to use this key
                </CardDescription>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowAddServerDialog(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Server
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {keyConnections.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Server className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No server connections configured</p>
                <p className="text-xs mt-1">
                  Add a server to quickly connect using this key
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {keyConnections.map((connection) => (
                  <div
                    key={connection.alias}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{connection.alias}</span>
                        {connection.port && connection.port !== 22 && (
                          <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            :{connection.port}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {connection.user}@{connection.hostName}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleConnect(connection)}
                        disabled={connectingServer === connection.alias}
                        title="Open Terminal and connect"
                      >
                        {connectingServer === connection.alias ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Terminal className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleForget(connection)}
                        disabled={forgettingServer === connection.alias}
                        title="Remove from known_hosts (fixes 'REMOTE HOST IDENTIFICATION HAS CHANGED' errors)"
                      >
                        {forgettingServer === connection.alias ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ExternalLink className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleDeleteClick(connection)}
                        title="Remove from SSH config"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
              <p className="flex items-center gap-1.5">
                <Terminal className="h-3 w-3" />
                <strong>Connect</strong> - Opens Terminal with SSH command
              </p>
              <p className="flex items-center gap-1.5 mt-1">
                <ExternalLink className="h-3 w-3" />
                <strong>Forget</strong> - Removes from known_hosts (fixes host key errors)
              </p>
              <p className="flex items-center gap-1.5 mt-1">
                <Trash2 className="h-3 w-3" />
                <strong>Remove</strong> - Deletes from SSH config
              </p>
            </div>
          </CardContent>
        </Card>

        <AddServerDialog
          open={showAddServerDialog}
          onOpenChange={setShowAddServerDialog}
          identityFilePath={identityFilePath}
          keyName={keyName}
        />

        {/* Step 2 Dialog: Confirm by typing alias */}
        <Dialog open={showDeleteDialog} onOpenChange={(open) => {
          if (!open) {
            setShowDeleteDialog(false);
            setServerToDelete(null);
            setConfirmStep(false);
            setConfirmAlias('');
          }
        }}>
          <DialogContent className="sm:max-w-md w-[calc(100%-2rem)] max-h-[85vh] overflow-hidden flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-destructive/10 rounded-lg flex-shrink-0">
                  <Trash2 className="h-6 w-6 text-destructive" />
                </div>
                <div className="min-w-0 overflow-hidden">
                  <DialogTitle>Confirm Removal</DialogTitle>
                  <DialogDescription>
                    Type the server alias to confirm deletion.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 mt-4 overflow-y-auto flex-1 min-h-0 p-1 -m-1">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  You are about to remove <strong className="mx-1">{serverToDelete.alias}</strong>.
                  This action cannot be undone.
                </AlertDescription>
              </Alert>

              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium">{serverToDelete.alias}</p>
                <p className="text-xs text-muted-foreground">
                  {serverToDelete.user}@{serverToDelete.hostName}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmAlias">
                  Type <code className="bg-muted px-1.5 py-0.5 rounded text-sm">{serverToDelete.alias}</code> to confirm:
                </Label>
                <Input
                  id="confirmAlias"
                  value={confirmAlias}
                  onChange={(e) => setConfirmAlias(e.target.value)}
                  placeholder={serverToDelete.alias}
                  className={isAliasMatch ? 'border-green-500 focus-visible:ring-green-500' : ''}
                  autoFocus
                />
              </div>

              {/* Forget servers checkbox */}
              <div className="flex items-start space-x-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <Checkbox
                  id="alsoForgetConfirm"
                  checked={alsoForget}
                  onCheckedChange={(checked) => setAlsoForget(checked as boolean)}
                />
                <div className="space-y-1 leading-none">
                  <Label
                    htmlFor="alsoForgetConfirm"
                    className="text-sm font-medium cursor-pointer flex items-center gap-1.5"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-amber-600" />
                    Also forget from known_hosts
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Removes {serverToDelete.hostName} from known_hosts.
                    Select this if you plan to reconnect later to avoid host key errors.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setConfirmStep(false);
                  setConfirmAlias('');
                }}
                disabled={isDeleting}
                className="flex-1 h-9"
              >
                Back
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={isDeleting || !isAliasMatch}
                className="flex-1 h-9"
              >
                {isDeleting ? 'Removing...' : alsoForget ? 'Forget & Remove' : 'Confirm Remove'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Step 1: Initial warning dialog
  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <Server className="h-4 w-4" />
                Server Connections
              </CardTitle>
              <CardDescription className="text-xs">
                Servers configured to use this key
              </CardDescription>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowAddServerDialog(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Server
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {keyConnections.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Server className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No server connections configured</p>
              <p className="text-xs mt-1">
                Add a server to quickly connect using this key
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {keyConnections.map((connection) => (
                <div
                  key={connection.alias}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{connection.alias}</span>
                      {connection.port && connection.port !== 22 && (
                        <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          :{connection.port}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {connection.user}@{connection.hostName}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleConnect(connection)}
                      disabled={connectingServer === connection.alias}
                      title="Open Terminal and connect"
                    >
                      {connectingServer === connection.alias ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Terminal className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleForget(connection)}
                      disabled={forgettingServer === connection.alias}
                      title="Remove from known_hosts (fixes 'REMOTE HOST IDENTIFICATION HAS CHANGED' errors)"
                    >
                      {forgettingServer === connection.alias ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ExternalLink className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleDeleteClick(connection)}
                      title="Remove from SSH config"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
            <p className="flex items-center gap-1.5">
              <Terminal className="h-3 w-3" />
              <strong>Connect</strong> - Opens Terminal with SSH command
            </p>
            <p className="flex items-center gap-1.5 mt-1">
              <ExternalLink className="h-3 w-3" />
              <strong>Forget</strong> - Removes from known_hosts (fixes host key errors)
            </p>
            <p className="flex items-center gap-1.5 mt-1">
              <Trash2 className="h-3 w-3" />
              <strong>Remove</strong> - Deletes from SSH config
            </p>
          </div>
        </CardContent>
      </Card>

      <AddServerDialog
        open={showAddServerDialog}
        onOpenChange={setShowAddServerDialog}
        identityFilePath={identityFilePath}
        keyName={keyName}
      />

      {/* Step 1: Initial warning dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={(open) => {
        if (!open) {
          setShowDeleteDialog(false);
          setServerToDelete(null);
          setConfirmStep(false);
          setConfirmAlias('');
        }
      }}>
        <DialogContent className="sm:max-w-md w-[calc(100%-2rem)] max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-lg flex-shrink-0">
                <Trash2 className="h-6 w-6 text-destructive" />
              </div>
              <div className="min-w-0 overflow-hidden">
                <DialogTitle>Remove Server Connection?</DialogTitle>
                <DialogDescription>
                  This will remove the server from your SSH config.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 mt-4 overflow-y-auto flex-1 min-h-0 p-1 -m-1">
            {serverToDelete && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium">{serverToDelete.alias}</p>
                <p className="text-xs text-muted-foreground">
                  {serverToDelete.user}@{serverToDelete.hostName}
                </p>
              </div>
            )}

            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This will remove <strong>{serverToDelete?.alias}</strong> from your SSH config file.
                You won't be able to use <code className="bg-muted/50 px-1 rounded">ssh {serverToDelete?.alias}</code> anymore.
              </AlertDescription>
            </Alert>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
              className="flex-1 h-9"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => setConfirmStep(true)}
              className="flex-1 h-9"
            >
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
