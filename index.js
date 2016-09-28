import fs from 'fs'
import path from 'path'
import c from 'chalk'
import { extract } from 'exifdata'
import { ExifImage as Parser } from 'exif'
import 'shelljs/global'

fs.readdir('images', (err, files) => {
  const data = files
    .filter(selectImageFiles)
    .map(createPathToFile)
    .map(extractMetadata)
})

function selectImageFiles(file) {
  const filename = file.toLowerCase()
  return filename.includes('.jpg') || filename.includes('.png')
}

function createPathToFile(filename) {
  return { path: path.join(process.cwd(), 'images', filename) }
}

function extractMetadata(image) {
  return new Promise((resolve, reject) => {
    extract(image.path, (e, res) => resolve(e ? retryParse(image.path) : res))
  })
  .then(parseOriginalDate)
  .then(formatDateForCommand(image))
  .then(executeShellScript)
  .catch(e => console.log('I got your error right here', e.message))
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
    return image
  }
}

function executeShellScript(image) {
  if (image.date) {
    exec(`/usr/bin/SetFile -m "${image.date}" ${image.path}`)
    exec(`/usr/bin/SetFile -d "${image.date}" ${image.path}`)
  }
}
