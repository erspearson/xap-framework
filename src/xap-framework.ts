
import os = require('os')
import dgram = require('dgram')
import ipaddr = require('ipaddr.js');
import crc = require('crc')
import { EventEmitter } from 'events';

//////////////////////////////////////////////////////////////
// TypeScript framework for sending and receiving
// xAP home automation messages from Node.js
//////////////////////////////////////////////////////////////

export module xAP {

  // Define environment variable DEBUG to enable some console logging
  var debug = (...args:any) => {}
  var isDebug = false
  if(process.env.DEBUG && process.env.DEBUG.includes('xap')) { debug = console.log; isDebug = true }

  ///////////////////////////////////////////////////////////
  // Message blocks and block items
  ///////////////////////////////////////////////////////////

  export interface blockItem {
    name: string,
    value: string,
    hexValue?: Uint8Array
  }

  export interface block {
    name: string,
    items: blockItem[],
  }

  export class block implements block {

    constructor(name: string, content: {[index:string]: string | number }) {
      if(!name) { throw Error('attempt to create xAP block with no name')}
      this.name = name
      this.items = []
      Object.keys(content).forEach(
        (key, index) => {
          this.items.push( { name: key, value: content[key].toString() } )
        }
      )
    }

    add(key: string, value: string | number) {
      if(this.getValue(key)) { throw Error('attempt to add duplicate key to xAP block') }
      this.items.push( { name: key, value: value.toString() } )
    }

    toString() { 
      let s = this.name + '\n{\n'
      this.items.forEach(
        (i,x) => { s += `${i.name}=${i.value}\n`
      })
      s += '}\n'
      return s
    }

    getValue (name: string) : string | undefined {
      name = name.toLowerCase()
      let item = this.items.find((i) => { return i.name.toLowerCase() == name })
      return item ? item.value : undefined
    }
  }

  ///////////////////////////////////////////////////////////
  // Header
  ///////////////////////////////////////////////////////////

  export const headerRequiredItemNames: (keyof headerItems)[] = ['v', 'hop', 'uid', 'class', 'source']
  export const headerOptionalItemNames: (keyof headerItems)[] = ['target']
  export const headerItemNames = headerRequiredItemNames.concat(headerOptionalItemNames)

  interface headerRequiredItems {
    v: number,
    hop: number,
    uid: string,
    class: string,
    source: string
  }

  export interface headerItems extends headerRequiredItems {
    target?: string
  }

  export class headerBlock extends block {

    constructor(items: headerItems) {
      super('xap-header', {})
      headerItemNames.forEach( key => {
        let value = items[key]
        if(value != null) { this.add(key, value) }
      })
    }
  }

  ///////////////////////////////////////////////////////////
  // Heartbeat
  ///////////////////////////////////////////////////////////

  type heartbeatClass = 'xap-hbeat.alive' | 'xap-hbeat.stopped'
  type heartbeatClassType = 'alive' | 'stopped'
  
  export const heartbeatAdditionalItemNames: heartbeatItemName[] = ['interval']
  export const heartbeatOptionalItemNames: heartbeatItemName[] = ['port', 'pid']
  export const heartbeatRequiredItemNames: heartbeatItemName[] = (headerRequiredItemNames as heartbeatItemName[]).concat(heartbeatAdditionalItemNames)
  export const heartbeatItemNames: heartbeatItemName[] = heartbeatRequiredItemNames.concat(heartbeatOptionalItemNames)
  
  export interface heartbeatItems extends headerRequiredItems {
    class: heartbeatClass,
    interval: number,
    port?: number,
    pid?: string
  }

  type heartbeatItemName = keyof heartbeatItems

  export class heartbeatBlock extends block {

    constructor(items: heartbeatItems) {
      super('xap-hbeat', {})
      heartbeatItemNames.forEach( key => {
        let value = items[key]
        if(value != null) { this.add(key, value) }
      })
    }

    // overload toString to ensure heartbeat items are in the required order
    toString() {
      let s = this.name + '\n{\n'
      heartbeatItemNames.forEach(
        name => { 
          let item = this.items.find(i => { return i.name == name})
          if(item != null) {
            s += `${item.name}=${item.value}\n`
          }
      })
      s += '}\n'
      return s
    }
  }
  
  ///////////////////////////////////////////////////////////
  // Message
  ///////////////////////////////////////////////////////////

  export interface message {
    header: headerItems,
    blocks: block[],
    originalText?: string
  }

  export class message implements message {
    constructor(headerBlock: block, messageBlock: block) {
      this.blocks = []
      this.blocks[0] = headerBlock
      this.blocks[1] = messageBlock
      let header = parseHeaderItems(headerBlock)
      if(header != null) { this.header = header }
    }

    add(block: block) : void { this.blocks.push(block) }

    toString() : string { 
      let str = ''
      this.blocks.forEach((b) => { str += b.toString()})
      this.originalText = str
      return str
    }

    // Convenience properties to promote header class and source to message level
    get source(): string { return this.header.source }
    get class(): string  { return this.header.class }

    getBlockValue (blockIndex: number, itemKey: string) : string | undefined { return this.blocks[blockIndex].getValue(itemKey) }
    getHeaderValue (itemKey: string) : string | undefined { return this.getBlockValue(0, itemKey) }
    getFirstBlockValue (itemKey: string) : string | undefined { return this.getBlockValue(1, itemKey) }
  }

  ///////////////////////////////////////////////////////////
  // Utilities
  ///////////////////////////////////////////////////////////

  // Utility function to construct a header block
  export function buildHeader
  (
    msgClass: string,
    uid: string,
    source: string,
    target?: string,
    subdeviceSource?: string,
    subdeviceID?: number
  )
    :headerBlock
  {
    let items: headerItems = {
      v: 13,
      hop: 1,
      uid: uid,
      class: msgClass,
      source: source 
    }
    if (target) {
      items.target = target
    }
    if(subdeviceSource) {
      items.source = `${items.source}:${subdeviceSource}`
    }
    if(subdeviceID && subdeviceID > 0) {
      const uidParts = items.uid.split(':')
      const n = uidParts.length == 1 ? 4 : uidParts[1].length
      items.uid = `${uidParts[0]}:${('0'.repeat(n) + subdeviceID.toString(16).toUpperCase()).slice(-n)}`
    }
    return new headerBlock(items)
  }

  // Utility function to construct a heartbeat block
  export function buildHeartbeat
  (
    hbClass: heartbeatClassType,
    uid: string,
    source: string,
    interval: number = 60,
    port?: number
  )
    :heartbeatBlock
  {
    let items: heartbeatItems = {
      v: 13,
      hop: 1,
      uid: uid,
      class: `xap-hbeat.${hbClass}` as heartbeatClass,
      source: source,
      interval: interval
    }
    if(port) {
      items.port = port
      items.pid = process.pid.toString()
    }
    return new heartbeatBlock(items)
  }

  // Return a instance-level UID generated from a CRC32 of the source (sub part always '00')
  export function generateUID12(source: string) : string {
    const sourceParts = source.split(':')
    let uid = `FF${('0000' + crc.crc32(sourceParts[0]).toString(16).toUpperCase()).slice(-4)}00`
    return uid
  }

  // Return a v13 style instance-level UID generated from a CRC32 of the source (sub part always zeroes)
  export function generateUID13(source: string, deviceDigits = 8, subDigits = 4) : string {
    const sourceParts = source.split(':')
    const instanceUID = ('0'.repeat(deviceDigits) + crc.crc32(sourceParts[0]).toString(16).toUpperCase()).substr(-deviceDigits, deviceDigits)
    const uid = `FF.${instanceUID}:${'0'.repeat(subDigits)}`
    return uid
  }

  function generateUID(version: string | undefined, source: string): string {
    if(version == 'v13') { return generateUID13(source) }
    else return generateUID12(source)
  }

  ///////////////////////////////////////////////////////////
  // Message parsing
  ///////////////////////////////////////////////////////////

  // Pairs of hex characters to a byte array
  function parseHexBytesString (str: string) : Uint8Array { 
    let bytes = new Uint8Array (str.length / 2)
    for (let i = 0; i < str.length / 2; i++) {
      bytes[i] = parseInt(str.substr(i * 2, 2), 16)
    }
    return bytes
  }

  // Extract blocks and values from text format message
  export function parseBlocks (msg: string) : block[] {

    const rBlock = /([A-Za-z0-9_\-\.]+[ A-Za-z0-9_\-\.]*)\s*\n\{\n([^}]*)\}\n/g // match a block-name and its contents
    const rLine =  /\s*([A-Za-z0-9_\-\.]+[ A-Za-z0-9_\-\.]*)([=!])(.*)\n/g // match parameter key, separator and value
    
    let blocks: block[] = []
    let items: blockItem[] = []
    let blockIndex = 0
    let itemIndex = 0
    let matches: RegExpExecArray | null

    while ((matches = rBlock.exec(msg)) != null) {
      if (matches && matches.length == 3)  {
        let blockName = matches[1]
        let blockContents = matches[2]
        
        items = []
        itemIndex = 0
        while (matches = rLine.exec(blockContents)) {
          if (matches && matches.length == 4) {
            let itemKey = matches[1]
            let itemSep = matches[2]
            let itemVal = matches[3]

            items[itemIndex++] = { name: itemKey, value: itemVal }
            if (itemSep == '!') { items[itemIndex].hexValue = parseHexBytesString(itemVal) }
          }
        }
        blocks[blockIndex] = new block(blockName, {})
        blocks[blockIndex].items = items;
        blockIndex++
      }
    }
    return blocks
  }

  // Populate and validate a header items object from a a message block
  // Mandatory header items shared by message headers and heartbeat headers
  // Return undefined if validation fails
  function parseRequiredHeaderItems (block: block) : headerRequiredItems | undefined {

    let header = {} as headerRequiredItems
    let valid = true
    
    headerRequiredItemNames.forEach( item => {
      let value = block.getValue(item)
      if(value != null) {
        switch(item) {
          case 'v':
            header.v = parseInt(value)
            valid = valid && header.v == 12 || header.v == 13
            break
          case 'hop':
            header.hop = parseInt(value)
            valid = valid && header.hop >= 1
            break
          case 'uid':
            header.uid = value.toUpperCase()
            valid = valid && header.uid != ''
            break
          case 'class':
            header.class = value.toLowerCase()
            valid = valid && header.class != ''
            break
          case 'source':
            header.source = value.toLowerCase()
            valid = valid && header.source != ''
            break
          default:
            valid = false
            break
        }
      } else {
          // missing required items not allowed
          valid = false
      }
    })
    
    return valid ? header : undefined
  }

  // Populate and validate a header items object from a a message block
  // Return undefined if validation fails
  export function parseHeaderItems (block: block) : headerItems | undefined {

    // extract the required header items
    let header = parseRequiredHeaderItems(block) as headerItems
    let valid = header != null

    // extract the optional header items
    if(valid) {
      headerOptionalItemNames.forEach( item => {
        let value = block.getValue(item)
        if(value != null) {
          switch(item) {
            case 'target':
              header.target = value.toLowerCase()
              valid = valid && header.target != ''
              break
          }
        }
      })
    }
    
    return valid ? header : undefined
  }

  // Populate and validate a heartbeat items object from a a message block
  // Return undefined if validation fails
  export function parseHeartbeatItems (block: block) : heartbeatItems | undefined {

    // extract the required header items
    let heartbeat = parseRequiredHeaderItems(block) as heartbeatItems
    let valid = heartbeat != null

    // extract the heartbeat specific required items
    if(valid) {
      heartbeatAdditionalItemNames.forEach( item => {
        let value = block.getValue(item)
        if(value != null) {
          switch(item) {
            case 'interval':
              heartbeat.interval = parseInt(value)
              valid = valid && heartbeat.interval >= 1
              break
          }
        } else {
          // missing required items not allowed
          valid = false
        }
      })
    }
    
    // extract the optional heartbeat items
    if(valid) {
      heartbeatOptionalItemNames.forEach( item => {
        let value = block.getValue(item)
        if(value != null) {
          switch(item) {
            case 'port':
              heartbeat.port = parseInt(value)
              valid = valid && heartbeat.port >= 1 // probably should be ephemeral
              break
            case 'pid':
              heartbeat.pid = value
              valid = valid && heartbeat.pid != ''
              break
          }
        }
      })
    }

    return valid ? heartbeat : undefined
  }

    
  function parseSource(source: string) { //todo add sub
    let parts = source.split('.')
    return ({
        vendor: parts[0],
        device: parts[1],
        instance: parts.slice(2).join('.')
    })
  }

  ///////////////////////////////////////////////////////////
  // Network connection
  ///////////////////////////////////////////////////////////

  // Connect to network sockets, send initial heartbeat message
  // Raise events on connection, message reception, heartbeat reception, disconnection and errors
  // Send messages from device-level and sub-device-levels
  // Manage UID generation
  // Send periodic heartbeats

  export interface options {
    version?: 'v12' | 'v13'
    source: {
      vendor: string
      device: string
      instance: string
    }
    hbInterval?: number
    uid?: string
    rxAddress?: string
    txAddress?: string
    port?: number
    loopback?: boolean
  }

  interface configuredOptions {
    version: 'v12' | 'v13'
    source: {
      vendor: string
      device: string
      instance: string
    },
    sourceString: string
    hbInterval: number
    uid: string
    rxAddress: string
    txAddress: string
    port: number
    loopback: boolean
  }

  export interface networkConnection {
    on (event: 'connected', listener: () => void) : this
    on (event: 'disconnected', listener: () => void) : this
    on (event: 'connection-lost', listener: () => void) : this
    on (event: 'message', listener: (msg: message, remote: dgram.RemoteInfo) => void) : this
    on (event: 'heartbeat', listener: (hb: heartbeatItems, remote: dgram.RemoteInfo) => void) : this
    on (event: 'error', listener: (buf: Buffer, remote: dgram.RemoteInfo) => void) : this

    connect(): void
    disconnect () : Promise<void>
    send (msg: string): Promise<void>
    sendBlock (msgClass: string, block: block, target?: string, subdeviceSource?: string, subdeviceID?: number): Promise<void>
    sendBlocks (msgClass: string, blocks: block[], target?: string, subdeviceSource?: string, subdeviceID?: number): Promise<void>
  }

  export class networkConnection extends EventEmitter implements networkConnection {
  
    private defaultOptions12: configuredOptions = {
      version: 'v12',
      source: { vendor: 'vendor', device: 'device', instance: 'instance' },
      sourceString: 'vendor.device.instance',
      hbInterval: 60,
      uid: 'FF123400',
      rxAddress: '127.0.0.1',
      txAddress: '127.0.0.1',
      port: 3639,
      loopback: false
    }

    private defaultOptions13: configuredOptions = {
      version: 'v13',
      source: { vendor: 'vendor', device: 'device', instance: 'instance' },
      sourceString: 'vendor.device.instance',
      hbInterval: 60,
      uid: 'FF.12345678:0000',
      rxAddress: '127.0.0.1',
      txAddress: '127.0.0.1',
      port: 3639,
      loopback: false
    }

    private options: configuredOptions

    // our UDP sockets
    private rxSock: dgram.Socket =  dgram.createSocket('udp4')
    private txSock: dgram.Socket =  dgram.createSocket('udp4')

    private hbTimer: NodeJS.Timer | null = null // timer used to send our own heartbeat periodically
    private hbInterval:number = 1000 // ms to wait until next heartbeat send
    private hbLastTime: number = 0 // ms since the last heartbeat was sent
    private hbSentUID: string = '' // used to confirm reception of our heartbeats
    private hbReceived: boolean = false // used to confirm reception of our heartbeats
    private connected: boolean = false // flag indicating a connection to the listening socket
    private alive: boolean = false // flag indicating that our own heartbeat is being received

    constructor(opts: options) {
      super()

      this.options = (opts.version && opts.version == 'v12') ? this.defaultOptions12 : this.defaultOptions13

      if(opts.source.vendor) { this.options.source.vendor = opts.source.vendor }
      if(opts.source.device) { this.options.source.device = opts.source.device }
      if(opts.source.instance) { this.options.source.instance = opts.source.instance }

      const { vendor, device, instance } = this.options.source
      this.options.sourceString = `${vendor}.${device}.${instance}`

      if(opts.rxAddress && ipaddr.isValid(opts.rxAddress)) { this.options.rxAddress = opts.rxAddress }
      if(opts.txAddress && ipaddr.isValid(opts.txAddress)) { this.options.txAddress = opts.txAddress }
      if(opts.port) { this.options.port = opts.port }
      if(opts.loopback) { this.options.loopback = opts.loopback }
      if(opts.uid) { this.options.uid = opts.uid } else { this.options.uid = generateUID(this.options.version, this.options.sourceString) }
      if(opts.hbInterval) { this.options.hbInterval = opts.hbInterval }
    }

    connect() {
    
      this.rxSock.on('listening', () => {
        const address = this.rxSock.address()
        debug(`server listening on ${address.address}:${address.port}`)
        if(this.options.loopback) { this.options.port = address.port } // for loopback testing, transmit on the listening port
        this.connected = true
        this.sendHeartbeat() // send first heartbeat

        // set up timer for further heartbeats - rapid till observed
        let self = this
        this.hbTimer = global.setInterval(
          function() {
            self.hbLastTime += 1000
            if(self.hbLastTime >= self.hbInterval) {
              self.hbLastTime = 0
              if(!self.alive) { self.hbInterval = Math.floor(self.hbInterval * 1.0)} // increase factor > 1 to back off timing
              if(self.hbInterval > self.options.hbInterval * 1000) { self.hbInterval = self.options.hbInterval * 1000 }
              self.sendHeartbeat()
              debug(`next heartbeat in ${self.hbInterval}ms`)
            }
          },
          1000
        )

      })
  
      this.rxSock.on('error', (err) => {
        debug(`server error:\n${err.stack}`)
        this.connected = false
        this.alive = false
        this.emit('error', err.message)
        this.rxSock.close()
      })
  
      this.rxSock.on('message', (rawMsg, remote) => {

        if(isDebug){ debug(`receive from ${remote.address}:${remote.port} "${rawMsg.toString().replace(/\n/g,'\\n')}"`)}
  
        // parse the received text into xAP message blocks
        let blocks = parseBlocks(rawMsg.toString())
  
        if(blocks.length > 0) {
          // get the name of the first block, the header
          let headerName = blocks[0].name.toLowerCase()
  
          // heartbeat
          if (headerName == 'xap-hbeat') {
            let hbi = parseHeartbeatItems(blocks[0])
            if(hbi != null) {
              if(isDebug){ debug(`  heartbeat from ${hbi.source}, uid ${hbi.uid} (our uid is ${this.hbSentUID})`) }
  
              // update the alive flag confirming that our own heartbeat has been received
              // and raise the connected event
              if(hbi.uid == this.hbSentUID) {
                this.hbReceived = true
                if(this.alive == false) {
                  this.alive = true
                  this.hbInterval = this.options.hbInterval * 1000
                  debug('connection detected - alive => true')
                  this.emit('connected')
                }
              }
  
              // raise the heartbeat event
              this.emit('heartbeat', hbi, remote)
            }
          }
  
          // message
          else if (headerName == 'xap-header' && blocks.length > 1) {
            // create message with header and one block
            let msg = new message(blocks[0], blocks[1])
            // add any further blocks
            blocks.slice(2).forEach((b) => { msg.add(b) })
            // retain the original received text
            msg.originalText = rawMsg.toString()
            if(isDebug){ debug(`  message from ${msg.source}, class ${msg.class}`) }
            // call the message received callback
            this.emit('message', msg, remote)
          }
          // errors
          else {
            debug('  received header with no body')
            this.emit('error',rawMsg, remote)
          }
        }
        else {
          debug('  failed to parse received data')
          this.emit('error',rawMsg, remote)
        }
      })
      
      this.rxSock.bind(0, this.options.rxAddress) // start to receive messages
    }


    async disconnect () : Promise<void> {
      if (this.connected) {
        if(this.hbTimer) { clearInterval(this.hbTimer) }
        // send a final heartbeat 
        return this.sendHeartbeat('stopped').then(() => {
          if(this.rxSock) { this.rxSock.close() }
          if(this.txSock) { this.txSock.close() }
          this.connected = false
          this.alive = false
          this.hbReceived = false
          this.emit('disconnected')
        })
      }
      else {
        return Promise.reject('not connected')
      }
    }

    send (msg: string): Promise<void> {
      if(this.connected) {
        let buf = Buffer.from(msg, 'utf8')
        return dgramSendAsync(this.txSock, buf, 0, buf.length, this.options.port, this.options.txAddress)
      } else {
        return Promise.reject('not connected')
      }
    }

    sendBlock (msgClass: string, block: block, target?: string, subdeviceSource?: string, subdeviceID?: number): Promise<void> {
      return this.sendBlocks(msgClass, [block], target, subdeviceSource, subdeviceID)
    }

    sendBlocks (msgClass: string, blocks: block[], target?: string, subdeviceSource?: string, subdeviceID?: number): Promise<void> {
      const header = buildHeader(msgClass,this.options.uid, this.options.sourceString, target, subdeviceSource, subdeviceID)
      const msg = new message(header, blocks[0])
      blocks.slice(1).forEach(b => { msg.add(b) })
      return this.send(msg.toString())
    }

    private sendHeartbeat (hbClass: heartbeatClassType = 'alive') : Promise<void> {
      const address = this.rxSock.address()
      const source = this.options.sourceString
      const uid = this.options.uid
      const interval = this.options.hbInterval
      const hb = buildHeartbeat(hbClass, uid, source, interval, address.port)
  
      if(this.alive == true && this.hbReceived == false) {
        // connection lost, revert to rapid heartbeats
        this.hbInterval = 1000
        debug('connection lost: alive => false')
        this.emit('lost-connection')
      }

      // update the alive flag confirming that our last heartbeat was sent and received
      this.alive = this.hbReceived

      // check again on the next iteration
      this.hbSentUID = uid
      this.hbReceived = false

      if(isDebug){ debug(`send heartbeat to ${this.options.txAddress}:${this.options.port} "${hb.toString().replace(/\n/g,'\\n')}"`)}
      return this.send(hb.toString())
    }
    
    isAlive () : boolean { return this.alive }
  }

  function dgramSendAsync (sock: dgram.Socket, data: string | Uint8Array | Buffer, offset: number, length: number, port: number, address: string): Promise<void> {
    return new Promise((resolve, reject) => {
      sock.send(data, offset, length, port, address, (error, bytes) => {
        if(error) { reject(error) } else { resolve() }
      })
  })}

}