import {themes as prismThemes} from 'prism-react-renderer';
import type {Config, Plugin} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const siteDir = path.dirname(fileURLToPath(import.meta.url));

// Local `npm run docs:start` stays at /. The Pages workflow sets GITHUB_PAGES
// so the built site is served at https://datavisards.com/chess-eval-bars/.
const pages = process.env.GITHUB_PAGES === 'true';

const config: Config = {
  title: 'chess-eval-bars | DataVisards Lab',
  tagline: 'Render evaluation-bars next to a chessboard.js board',
  favicon: 'img/favicon.svg',
  url: 'https://datavisards.com',
  baseUrl: pages ? '/chess-eval-bars/' : '/',
  organizationName: 'datavisards',
  projectName: 'chess-eval-bars',
  trailingSlash: false,
  onBrokenLinks: 'throw',
  markdown: {
    format: 'detect',
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },
  i18n: {defaultLocale: 'en', locales: ['en']},
  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: undefined,
        },
        blog: false,
        theme: {
          customCss: ['./src/css/custom.css', '../src/styles/styles.css'],
        },
      } satisfies Preset.Options,
    ],
  ],
  plugins: [
    function chessEvalBarsSrc(): Plugin {
      return {
        name: 'chess-eval-bars-src',
        configureWebpack(_config, isServer, utils) {
          return {
            mergeStrategy: {'module.rules': 'prepend'},
            resolve: {
              alias: {
                'chess-eval-bars': path.resolve(siteDir, '../src/index.ts'),
                'chess-eval-bars/styles.css': path.resolve(siteDir, '../src/styles/styles.css'),
                'ceb-examples': path.resolve(siteDir, '../examples'),
              },
              extensions: ['.ts', '.tsx', '.js', '.jsx', '.css'],
            },
            module: {
              rules: [
                {
                  test: /\.tsx?$/,
                  include: [
                    path.resolve(siteDir, '../src'),
                    path.resolve(siteDir, '../examples'),
                  ],
                  use: [utils.getJSLoader({isServer})],
                },
              ],
            },
          };
        },
      };
    },
  ],
  themeConfig: {
    navbar: {
      title: 'chess-eval-bars',
      items: [
        {type: 'docSidebar', sidebarId: 'docs', position: 'left', label: 'Docs'},
        {to: '/docs/playground', label: 'Playground', position: 'left'},
        {to: '/docs/chessboardjs', label: 'Examples', position: 'left'},
      ],
    },
    footer: {
      style: 'dark',
      copyright: `© 2026 <a href="https://narechania.com">Arpit Narechania</a> · <a href="https://datavisards.com">DataVisards Lab</a>, HKUST`,
    },
    prism: {
      theme: prismThemes.github,
    },
    colorMode: {
      defaultMode: 'light',
      disableSwitch: true,
      respectPrefersColorScheme: false,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
