import fs from 'fs'
import path from 'path'
import c from 'chalk'
import exif from 'exifdata'
import { ExifImage as Exif } from 'exif'
import 'shelljs/global'

fs.readdir('images', (err, files) => {
  const data = files
    .filter(x => {
      const filename = x.toLowerCase()
      return filename.includes('.jpg') || filename.includes('.png')
    })
    .reduce((acc, x) => {
      acc.push({ file: path.join(process.cwd(), 'images', x) })
      return acc
    }, [])
    .map(extractExifMetadata)
})

function extractExifMetadata(image) {
  return new Promise((resolve, reject) => {
    exif.extract(image.file, (err, data) => {
      if (err) {
        try {
          new Exif({ image: image.file }, (err, data) => {
            if (err) {
              console.log(c.bgRed(err.message))
              reject(err)
            } else {
              resolve(data)
            }
          })
        } catch (e) {
          console.log(c.bgRed(e.message))
        }
      } else {
        resolve(data)
      }
    })
  })
  .then(
    data => {
      image.date = parseOriginalDate(data)
      return image
    },
    err => {
      image.date = null
      return image
    })
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
  if (!prop) { return null }

  return prop
    .split(' ')
    .map((x, i) => {
      if (i > 0) { return x }
      const [ year, month, day ] = x.split(':')
      return `${month}/${day}/${year} `
    })
    .reduce((acc, x) => acc + x, '')
}

function executeShellScript(image) {
  if (image.date !== null) {
    exec(`/usr/bin/SetFile -m "${image.date}" ${image.file}`)
    exec(`/usr/bin/SetFile -d "${image.date}" ${image.file}`)
  }
}
