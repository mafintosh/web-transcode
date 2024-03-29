#!/usr/bin/env node

const vtt = require('srt-to-vtt')
const { spawn, spawnSync } = require('child_process')
const { mkdirSync, createReadStream, createWriteStream, writeFileSync, existsSync } = require('fs')
const minimist = require('minimist')
const path = require('path')
const pump = require('pump')
const os = require('os')

const argv = minimist(process.argv.slice(2), {
  alias: {
    input: 'i',
    subtitles: 's',
    subs: 's',
    sub: 's',
    out: 'o',
    name: 'n'
  },
  '--': true
})

const onlyMp4 = !!argv['only-mp4']

if (!argv.out) {
  argv.out = 'web'
}

if (!argv.input || argv.help) {
  console.log('Usage: web-transcode -i <media-file> ( -s subtitles -n name -o ./web --only-mp4? )')
  process.exit(1)
}

if (!existsSync(argv.input)) {
  console.log('Input file does not exist')
  process.exit(2)
}

if (argv.s === true || argv.s === 'auto') {
  const tmp = tmpFile('srt')
  spawnSync('ffmpeg', [ '-i', argv.input, '-map', '0:s:0', tmp ], { stdio: 'inherit' })
  argv.s = tmp
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
const subsOut = onlyMp4 ? tmpFile('.vtt') : path.join(argv.out, name + '.vtt')
const htmlOut = onlyMp4 ? tmpFile('.html') : path.join(argv.out, name + '.html')

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
    ready()
  })
} else {
  ready()
}

function ready () {
  const extraArgs = [].concat(argv['--'] || [])
  const subArgs = []

  if (argv.s) {
    subArgs.push(
      '-i',
      subsOut,
      '-c:s',
      'mov_text'
    )
  }

  spawn('ffmpeg', [
    '-i', argv.input,
    ...subArgs,
    '-y',
    '-hide_banner',
    '-vcodec', v,
    '-acodec', a,
    ...extraArgs,
    mediaOut
  ], { stdio: 'inherit' })

  if (argv.html !== false) {
    writeFileSync(htmlOut, `<html>
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
  }
}

function tmpFile (ext) {
  return path.join(os.tmpdir(), 'web-transcode.' + Math.random().toString(16).slice(2) + '.' + ext)
}
