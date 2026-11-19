/**
 * Note-account keys are stored/backed up without a 0x prefix (eth-sig-util
 * getEncryptionPublicKey expects that). web3 v4 privateKeyToAccount requires 0x.
 */

export function strip0x(key = '') {
  const value = String(key || '')
  return value.startsWith('0x') || value.startsWith('0X') ? value.slice(2) : value
}

export function with0x(key = '') {
  const value = String(key || '')
  if (!value) {
    return value
  }
  return value.startsWith('0x') || value.startsWith('0X') ? value : `0x${value}`
}
