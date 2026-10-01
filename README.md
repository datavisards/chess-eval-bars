# chess-eval-bars

TypeScript library for drawing chess evaluation bars.

![chess-eval-bars teaser](https://raw.githubusercontent.com/datavisards/chess-eval-bars/main/teaser.png)

```bash
npm install chess-eval-bars
```

```js
import { ChessEvalBar } from 'chess-eval-bars'
import 'chess-eval-bars/styles.css'

const bar = ChessEvalBar('#evalbar', {
  encoding: {
    length: { value: 0.5, min: -4, max: 4 },
  },
  label: { text: '+0.50' },
})
```

## Development

```bash
npm install
npm test
npm run build
npm run docs:start
```

## Deploy

### GitHub Pages

`website/` is the Docusaurus app. Pushing to `main` runs [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml), which builds `website/build` and publishes that folder with GitHub’s Pages artifact deploy.

### npm
```bash
npm run verify
npm login --auth-type=web
npm whoami
npm pack --dry-run
npm publish --access public
```

**Author:** [Arpit Narechania](https://narechania.com)  
**License:** MIT, [DataVisards Lab](https://datavisards.com/) at HKUST  
**Contact:** [narechania.com](https://narechania.com)
