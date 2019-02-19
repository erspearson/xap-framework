# xap-framework
A framework for building xAP home automation applications on NodeJS

`xap-framework` is a NodeJS module written in TypeScript that deals with network communication
and message processing for applications that communicate using the xAP home automation protocol.  
Its purpose and operation are similar to the earlier xAPframework.net library written in CSharp.

## Framework Overview
Major functional areas are:
* Network Communication - event-based interaction with UDP network sockets
* Header Parsing and Construction - checking and manipulation of xAP message headers and heartbeats
* Message Parsing and Construction - extracting and inserting values into xAP messages.

This TypeScript implementation includes a thorough treatment of xAP messages expressed through
type definitions. xAP messages are defined from low- to high-level types as follows:
* blockItem - each line in a xAP message (each a name-value pair)
* block - a named set of message lines
* headerItems - the lines required for the first block in every message
* heartbeatItems - the lines required for heartbeat message headers
* message - an array of blocks with the first being a header.

The various types and classes help deal with aspects of the xAP specification such as:
* case-insensitivity of item and block names
* items containing hex data
* generating UID's from source addresses
* the structure of source and target addresses and UID's
* enforcing required and optional items in headers and heartbeats, their order and contents
* translating between xAP's on-the-wire message format and JavaScript-friendly representations.


Network communication is event-based, extending the NodeJS EventEmitter object.
The `networkConnection` class raises events for:
* connected - connection to the network confirmed by reception of a heartbeat
* disconnected - confirmation of disconnection
* connection-lost - heartbeat reception no longer detected
* message - a xAP message has been received
* heartbeat - a xAP heartbeat message has been received
* error - a message has been received that is not well-formed xAP.

The `networkConnection` class provides methods for:
* connecting and disconnecting the network
* sending messages.

The `networkConnection` class represents a xAP device on the the network.
Constructing an instance of `networkConnection` includes specifying at least the xAP Source of the device
and optionally its UID, heartbeat interval and protocol version.
Once connected, `networkConnection` will send out regular heartbeat messages,
monitor the network and assist with filling out the header fields of messages to be sent.


