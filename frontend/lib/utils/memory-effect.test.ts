import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { factLabelFromEffect } from './memory-effect.ts'

describe('factLabelFromEffect', () => {
  test('strips the "Saved to memory — " prefix', () => {
    assert.equal(
      factLabelFromEffect('Saved to memory — Avoids onsite roles'),
      'Avoids onsite roles',
    )
  })

  test('an unprefixed label passes through unchanged', () => {
    assert.equal(factLabelFromEffect('TypeScript'), 'TypeScript')
  })

  test('a hyphen instead of the em dash is not treated as the prefix', () => {
    assert.equal(
      factLabelFromEffect('Saved to memory - TypeScript'),
      'Saved to memory - TypeScript',
    )
  })
})
