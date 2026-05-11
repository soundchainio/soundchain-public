import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'io.soundchain.mint',
  appName: 'SoundChain Mint',
  webDir: 'out',
  server: {
    url: 'https://mint.soundchain.io',
    cleartext: false,
  },
  ios: {
    contentInset: 'always',
    backgroundColor: '#050708',
  },
  android: {
    backgroundColor: '#050708',
  },
}

export default config
