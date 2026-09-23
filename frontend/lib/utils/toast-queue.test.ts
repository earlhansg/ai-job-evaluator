import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { TOAST_LIMIT, pushToast, removeToast, type ToastItem } from './toast-queue.ts'

const toast = (n: number): ToastItem => ({ id: `toast_${n}`, message: `Message ${n}` })

describe('toast queue', () => {
  test('the limit is three', () => {
    assert.equal(TOAST_LIMIT, 3)
  })

  test('pushing a fourth toast drops the oldest', () => {
    let list: ToastItem[] = []
    for (const n of [1, 2, 3, 4]) list = pushToast(list, toast(n))
    assert.deepEqual(
      list.map((t) => t.id),
      ['toast_2', 'toast_3', 'toast_4'],
    )
  })

  test('push does not mutate its input', () => {
    const list = [toast(1)]
    pushToast(list, toast(2))
    assert.equal(list.length, 1)
  })

  test('remove drops the matching id', () => {
    assert.deepEqual(
      removeToast([toast(1), toast(2)], 'toast_1').map((t) => t.id),
      ['toast_2'],
    )
  })

  test('removing an unknown id is a no-op', () => {
    const list = [toast(1), toast(2)]
    assert.deepEqual(removeToast(list, 'toast_9'), list)
  })
})
