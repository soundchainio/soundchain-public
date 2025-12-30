/**
 * SCid Certificate Generator
 *
 * Generates a downloadable certificate/proof file for artists
 * who upload non-web3 music assets. This gives them full control
 * and ownership proof that they can store on their own devices.
 */

export interface SCidCertificateData {
  // SCid Info
  scid: string;
  chainCode: string;
  status: string;

  // Track Info
  trackId?: string;
  title: string;
  artist?: string;
  album?: string;
  description?: string;
  releaseYear?: number;
  copyright?: string;
  genres?: string[];

  // IPFS Info (decentralized storage proof)
  ipfsCid: string;
  ipfsGatewayUrl: string;

  // Verification
  checksum?: string;
  registeredAt: string;
  platform: string;
  version: string;
}

/**
 * Generate a certificate object with all track/SCid information
 */
export function generateCertificate(data: {
  scid: string;
  chainCode?: string;
  status?: string;
  trackId?: string;
  title: string;
  artist?: string;
  album?: string;
  description?: string;
  releaseYear?: number;
  copyright?: string;
  genres?: string[];
  ipfsCid: string;
  ipfsGatewayUrl: string;
  checksum?: string;
}): SCidCertificateData {
  return {
    scid: data.scid,
    chainCode: data.chainCode || 'POL',
    status: data.status || 'REGISTERED',
    trackId: data.trackId,
    title: data.title,
    artist: data.artist,
    album: data.album,
    description: data.description,
    releaseYear: data.releaseYear,
    copyright: data.copyright,
    genres: data.genres,
    ipfsCid: data.ipfsCid,
    ipfsGatewayUrl: data.ipfsGatewayUrl,
    checksum: data.checksum,
    registeredAt: new Date().toISOString(),
    platform: 'SoundChain',
    version: '1.0',
  };
}

/**
 * Generate a human-readable text certificate
 */
export function generateTextCertificate(cert: SCidCertificateData): string {
  return `
╔══════════════════════════════════════════════════════════════════╗
║                    SOUNDCHAIN SCid CERTIFICATE                   ║
║                    Web3 Music Registration Proof                 ║
╠══════════════════════════════════════════════════════════════════╣

  SCid:           ${cert.scid}
  Status:         ${cert.status}
  Chain:          ${cert.chainCode}

══════════════════════════════════════════════════════════════════

  TRACK INFORMATION

  Title:          ${cert.title}
  Artist:         ${cert.artist || 'Not specified'}
  Album:          ${cert.album || 'Not specified'}
  Release Year:   ${cert.releaseYear || 'Not specified'}
  Copyright:      ${cert.copyright || 'Not specified'}
  Genres:         ${cert.genres?.join(', ') || 'Not specified'}

══════════════════════════════════════════════════════════════════

  IPFS STORAGE (DECENTRALIZED)

  IPFS CID:       ${cert.ipfsCid}
  Gateway URL:    ${cert.ipfsGatewayUrl}

══════════════════════════════════════════════════════════════════

  VERIFICATION

  Registered:     ${cert.registeredAt}
  Platform:       ${cert.platform}
  Version:        ${cert.version}
  ${cert.checksum ? `Checksum:       ${cert.checksum}` : ''}

╚══════════════════════════════════════════════════════════════════╝

This certificate proves that the above track was registered on the
SoundChain platform and stored on IPFS (InterPlanetary File System).

The SCid (SoundChain ID) is a Web3 replacement for ISRC codes,
providing decentralized music identification.

Keep this certificate safe - it's your proof of registration!

Verify at: https://soundchain.io/verify/${cert.scid}
`.trim();
}

/**
 * Download certificate as JSON file
 */
export function downloadCertificateJSON(cert: SCidCertificateData): void {
  const json = JSON.stringify(cert, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `soundchain-certificate-${cert.scid}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Download certificate as text file
 */
export function downloadCertificateText(cert: SCidCertificateData): void {
  const text = generateTextCertificate(cert);
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `soundchain-certificate-${cert.scid}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Download both JSON and text certificates
 */
export function downloadCertificates(cert: SCidCertificateData): void {
  downloadCertificateJSON(cert);
  // Small delay to avoid browser blocking multiple downloads
  setTimeout(() => downloadCertificateText(cert), 500);
}

/**
 * Copy certificate to clipboard
 */
export async function copyCertificateToClipboard(cert: SCidCertificateData): Promise<boolean> {
  try {
    const text = generateTextCertificate(cert);
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a shareable link for the certificate
 */
export function generateShareableLink(cert: SCidCertificateData): string {
  return `https://soundchain.io/track/${cert.scid}`;
}

export default {
  generateCertificate,
  generateTextCertificate,
  downloadCertificateJSON,
  downloadCertificateText,
  downloadCertificates,
  copyCertificateToClipboard,
  generateShareableLink,
};
