# Publicar na Google Play (.aab)

> **Estado:** ainda não se compila o `.aab`. Este guia é para quando o jogo estiver pronto a publicar.

## 1. O que já está preparado

- O projeto Android (`android/`) é gerado pelo Capacitor, com ecrã horizontal fixo e modo imersivo (sem barras do sistema).
- O workflow `.github/workflows/android.yml` **só corre manualmente**: GitHub → Actions → *Android release* → *Run workflow*.
  Corre os testes e gera:
  - `app-release-aab`: o **.aab** para a Google Play
  - `app-debug-apk`: um **.apk** de debug para instalar direto no telemóvel
- O `versionCode` é o número da execução do workflow, por isso cada build tem um número maior
  (a Google Play exige-o).

Descarregas os ficheiros em **GitHub → Actions → (execução) → Artifacts**.

## 2. Antes da primeira publicação

1. **ID da app**: está como `com.judilsong.towerdefense` (provisório). Depois de publicado **nunca mais pode mudar**.
   Para o trocar, altera `appId` em `capacitor.config.ts` e `namespace`/`applicationId` em `android/app/build.gradle`,
   e move `MainActivity.java` para a pasta do novo pacote (ou pede-me que o faça).
2. **Nome da app**: `appName` em `capacitor.config.ts` e `app_name` em `android/app/src/main/res/values/strings.xml`.
3. **Ícone e splash**: ver o fim de [ART_GUIDE.md](ART_GUIDE.md).

## 3. Criar a chave de upload (uma vez só)

Precisas do Java (JDK 17+). No teu computador:

```bash
keytool -genkeypair -v -keystore upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
```

**Guarda o `upload.jks` e as passwords num sítio seguro.** Nunca os ponhas no repositório (o `.gitignore` já os bloqueia).
Na Google Play, ativa a *Play App Signing*: a Google guarda a chave final e tu só usas esta chave de upload.

## 4. Configurar os secrets no GitHub

Em **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Valor |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | Conteúdo do `upload.jks` em base64 (`base64 -w0 upload.jks` no Linux, `base64 -i upload.jks` no macOS) |
| `ANDROID_KEYSTORE_PASSWORD` | Password da keystore |
| `ANDROID_KEY_ALIAS` | `upload` (ou o alias que escolheste) |
| `ANDROID_KEY_PASSWORD` | Password da chave |

A partir daí o `.aab` sai assinado. Sem estes secrets o build passa, mas o `.aab` fica por assinar e com um aviso.

## 5. Compilar localmente (opcional)

Com o Android Studio instalado:

```bash
npm run android:sync     # build web + copia para android/
npm run android:open     # abre no Android Studio
```

Para assinar localmente, cria `android/keystore.properties` (ignorado pelo git):

```properties
storeFile=/caminho/para/upload.jks
storePassword=...
keyAlias=upload
keyPassword=...
```

E depois corre `cd android && ./gradlew bundleRelease`. O ficheiro sai em `android/app/build/outputs/bundle/release/`.

## 6. Na Google Play Console

Conta de programador (taxa única), criar app, preencher a ficha da loja, a classificação de conteúdo e a política
de privacidade (o jogo não recolhe dados; o progresso fica só no dispositivo). Depois carrega o `.aab` numa faixa de
**teste interno** antes de produção.
