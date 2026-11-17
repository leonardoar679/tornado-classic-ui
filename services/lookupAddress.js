// from https://github.com/ChainSafe/web3.js/issues/2683#issuecomment-547348416
// ported to web3 v4 BatchRequest (raw JSON-RPC eth_call batch)

import namehash from 'eth-ens-namehash'
import { isAddress } from 'web3-utils'
import { toBN } from '@/utils/bn.js'
import uniq from 'lodash/uniq'
import chunk from 'lodash/chunk'
import { CHUNK_COUNT_PER_BATCH_REQUEST } from '@/constants/index.js'

const CACHE = {}

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
const NAME_ABI = [
  {
    constant: true,
    inputs: [{ name: 'node', type: 'bytes32' }],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    payable: false,
    stateMutability: 'view',
    type: 'function'
  }
]

let batchId = 0

const createFetchNodeAddresses = (web3, registryContract, batch) => async (address) => {
  const addressLower = address.toLowerCase()

  const node = addressLower.substr(2) + '.addr.reverse'
  const nodeHash = namehash.hash(node)
  let nodeAddress = null

  if (!CACHE[addressLower]) {
    try {
      const data = registryContract.methods.resolver(nodeHash).encodeABI()
      const response = await batch.add({
        id: ++batchId,
        method: 'eth_call',
        params: [{ to: ENS_REGISTRY, data }, 'latest']
      })

      if (response) {
        nodeAddress = web3.eth.abi.decodeParameter('address', response)
        if (+nodeAddress === 0) nodeAddress = null
      }
    } catch (error) {
      console.error(`Error resolve ens for "${address}"`, error.message)
      // do nothing
    }
  }

  return {
    addressLower,
    address,
    nodeHash,
    nodeAddress
  }
}

const createFetchEnsNames = (web3, batch, results) => async (data) => {
  const { address, addressLower, nodeHash, nodeAddress } = data
  if (!nodeAddress) return results

  if (CACHE[addressLower]) {
    results[address] = CACHE[addressLower]
    return results
  }

  const nameData = web3.eth.abi.encodeFunctionCall(NAME_ABI[0], [nodeHash])

  try {
    const response = await batch.add({
      id: ++batchId,
      method: 'eth_call',
      params: [{ to: nodeAddress, data: nameData }, 'latest']
    })

    if (response) {
      const ensName = web3.eth.abi.decodeParameter('string', response)

      const isZeroAddress = ensName.trim().length && isAddress(ensName) && toBN(ensName).isZero()

      if (!isZeroAddress) {
        CACHE[addressLower] = ensName
        results[address] = ensName
      }
    }

    return results
  } catch (error) {
    console.error(`Error lookupAddress ens for "${address}"`, error.message)
    return results
  }
}

export const lookupAddressesRequest = async (addressList, web3, registryContract) => {
  const fetchNodeAddressesBatch = new web3.BatchRequest()
  const fetchNodeAddresses = createFetchNodeAddresses(web3, registryContract, fetchNodeAddressesBatch)
  const fetchNodeAddressesPromises = uniq(addressList).map(fetchNodeAddresses)
  fetchNodeAddressesBatch.execute()

  const nodeAddresses = await Promise.all(fetchNodeAddressesPromises)

  const results = {}
  const fetchEnsNamesBatch = new web3.BatchRequest()
  const fetchEnsNames = createFetchEnsNames(web3, fetchEnsNamesBatch, results)
  const fetchEnsNamesPromises = nodeAddresses.map(fetchEnsNames)
  fetchEnsNamesBatch.execute()

  await Promise.all(fetchEnsNamesPromises)
  return results
}

export const lookupAddresses = async (addressList, web3) => {
  const registryContract = new web3.eth.Contract(RESOLVER_ABI, ENS_REGISTRY)

  const addressListChunks = chunk(addressList, CHUNK_COUNT_PER_BATCH_REQUEST)
  let results = {}

  for await (const list of addressListChunks) {
    const result = await lookupAddressesRequest(list, web3, registryContract)
    results = { ...results, ...result }
  }

  return results
}
