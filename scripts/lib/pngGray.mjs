// Re-encodes a PNG as 8-bit greyscale (docs/dev/history/technical-design-quality-assurance.md §6.2,
// §6.5): Chromium's screenshots are RGB, the help diagrams are black, white and grey only, so one
// channel holds them exactly and takes about a third of the bytes that count against the budget.
// Pure: buffers in, buffer out; tested by scripts/test-diagrams.mjs.

import {deflateSync, inflateSync} from 'node:zlib';

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

const paeth = (a, b, c) => {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
};

/** The pixels of an 8-bit RGB, RGBA, grey or grey+alpha PNG: {width, height, channels, data}. Throws on others. */
export function decodePng(buffer) {
  if (!buffer.subarray(0, 8).equals(SIGNATURE)) throw new Error('not a PNG');
  let pos = 8, width = 0, height = 0, depth = 0, colorType = 0, interlace = 0;
  const idat = [];
  while (pos < buffer.length) {
    const len = buffer.readUInt32BE(pos);
    const type = buffer.toString('ascii', pos + 4, pos + 8);
    const data = buffer.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      depth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  const channels = {0: 1, 2: 3, 4: 2, 6: 4}[colorType];
  if (depth !== 8 || !channels || interlace) throw new Error(`unsupported PNG (depth ${depth}, color type ${colorType}, interlace ${interlace})`);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const data = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? data[y * stride + x - channels] : 0;
      const b = y > 0 ? data[(y - 1) * stride + x] : 0;
      const c = x >= channels && y > 0 ? data[(y - 1) * stride + x - channels] : 0;
      const v = line[x];
      data[y * stride + x] = (filter === 0 ? v : filter === 1 ? v + a : filter === 2 ? v + b : filter === 3 ? v + ((a + b) >> 1) : v + paeth(a, b, c)) & 0xff;
    }
  }
  return {width, height, channels, data};
}

/** One grey value per pixel: luminance, with any alpha composited onto white. */
function toGray({width, height, channels, data}) {
  const out = Buffer.alloc(width * height);
  for (let i = 0; i < width * height; i++) {
    const p = i * channels;
    let g = channels >= 3 ? 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2] : data[p];
    const alpha = channels === 4 ? data[p + 3] : channels === 2 ? data[p + 1] : 255;
    g = (g * alpha + 255 * (255 - alpha)) / 255;
    out[i] = Math.round(g);
  }
  return out;
}

/** An 8-bit greyscale PNG of `gray` (width × height bytes), each row with the filter that packs best. */
export function encodeGrayPng(width, height, gray) {
  const rows = [];
  for (let y = 0; y < height; y++) {
    const cur = gray.subarray(y * width, (y + 1) * width);
    const prev = y > 0 ? gray.subarray((y - 1) * width, y * width) : Buffer.alloc(width);
    let best = null;
    for (let f = 0; f <= 4; f++) {
      const line = Buffer.alloc(width + 1);
      line[0] = f;
      let cost = 0;
      for (let x = 0; x < width; x++) {
        const a = x > 0 ? cur[x - 1] : 0, b = prev[x], c = x > 0 ? prev[x - 1] : 0;
        const pred = f === 0 ? 0 : f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : paeth(a, b, c);
        const v = (cur[x] - pred) & 0xff;
        line[x + 1] = v;
        cost += v < 128 ? v : 256 - v;
      }
      if (!best || cost < best.cost) best = {cost, line};
    }
    rows.push(best.line);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 0; // greyscale
  return Buffer.concat([SIGNATURE, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(Buffer.concat(rows), {level: 9})), chunk('IEND', Buffer.alloc(0))]);
}

/** The PNG `buffer` re-encoded as 8-bit greyscale. */
export function toGrayPng(buffer) {
  const img = decodePng(buffer);
  return encodeGrayPng(img.width, img.height, toGray(img));
}
