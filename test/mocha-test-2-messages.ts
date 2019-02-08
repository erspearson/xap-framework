import { xAP } from '../lib/xap-framework'
import { expect } from 'chai'

describe('xAP Framework message tests', function() {

  ////////////////////////////////////////////////////////////////////////////////////////////////
  // MESSAGE BLOCKS
  ////////////////////////////////////////////////////////////////////////////////////////////////

  context('Message construction', function() {

    // Test construction of a simple message
    it('should construct a one block message plus header', function() {
      const result = new xAP.message(xAP.buildHeader('class','FF.1234:00', 'v.d.i'), new xAP.block('block', { key: 'value' }))
      expect(result).is.not.undefined
      expect(result).is.an('object')
      expect(result).has.ownProperty('header')
      expect(result.header).has.ownProperty('class')
      expect(result.header.class).equals('class')
      expect(result.getHeaderValue('UiD')).equals('FF.1234:00')
      expect(result.blocks).is.an('array')
      expect(result.blocks).has.lengthOf(2)
      expect(result.blocks[1].name).equals('block')
      expect(result.getFirstBlockValue('key')).equals('value')
      expect(result.getFirstBlockValue('KeY')).equals('value')
      expect(result.getBlockValue(1, 'key')).equals('value')
    })

    // Test rendering of a simple message
    it('should correctly render a one block message', function() {
      const msg = new xAP.message(xAP.buildHeader('class','FF.1234:00', 'v.d.i'), new xAP.block('block', { key: 'value' }))
      const result = msg.toString()
      expect(result).equals(
        'xap-header\n{\nv=13\nhop=1\nuid=FF.1234:00\nclass=class\nsource=v.d.i\n}\n'
        + 'block\n{\nkey=value\n}\n'
      )
    })

    // Test adding an additional block
    it('should construct then render a multi-block message', function() {
      var msg = new xAP.message(xAP.buildHeader('class','FF.1234:00', 'v.d.i'), new xAP.block('block', { key: 'value' }))
      msg.add(new xAP.block('block2', { key: 'value2' }))
      expect(msg.blocks).has.lengthOf(3)
      expect(msg.getBlockValue(2, 'key')).equals('value2')
      const result = msg.toString()
      expect(result).equals(
        'xap-header\n{\nv=13\nhop=1\nuid=FF.1234:00\nclass=class\nsource=v.d.i\n}\n'
        + 'block\n{\nkey=value\n}\n'
        + 'block2\n{\nkey=value2\n}\n'
      )
    })

  })
})