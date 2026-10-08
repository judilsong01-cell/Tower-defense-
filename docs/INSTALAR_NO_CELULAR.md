# Instalar o jogo no celular (Android)

Este guia gera um **APK** no teu PC (Windows) e instala-o no celular. O jogo fica todo dentro do APK: **não
precisa de servidor, de `npm run dev`, de Metro nem de internet** para jogar. Abres o ícone e joga-se.

> Isto é um APK de **teste** (debug). O `.aab` para a Google Play fica para mais tarde
> ([ANDROID_RELEASE.md](ANDROID_RELEASE.md)).

---

## 1. Preparar o PC (só da primeira vez)

### 1.1 Instalar o Android Studio

1. Descarrega em <https://developer.android.com/studio> e instala com as opções por defeito.
2. Abre o Android Studio **uma vez**. No assistente escolhe **Standard** e deixa-o descarregar tudo
   (Android SDK, cerca de 3 GB). Quando aparecer o ecrã *Welcome to Android Studio*, podes fechá-lo.

Não precisas de abrir o projeto no Android Studio. Ele só serve para instalar o **Java** e o **Android SDK**,
e o script do jogo encontra-os sozinho.

### 1.2 Confirmar o resto

Já tens o Node.js e o Git (usaste-os para `npm run dev`).

---

## 2. Atualizar o projeto

No PowerShell, **um comando de cada vez** (Enter depois de cada linha):

```powershell
cd Tower-defense-
git pull origin main
npm install
```

> Se a pasta estiver noutro sítio, usa o caminho certo no `cd`, por exemplo `cd C:\Users\judil\Tower-defense-`.

---

## 3. Gerar o APK

```powershell
npm run android:apk
```

- A **primeira vez demora** (5 a 15 minutos): descarrega o Gradle e as bibliotecas Android. Precisa de internet.
  As seguintes demoram menos de 1 minuto.
- No fim aparece `Pronto: TowerDefense.apk`. O ficheiro fica na pasta do projeto:
  `Tower-defense-\TowerDefense.apk` (cerca de 13 MB).

---

## 4. Instalar no celular

Escolhe **uma** das formas.

### Forma A: sem cabo (a mais simples)

1. Passa o `TowerDefense.apk` para o celular: Google Drive, WhatsApp para ti próprio, e-mail, ou copia-o pelo cabo
   USB para a pasta *Download*.
2. No celular, abre o ficheiro (pela app *Ficheiros*/*Files*, *Drive* ou *WhatsApp*).
3. O Android pede autorização para **instalar apps desconhecidas** a partir dessa app: carrega em **Definições**,
   ativa **Permitir desta fonte** e volta atrás.
4. Carrega em **Instalar**. Se o *Play Protect* avisar, carrega em **Mais detalhes → Instalar mesmo assim**
   (aparece porque o APK não vem da Play Store).
5. Abre **Tower Defense**. O jogo abre deitado (horizontal) e em ecrã inteiro.

### Forma B: com cabo USB (instala e abre sozinho)

Só da primeira vez, no celular:

1. **Definições → Acerca do telefone** → toca **7 vezes** em **Número da compilação** (*Build number*).
   Aparece "Agora és programador".
2. **Definições → Sistema → Opções de programador** → ativa **Depuração USB**.
3. Liga o cabo ao PC e, no aviso *Permitir depuração USB?*, marca **Permitir sempre deste computador** → **OK**.

Depois, sempre que quiseres instalar a versão mais recente:

```powershell
npm run android:run
```

Gera o APK, instala-o e abre o jogo no celular.

---

## 5. Atualizar o jogo no celular

Quando eu fizer alterações:

```powershell
git pull origin main
npm install
npm run android:apk      # ou: npm run android:run (com cabo)
```

E instala o novo `TowerDefense.apk` por cima (Forma A ou B). **O progresso é mantido**, desde que o APK seja
sempre gerado no **mesmo PC**.

---

## 6. Alternativa: descarregar o APK do GitHub (sem instalar nada no PC)

1. No GitHub do projeto: **Actions → Android APK (teste) → Run workflow → Run workflow**.
2. Espera uns 3 minutos até ficar verde ✓, abre a execução e descarrega **TowerDefense-apk** em *Artifacts*.
3. É um `.zip`: extrai o `TowerDefense.apk` e instala-o como na Forma A.

> O APK do GitHub e o do teu PC têm assinaturas diferentes. Para trocar de um para o outro tens de
> **desinstalar primeiro** o jogo do celular (perdes o progresso).

---

## 7. Problemas

| Mensagem | Solução |
| --- | --- |
| `Não encontrei o Android SDK` | Abre o Android Studio uma vez e deixa-o terminar o assistente (passo 1.1). Se o instalaste noutra pasta, abre **More Actions → SDK Manager**, copia o *Android SDK Location* e corre `$env:ANDROID_HOME="C:\o\caminho\Sdk"` antes de `npm run android:apk`. |
| `JAVA_HOME is not set` ou `java não é reconhecido` | Corre `$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"` (ajusta o caminho se instalaste noutro sítio) e repete. |
| `Unsupported class file major version` ou erro de versão do Java | O Java tem de ser o 21 ou mais recente. Usa o do Android Studio (linha acima). |
| `npm` dá erro ao pedir o `tsc` ou o `cap` | Faltou o `npm install` (passo 2). |
| O build fica parado muito tempo na primeira vez | É normal: está a descarregar o Gradle. Espera; não feches a janela. |
| *App não instalada* / `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | Já tens uma versão com outra assinatura (de outro PC ou do GitHub). Desinstala o jogo do celular e instala de novo. |
| `adb: no devices` / *unauthorized* (Forma B) | Confirma a **Depuração USB**, troca o modo USB para *Transferência de ficheiros* e aceita o aviso no celular. |
| Ecrã preto ao abrir | Fecha a app e abre de novo. Se continuar, diz-me o modelo do celular e a versão do Android. |

Requisitos do celular: **Android 7.0 ou mais recente**.
