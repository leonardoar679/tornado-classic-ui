import 'dotenv/config'

import fs from 'fs'
import lodash from 'lodash'

import networkConfig from '../networkConfig.js'
import ABI from '../abis/TornadoProxy.abi.json' with { type: 'json' }
import { getPastEvents, loadCachedEvents } from './helpers/index.js'

const { uniqBy } = lodash

const EVENTS_PATH = './static/events/'
const enabledChains = ['1', '5', '56']

async function saveEncryptedNote(netId) {
  const {
    constants,
    'tornado-proxy.contract.tornadocash.eth': tornadoProxy,
    'tornado-router.contract.tornadocash.eth': tornadoRouter,
    'tornado-proxy-light.contract.tornadocash.eth': lightProxy
  } = networkConfig[`netId${netId}`]

  const contractAddress = tornadoRouter || tornadoProxy || lightProxy

  let encryptedEvents = []
  const name = `encrypted_notes_${netId}.json`

  const cachedEvents = await loadCachedEvents({
    name,
    directory: EVENTS_PATH,
    deployedBlock: constants.ENCRYPTED_NOTES_BLOCK
  })

  console.log('cachedEvents', cachedEvents.events.length)

  encryptedEvents = await getPastEvents({
    netId,
    type: 'EncryptedNote',
    events: encryptedEvents,
    fromBlock: Number(cachedEvents.lastBlock) + 1,
    contractAttrs: [ABI, contractAddress]
  })

  console.log('Encrypted note', netId, encryptedEvents.length)

  encryptedEvents = encryptedEvents.reduce((acc, curr) => {
    if (curr.returnValues.encryptedNote) {
      acc.push({
        txHash: curr.transactionHash,
        blockNumber: Number(curr.blockNumber),
        encryptedNote: curr.returnValues.encryptedNote
      })
    }
    return acc
  }, [])

  let freshEvents = cachedEvents.events.concat(encryptedEvents)

  freshEvents = uniqBy(freshEvents, 'encryptedNote').sort(
    (a, b) => Number(b.blockNumber) - Number(a.blockNumber)
  )

  const eventsJson = JSON.stringify(freshEvents, null, 2) + '\n'
  fs.writeFileSync(`${EVENTS_PATH}${name}`, eventsJson)
}

async function main() {
  const [, , , chainArg] = process.argv
  const chain = chainArg || '1'
  if (!enabledChains.includes(chain)) {
    throw new Error(`Supported chain ids ${enabledChains.join(', ')}`)
  }

  await saveEncryptedNote(chain)
}

main()
