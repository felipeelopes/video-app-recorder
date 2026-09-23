# video-app-recorder

**Vídeos de produto do seu web app, montados por um agente de IA a partir de telas reais.**

CLI e skill para agentes (Claude Code, Codex, Cursor) que transformam um pedido como *"vídeo de 90 s
das novidades do dashboard e do pedido pelo WhatsApp"* em MP4s renderizados com o
[HyperFrames](https://github.com/heygen-com/hyperframes) (HTML → vídeo). Detalhes completos no
[README em inglês](README.md).

## 1. Dependências

| Dependência | Para quê | Windows | macOS | Linux (Debian/Ubuntu) |
|---|---|---|---|---|
| Node.js 22+ | CLI e scripts | `winget install OpenJS.NodeJS.LTS` | `brew install node` | `nvm install 22` |
| FFmpeg | gravações, áudio | `winget install Gyan.FFmpeg` | `brew install ffmpeg` | `sudo apt install ffmpeg` |
| HyperFrames | render, Chrome headless, efeitos | `npm install -g hyperframes` | igual | igual |
| Python 3 + NumPy + SciPy | trilha | `winget install Python.Python.3.12` e `pip install numpy scipy` | `brew install python` e `pip3 install numpy scipy` | `sudo apt install python3-numpy python3-scipy` |

Conferir: `node --version`, `ffmpeg -version`, `npx hyperframes doctor` e
`python -c "import numpy, scipy"`. O app precisa estar rodando localmente (ou em homologação)
**com dados de demonstração**; nunca capture produção.

## 2. Instalar o CLI

```bash
npm install -g github:felipeelopes/video-app-recorder
video-app-recorder help
```

(ou `npx github:felipeelopes/video-app-recorder help`, ou `git clone` + `npm link`).

## 3. Instalar a skill no agente

```bash
video-app-recorder install-skill --for claude     # ~/.claude/skills
video-app-recorder install-skill --for codex      # ~/.codex/skills
video-app-recorder install-skill --for cursor     # ~/.cursor/skills
video-app-recorder install-skill --for claude,cursor --project .   # dentro do repositório
```

Reinicie o agente depois de instalar.

- **Claude Code:** `/video-app-recorder vídeo de 60 s das novidades do dashboard, para o LinkedIn`
  (ou só peça um vídeo de produto; a skill é escolhida pela descrição).
- **Codex:** `$video-app-recorder vídeo de em breve e de lançamento da nova reserva`. Captura e render
  abrem o Chrome e acessam `localhost`/npm/CDN: aprove quando o Codex pedir ou libere rede em
  `~/.codex/config.toml` (`[sandbox_workspace_write]` `network_access = true`).
- **Cursor:** no chat **Agent**, digite `/video-app-recorder` e o pedido. Use num workspace local (não em
  Cloud Agent). O Cursor também lê `~/.claude/skills` e `~/.codex/skills`.

## 4. Configurar um projeto de vídeo

```bash
video-app-recorder init meu-video      # --example para o demo "Acme Bistro"
cd meu-video
```

- `capture.plan.json`: URL local (`base`), passos de login, telas (`shots`) e regiões medidas.
- `video.config.json`: marca, cenas (`hook`, `zoom`, `chat`, `closing`, `custom`), versões e música.
- Credenciais só por variável de ambiente, referenciadas como `${env:NOME}`:
  `export APP_USER=...` (bash) ou `$env:APP_USER = "..."` (PowerShell).
- Música: `"calm": true` (sintetizada) ou uma faixa escolhida + `video-app-recorder analyze-track`.

## 5. Usar

```bash
video-app-recorder capture
video-app-recorder build --variant soon
video-app-recorder check
video-app-recorder snapshot --at 4,12,30,60
video-app-recorder render
```

Demo sem app próprio: `video-app-recorder demo-app` num terminal e, em outro,
`video-app-recorder init acme --example`, `capture` (com `DEMO_USER`/`DEMO_PASSWORD`), `build`, `render`.

## Segurança

Só captura `localhost` (homologação só com `--allow-remote`), credenciais só por `${env:NOME}`,
captcha para a execução e é resolvido por uma pessoa (`--headed`), e o agente é instruído a nunca
clicar em ações que publicam e a substituir dados pessoais reais antes de publicar.

## Licença

[MIT](LICENSE). Componentes de terceiros: [THIRD_PARTY.md](THIRD_PARTY.md). WhatsApp é marca da Meta
Platforms, Inc.; a cena de chat é uma simulação visual aproximada, sem afiliação com a Meta.
