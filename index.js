import fs from 'fs'
import path from 'path'
import { ExifImage as Parser } from 'exif'
import { exec } from 'shelljs'

const INPUT_PATH = path.resolve(process.cwd(), process.argv[2])
const EXIF_TAGS = [
  ['exif',  'DateTimeOriginal', 'DateTimeDigitized', 'CreateDate'],
  ['tiff',  'DateTime'],
  ['image', 'ModifyDate'],
  ['gps',   'GPSDateStamp']
]

fs.readdir(INPUT_PATH, (e, xs) => {
  if (e) { throwError(e) }
  const paths = xs
    .filter(matchFileType)
    .map(concatPath)

  Promise.all(paths.map(parseMetadata))
    .then(xs => xs.map(x => getInRecurse(x)(...EXIF_TAGS)))
    .then(xs => xs.map(concatDateTime))
    .then(xs => zip(xs, paths))
    .then(xs => xs.map(ys => execWriteCmd(...ys)))
    .catch(catchError)
})

function getInRecurse(obj) {
  return (...args) => args
    .reduce((acc, xs) => !acc
      ? xs.reduce((_, __) => getIn(obj)(...xs), acc)
      : acc,
      false)
}

function getIn(obj) {
  return (prop, ...rest) => {
    if (obj[prop]) {
      const val = rest.filter(x => obj[prop][x])[0]
      if (val) {
        return obj[prop][val]
      }
    }
    return false
  }
}

function concatDateTime(dateTime) {
  const [date, time] = dateTime.split(' ')
  const [ y, m, d ] = date.split(':')
  return `${m}/${d}/${y} ${time}`
}

function execWriteCmd(dateTime, filepath) {
  exec(`/usr/bin/SetFile -m "${dateTime}" ${filepath}`)
  exec(`/usr/bin/SetFile -d "${dateTime}" ${filepath}`)
}

function parseMetadata(metadata) {
  return new Promise((resolve, reject) => {
    new Parser({image: metadata}, (e, x) => e
      ? throwError(e)
      : resolve(x))
  })
}

function zip(xs, ys) {
  return xs.map((x, i) => [x, ys[i]])
}

function matchFileType(filename) {
  return /\.(jpg|jpeg|png|tiff)$/.test(filename.toLowerCase())
}

function concatPath(filename) {
  return `${INPUT_PATH}/${filename}`
}

function catchError(e) {
  const message = `See, what had happened was ${e.message}`
  console.log(message)
  return message
}

function throwError(e) {
  throw new Error(catchError(e))
}