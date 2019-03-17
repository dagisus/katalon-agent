const os = require('os');
const childProcess = require('child_process');
const tmp = require('tmp');
const logger = require('./logger');

module.exports = {

  getUserhome: function() {
    return os.homedir();
  },

  getVersion: function() {
    let version = '';
    const type = os.type();
    switch (type) {
      case 'Linux':
        version += 'Linux';
        break;
      case 'Darwin':
        version += 'macOS (app)';
        break;
      case 'Windows_NT':
        version += 'Windows';
        const arch = os.arch();
        switch (arch) {
          case 'x32':
            version += ' 32';
            break;
          case 'x64':
            version += ' 64';
            break;
          default:
            throw `Unsupported architecture: ${arch}`;
        }
        break;
      default:
        throw `Unsupported OS: ${type}`;
    }
    return version;
  },

  runCommand: function(command, x11Display, xvfbConfiguration) {

    let cmd;
    const args = [];
    const type = os.type();
    if (type === 'Windows_NT') {
      cmd = 'cmd';
      args.push('/c');
      args.push(command);
    } else {
      if (x11Display) {
        command = `DISPLAY=${x11Display} ${command}`;
      }
      if (xvfbConfiguration) {
        command = `xvfb-run ${xvfbConfiguration} command`;
      }
      cmd = 'sh';
      args.push('-c');
      args.push(command);
    }
    const tmpDir = tmp.dirSync();
    const tmpDirPath = tmpDir.name;
    logger.info(`Execute "${cmd} ${args.join(' ')}" in ${tmpDirPath}.`);
    const promise = new Promise((resolve) => {
      const cmdProcess = childProcess.spawn(cmd, args, {
        cwd: tmpDirPath,
        shell: true
      });
      cmdProcess.stdout.on('data', (data) => {
        process.stdout.write(data.toString());
      });
      cmdProcess.stderr.on('data', (data) => {
        process.stderr.write(data.toString());
      });
      cmdProcess.on('close', (code) => {
        logger.info(`Exit code: ${code}.`);
        resolve(code);
      });
    });
    return promise;
  }
}