import { sm2 } from 'sm-crypto'
import { publicKey } from '/@/config'

export function sm2Encrypt(plainText: string) {
  try {
    return sm2.doEncrypt(plainText, publicKey, 0)
  } catch {
    return ''
  }
}
