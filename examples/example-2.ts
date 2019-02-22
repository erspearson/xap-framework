// This example is a walk through of various xap-framework
// functions to illustrate how to work with the library.

import { xAP } from '../lib/xap-framework'

// xAP MESSAGE BLOCKS

// Construct a xAP message block giving its name and a hash of key/value pairs
// Values are strings or numbers
let demoBlock = new xAP.block(
  'my.block',
  {
    strVal: 'a string value',
    numVal: 2001
  }
)

// xAP.block's toString method produces the on-the-wire form
let blockString = demoBlock.toString()
console.log(blockString)

// Each line of a message block is a blockItem type
let item: xAP.blockItem

// The items property of a xAP.block returns the blockItems as an array for iteration
// Each item has a name and value property
console.log(`The block named '${demoBlock.name}' contains:`)
for(item of demoBlock.items) {
  console.log(`  an item named '${item.name}' having value '${item.value}'`)
}

// Further items can be added to a block
demoBlock.add('moreVal', 'adding more')

console.log('\nAdd item. Block is now:\n' + demoBlock.toString())

// Keys, block names etc in xAP should be treated case-insensitively
// xAP.block's getValue method deals with this for block items
let s = demoBlock.getValue('NuMvAL') // returns 2001
let u = demoBlock.getValue('noVal') // returns undefined

// Keys in messages are kept unique independent of case
try {
  demoBlock.add('MOreVal', 'no more')
} catch {
  console.log("Cannot add an item named 'MOreVal'")
}

// xAP MESSAGE HEADER BLOCKS

// A message header is a block
// It is the first block in a message
// and must contain certain values in a certain order
// The class representing a block is xAP.headerBlock
// and there's a utility function to create one
let demoHeader = xAP.buildHeader('my.demo', 'FF.1234.00', 'vendor.device.instance')

// Required header items (such as 'v' and 'hop') are added with default values
console.log('\nOur header is:\n' + demoHeader.toString())

// Optional arguments to buildHeader allow target and sub-device elements to be added


// xAP MESSAGES

// A xAP message is a header block followed by at least one message block
let demoMessage = new xAP.message(demoHeader, demoBlock)
console.log('\nOur message is:\n' + demoMessage.toString())

// Further blocks can be added to a message
demoMessage.add(new xAP.block('another.block', { more: 'stuff', even: 'more'}))

// The xAP.message.blocks property contains all the message blocks including the header
console.log(`It now contains ${demoMessage.blocks.length} blocks`) // 3

// There's a utility function to get values from a numbered block
let v = demoMessage.getBlockValue(1, 'numVal') // 2001

// Another that goes straight to the first block after the header
v = demoMessage.getFirstBlockValue('numVal') // 2001

// The header is the block with index 0; easy access via the header property
let src = demoMessage.header.source // vendor.device.instance
let msClass = demoMessage.header.class // my.demo

// xAP MESSAGE PARSING

let newData = demoMessage.toString()

// If data is received directly from the network or a file
// it can be validated and parsed into a set of blocks using
let newBlocks = xAP.parseBlocks(newData)

// If it is valid then the header items can be extracted
if(newBlocks.length > 0) {
  if(newBlocks[0].name == 'xap-header') {
    let newHeader = xAP.parseHeaderItems(newBlocks[0])

    // If the header is valid its items can be accessed
    if(newHeader) {
      let uid = newHeader.uid // FF.1234.00
      let hop = newHeader.hop // 1
    }
  }
}
// Normally with xap-framework you use the networkConnection object to
// deliver parsed messages to you so you don't have to worry about calling the
// parsing functions above.
// networkConnection raises a message or heartbeat event when valid xAP is received.
// Similarly, networkConnection will fill out and add an appropriate header block
// for blocks you want to send. This is shown in example-1.ts
