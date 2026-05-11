/**
 * SCid Certificate — now lives in @soundchain/scid for cross-app reuse.
 *
 * This file is a re-export shim. All existing imports from
 * `utils/SCidCertificate` keep working; the source of truth is now the
 * shared package at packages/scid/src/index.ts.
 *
 * Migration: as files come up in unrelated edits, switch their imports
 * from `from 'utils/SCidCertificate'` to `from '@soundchain/scid'`. No
 * rush — this shim stays indefinitely.
 */

export {
  generateCertificate,
  generateTextCertificate,
  downloadCertificateJSON,
  downloadCertificateText,
  downloadCertificates,
  copyCertificateToClipboard,
  generateShareableLink,
  parseScid,
  isValidScid,
  SCID_FORMAT_REGEX,
  SCID_PREFIX,
  SCID_CHAIN_POLYGON,
} from '@soundchain/scid'

export type { SCidCertificateData, ParsedScid } from '@soundchain/scid'

// Preserve default export for any consumers using `import SCidCert from '...'`
import {
  generateCertificate,
  generateTextCertificate,
  downloadCertificateJSON,
  downloadCertificateText,
  downloadCertificates,
  copyCertificateToClipboard,
  generateShareableLink,
} from '@soundchain/scid'

export default {
  generateCertificate,
  generateTextCertificate,
  downloadCertificateJSON,
  downloadCertificateText,
  downloadCertificates,
  copyCertificateToClipboard,
  generateShareableLink,
}
