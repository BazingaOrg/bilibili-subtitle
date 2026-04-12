# MakuNabe (Bazinga Fork)

MakuNabe is a cozy subtitle helper for Bilibili.

It is a personal fork focused on practical daily use: reading subtitles faster, generating summaries, and exporting useful notes.

## Features

- Show subtitle list and jump to exact timestamps
- Generate segment summaries with AI
- Copy or export subtitles in multiple formats
- Configure OpenAI-compatible models (including custom endpoints)
- Auto-send summary email via webhook after all segments are done (optional)

## Quick Start

### Requirements

- Node.js `18.15.0`
- `pnpm`

### Install

```bash
pnpm install
```

### Development

```bash
pnpm run dev
```

Then open your browser extension page, enable Developer Mode, and load the unpacked extension from `dist`.

### Build

```bash
pnpm run build
```

After build, load the unpacked extension from `dist`.

## AI Setup

Open the extension options page and configure:

- `apiKey`
- `serverUrl`
- `model` (or custom model)

For local Ollama, set:

```bash
OLLAMA_ORIGINS=chrome-extension://*,moz-extension://*,safari-web-extension://*
```

Then use:

- `serverUrl`: `http://localhost:11434`
- `model`: select from discovered models or enter your custom model name

## Notes

- If the subtitle panel does not load during development and you see CSP errors, check `dist/manifest.json` and ensure `web_accessible_resources[*].use_dynamic_url` is `false`, then reload the extension.
- `push.sh` is a personal helper script and can be ignored.

## Credits

This project is based on the original open-source work by `IndieKKY`, and is maintained as a personal fork with custom changes.

## License

MIT
