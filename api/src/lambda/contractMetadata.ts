import type { Handler } from 'aws-lambda';

export const contractMetadata: Handler = async () => {
  return {
    name: "SoundChain",
    description: "SoundChain is a decentralized music platform that allows users to share their music with the world.",
    image: "https://soundchain.io/soundchain-app-icon.png",
    external_link: "https://soundchain.io",
  }
};