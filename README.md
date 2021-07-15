# Soundchain

## Setup

- `yarn`
- `yarn bootstrap`
- `cp api/.env.sample api/.env.local`
- `cp web/.env.sample web/.env.local`

## Develop

- `yarn dev`

### Recommended

Turn on some VSCode actions on save. In your settings.json file add:

```
  "editor.codeActionsOnSave": {
    "source.organizeImports": true,
    "source.fixAll.format": true,
    "source.fixAll.eslint": true
  },
```
