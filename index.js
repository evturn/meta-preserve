import fs from 'fs'
import path from 'path'
import c from 'chalk'
import { ExifImage as Parser } from 'exif'
import 'shelljs/global'

const [_, __, dirname] = process.argv
const INPUT_PATH = path.resolve(process.cwd(), dirname)
const metadataProps = [
  ['exif', 'DateTimeOriginal', 'DateTimeDigitized', 'CreateDate'],
  ['tiff', 'DateTime'],
  ['image', 'ModifyDate'],
  ['gps', 'GPSDateStamp']
]

const throwError = e =>  {
  throw new Error(c.bgRed(e.message))
}

const testProp = (prop, keys) => {
  const val = keys.filter(x => prop[x])[0]
  return val ? prop[val] : false
}

const getIn = obj => {
  return (prop, ...keys) => obj[prop] ? testProp(obj[prop], keys) : false
}

const testDateTime = (...args) => {
  return metadata => args
    .reduce((acc, xs) => !acc
      ? xs.reduce((_, __) => getIn(metadata)(...xs), acc)
      : acc,
    false)
}

const testFiletype = filename => {
  return filename.toLowerCase().includes('.jpg' || '.png')
}

const concatPath = filename => {
  return `${INPUT_PATH}/${filename}`
}

const concatDateTime = datetime => {
  const [date, time] = datetime.split(' ')
  const [ y, m, d ] = date.split(':')
  return `${m}/${d}/${y} ${time}`
}

const executeRewriteCmd = filepath => {
  return datetime => {
    exec(`/usr/bin/SetFile -m "${datetime}" ${filepath}`)
    exec(`/usr/bin/SetFile -d "${datetime}" ${filepath}`)
  }
}

const execExtract = filepath => {
  return new Promise((resolve, reject) => {
    try {
      new Parser({image: filepath}, (e, x) => resolve(x))
    } catch (e) {
      reject(e)
    }
  })
  .then(testDateTime(metadataProps))
  .then(concatDateTime)
  .then(executeRewriteCmd(filepath))
}

const execRead = (e, xs) => {
  return e
    ? throwError(e)
    : xs.filter(testFiletype)
        .map(concatPath)
        .map(execExtract)
}

fs.readdir(INPUT_PATH, execRead)