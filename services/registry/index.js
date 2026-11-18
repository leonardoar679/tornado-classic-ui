import namehash from 'eth-ens-namehash'
import { BigNumber as BN } from 'bignumber.js'
import { toChecksumAddress } from 'web3-utils'

import { graph } from '@/services/index.js'
import networkConfig from '@/networkConfig.js'
import { REGISTRY_DEPLOYED_BLOCK } from '@/constants/index.js'
import { formatRpcError } from '@/utils/rpcError.js'

import AggregatorABI from '@/abis/Aggregator.abi.json'
import RelayerRegistryABI from '@/abis/RelayerRegistry.abi.json'
import { getIndexedDB } from '@/services/idb.js'

const MIN_STAKE_BALANCE = '0x22B1C8C1227A00000' // 40 TORN
const ENS_REGISTRY = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e'
const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000'

const ENS_REGISTRY_ABI = [
  {
    constant: true,
    inputs: [{ name: 'node', type: 'bytes32' }],
    name: 'resolver',
    outputs: [{ name: '', type: 'address' }],
    type: 'function'
  }
]
const ENS_RESOLVER_ABI = [
  {
    constant: true,
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'key', type: 'string' }
    ],
    name: 'text',
    outputs: [{ name: '', type: 'string' }],
    type: 'function'
  }
]

const subdomains = Object.values(networkConfig).map(({ ensSubdomainKey }) => ensSubdomainKey)
const emptyRecords = () => Array(20).fill('')

class RelayerRegister {
  constructor(provider) {
    this.provider = provider
    this.$indexedDB = getIndexedDB(1)

    const { registryContract, aggregatorContract } = networkConfig.netId1

    this.aggregator = new this.provider.Contract(AggregatorABI, aggregatorContract)
    this.relayerRegistry = new this.provider.Contract(RelayerRegistryABI, registryContract)
    this.ensRegistry = new this.provider.Contract(ENS_REGISTRY_ABI, ENS_REGISTRY)
  }

  fetchEvents = async (fromBlock, toBlock) => {
    if (fromBlock <= toBlock) {
      try {
        const registeredEventsPart = await this.relayerRegistry.getPastEvents('RelayerRegistered', {
          fromBlock,
          toBlock
        })

        return registeredEventsPart
      } catch (error) {
        const midBlock = (Number(fromBlock) + Number(toBlock)) >> 1

        if (midBlock - fromBlock < 2) {
          throw new Error(`error fetching events: ${error.message}`)
        }

        const arr1 = await this.fetchEvents(fromBlock, midBlock)
        const arr2 = await this.fetchEvents(midBlock + 1, toBlock)
        return [...arr1, ...arr2]
      }
    }
    return []
  }

  saveEvents = async ({ events, lastSyncBlock, storeName }) => {
    try {
      if (this.$indexedDB.isBlocked) {
        return
      }

      await this.$indexedDB.putItem({
        data: {
          blockNumber: lastSyncBlock,
          name: storeName
        },
        storeName: 'lastEvents'
      })

      if (events.length) {
        this.$indexedDB.createMultipleTransactions({ data: events, storeName })
      }
    } catch (err) {
      console.error(`saveEvents has error: ${err.message}`)
    }
  }

  getCachedData = async () => {
    let blockFrom = REGISTRY_DEPLOYED_BLOCK[1]

    try {
      const blockTo = await this.provider.getBlockNumber()

      const cachedEvents = await this.$indexedDB.getAll({
        storeName: 'register_events'
      })

      const lastBlock = await this.$indexedDB.getFromIndex({
        indexName: 'name',
        key: 'register_events',
        storeName: 'lastEvents'
      })

      if (lastBlock) {
        blockFrom =
          Number(blockTo) >= Number(lastBlock.blockNumber) ? Number(lastBlock.blockNumber) + 1 : blockTo
      }

      return { blockFrom, blockTo, cachedEvents }
    } catch {
      return { blockFrom, blockTo: 'latest', cachedEvents: [] }
    }
  }

  fetchRelayers = async () => {
    let { blockFrom, blockTo, cachedEvents } = await this.getCachedData()
    let allRelayers = cachedEvents

    if (blockFrom !== blockTo) {
      const registeredRelayersEvents = await graph.getAllRegisters(blockFrom)

      let relayers = {
        lastSyncBlock: registeredRelayersEvents.lastSyncBlock,
        events: registeredRelayersEvents.events.map((el) => ({
          ensName: el.ensName,
          relayerAddress: toChecksumAddress(el.address)
        }))
      }

      const isGraphLate = relayers.lastSyncBlock && blockTo > Number(relayers.lastSyncBlock)

      if (isGraphLate) {
        blockFrom = relayers.lastSyncBlock
      }

      if (!relayers.events.length || isGraphLate) {
        const multicallEvents = await this.fetchEvents(blockFrom, blockTo)
        const eventsRelayers = multicallEvents.map(({ returnValues }) => ({
          ensName: returnValues.ensName,
          relayerAddress: returnValues.relayerAddress
        }))

        relayers = {
          lastSyncBlock: blockTo,
          events: relayers.events.concat(eventsRelayers)
        }
      }

      await this.saveEvents({ storeName: 'register_events', ...relayers })
      allRelayers = allRelayers.concat(relayers.events)
    }

    // Deduplicate by ensName (cached + graph/RPC sync can overlap).
    const byName = new Map()
    for (const relayer of allRelayers) {
      if (relayer?.ensName) {
        byName.set(relayer.ensName.toLowerCase(), relayer)
      }
    }
    return [...byName.values()]
  }

  filterRelayer = (acc, curr, ensSubdomainKey, relayer) => {
    const subdomainIndex = subdomains.indexOf(ensSubdomainKey)
    const records = curr.records || emptyRecords()

    const mainnetSubdomain = records[0]
    const hostname = records[subdomainIndex] || ''
    const isHostWithProtocol = hostname.includes('http')

    const isOwner = relayer.relayerAddress === curr.owner
    const hasMinBalance = new BN(curr.balance || 0).gte(MIN_STAKE_BALANCE)

    if (
      hostname &&
      isOwner &&
      mainnetSubdomain &&
      curr.isRegistered &&
      hasMinBalance &&
      !isHostWithProtocol
    ) {
      acc.push({
        hostname,
        ensName: relayer.ensName,
        stakeBalance: curr.balance,
        relayerAddress: relayer.relayerAddress
      })
    } else {
      // Expected for unregistered / under-staked ENS names — keep a count, not a flood.
      acc._invalid = (acc._invalid || 0) + 1
    }

    return acc
  }

  /**
   * Aggregator.relayersData(..., subdomains) reverts the whole batch when any
   * ENS name has no resolver (it calls resolver.text on address(0)). Always
   * fetch ownership/stake with empty subdomains, then resolve TXT off-chain
   * only for candidates that can pass filterRelayer. This avoids binary-split
   * storms and web3's "No matching error abi" console.error spam.
   */
  resolveSubdomainUrl = async (ensName, subdomainKey) => {
    try {
      const parentNode = namehash.hash(ensName)
      const resolverAddress = await this.ensRegistry.methods.resolver(parentNode).call()
      if (!resolverAddress || resolverAddress === EMPTY_ADDRESS) {
        return ''
      }
      const resolver = new this.provider.Contract(ENS_RESOLVER_ABI, resolverAddress)
      const subdomainNode = namehash.hash(`${subdomainKey}.${ensName}`)
      return (await resolver.methods.text(subdomainNode, 'url').call()) || ''
    } catch (err) {
      this._ensLookupFails = (this._ensLookupFails || 0) + 1
      this._lastEnsLookupError = formatRpcError(err)
      return ''
    }
  }

  enrichRelayerRecords = async (row, relayer, ensSubdomainKey) => {
    const records = emptyRecords()
    const subdomainIndex = subdomains.indexOf(ensSubdomainKey)
    const keysNeeded = new Set([0])
    if (subdomainIndex >= 0) {
      keysNeeded.add(subdomainIndex)
    }

    await Promise.all(
      [...keysNeeded].map(async (idx) => {
        records[idx] = await this.resolveSubdomainUrl(relayer.ensName, subdomains[idx])
      })
    )

    return { ...row, records }
  }

  fetchRelayersDataForHashed = async (hashed, ensSubdomainKey) => {
    const nameHashes = hashed.map((h) => h.nameHash)
    let rows
    try {
      // Empty subdomain list: no resolver.text calls → no batch-wide reverts.
      rows = await this.aggregator.methods.relayersData(nameHashes, []).call()
    } catch (err) {
      // Rare: if even the empty-subdomain batch fails, fall back per-name.
      console.warn(`Relayer aggregator batch failed (${formatRpcError(err)}); fetching individually`)
      rows = []
      for (const item of hashed) {
        try {
          const [row] = await this.aggregator.methods.relayersData([item.nameHash], []).call()
          rows.push(row)
        } catch (innerErr) {
          this._aggregatorFallbackFails = (this._aggregatorFallbackFails || 0) + 1
          this._lastAggregatorFallbackError = formatRpcError(innerErr)
          rows.push({
            owner: EMPTY_ADDRESS,
            balance: '0',
            isRegistered: false,
            records: emptyRecords()
          })
        }
      }
    }

    return Promise.all(
      rows.map(async (row, index) => {
        const relayer = hashed[index].relayer
        const hasMinBalance = new BN(row.balance || 0).gte(MIN_STAKE_BALANCE)
        const isOwner = relayer.relayerAddress === row.owner

        if (!row.isRegistered || !hasMinBalance || !isOwner) {
          return { ...row, records: emptyRecords() }
        }

        return this.enrichRelayerRecords(row, relayer, ensSubdomainKey)
      })
    )
  }

  getValidRelayers = async (relayers, ensSubdomainKey) => {
    this._ensLookupFails = 0
    this._aggregatorFallbackFails = 0
    this._lastEnsLookupError = null
    this._lastAggregatorFallbackError = null

    const hashed = []
    for (const relayer of relayers) {
      try {
        if (!relayer?.ensName) {
          continue
        }
        hashed.push({ relayer, nameHash: namehash.hash(relayer.ensName) })
      } catch (err) {
        console.warn(`skipping relayer namehash for ${relayer?.ensName}:`, formatRpcError(err))
      }
    }

    if (!hashed.length) {
      return []
    }

    const relayersData = await this.fetchRelayersDataForHashed(hashed, ensSubdomainKey)

    const valid = relayersData.reduce(
      (acc, curr, index) => this.filterRelayer(acc, curr, ensSubdomainKey, hashed[index].relayer),
      []
    )
    const skipped = valid._invalid || 0
    delete valid._invalid
    if (skipped) {
      console.warn(
        `Skipped ${skipped} invalid ENS relayer registrations (under-staked / missing TXT / unregistered)`
      )
    }
    if (this._aggregatorFallbackFails) {
      console.warn(
        `Relayer aggregator: ${this._aggregatorFallbackFails} individual fallback(s) failed (${this._lastAggregatorFallbackError})`
      )
    }
    if (this._ensLookupFails) {
      console.warn(`ENS url lookup: ${this._ensLookupFails} miss(es) (${this._lastEnsLookupError})`)
    }
    return valid
  }

  getRelayers = async (ensSubdomainKey) => {
    try {
      const relayers = await this.fetchRelayers()
      return await this.getValidRelayers(relayers, ensSubdomainKey)
    } catch (err) {
      console.error('getRelayers failed:', err.message)
      return []
    }
  }
}

export const relayerRegisterService = (provider) => new RelayerRegister(provider.eth)
