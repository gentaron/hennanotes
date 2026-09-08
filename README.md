# HENNA NOTES

画像をアップロードして自由にスライドできる PWA ビューア。
閲覧中は画面下に judgement line が一本走り、その上をドットのノーツが流れてくる
—— ただしパターンは数秒ごとに勝手に組み替わり、**制御できない**。

## 使い方

1. 静的ファイルなのでそのまま配信すればいい。ローカルなら:
   ```
   python3 -m http.server 8080
   ```
   → `http://localhost:8080/` を開く（Service Worker は localhost か HTTPS が必要）。
2. 「＋ 画像」かドロップで画像を追加（端末内の IndexedDB に保存。オフラインでも開ける）。
3. 「▶ スライド」で閲覧モードへ。
4. ブラウザのメニュー、または「インストール」ボタンでホーム画面に入る。

## 操作

| 操作 | 動き |
|---|---|
| スワイプ / ドラッグ | 前後の画像へ（自由スライド） |
| タップ（左半分 / 右半分） | 前へ / 次へ |
| ← → キー | 前へ / 次へ |
| 画面下 30% をタップ、Space / Enter / F / J | ノーツを叩く |
| 自動 | 3.6 秒ごとに自動送り |
| ノーツ ON/OFF | リズム表示の切り替え |
| Esc / 戻る | ライブラリへ |

判定は PERFECT / GREAT / GOOD / MISS。判定サークルとの距離だけで決まるので、
ノーツが化け物じみた動きをしていても叩ける。

## カオスの中身

数秒ごとに「フェーズ」が丸ごと引き直され、さらにランダムな「イベント」が重なる。

- **パターン** 14種: single / stream / chord / burst / stair / wave / cluster / rest / triplet / machinegun / rain / crescendo / mirror / scatter
- **動き** 16種: straight / sine / zigzag / bounce / gravity / float / spiral / stutter / swell / drunk / pendulum / rocket / fall / orbit / elastic / snake
- **形** 16種: dot / ring / square / diamond / triangle / star / cross / plus / hex / bar / twin / pixel / spark / hollow / arrow / blob
- **線** 14種: solid / dashed / dotted / double / glow / wave / tilt / jitter / thick / hair / gradient / broken / pulse / ladder
- **色** 12種: neon / ice / magma / toxic / candy / mono / rainbow / sunset / deep / vhs / gold / ghost
- **イベント** 30種: GRAVITY FLIP / ZERO-G / HYPER / SLOW MOTION / SWARM / GIANT / TINY / MIRROR / GHOST / RAINBOW / MONOCHROME / STROBE / INVERT / TORNADO / SILENCE / AVALANCHE / ECHO / DOUBLE LINE / SNAKE LINE / DRUNK LINE / METEOR / BLOOM / GLITCH / REVERSE / SPLIT JUDGE / PENDULUM / FREEZE / SHATTER / DRIFT UP / HEARTBEAT

BPM・分割・速度・向き（→ / ← / ⇄）・密度・サイズ・トレイル・回転・判定点の位置と数まで
毎回引き直すので、同じ譜面は二度と出てこない。現在の状態は画面右上に表示される。

## 構成

```
index.html              画面（ライブラリ / ビューア）
css/style.css
js/app.js               UI・スライド操作・PWA まわり
js/store.js             IndexedDB への画像保存
js/rhythm.js            カオス・ノーツエンジン（Canvas）
sw.js                   アプリシェルのキャッシュ
manifest.webmanifest
icons/                  アイコン（tools/make_icons.py で生成）
```

依存パッケージなし・ビルド不要。素の HTML/CSS/JS だけで動く。
