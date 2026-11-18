import namehash from 'eth-ens-namehash'
import { BigNumber as BN } from 'bignumber.js'
import { toChecksumAddress } from 'web3-utils'

import { graph } from '@/services/index.js'
import networkConfig from '@/networkConfig.js'
import { REGISTRY_DEPLOYED_BLOCK } from '@/constants/index.js'

import AggregatorABI from '@/abis/Aggregator.abi.json'
import RelayerRegistryABI from '@/abis/RelayerRegistry.abi.json'
import { getIndexedDB } from '@/services/idb.js'

const MIN_STAKE_BALANCE = '0x22B1C8C1227A00000' // 40 TORN

const subdomains = Object.values(networkConfig).map(({ ensSubdomainKey }) => ensSubdomainKey)

class RelayerRegister {
  constructor(provider) {
    this.provider = provider
    this.$indexedDB = getIndexedDB(1)

    const { registryContract, aggregatorContract } = networkConfig.netId1

    this.aggregator = new this.provider.Contract(AggregatorABI, aggregatorContract)
    this.relayerRegistry = new this.provider.Contract(RelayerRegistryABI, registryContract)
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

    return allRelayers
  }

  filterRelayer = (acc, curr, ensSubdomainKey, relayer) => {
    const subdomainIndex = subdomains.indexOf(ensSubdomainKey)

    const mainnetSubdomain = curr.records[0]
    const hostname = curr.records[subdomainIndex]
    const isHostWithProtocol = hostname.includes('http')

    const isOwner = relayer.relayerAddress === curr.owner
    const hasMinBalance = new BN(curr.balance).gte(MIN_STAKE_BALANCE)

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
      console.error(`${relayer.ensName} invalid: `, {
        isOwner,
        hasTXT: Boolean(hostname),
        isHasMinBalance: hasMinBalance,
        isRegistered: curr.isRegistered,
        isHostWithoutProtocol: !isHostWithProtocol,
        isMainnetSubdomain: Boolean(mainnetSubdomain)
      })
    }

    return acc
  }

  getValidRelayers = async (relayers, ensSubdomainKey) => {
    const hashed = []
    for (const relayer of relayers) {
      try {
        if (!relayer?.ensName) {
          continue
        }
        hashed.push({ relayer, nameHash: namehash.hash(relayer.ensName) })
      } catch (err) {
        console.warn(`skipping relayer namehash for ${relayer?.ensName}:`, err.message)
      }
    }

    if (!hashed.length) {
      return []
    }

    const relayersData = await this.aggregator.methods
      .relayersData(
        hashed.map((h) => h.nameHash),
        subdomains
      )
      .call()

    return relayersData.reduce(
      (acc, curr, index) => this.filterRelayer(acc, curr, ensSubdomainKey, hashed[index].relayer),
      []
    )
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
