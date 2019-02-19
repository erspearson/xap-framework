import { xAP } from '../lib/xap-framework'
import { expect } from 'chai'

describe('xAP Framework network tests', function() {

  let options: xAP.options
  let xap: xAP.networkConnection
  let heartbeat: xAP.heartbeatItems | undefined
  let UID: string = ''

  before('create network object', function() {

    options = {
      source: {
        vendor: 'xfx',
        device: 'unit-test',
        instance: 'send-receive'
      },
      hbInterval: 60,
      loopback: true
    }
console.error('stderr')
console.log('stdout')
    xap = new xAP.networkConnection(options)

    xap.on('heartbeat', (hb, remote) => { heartbeat = xAP.parseHeartbeatItems(hb) })
  })

  specify('connect to network', function(done) {

    xap.on('connected', () => {
      done();
    })
    xap.connect()
  })
  
  specify('should see own heartbeat', function() {
    expect(heartbeat).is.not.null
    expect(heartbeat).is.not.undefined
    if(heartbeat) {
      expect(heartbeat.source).is.not.undefined
      expect(heartbeat.source).equals('xfx.unit-test.send-receive')
      UID = heartbeat.uid
    }
  })

  specify('heartbeat has been given a UID', function() {
    expect(UID).matches(/FF.[0-9A-F]{8}:0000/)
  })

  specify('own message is sent and received', function(done) {
    xap.on('message', (msg, remote) => { done() })
    xap.sendBlock('block', new xAP.block('test.block', { Key: 'value' } ))
  })
  
  specify('disconnect', function(done) {
    xap.disconnect().then(done)
  })

  after('ensure disconnect', function(done) {
    xap.disconnect().catch(()=>{}).then(done)
  })
})
