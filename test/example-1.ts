import { xAP } from '../lib/xap-framework'

// Specify the source address and heartbeat interval for our device
const options = {
  source: {
    vendor: 'acme',
    device: 'logger',
    instance: 'example'
  },
  hbInterval: 60,
  address: '192.168.8.21'
}

let xap = new xAP.networkConnection(options)

xap.on('connected', () => {
  console.log('Connected')
  xap.sendBlock('message', new xAP.block('test.block', { content: 'Hello World!' } ))
})

xap.on('heartbeat', (hb, remote) => {
  let heartbeat = xAP.parseHeartbeatItems(hb)
  if(heartbeat) {
    console.log(`Received ${heartbeat.class} from ${heartbeat.source}`)
  }
})

xap.connect()