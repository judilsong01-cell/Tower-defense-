// Builds an installable debug APK (TowerDefense.apk in the project root).
// With --install it also installs it on a phone connected by USB (USB debugging on).
// Expects `npm run android:sync` to have run first (the npm scripts do it).
// Finds Android Studio's Java and SDK on Windows/macOS/Linux when JAVA_HOME / ANDROID_HOME are not set.
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const win = process.platform === 'win32';
const mac = process.platform === 'darwin';
const env = { ...process.env };

const first = (paths) => paths.find((p) => p && existsSync(p));

if (!env.JAVA_HOME) {
  const jbr = first([
    win && 'C:\\Program Files\\Android\\Android Studio\\jbr',
    win && env.LOCALAPPDATA && join(env.LOCALAPPDATA, 'Programs', 'Android Studio', 'jbr'),
    mac && '/Applications/Android Studio.app/Contents/jbr/Contents/Home',
    !win && !mac && '/opt/android-studio/jbr',
  ]);
  if (jbr) {
    env.JAVA_HOME = jbr;
    console.log(`Java: ${jbr}`);
  }
}

const localProps = join('android', 'local.properties');
let sdk = env.ANDROID_HOME || env.ANDROID_SDK_ROOT;
if (!sdk && existsSync(localProps)) {
  const line = readFileSync(localProps, 'utf8').split(/\r?\n/).find((l) => l.startsWith('sdk.dir='));
  if (line) sdk = line.slice('sdk.dir='.length).replace(/\\(.)/g, '$1');
}
if (!sdk) {
  sdk = first([
    win && env.LOCALAPPDATA && join(env.LOCALAPPDATA, 'Android', 'Sdk'),
    mac && join(homedir(), 'Library', 'Android', 'sdk'),
    !win && !mac && join(homedir(), 'Android', 'Sdk'),
  ]);
  if (!sdk) {
    console.error('\nNão encontrei o Android SDK. Instala o Android Studio e abre-o uma vez (ver docs/INSTALAR_NO_CELULAR.md).\n');
    process.exit(1);
  }
  writeFileSync(localProps, `sdk.dir=${sdk.replace(/\\/g, '\\\\').replace(/:/g, '\\:')}\n`);
  console.log(`Android SDK: ${sdk}`);
}

const gradle = spawnSync(win ? 'gradlew.bat' : './gradlew', ['assembleDebug'], { cwd: 'android', stdio: 'inherit', env, shell: win });
if (gradle.status !== 0) {
  console.error('\nO build Android falhou. Vê a secção "Problemas" em docs/INSTALAR_NO_CELULAR.md.\n');
  process.exit(gradle.status ?? 1);
}

copyFileSync(join('android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk'), 'TowerDefense.apk');
console.log('\nPronto: TowerDefense.apk (na pasta do projeto).');

if (!process.argv.includes('--install')) {
  console.log('Envia-o para o celular e instala (ver docs/INSTALAR_NO_CELULAR.md).\n');
  process.exit(0);
}
const adb = join(sdk, 'platform-tools', win ? 'adb.exe' : 'adb');
console.log('A instalar no celular ligado por USB...');
const install = spawnSync(adb, ['install', '-r', 'TowerDefense.apk'], { stdio: 'inherit' });
if (install.status !== 0) {
  console.error('\nNão consegui instalar. Confirma o cabo, a "Depuração USB" e aceita o aviso no celular.');
  console.error('Se diz INSTALL_FAILED_UPDATE_INCOMPATIBLE, desinstala o jogo do celular e tenta outra vez.\n');
  process.exit(1);
}
spawnSync(adb, ['shell', 'monkey', '-p', 'com.judilsong.towerdefense', '-c', 'android.intent.category.LAUNCHER', '1'], { stdio: 'ignore' });
console.log('Instalado e aberto no celular.\n');
