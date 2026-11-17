import fs from 'fs'
import Jszip from 'jszip'
import networkConfig from '../../networkConfig.js'
import { createWeb3 } from '../../utils/web3.js'

const jszip = new Jszip()

export async function download({ name, directory, contentType }) {
  const path = `${directory}${name}.zip`.toLowerCase()

  const data = fs.readFileSync(path)
  const zip = await jszip.loadAsync(data)

  const file = zip.file(path.replace(directory, '').slice(0, -4).toLowerCase())

  const content = await file.async(contentType)

  return content
}

export async function loadCachedEvents({ name, directory, deployedBlock }) {
  try {
    const module = await download({ contentType: 'string', directory, name })

    if (module) {
      const events = JSON.parse(module)

      const [lastEvent] = JSON.parse(module).sort(
        (a, b) => (b.block || b.blockNumber) - (a.block || a.blockNumber)
      )
      const lastBlock = lastEvent.block || lastEvent.blockNumber

      return {
        events,
        lastBlock
      }
    }
  } catch (err) {
    console.error(`Method loadCachedEvents has error: ${err.message}`)
    return {
      events: [],
      lastBlock: deployedBlock
    }
  }
}

export async function getPastEvents({ type, fromBlock, netId, events, contractAttrs }) {
  let downloadedEvents = events

  let [{ url: rpcUrl }] = Object.values(networkConfig[`netId${netId}`].rpcUrls)

  if (netId === '5') {
    rpcUrl = `https://goerli.infura.io/v3/${process.env.INFURA_KEY}`
  }

  const web3 = createWeb3(rpcUrl)
  const contract = new web3.eth.Contract(...contractAttrs)

  const currentBlockNumber = Number(await web3.eth.getBlockNumber())
  // Infura/Alchemy eth_getLogs caps at 10k blocks; BSC nodes are tighter.
  const maxRange = Number(netId) === 56 ? 4950 : 9999

  let from = Number(fromBlock)
  let chunk = 0
  let range = maxRange

  if (from < currentBlockNumber) {
    const chunksCount = Math.max(1, Math.ceil((currentBlockNumber - from) / maxRange))
    console.log(`Fetching ${type}, chainId - ${netId}`, `chunksCount - ${chunksCount}`)

    while (from <= currentBlockNumber) {
      const to = Math.min(from + range - 1, currentBlockNumber)
      try {
        await new Promise((resolve) => setTimeout(resolve, 200))

        console.log(`fromBlock - ${from}`)
        console.log(`toBlock - ${to}`)

        const eventsChunk = await contract.getPastEvents(type, { fromBlock: from, toBlock: to })

        if (eventsChunk?.length) {
          downloadedEvents = downloadedEvents.concat(eventsChunk)
          console.log('downloaded events count - ', eventsChunk.length)
          console.log('____________________________________________')
        }

        if (to >= currentBlockNumber) {
          break
        }
        from = to + 1
        range = maxRange
        chunk += 1
      } catch (err) {
        console.log('getPastEvents events', `chunk number - ${chunk}, has error: ${err.message}`)
        if (range <= 1) {
          throw err
        }
        range = Math.max(1, Math.floor(range / 2))
      }
    }
  }
  return downloadedEvents
}
