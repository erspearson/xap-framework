import { xAP } from '../lib/xap-framework'

// Specify the source address and heartbeat interval for our device
const options: xAP.options = {
  source: {
    vendor: 'acme',
    device: 'logger',
    instance: 'example'
  },
  hbInterval: 60,
  //rxAddress: '192.168.1.10',
  //txAddress: '192.168.1.255'
}

// Create the network connection
let xap = new xAP.networkConnection(options)

// Set an action on connect - send a test message
xap.on('connected', () => {
  console.log('Connected')
  // Build a block named test.block
  let myBlock = new xAP.block('test.block', { content: 'Hello World!' })
  // Send the block from our device with class test.message
  xap.sendBlock('test.message', myBlock)
})

// Set an action on heartbeat reception - log the class and source
xap.on('heartbeat', (hb, remote) => {
  let heartbeat = xAP.parseHeartbeatItems(hb)
  if(heartbeat) {
    console.log(`Received ${heartbeat.class} from ${heartbeat.source}`)
  }
})

// Start up the connection
xap.connect()

// There is no more code here but NodeJS will continue to run
// as our networkConnection object is bound to a socket.
// Terminate using ctrl-C.

// For examples of how to create and manipulate xAP messages
// see example-2.ts