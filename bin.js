#!/usr/bin/env node

const vtt = require('srt-to-vtt')
const { spawn, spawnSync } = require('child_process')
const { mkdirSync, createReadStream, createWriteStream, writeFileSync, existsSync } = require('fs')
const minimist = require('minimist')
const path = require('path')
const pump = require('pump')

const argv = minimist(process.argv.slice(2), {
  alias: {
    input: 'i',
    subtitles: 's',
    subs: 's',
    sub: 's',
    out: 'o',
    name: 'n'
  }
})

if (!argv.out) {
  argv.out = 'web'
}

if (!argv.input || argv.help) {
  console.log('Usage: web-transcode -i <media-file> ( -s subtitles )')
  process.exit(1)
}

if (!existsSync(argv.input)) {
  console.log('Input file does not exist')
  process.exit(2)
}

if (argv.s && !existsSync(argv.s)) {
  console.log('Subtitle file does not exist')
  process.exit(2)
}

const name = (argv.name || path.basename(argv.input, path.extname(argv.input)))

try {
  mkdirSync(argv.out)
} catch (_) {}

const mediaOut = path.join(argv.out, name + '.mp4')
const subsOut = path.join(argv.out, name + '.vtt')
const htmlOut = path.join(argv.out, name + '.html')

const { stderr } = spawnSync('ffmpeg', [ '-i', argv.input, '-hide_banner' ])

let v = (stderr.toString().match(/Stream #0.+ Video: (\w+) /) || [ null, null ])[1]
let a = (stderr.toString().match(/Stream #0.+ Audio: (\w+) /) || [ null, null ])[1]

if (v === 'h264') v = 'copy'
else v = 'h264'

if (a === 'aac') a = 'copy'
else a = 'aac'

if (argv.s) {
  const stream = /\.vtt$/.test(argv.s)
    ? createReadStream(argv.s)
    : pump(createReadStream(argv.s), vtt())
  pump(stream, createWriteStream(subsOut), function (err) {
    if (err) throw err
  })
}

spawn('ffmpeg', [
  '-i', argv.input,
  '-y',
  '-hide_banner',
  '-vcodec', v,
  '-acodec', a,
  mediaOut
], { stdio: 'inherit' })

writeFileSync(htmlOut, `
<html>
  <head>
    <style>
      html, body {
        margin: 0;
        padding: 0;
        background-color: black;
      }

      video {
        width: 100%;
        height: 100%;
        max-height: 100%;
        max-width: 100%;
      }
    </style>
  </head>
  <body>
    <video controls autoplay>
      <source type="video/mp4" src="${name}.mp4">   
      ${argv.s ? `<track src="${name}.vtt" label="Subtitles" kind="captions" default>` : ''}
    </video>
  </body>
</html>
`)
