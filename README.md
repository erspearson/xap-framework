# xap-framework
A framework for building xAP home automation applications on NodeJS

`xap-framework` is a NodeJS module written in TypeScript that deals with network communication
and message processing for applications that communicate using the xAP home automation protocol.  
Its purpose and operation are similar to the earlier xAPframework.net library written in CSharp.

## Installation
```shell
> npm install xap-framework
```

## Usage
```typescript
// TypeScript
import { xAP } from 'xap-framework'
```
```javascript
// JavaScript
var xAP = require('xap-framework')
```

## Framework Overview
The main functional areas are:
* **Network Communication** - event-based interaction with UDP network sockets
* **Header Parsing and Construction** - checking and manipulation of xAP message headers and heartbeats
* **Message Parsing and Construction** - extracting and inserting values into xAP messages.

This TypeScript implementation includes a thorough treatment of xAP messages expressed throughtype definitions.  
xAP messages are defined from low- to high-level types as follows:
* `xAP.blockItem` - each line in a xAP message (each a name-value pair)
* `xAP.block` - a named set of message lines
* `xAP.headerItems` - the lines required for the first block in every message
* `xAP.heartbeatItems` - the lines required for heartbeat message headers
* `xAP.message` - an array of blocks with the first being a header.

The various types and classes help deal with aspects of the xAP specification such as:
* **case-insensitivity** of item and block names
* items containing **hex data**
* **generating UID's** from source addresses
* the structure of **source and target addresses** as well as UID's
* enforcing required and optional items in **headers and heartbeats**, their order and contents
* translating between xAP's **on-the-wire** message format and JavaScript-friendly representations.


Network communication is event-based, extending the NodeJS EventEmitter object.  
The `xAP.networkConnection` class raises events:
* `connected` - connection to the network confirmed by reception of a heartbeat
* `disconnected` - confirmation of disconnection
* `connection-lost` - heartbeat reception no longer detected
* `message` - a xAP message has been received
* `heartbeat` - a xAP heartbeat message has been received
* `error` - a message has been received that is not well-formed xAP.

As well as events, the networkConnection class provides methods for:
* connecting and disconnecting the network
* sending messages.

The networkConnection class represents a **xAP device** on the the network.
Constructing an instance of networkConnection includes specifying at least the xAP Source of the device
and optionally its UID, heartbeat interval and protocol version.
Once connected, networkConnection will send out regular heartbeat messages,
monitor the network, raise events for incoming messages
and assist with filling out the header fields of messages being sent.

Look in the xap-framework examples folder (on the GitHub repository) for more guidance.

## Quick Example
Connect, say hello then log heartbeat messages

```typescript
import { xAP } from 'xap-framework'

// Specify the source address and heartbeat interval for our device
const options: xAP.options = {
  source: {
    vendor: 'acme',
    device: 'logger',
    instance: 'example'
  },
  hbInterval: 60
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
```
A more developed version this example is the
xAP command line logging tool [xap-log](http://github.com/erspearson/xap-log).

By default, networkConnection is configured to communicate with
[xap-hub](http://github.com/erspearson/xap-hub)
using only localhost sockets. The example above assumes this.
xap-hub includes enhanced (compared with previous xAP hubs) communication with client applications
by dealing with traffic in both directions via local ports.
Previous hubs have only dealt with inbound traffic.

To work with an earlier hub specify the outgoing network broadcast address in the options hash  
e.g., `txAddress: '192.168.1.255'`.  
To work without any hub (as the only xAP application on a host),
specify additionally the the receive address to bind to  
e.g., `rxAddress: '192.168.1.10'`.

The add-on module
[xap-net-address](http://github.com/erspearson/xap-net-address)
provides methods to determine the most likely network
and broadcast addresses to use for txAddress and rxAddress.
xap-hub uses xap-net-address to determine addresses.

xap-framework is part of a family of modules for xAP
![xAP family diagram](/img/xap-family-framework.png?raw=true)