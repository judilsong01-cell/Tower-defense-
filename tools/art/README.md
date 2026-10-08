# Sprites desenhados à mão (fonte)

Cada boneco é uma grelha de 32×32 caracteres; cada letra é uma cor da paleta do boneco. O contorno escuro é
acrescentado automaticamente. Para gerar as folhas de pré-visualização (`docs/art-preview/`):

```bash
cd tools/art
python3 present.py   # precisa de Pillow: pip install pillow
```

Estado: **modelos para aprovação**. Depois de aprovados, são exportados como PNG para `public/assets/sprites/`
e ganham animações (operadores: `idle` + `attack`; inimigos: `move`).
