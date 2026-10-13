# Google Play Console: conta Zuri Tech Lab

Imagens prontas para a página de programador (geradas a partir do logótipo Zuri Tech Lab):

| Ficheiro | Para quê | Formato pedido pela Google |
| --- | --- | --- |
| `icone_programador_512.png` | Ícone de programador | 512×512, PNG 32 bits |
| `cabecalho_4096x2304.jpg` | Imagem de cabeçalho | 4096×2304, JPG ou PNG 24 bits sem transparência |

## 1. Mudar o nome de programador para "Zuri Tech Lab"

1. Entra em <https://play.google.com/console> com a conta dona (proprietária) da conta de programador.
2. Menu da esquerda, ao nível da conta (fora de qualquer app): **Conta de programador** → **Acerca de si / About you**
   (em contas mais antigas: **Detalhes da conta**).
3. Muda o **Nome de programador** para `Zuri Tech Lab` e guarda.
4. A Google revê o nome antes de o mostrar no Google Play. O nome não pode ser igual ao de outra conta.

Atenção: o **nome de programador** (público) é diferente do **nome legal** verificado (o do perfil de pagamentos).
- Conta **pessoal**: o nome legal continua a ser o teu; só o nome público passa a "Zuri Tech Lab".
- Para aparecer como **empresa/organização** verificada, é preciso uma conta de organização (com número D-U-N-S),
  o que não se muda numa conta pessoal existente: exige um perfil de pagamentos novo e verificação.

## 2. Pôr o logótipo na página de programador

1. Ao nível da conta: **Conta de programador** → **Perfil de programador / Página de programador**.
2. **Ícone de programador**: carrega `icone_programador_512.png`.
3. **Imagem de cabeçalho**: carrega `cabecalho_4096x2304.jpg`.
4. Preenche o site, o email de contacto, uma descrição curta da Zuri Tech Lab e, se quiseres, a app em destaque.
5. Guarda. A página aparece no Google Play depois de teres pelo menos uma app publicada.

## 3. Pôr outras apps na conta

Cada app nova cria-se em **Todas as apps** → **Criar app**:

1. Nome da app, idioma predefinido, app ou jogo, gratuita ou paga, e aceitar as declarações.
2. No painel da app, completar **Configurar a app**: política de privacidade, acesso à app, anúncios,
   classificação de conteúdo, público-alvo, segurança dos dados, categoria e ficha da loja
   (ícone 512×512, imagem de destaque 1024×500, capturas de ecrã).
3. Carregar o **.aab** (o Muxima já tem o workflow pronto: ver [ANDROID_RELEASE.md](../ANDROID_RELEASE.md)).
   Cada app precisa de um **ID de pacote** único (ex.: `com.zuritechlab.muxima`), que nunca mais pode mudar
   depois do primeiro envio.

**Se a conta é pessoal e foi criada depois de 13 de novembro de 2023**, cada app nova tem de passar primeiro por um
**teste fechado com pelo menos 12 testadores, inscritos durante 14 dias seguidos**. Só depois se pode pedir acesso à
produção (no painel da app); a Google costuma responder em 7 dias ou menos.

Fontes (ajuda oficial da Play Console):
- [Página/perfil de programador](https://support.google.com/googleplay/android-developer/answer/6226441?hl=pt)
- [Gerir as informações da conta de programador](https://support.google.com/googleplay/android-developer/answer/13634081?hl=pt)
- [Requisitos de teste para contas pessoais novas](https://support.google.com/googleplay/android-developer/answer/14151465?hl=pt)
- [Criar e configurar a app](https://support.google.com/googleplay/android-developer/answer/9859152?hl=pt)
