import fs from 'fs';
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
pkg.main = 'main.js';
pkg.scripts['electron:dev'] = 'concurrently -k "cross-env BROWSER=none npm run dev" "wait-on http://localhost:5173 && electron ."';
pkg.scripts['electron:build'] = 'npm run build && electron-builder';
pkg.build = {
  appId: 'com.alphavision.app',
  productName: 'AlphaVision AI',
  directories: {
    output: 'release'
  },
  files: [
    'dist/**/*',
    'main.js'
  ],
  win: {
    target: ['nsis']
  }
};
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
