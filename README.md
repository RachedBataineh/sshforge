# SSHForge

<p align="center">
  <img src="build/icon.png" alt="SSHForge Logo" width="128" height="128">
</p>

<p align="center">
  <strong>A beautiful desktop application for creating and managing SSH keys</strong>
</p>

<p align="center">
  The easiest way to generate, organize, and deploy SSH keys across all your servers.
</p>

<p align="center">
  <strong>100% OpenSSH Compatible</strong> - Works seamlessly with all your existing SSH infrastructure
</p>

---

## What is SSHForge?

SSHForge is a cross-platform desktop application that simplifies SSH key management. No more terminal commands or remembering complex `ssh-keygen` syntax. With SSHForge, you can:

- **Generate SSH Keys** - Create RSA, ED25519, ECDSA, and DSA keys with a beautiful graphical interface
- **Manage Your Keys** - View all your keys in one place, copy public keys, and organize them effortlessly
- **Connect to Servers** - Save SSH server connections and associate keys with specific hosts

Whether you're a developer, DevOps engineer, or system administrator, SSHForge makes SSH key management painless.

## Features

### Key Generation
- Multiple algorithm support (RSA-4096, ED25519, ECDSA, DSA)
- Customizable key names and comments
- Optional passphrase protection
- Secure key generation using OpenSSL
- **100% OpenSSH compatible** - keys work everywhere OpenSSH is supported

### Key Management
- Visual overview of all your SSH keys
- One-click copy public key to clipboard
- View key fingerprints and metadata
- Delete keys with confirmation

### Server Connections
- Save frequently used SSH servers
- Associate specific keys with servers
- Quick access to connection details
- Test connections before saving

### Beautiful User Interface
- Modern, clean design
- Dark mode support
- Native look and feel on each platform
- Intuitive navigation

## Installation

### Download

Download the latest version for your platform from the [Releases](https://github.com/RachedBataineh/sshforge/releases) page.

| Platform | Download |
|----------|----------|
| macOS (Apple Silicon) | `SSHForge-x.x.x-arm64.dmg` |
| macOS (Intel) | `SSHForge-x.x.x-x64.dmg` |
| Windows | `SSHForge Setup x.x.x.exe` |
| Linux | `SSHForge-x.x.x.AppImage` |

### System Requirements

- **macOS**: 10.12 (Sierra) or later
- **Windows**: Windows 10 or later
- **Linux**: Any modern distribution with glibc 2.17+

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) 18.0 or higher
- [npm](https://www.npmjs.com/) 9.0 or higher

### Getting Started

```bash
# Clone the repository
git clone https://github.com/RachedBataineh/sshforge.git
cd sshforge

# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will open with hot-reload enabled. Changes to the code will automatically refresh the application.

### Building for Production

```bash
# Build for current platform
npm run build
npm run package

# Build for specific platforms
npm run package:mac    # macOS (universal)
npm run package:win    # Windows
npm run package:linux  # Linux
```

Built applications are output to the `release/` directory.

## Tech Stack

### Core Framework
- **[Electron](https://www.electronjs.org/)** v28 - Build cross-platform desktop apps with JavaScript, HTML, and CSS
- **[React](https://react.dev/)** v18 - A JavaScript library for building user interfaces
- **[TypeScript](https://www.typescriptlang.org/)** v5 - JavaScript with syntax for types

### Build Tools
- **[Vite](https://vitejs.dev/)** v5 - Next generation frontend tooling
- **[vite-plugin-electron](https://github.com/electron-vite/vite-plugin-electron)** - Electron integration for Vite
- **[electron-builder](https://www.electron.build/)** - A complete solution to package and build Electron apps

### UI & Styling
- **[Tailwind CSS](https://tailwindcss.com/)** v3 - A utility-first CSS framework
- **[Radix UI](https://www.radix-ui.com/)** - Unstyled, accessible UI primitives
- **[Lucide React](https://lucide.dev/)** - Beautiful & consistent icon toolkit
- **[class-variance-authority](https://cva.style/)** - CSS class variants management

### State Management
- **[Zustand](https://zustand-demo.pmnd.rs/)** v4 - A small, fast and scalable state-management solution

### Security & Cryptography
- **OpenSSL** (via Node.js) - Secure key generation
- **bcrypt** - Passphrase hashing

### Data Persistence
- **[electron-store](https://github.com/sindresorhus/electron-store)** - Simple data persistence for Electron apps

## Project Structure

```
sshforge/
├── electron/                    # Electron main process
│   ├── main.ts                 # Application entry point
│   ├── preload.cjs             # Context bridge for IPC
│   └── ipc/                    # IPC handlers
│       ├── keyGenerator.ts     # SSH key generation logic
│       ├── fileManager.ts      # File system operations
│       └── sshConfig.ts        # SSH config management
├── src/                        # React frontend
│   ├── components/             # UI components
│   │   ├── ui/                 # Reusable UI primitives
│   │   ├── Sidebar.tsx         # Navigation sidebar
│   │   ├── CreateKeyForm.tsx   # Key creation form
│   │   └── ...                 # Other components
│   ├── store/                  # Zustand store
│   │   └── useAppStore.ts      # Global application state
│   ├── types/                  # TypeScript definitions
│   ├── lib/                    # Utility functions
│   └── assets/                 # Static assets (images, etc.)
├── build/                      # Build resources
│   ├── icon.png                # Application icon
│   └── entitlements.mac.plist  # macOS entitlements
├── public/                     # Public static files
└── release/                    # Built applications (git-ignored)
```

## Security

SSHForge takes security seriously:

- **DevTools disabled** in production builds
- **Context isolation** enabled in Electron
- **Node integration** disabled in renderer
- **Sandboxed** renderer process
- Keys are stored in the standard `~/.ssh` directory
- Passphrases are never stored; keys are encrypted using industry-standard algorithms

## Roadmap

- [ ] SSH Agent integration
- [ ] SSH key import functionality
- [ ] Key backup and restore
- [ ] Multi-profile support
- [ ] SSH config file editor
- [ ] Key expiration reminders
- [ ] Cloud sync (optional)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [OpenSSH](https://www.openssh.com/) - The gold standard for SSH
- The amazing open-source community behind all the tools we use

---

<p align="center">
  Made with ❤️ for developers who work with SSH keys
</p>
