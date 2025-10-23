# JSON Formatter & Validator

A desktop utility app built with Tauri for validating and formatting JSON payloads.

## Features

- 🔍 JSON validation with detailed error reporting
- ✨ Pretty-print JSON with configurable indentation
- 📦 Minify JSON to remove unnecessary whitespace
- 📋 Clipboard integration for quick copy/paste
- 📁 Import/export JSON files
- 🌓 Light and dark theme support
- ⚡ Fast, lightweight, and offline-friendly

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite 5
- **Backend**: Tauri 2.9 + Rust
- **Styling**: CSS with system theme support

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.x or higher
- **Rust** 1.70 or higher (install via [rustup](https://rustup.rs/))
- **npm** or **yarn**

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/tauri-json-tool.git
cd tauri-json-tool
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Development Mode

```bash
npm run tauri:dev
```

This will start the Vite development server and launch the Tauri application window.

### 4. Build for Production

```bash
npm run tauri:build
```

The build artifacts will be available in `src-tauri/target/release/bundle/`.

## Available Scripts

- `npm run dev` - Start Vite development server
- `npm run build` - Build frontend for production
- `npm run tauri:dev` - Run Tauri in development mode
- `npm run tauri:build` - Build Tauri app for production
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## Project Structure

```
tauri-json-tool/
├── src/                    # Frontend source code
│   ├── App.tsx            # Main React component
│   ├── main.tsx           # Entry point
│   ├── styles.css         # Global styles
│   └── vite-env.d.ts      # TypeScript declarations
├── src-tauri/             # Tauri backend
│   ├── src/               # Rust source code
│   │   └── main.rs        # Rust entry point
│   ├── Cargo.toml         # Rust dependencies
│   └── tauri.conf.json    # Tauri configuration
├── docs/                  # Documentation
├── package.json           # Node.js dependencies
├── vite.config.ts         # Vite configuration
└── tsconfig.json          # TypeScript configuration
```

## Configuration

### Window Settings

- Default size: 1200×800
- Minimum size: 800×600
- Centered on launch
- Resizable

### Security

- Content Security Policy enabled
- File system access restricted to user documents
- No external network dependencies

## Development Status

✅ **Task 1**: Tauri Project Scaffolding - Complete
- [x] Project structure initialized
- [x] Dependencies installed
- [x] Development mode tested
- [x] Basic UI implemented

🔜 **Next Tasks**:
- Task 2: JSON Parsing & Validation Service
- Task 3: JSON Formatting & Minification Engine
- Task 4: Desktop UI Layout

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and questions, please create an issue on GitHub.