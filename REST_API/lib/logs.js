/**
 * Library for storing and rotating logs.
 */

//Dependencies
const path = require("path");
const fs = require("fs");
const zlib = require("zlib");

// Container
const lib = {};

// Base dir of the logs folder

lib.baseDir = path.join(__dirname, "/../.logs/");

// Append a string to a file. Create the file if it does not exist.

lib.append = (fileName, str, callback) => {
  // Open the file for appending.

  fs.open(`${lib.baseDir}${fileName}.log`, "a", (err, fileDescriptor) => {
    if (!err && fileDescriptor) {
      // Append to the file and close it
      fs.appendFile(fileDescriptor, str + "\n", err => {
        if (!err) {
          fs.close(fileDescriptor, err => {
            if (!err) {
              callback(false);
            } else {
              callback("Error closing file that was being appended.");
            }
          });
        } else {
          callback("Error appending to file");
        }
      });
    } else {
      callback("Could not open file for appending.");
    }
  });
};

// List all the logs, and optionally include the compressed logs.
lib.list = (includeCompressedLogs, callback) => {
  fs.readdir(lib.baseDir, (err, data) => {
    if (!err && data && data.length > 0) {
      let trimmedFileNames = [];
      data.forEach(fileName => {
        // Add the .log files
        if (fileName.includes(".log")) {
          trimmedFileNames.push(fileName.replace(".log", ""));
        }
        // add on the .gz files
        if (fileName.includes(".gz.b64") && includeCompressedLogs) {
          trimmedFileNames.push(fileName.replace(".gz.b64", ""));
        }
        callback(false, trimmedFileNames);
      });
    } else {
      callback(err, data);
    }
  });
};

// Compress the contents of one .log file into a .gz.b64 file witin the same directory.
lib.compress = (logId, newFileId, callback) => {
  let sourceFile = `${logId}.log`;
  let destFile = `${newFileId}.gz.b64`;

  // read the source file
  fs.readFile(lib.baseDir + sourceFile, "utf8", (err, inputString) => {
    if (!err && inputString) {
      // Compress the data using zlib gzip:
      zlib.gzip(inputString, (err, buffer) => {
        if (!err && buffer) {
          // send the data to the destination file
          fs.open(lib.baseDir + destFile, "wx", (err, fileDescriptor) => {
            if (!err && fileDescriptor) {
              //write to dest file
              fs.writeFile(fileDescriptor, buffer.toString("base64"), err => {
                if (!err) {
                  //close file
                  fs.close(fileDescriptor, err => {
                    if (!err) {
                      callback(false);
                    } else {
                      callback(err);
                    }
                  });
                } else {
                  callback(err);
                }
              });
            } else {
              callback(err);
            }
          });
        } else {
          callback(err);
        }
      });
    } else {
      callback(err);
    }
  });
};

// Decompress the contents of a .gz.b64 file into a string variable.

lib.decompress = (fileId, callback) => {
  let fileName = `${fileId}.gz.b64`;
  fs.readdir(lib.baseDir + fileName, "utf8", (err, str) => {
    if (!err && str) {
      // Decompress the data
      let inputBuffer = Buffer.from(str, "base64");
      zlib.unzip(inputBuffer, (err, ouputBuffer) => {
        if (!err && ouputBuffer) {
          // Callback
          let str = ouputBuffer.toString();
          callback(false, str);
        } else {
          callback(err);
        }
      });
    } else {
      callback(err);
    }
  });
};

// Truncate a log file;
lib.truncate = (logId, callback) => {
  fs.truncate(lib.baseDir + logId + ".log", 0, err => {
    if (!err) {
      callback(false);
    } else {
      callback(err);
    }
  });
};

// Export the module.

module.exports = lib;
