import { xAP } from '../lib/xap-framework'
import { expect, should } from 'chai'

should() // attach 'should' to object prototype

describe('xAP Framework object tests', function() {

  ////////////////////////////////////////////////////////////////////////////////////////////////
  // MESSAGE BLOCKS
  ////////////////////////////////////////////////////////////////////////////////////////////////

  context('Message block primatives', function() {

    // Test construction of the simplest block
    it('should construct a one item block', function() {

      const result = new xAP.block('block', { key: 'value'})
      result.name.should.equal('block')
      result.items.should.have.lengthOf(1)
    })

    // Test construction of a multi item block
    it('should construct a multi item block', function() {

      const result = new xAP.block('block', { key1: 'value1', key2: 'value2', key3: 'value3'})
      result.items.should.have.lengthOf(3)
    })
    
    // Test block text rendering
    it('should convert to text', function() {

      const block = new xAP.block('block', { key: 'value'})
      const result = block.toString()
      result.should.equal('block\n{\nkey=value\n}\n')
    })
 
    // Test block text rendering order
    it('should convert to text respecting item order', function() {

      const block = new xAP.block('block', { key1: 'value1', key2: 'value2', key3: 'value3'})
      const result = block.toString()
      result.should.equal('block\n{\nkey1=value1\nkey2=value2\nkey3=value3\n}\n')
    })
    
    // Test block item extraction
    it('should extract a block item using a case insensitive key', function() {

      const block = new xAP.block('block', { key: 'value'})
      const result = block.getValue('KeY')
      expect(result).is.not.undefined
      if(result) { result.should.equal('value') }
    })
    
    // Test block item extraction
    it('should return undefined for a non existant key', function() {

      const block = new xAP.block('block', { key: 'value'})
      const result = block.getValue('missing')
      expect(result).is.undefined
    })
    
    // Test block item addition
    it('should allow additional items to be appended', function() {

      var block = new xAP.block('block', { key1: 'value1'})
      block.items.should.have.lengthOf(1, block.toString())
      block.add('key2', 'value2')
      block.items.should.have.lengthOf(2, block.toString())
      block.add('key3', 'value3')
      block.items.should.have.lengthOf(3, block.toString())
    })

    // Test blocks maintain unique keys
    it('should not allow additional items with duplicate keys', function() {

      var block = new xAP.block('block', { key1: 'value1'})
      block.items.should.have.lengthOf(1)
      expect(() => { block.add('key1', 'value2') }).to.throw()
    })


    // Test blocks maintain case-insensitive unique keys
    it('should not allow additional items with keys differing only in case', function() {

      var block = new xAP.block('block', { key1: 'value1'})
      block.items.should.have.lengthOf(1)
      expect(() => { block.add('kEY1', 'value2') }).to.throw()
    })    
  })

  ////////////////////////////////////////////////////////////////////////////////////////////////
  // MESSAGE HEADERS - Mandatory items
  ////////////////////////////////////////////////////////////////////////////////////////////////

  context('Message headers: mandatory items', function() {

    function buildHeader() {
      let msgClass = `class`
      let source = `vendor.device.instance`
      let uid = 'FF.12345678:0000'
      let header = xAP.buildHeader(msgClass, uid, source)
      return header
    }

    // Test construction of a header
    it('should construct a valid header block without throwing', function() {
      expect(function() { buildHeader() }).not.to.throw()
    })

    // Test construction of a header
    it('should correctly construct a five-item block named "xap-header"', function() {

      const result = buildHeader()
      expect(result).is.not.undefined
      result.should.have.property('name')
      result.name.should.equal('xap-header')
      result.should.have.property('items')
      result.items.should.have.lengthOf(5)
    })

    // Test header rendering
    it('should render a header with the items in the required order', function() {
      const header = buildHeader() as xAP.headerBlock
      const result = header.toString()
      result.should.equal('xap-header\n{\nv=13\nhop=1\nuid=FF.12345678:0000\nclass=class\nsource=vendor.device.instance\n}\n')
    })

    // Test header parsing
    it('parsing a valid header should not throw', function() {
      const header = buildHeader() as xAP.headerBlock
      expect(function() { xAP.parseHeaderItems(header) as xAP.headerItems }).not.to.throw()
    })

    // Test header parsing
    it('parsing a valid header should produce the expected items', function() {
      const header = buildHeader() as xAP.headerBlock
      const result = xAP.parseHeaderItems(header) as xAP.headerItems
      expect(result).is.not.undefined
      result.should.contain.keys(['v', 'hop', 'uid', 'class', 'source'])
    })

    // Test header parsing
    it('parsing a valid header should produce items with the expected values', function() {
      const header = buildHeader() as xAP.headerBlock
      const result = xAP.parseHeaderItems(header) as xAP.headerItems
      expect(result).is.not.undefined
      result.v.should.equal(13)
      result.hop.should.equal(1)
      result.class.should.equal('class')
      result.source.should.equal('vendor.device.instance')
      result.uid.should.equal('FF.12345678:0000')
    })
  })


  ////////////////////////////////////////////////////////////////////////////////////////////////
  // MESSAGE HEADERS - Optional items
  ////////////////////////////////////////////////////////////////////////////////////////////////

  context('Message headers: optional items', function() {

    function buildHeader() {
      let msgClass = `class`
      let source = `vendor.device.instance`
      let uid = 'FF.12345678:0000'
      let target = 'target'
      let subdevice = 'subdevice'
      let subdeviceID = 1
      let header = xAP.buildHeader(msgClass, uid, source, target, subdevice, subdeviceID)
      return header
    }

    // Test construction of a header
    it('should construct a valid header block with optional items without throwing', function() {
      expect(function() { buildHeader() }).not.to.throw()
    })

    // Test construction of a header
    it('should correctly construct a six-item block for a targetted header', function() {

      const result = buildHeader()
      result.items.should.have.lengthOf(6)
    })

    // Test header parsing with target
    it('parsing a targetted header should find the expected target item', function() {
      const header = buildHeader() as xAP.headerBlock
      const result = xAP.parseHeaderItems(header) as xAP.headerItems
      expect(result).is.not.undefined
      result.should.contain.keys(['v', 'hop', 'uid', 'class', 'source', 'target'])
      const target = result.target || ''
      target.should.equal('target')
    })

    // Test header parsing with subdevice and UID
    it('parsing a header with sub-device should find the source and UID decorated accordingly', function() {
      const header = buildHeader() as xAP.headerBlock
      const result = xAP.parseHeaderItems(header) as xAP.headerItems
      expect(result).is.not.undefined
      result.source.should.equal('vendor.device.instance:subdevice')
      result.uid.should.equal('FF.12345678:0001')
    })
  })

  ////////////////////////////////////////////////////////////////////////////////////////////////
  // HEARTBEATS
  ////////////////////////////////////////////////////////////////////////////////////////////////

  context('Heartbeats', function() {

    function buildHeartbeat() {
      let source = `vendor.device.instance`
      let uid = 'FF.12345678:0000'
      let hb = xAP.buildHeartbeat('alive', uid, source)
      return hb
    }

    // Test construction of a heartbeat
    it('should construct a valid heartbeat without throwing', function() {
      expect(function() { buildHeartbeat() }).not.to.throw()
    })

    // Test construction of a heartbeat
    it('should construct a six-item block named "xap-hbeat with class "hbeat-alive"', function() {

      const result = buildHeartbeat()
      expect(result).is.not.undefined
      result.should.have.property('name')
      result.name.should.equal('xap-hbeat')
      result.should.have.property('items')
      result.items.should.have.lengthOf(6)
    })

    // Test heartbeat rendering
    it('should render a heartbeat with the items in the required order', function() {
      const hb = buildHeartbeat() as xAP.heartbeatBlock
      const result = hb.toString()
      result.should.equal('xap-hbeat\n{\nv=13\nhop=1\nuid=FF.12345678:0000\nclass=xap-hbeat.alive\nsource=vendor.device.instance\ninterval=60\n}\n')
    })

    // Test heartbeat parsing
    it('parsing a valid heartbeat should not throw', function() {
      const hb = buildHeartbeat() as xAP.heartbeatBlock
      expect(function() { xAP.parseHeartbeatItems(hb) as xAP.heartbeatItems }).not.to.throw()
    })

    // Test heartbeat parsing
    it('parsing a valid heartbeat should produce the expected items', function() {
      const hb = buildHeartbeat() as xAP.headerBlock
      const result = xAP.parseHeartbeatItems(hb) as xAP.headerItems
      expect(result).is.not.undefined
      result.should.contain.keys(['v', 'hop', 'uid', 'class', 'source', 'interval'])
    })

    // Test heartbeat parsing
    it('parsing a valid heartbeat should produce items with the expected values', function() {
      const hb = buildHeartbeat() as xAP.heartbeatBlock
      const result = xAP.parseHeartbeatItems(hb) as xAP.heartbeatItems
      expect(result).is.not.undefined
      result.v.should.equal(13)
      result.hop.should.equal(1)
      result.uid.should.equal('FF.12345678:0000')
      result.class.should.equal('xap-hbeat.alive')
      result.source.should.equal('vendor.device.instance')
      result.interval.should.equal(60)
    })

    it('a heartbeat can have addional "port" and "pid" items', function() {
      const hb = xAP.buildHeartbeat('alive', 'FF.1234:00', 'v.d.i', 120, 56001)
      hb.items.should.have.lengthOf(8)
      const result = xAP.parseHeartbeatItems(hb) as xAP.heartbeatItems
      expect(result).is.not.undefined
      result.should.contain.keys(['v', 'hop', 'uid', 'class', 'source', 'interval', 'port', 'pid'])
      result.interval.should.equal(120)
      expect(result.port || -1).is.equal(56001)
      expect(result.pid || '').is.equal(process.pid.toString())
    })
  })


  ////////////////////////////////////////////////////////////////////////////////////////////////
  // UID Generation
  ////////////////////////////////////////////////////////////////////////////////////////////////

  context('UID Generation', function() {

    it('should generate a v12 UID like "FF123400"', function() {
      const result = xAP.generateUID12('vendor.device.instance')
      result.should.match(/FF[0123456789ABCDEF]{4}00/)
    })

    it('should generate a default v13 UID like "FF.12345678:0000"', function() {
      const result = xAP.generateUID13('vendor.device.instance')
      result.should.match(/FF\.[0123456789ABCDEF]{8}:0{4}/)
    })

    it('should generate a custom v13 UID like "FF.123456:00"', function() {
      const result = xAP.generateUID13('vendor.device.instance', 6, 2)
      result.should.match(/FF\.[0123456789ABCDEF]{6}:0{2}/)
    })

    it("should generate different UID's for differnt sources", function() {
      const uid1 = xAP.generateUID13('vendor.device.instance')
      const result = xAP.generateUID13('vendor.thing.instance')
      result.should.not.equal(uid1)
    })
  })
})