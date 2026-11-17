import Jszip from 'jszip'
import axios from 'axios'

import { detectMob } from '@/utils/index.js'
import namehash from 'eth-ens-namehash'
import networkConfig from '@/networkConfig.js'
import groth16 from 'websnark/src/groth16'
import { createWeb3 } from '@/utils/web3.js'

const APP_ENS_NAME = process.env.APP_ENS_NAME

const jszip = new Jszip()

// ENS registry (mainnet) — web3 v4 removed the built-in ENS module
const ENS_REGISTRY = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e'
const RESOLVER_ABI = [
  {
    constant: true,
    inputs: [{ name: 'node', type: 'bytes32' }],
    name: 'resolver',
    outputs: [{ name: '', type: 'address' }],
    payable: false,
    stateMutability: 'view',
    type: 'function'
  }
]
const CONTENTHASH_ABI = [
  {
    constant: true,
    inputs: [{ name: 'node', type: 'bytes32' }],
    name: 'contenthash',
    outputs: [{ name: '', type: 'bytes' }],
    payable: false,
    stateMutability: 'view',
    type: 'function'
  }
]

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

function base58Encode(bytes) {
  let num = BigInt(0)
  for (const byte of bytes) {
    num = num * BigInt(256) + BigInt(byte)
  }
  let encoded = ''
  while (num > 0) {
    const remainder = num % BigInt(58)
    num = num / BigInt(58)
    encoded = BASE58_ALPHABET[Number(remainder)] + encoded
  }
  // leading zero bytes become '1'
  for (const byte of bytes) {
    if (byte !== 0) break
    encoded = '1' + encoded
  }
  return encoded
}

/**
 * Decode an IPFS/IPNS identifier from ENS contenthash bytes.
 * Supports the common ipfs-ns (0xe3) and ipns-ns (0xe5) codecs.
 */
function decodeContentHash(hex) {
  const bytes = []
  const clean = hex.replace(/^0x/, '')
  for (let i = 0; i < clean.length; i += 2) {
    bytes.push(parseInt(clean.slice(i, i + 2), 16))
  }

  if (bytes.length < 4) {
    return null
  }

  const nsPrefix = bytes[0]

  if (nsPrefix === 0xe3 || nsPrefix === 0xe5) {
    // 0xe3 = ipfs-ns, 0xe5 = ipns-ns
    // skip the varint-encoded codec id (e.g. 0x01 dag-pb, 0x70 sha2-256, 0x55 sha2-512, 0x72 libp2p-key)
    let i = 1
    while (i < bytes.length) {
      const b = bytes[i]
      i += 1
      if ((b & 0x80) === 0) break
    }

    const hashBytes = bytes.slice(i)
    if (nsPrefix === 0xe5) {
      // ipns: libp2p-key multihash encodes the peer id
      return base58Encode(hashBytes)
    }
    // ipfs: v0 CID (dag-pb + sha2-256) → base58 of the full multihash
    return base58Encode(hashBytes)
  }

  return null
}

function buildGroth16() {
  const isMobile = detectMob()
  const wasmMemory = isMobile ? 1000 : 2000
  return groth16({ wasmInitialMemory: wasmMemory })
}

/**
 * Runtime asset base, IPFS-gateway aware (replaces the old __webpack_public_path__ trick).
 */
function getAssetsBase() {
  if (typeof window === 'undefined') {
    return ''
  }
  const ipfsPathRegExp = /^(\/(?:ipfs|ipns)\/[^/]+)/
  const ipfsPathPrefix = (window.location.pathname.match(ipfsPathRegExp) || [])[1]
  return ipfsPathPrefix ? `${ipfsPathPrefix}/` : '/'
}

async function getIPFSIdFromENS(ensName) {
  try {
    const web3 = createWeb3(networkConfig.netId1.rpcUrls.Infura.url)
    const registry = new web3.eth.Contract(RESOLVER_ABI, ENS_REGISTRY)
    const node = namehash.hash(ensName)

    const resolverAddress = await registry.methods.resolver(node).call()
    if (!resolverAddress || /^0x0+$/.test(resolverAddress)) {
      throw new Error(`No resolver set for ${ensName}`)
    }

    const resolver = new web3.eth.Contract(CONTENTHASH_ABI, resolverAddress)
    const content = await resolver.methods.contenthash(node).call()

    const id = decodeContentHash(content)
    if (!id) {
      throw new Error(`Unsupported contenthash for ${ensName}`)
    }
    return id
  } catch (err) {
    throw new Error(err.message || String(err))
  }
}

async function getTornadoKeys(getProgress) {
  const keys = await Promise.all([
    download({ name: 'tornado.json.zip', contentType: 'string' }),
    download({ name: 'tornadoProvingKey.bin.zip', contentType: 'arraybuffer', getProgress })
  ])
  return { circuit: JSON.parse(keys[0]), provingKey: keys[1] }
}

async function fetchFile({ url, name, getProgress, id, retryAttempt = 0 }) {
  try {
    const response = await axios.get(`${url}/${name}`, {
      responseType: 'blob',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      onDownloadProgress: (progressEvent) => {
        if (typeof getProgress === 'function') {
          const progress = Math.round((progressEvent.loaded * 100) / 9626311)
          getProgress(progress)
        }
      }
    })

    return response
  } catch (err) {
    if (!id) {
      id = await getIPFSIdFromENS(APP_ENS_NAME)
    }
    const knownResources = [
      url,
      `https://ipfs.io/ipfs/${id}`,
      `https://dweb.link/ipfs/${id}`,
      `https://gateway.pinata.cloud/ipfs/${id}`
    ]

    if (retryAttempt < knownResources.length) {
      const fallbackUrl = knownResources[retryAttempt]
      retryAttempt++

      const response = await fetchFile({ name, getProgress, retryAttempt, id, url: fallbackUrl })

      return response
    }
    throw err
  }
}
/**
 * Function to download
 * @param {*} name filename
 * @param {'base64'|'string'|'binarystring'|'text'|'blob'|'uint8array'|'arraybuffer'|'array'|'nodebuffer'} contentType type of the content.
 * @param getProgress function
 */
async function download({ name, contentType, getProgress, eventName = 'events' }) {
  const prefix = getAssetsBase()
  const response = await fetchFile({ getProgress, url: prefix, name })

  const zip = await jszip.loadAsync(response.data)
  const file = zip.file(name.replace(`${eventName}/`, '').slice(0, -4))

  const content = await file.async(contentType)

  return content
}

export { getTornadoKeys, buildGroth16, download }
