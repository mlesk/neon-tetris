import struct, zlib

def png(path, n, draw):
    raw = bytearray()
    for y in range(n):
        raw.append(0)
        for x in range(n):
            raw.extend(draw(x / n, y / n))
    def chunk(t, d):
        c = struct.pack('>I', len(d)) + t + d
        return c + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    ihdr = struct.pack('>IIBBBBB', n, n, 8, 6, 0, 0, 0)
    data = chunk(b'IHDR', ihdr) + chunk(b'IDAT', zlib.compress(bytes(raw)))
    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n' + data + chunk(b'IEND', b''))
    print('wrote', path)

BG = (11, 14, 31, 255)
# T tetromino cells in 3x2 grid, neon violet/cyan mix
CELLS = [(0, 0), (1, 0), (2, 0), (1, 1)]
NEON = [(34, 230, 255, 255), (199, 123, 255, 255), (255, 93, 242, 255), (255, 217, 77, 255)]

def make_draw():
    def draw(fx, fy):
        # rounded-ish dark bg with subtle glow ring
        r = ((fx - 0.5) ** 2 + (fy - 0.5) ** 2) ** 0.5
        # T blocks occupy center
        gx, gy = fx * 3, fy * 3
        for i, (cx, cy) in enumerate(CELLS):
            bx0, by0 = 0.35 + cx * 0.1 - 0.05, 0.28 + cy * 0.1
            if bx0 < fx < bx0 + 0.09 and by0 < fy < by0 + 0.09:
                return NEON[i]
        # glow ring
        if 0.36 < r < 0.44:
            return (60, 90, 200, 255)
        return BG
    return draw

for n, name in [(180, 'icon-180.png'), (192, 'icon-192.png'), (512, 'icon-512.png')]:
    png(name, n, make_draw())
