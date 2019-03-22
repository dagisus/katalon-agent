const uuidv4 = require('uuid/v4');
var path = require('path');
var _ = require('lodash');
var find = require('find');
var config = require('./config');
var katalonRequest = require('./katalon-request');
var fse = require('fs-extra');
var archiver = require('archiver');

const logExtension=/.*[^\.har|.zip]$/
const harExtension=/.*\.(har)$/

const uploadInfoOutPath=ka_upload_info.json

// const oauth2 = {
//   grant_type: "password",
//   client_secret: "kit_uploader",
//   client_id: "kit_uploader"
// }
let zip = (folderPath, harFiles) => {
  let tempPath = path.join(folderPath, 'katalon-analytics-tmp'); 
  fse.ensureDirSync(tempPath);
  // create a file to stream archive data to.
  const zipPath = path.join(tempPath, `hars-${new Date().getTime()}.zip`);

  var output = fse.createWriteStream(zipPath);
  var archive = archiver('zip', {
    zlib: { level: 9 } // Sets the compression level.
  })

  archive.pipe(output);

  harFiles.forEach(file => {
    const fileName = path.basename(file);
    const rel = path.relative(folderPath, file);
    archive.file(file, { name: fileName });
  })

  archive.finalize();
  return zipPath;
}

let writeUploadInfo = (batch, files) => {
  let uploadInfo = {};
  uploadInfo[batch] = files;
  if (uploadInfoOutPath) {
    fse.outputJSONSync(file, uploadInfo);
  }
}



module.exports = {
  upload: (folderPath) => {
    const {email, password, projectId} = config;
    const harFiles = find.fileSync(harExtension, folderPath);
    const logFiles = find.fileSync(logExtension, folderPath);

    let harZips = {}
    harFiles.forEach(filePath => {
      let parent = path.resolve(filePath, '../../..');
      let files = harZips[parent];
      if (!files) {
        harZips[parent] = [];
      }
      harZips[parent].push(filePath);
    })

    Object.keys(harZips).map((folderPath, index) => {
      var files = harZips[folderPath];
      const zipPath = zip(folderPath, files);
      logFiles.push(zipPath);
    });

    const batch = new Date().getTime() + "-" + uuidv4();

    let uploadPromises = [];

    katalonRequest.requestToken(email, password)
    .then(response => {
      const token = response.body.access_token;

      for (let i = 0; i < logFiles.length -1; i++) {
        const filePath = logFiles[i];
        const promise = katalonRequest.getUploadInfo(token, projectId).then(({body}) => {
          const uploadUrl = body.uploadUrl;
          const uploadPath = body.path;
          const fileName = path.basename(filePath);
          const folderPath = path.dirname(filePath);
          let parent;
          if (path.extname(fileName) == '.zip') {
            parent = path.resolve(filePath, '../../../..');
          } else {
            parent = path.resolve(filePath, '../../..');
          };
          let rel = path.relative(parent, folderPath);
          return katalonRequest.uploadFile(uploadUrl, filePath)
            .then(() => katalonRequest.uploadFileInfo(token, projectId, batch, rel, fileName, uploadPath, false))
        });
        uploadPromises.push(promise);
      };

      Promise.all(uploadPromises).then(() => {
        const filePath = logFiles[logFiles.length - 1];
        katalonRequest.requestToken(email, password)
          .then(response => {
            const token = response.body.access_token;
            return katalonRequest.getUploadInfo(token, projectId).then(({body}) => {
              const uploadUrl = body.uploadUrl;
              const uploadPath = body.path;
              const fileName = path.basename(filePath);
              const folderPath = path.dirname(filePath);
              let parent;
              if (path.extname(fileName) == '.zip') {
                parent = path.resolve(filePath, '../../../..');
              } else {
                parent = path.resolve(filePath, '../../..');
              };
              let rel = path.relative(parent, folderPath);
              return katalonRequest.uploadFile(uploadUrl, filePath)
                .then(() => katalonRequest.uploadFileInfo(token, projectId, batch, rel, fileName, uploadPath, true))
            });
          });
      });

      writeUploadInfo(batch, logFiles);
    });


  }
}