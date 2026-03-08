/* global global */
// Shim for React Native - must be imported before anything else
import 'react-native-get-random-values';
import { Buffer } from 'buffer';

// Make Buffer available globally (always set, not just when undefined,
// to ensure the npm 'buffer' polyfill takes precedence over any partial native impl)
global.Buffer = Buffer;

// Fix Buffer.isBuffer to recognize Uint8Array instances.
// Anchor's browser bundle inlines buffer-layout which uses Buffer.isBuffer() to decide
// whether to decode enum discriminators. Solana RPC returns Uint8Array (not Buffer),
// so Buffer.isBuffer() returns false, causing buffer-layout to skip discriminator decoding
// and throw "variant mismatch". Making isBuffer() return true for all Uint8Arrays fixes this
// since Buffer is a subclass of Uint8Array and all Buffer methods are patched below.
const originalIsBuffer = Buffer.isBuffer;
Buffer.isBuffer = function (obj) {
  return originalIsBuffer(obj) || (obj instanceof Uint8Array);
};

// Patch Uint8Array with Buffer read/write methods needed by @solana/buffer-layout and Anchor's Borsh.
// Solana RPC returns Uint8Array, but buffer-layout calls readUIntLE/writeUIntLE which only exist on Buffer.
const bufferMethods = [
  'readUIntLE', 'readUIntBE', 'readIntLE', 'readIntBE',
  'readUInt8', 'readUInt16LE', 'readUInt16BE', 'readUInt32LE', 'readUInt32BE',
  'readInt8', 'readInt16LE', 'readInt16BE', 'readInt32LE', 'readInt32BE',
  'readFloatLE', 'readFloatBE', 'readDoubleLE', 'readDoubleBE',
  'writeUIntLE', 'writeUIntBE', 'writeIntLE', 'writeIntBE',
  'writeUInt8', 'writeUInt16LE', 'writeUInt16BE', 'writeUInt32LE', 'writeUInt32BE',
  'writeInt8', 'writeInt16LE', 'writeInt16BE', 'writeInt32LE', 'writeInt32BE',
  'writeFloatLE', 'writeFloatBE', 'writeDoubleLE', 'writeDoubleBE',
];
for (const method of bufferMethods) {
  if (!Uint8Array.prototype[method] && Buffer.prototype[method]) {
    Uint8Array.prototype[method] = function (...args) {
      return Buffer.from(this.buffer, this.byteOffset, this.length)[method](...args);
    };
  }
}

// Patch Uint8Array.prototype.subarray to also carry Buffer methods.
// buffer-layout calls subarray() then expects Buffer methods on the result.
const originalSubarray = Uint8Array.prototype.subarray;
Uint8Array.prototype.subarray = function (...args) {
  const result = originalSubarray.apply(this, args);
  return Buffer.from(result.buffer, result.byteOffset, result.length);
};

// Polyfill TextEncoder/TextDecoder if needed
import { TextEncoder, TextDecoder } from 'text-encoding';
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}
