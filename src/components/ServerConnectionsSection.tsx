import { useState, useEffect } from 'react';
import { Server, Terminal, Trash2, RefreshCw, Plus, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  const [removingServer, setRemovingServer] = useState<string | null>(null);

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

  const handleRemove = async (connection: SSHServerConnection) => {
    setRemovingServer(connection.alias);
    try {
      await removeServerConnection(connection.alias);
    } finally {
      setRemovingServer(null);
    }
  };

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
                      onClick={() => handleRemove(connection)}
                      disabled={removingServer === connection.alias}
                      title="Remove from SSH config"
                    >
                      {removingServer === connection.alias ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
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
    </>
  );
}
