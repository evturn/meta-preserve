import fs from 'fs'
import path from 'path'
import c from 'chalk'
import { extract } from 'exifdata'
import { ExifImage as Parser } from 'exif'
import 'shelljs/global'

const [_, __, dirname] = process.argv
const INPUT_PATH = path.resolve(process.cwd(), dirname)

fs.readdir(INPUT_PATH, (err, files) => {
  files
    .filter(x => x.toLowerCase().includes('.jpg' || '.png'))
    .map(x => ({path: `${INPUT_PATH}/${x}`}))
    .map(extractMetadata)
})

function extractMetadata(img) {
  return new Promise((resolve, reject) => {
    extract(img.path, (e, res) => resolve(e ? retryParse(img.path) : res))
  })
  .then(parseOriginalDate)
  .then(formatDateForCommand(img))
  .then(executeShellScript)
  .catch(e => console.log('I got your error right here', e.message))
}

function parseOriginalDate(data) {
  const { exif, tiff, image, gps } = data
  let prop = false
  if (!prop && exif && exif.DateTimeOriginal) { prop = exif.DateTimeOriginal }
  if (!prop && exif && exif.DateTimeDigitized) { prop = exif.DateTimeDigitized }
  if (!prop && exif && exif.CreateDate) { prop = exif.CreateDate }
  if (!prop && tiff && tiff.DateTime) { prop = tiff.DateTime }
  if (!prop && image && image.ModifyDate) { prop = image.ModifyDate }
  if (!prop && gps && gps.GPSDateStamp) { prop = gps.GPSDateStamp }
  return prop
}

function retryParse(filepath) {
  return new Promise((resolve, reject) => {
    try {
      new Parser({ image: filepath }, (e, res) => {
        if (e) {
          console.log(c.bgRed(e.message))
          reject(null)
        }
        resolve(res)
      })
    } catch (e) {
      console.log(c.bgRed(e.message))
    }
  })
}

function formatDateForCommand(image) {
  return date => {
    if (date) {
      image.date = date
        .split(' ')
        .reduce((acc, x) => {
          if (acc === '') {
            const [ year, month, day ] = x.split(':')
            acc += `${month}/${day}/${year} `
          } else {
            acc += x
          }
          return acc
        }, '')
    }
    console.log(image.date)
    return image
  }
}

function executeShellScript(image) {
  if (image.date) {
    exec(`/usr/bin/SetFile -m "${image.date}" ${image.path}`)
    exec(`/usr/bin/SetFile -d "${image.date}" ${image.path}`)
  }
}
