/**
 * Librar for storing and editing data
 */

//Dependencies:
const fs = require("fs");
const path = require("path");

//Container for thths module (to be exported)
const lib = {};
//Wirte data to a file

//base directory of the data folder:

lib.baseDir = path.join(__dirname, "/../.data/");

lib.create = (dir, file, data, callback) => {
  //open the file for writing
  fs.open(`${lib.baseDir}${dir}/${file}.json`, "wx", (err, fileDescriptor) => {
    if (!err && fileDescriptor) {
      //Convert data to string.
      let stringData = JSON.stringify(data);

      //Write to file and close it.
      fs.writeFile(fileDescriptor, stringData, err => {
        if (!err) {
          fs.close(fileDescriptor, err => {
            if (!err) {
              callback(false);
            } else {
              callback("Error closing new file");
            }
          });
        } else {
          callback("Error writing to new file");
        }
      });
    } else {
      callback("Could not create new file, it may already exist");
    }
  });
};

//Read data from a file:
lib.read = (dir, file, callback) => {
  fs.readFile(`${lib.baseDir}${dir}/${file}.json`, "utf8", (err, data) => {
    callback(err, data);
  });
};

//Update data inside a file

lib.update = (dir, file, data, callback) => {
  //open the file for reading
  fs.open(`${lib.baseDir}${dir}/${file}.json`, "r+", (err, fileDescriptor) => {
    if (!err && fileDescriptor) {
      //Convert the data to string
      let stringData = JSON.stringify(data);
      //Truncate the file:
      fs.truncate(fileDescriptor, err => {
        if (!err) {
          //Write to the file and close it:
          fs.writeFile(fileDescriptor, stringData, err => {
            if (!err) {
              fs.close(fileDescriptor, err => {
                if (!err) {
                  callback(false);
                } else {
                  callback("Error closing the file");
                }
              });
            } else {
              callback("Error writing to existing file");
            }
          });
        } else {
          callback("Error truncating file");
        }
      });
    } else {
      callback("Could not open the file for updating, it may not exist yet");
    }
  });
};

//Detele a file:

lib.delete = (dir, file, callback) => {
  //Unlink the file.
  fs.unlink(`${lib.baseDir}${dir}/${file}.json`, err => {
    if (!err) {
      callback(false);
    } else {
      callback("Error deleting the file");
    }
  });
};

//export the module:
module.exports = lib;
