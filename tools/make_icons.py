#!/usr/bin/env python3
"""アイコン(PNG)生成。依存ライブラリなしで書き出す簡易ジェネレータ。"""
import zlib, struct, math, os

OUT = os.path.join(os.path.dirname(__file__), '..', 'icons')

def png(path, w, h, px):
    raw = b''.join(b'\x00' + bytes(px[y]) for y in range(h))
    def chunk(t, d):
        c = struct.pack('>I', len(d)) + t + d
        return c + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    data = (b'\x89PNG\r\n\x1a\n'
            + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(raw, 9))
            + chunk(b'IEND', b''))
    open(path, 'wb').write(data)

def render(size, pad):
    bg = (7, 7, 12)
    rows = [[bg[0], bg[1], bg[2]] * size for _ in range(size)]
    def put(x, y, c, a=1.0):
        if 0 <= x < size and 0 <= y < size:
            i = x * 3
            for k in range(3):
                rows[y][i + k] = int(rows[y][i + k] * (1 - a) + c[k] * a)
    inner = size - pad * 2
    line_y = pad + int(inner * 0.70)
    cyan, pink, white = (102, 230, 255), (255, 79, 163), (255, 255, 255)
    # 判定ラインとグロー
    for x in range(pad, size - pad):
        for dy in range(-9, 10):
            a = max(0.0, 1 - abs(dy) / 9) ** 2 * 0.55
            put(x, line_y + dy, cyan, a)
        put(x, line_y, cyan, 1.0)
        put(x, line_y + 1, cyan, 0.8)
    # 流れるノーツ
    notes = [(0.16, 0.70, 0.055, cyan), (0.36, 0.52, 0.075, white),
             (0.55, 0.70, 0.10, pink), (0.76, 0.36, 0.06, cyan),
             (0.88, 0.70, 0.045, white)]
    for fx, fy, fr, col in notes:
        cx, cy, r = pad + inner * fx, pad + inner * fy, inner * fr
        for y in range(int(cy - r * 3), int(cy + r * 3) + 1):
            for x in range(int(cx - r * 3), int(cx + r * 3) + 1):
                d = math.hypot(x - cx, y - cy)
                if d <= r:
                    put(x, y, col, 1.0)
                elif d <= r * 2.6:
                    put(x, y, col, max(0.0, 1 - (d - r) / (r * 1.6)) ** 2 * 0.5)
    # 判定サークル
    cx, cy, r = pad + inner * 0.55, line_y, inner * 0.19
    for y in range(int(cy - r - 3), int(cy + r + 4)):
        for x in range(int(cx - r - 3), int(cx + r + 4)):
            d = abs(math.hypot(x - cx, y - cy) - r)
            if d < 1.6:
                put(x, y, pink, 1 - d / 1.6)
    return rows

for size, pad, name in [(192, 10, 'icon-192.png'), (512, 26, 'icon-512.png'),
                        (512, 96, 'icon-maskable.png')]:
    png(os.path.join(OUT, name), size, size, render(size, pad))
    print('wrote', name)
