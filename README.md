# Soundchain

## Setup

- `yarn`
- `brew install lerna`
- `yarn bootstrap`
- `cp api/.env.sample api/.env.local`
- `cp web/.env.sample web/.env.local`

(If lerna doesn't work)
```
cd api
yarn
yarn dev
```

```
cd web
yarn
yarn dev
```

## Develop

- `yarn dev`

## Smart Contracts

The smart contracts and scripts are located at this [repo](https://github.com/agencyenterprise/soundchain-contracts)

### Recommended

Turn on some VSCode actions on save. In your settings.json file add:

```
  "editor.codeActionsOnSave": {
    "source.organizeImports": true,
    "source.fixAll.format": true,
    "source.fixAll.eslint": true
  },
```
