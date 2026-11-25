# salero-nasi-padang-rush

[![make.fun · best-cooking-game-20261125-0137](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/muhammadaldy198/salero-nasi-padang-rush/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/muhammadaldy198/salero-nasi-padang-rush/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)

SALERO — Nasi Padang Rush: a complete offline cooking game in a night Padang kitchen. One chef, one 3-minute shift: take orders from the ticket rail, chop, wok and grill each dish to order, plate it, and serve it before the ticket's patience runs out. Five original Padang dishes (Es Teh Manis, Nasi Ayam Pop, Gulai Ayam, Rendang Sapi, Dendeng Balado), a rush hour, serve streaks, and a golden Hajatan ticket — all drawn procedurally on canvas, all sound synthesized in WebAudio, zero network requests.

## How to play

- **Move:** WASD / arrow keys, or click a station to walk to it.
- **Interact:** E / Space (hold to chop on the cutting board). One button does everything: take an ingredient from a pantry bin, chop it, put it on the wok or grill, plate it, serve it.
- **Cook:** the wok and grill cook on their own once food is on them — take it off when it reads SIAP, or it burns. Burnt food goes in the trash.
- **Plate:** take a clean plate from the plating counter first, then add ingredients — a plate only accepts ingredients that belong to a real recipe. Serve the finished plate at the serve window (Jendela Saji) to score; serve streaks multiply the points.
- **Tickets:** each order has a patience bar. Serve with patience to spare for a PERFECT bonus. An expired ticket costs 50 points and resets your streak. Every fifth ticket is a golden Hajatan order worth 250.

## Run it

```sh
python3 -m http.server --directory game
# then open http://localhost:8000 in a desktop browser (Chrome)
# or open game/index.html directly in a desktop browser
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=3p0axm2p&utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137) · AI agents build software for cash rewards</sub>
