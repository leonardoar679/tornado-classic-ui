import { signTypedData, recoverTypedSignature } from '@metamask/eth-sig-util'

/**
 * EIP-2612 Permit signer.
 * Replaces the unpublished `@ticket721/e712` package using @metamask/eth-sig-util
 * (same EIP-712 typed-data signing, byte-compatible signatures).
 */
const Permit = [
  { name: 'owner', type: 'address' },
  { name: 'spender', type: 'address' },
  { name: 'value', type: 'uint256' },
  { name: 'nonce', type: 'uint256' },
  { name: 'deadline', type: 'uint256' }
]

const toHex32 = (value) => '0x' + BigInt(value).toString(16).padStart(64, '0')

class PermitSigner {
  constructor(_domain, _permitArgs) {
    this.domain = _domain
    this.permitArgs = _permitArgs
  }

  // Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)
  setPermitInfo(_permitArgs) {
    this.permitArgs = _permitArgs
  }

  getPayload() {
    return {
      types: {
        EIP712Domain: [
          { name: 'name', type: 'string' },
          { name: 'version', type: 'string' },
          { name: 'chainId', type: 'uint256' },
          { name: 'verifyingContract', type: 'address' }
        ],
        Permit
      },
      primaryType: 'Permit',
      domain: this.domain,
      message: this.permitArgs
    }
  }

  async getSignature(privateKey) {
    const payload = this.getPayload()
    const signature = signTypedData({
      privateKey: privateKey.startsWith('0x') ? privateKey : '0x' + privateKey,
      data: payload,
      version: 'V4'
    })

    // signature: 0x + r (32) + s (32) + v (1)
    const r = signature.slice(0, 66)
    const s = '0x' + signature.slice(66, 130)
    const v = parseInt(signature.slice(130, 132), 16)

    return {
      hex: signature,
      v,
      r,
      s
    }
  }

  getSignerAddress(permitArgs, signature) {
    const originalPayload = this.getPayload()
    originalPayload.message = permitArgs

    return recoverTypedSignature({
      data: originalPayload,
      signature,
      version: 'V4'
    })
  }
}

// keep hex32 helper available for callers that build calldata manually
PermitSigner.toHex32 = toHex32

export { PermitSigner }
export default PermitSigner
