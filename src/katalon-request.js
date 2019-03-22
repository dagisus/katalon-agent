const http = require('./http');
const config = require('./config');
const fs = require('fs')

const TOKEN_URI = "/oauth/token";
const UPLOAD_URL_URI = "/api/v1/files/upload-url";

const KATALON_TEST_REPORTS_URI = "/api/v1/katalon-test-reports";
const KATALON_RECORDER_TEST_REPORTS_URI = "/api/v1/katalon-recorder/test-reports";
const KATALON_JUNIT_TEST_REPORTS_URI = "/api/v1/junit/test-reports";

const oauth2 = {
  grant_type: "password",
  client_secret: "kit_uploader",
  client_id: "kit_uploader"
};

module.exports = {
  requestToken: function(email, password) {
    const data = {
      username: email,
      password: password,
      grant_type: oauth2.grant_type
    }
    var options = {
      auth: {
        username: oauth2.client_id,
        password: oauth2.client_secret
      },
      form: data,
      json: true
    };
    return http.request(config.serverUrl, TOKEN_URI, options, 'post');
  },

  getUploadInfo: function(token, projectId) {
    const options = {
      auth: {
        bearer: token
      },
      json: true,
      qs: {
        projectId
      },
    }
    return http.request(config.serverUrl, UPLOAD_URL_URI, options, 'get');
  },

  uploadFile: function(uploadUrl, filePath) {
    return http.uploadToS3(uploadUrl, filePath);
  },

  uploadFileInfo: function(token, projectId, batch, folderName, fileName, uploadedPath, isEnd, reportType) {
    let url = KATALON_TEST_REPORTS_URI;
    if ("junit" == reportType) {
      url = KATALON_JUNIT_TEST_REPORTS_URI;
    } else if ("recorder" == reportType) {
      url = KATALON_RECORDER_TEST_REPORTS_URI;
    }
    const options = {
      auth: {
        bearer: token
      },
      json: true,
      qs: {
        projectId,
        batch,
        folderPath: folderName,
        fileName,
        uploadedPath,
        isEnd
      },
    }
    return http.request(config.serverUrl, url, options, 'post');
  }
}