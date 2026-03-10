declare module 'bcrypt-pbkdf' {
  /**
   * OpenBSD bcrypt_pbkdf implementation
   * This is the exact algorithm used by OpenSSH for key derivation
   *
   * @param pass - The passphrase string
   * @param passlen - Length of passphrase
   * @param salt - Salt buffer
   * @param saltlen - Length of salt
   * @param key - Output buffer for derived key
   * @param keylen - Desired key length
   * @param rounds - Number of rounds
   * @returns 0 on success, -1 on error
   */
  export function pbkdf(
    pass: string,
    passlen: number,
    salt: Buffer,
    saltlen: number,
    key: Buffer,
    keylen: number,
    rounds: number
  ): number;

  export function hash(
    sha2pass: Uint8Array,
    sha2salt: Uint8Array,
    out: Uint8Array
  ): void;

  export const BLOCKS: number;
  export const HASHSIZE: number;
}
